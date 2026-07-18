import fs from "node:fs/promises";

import { Prisma, ScanStatus, type Scan } from "@prisma/client";

import { environment } from "../../config/environment";
import { ApiError } from "../../shared/errors/api-error";
import { logger } from "../../shared/logger/logger";
import { chunkGeneratorService, ChunkGeneratorService, type RepositoryChunk } from "../chunk-generator";
import { fileIndexerService, FileIndexerService } from "../file-indexer";
import { findingRepository, FindingRepository } from "../findings";
import { GitHubImportRepository, githubImportRepository } from "../github-imports/github-import.repository";
import { openAIService, OpenAIService } from "../openai";
import { aiPromptBuilderService, AiPromptBuilderService, type PromptFileContent } from "../prompt-builder";
import { ProjectRepository, projectRepository } from "../projects/project.repository";
import { repositoryParserService, RepositoryParserService } from "../repository-parser";
import {
  ruleBasedSecurityScannerService,
  RuleBasedSecurityScannerService,
  type SecurityFinding,
  type SecurityScanSummary,
} from "../rule-based-scanner";
import { UploadRepository, uploadRepository } from "../uploads/upload.repository";
import { ACTIVE_SCAN_STATUSES } from "./scan.constants";
import { createDemoSecurityFindings } from "./scan-demo-findings";
import { scanProgressService, ScanProgressService } from "./scan-progress.service";
import { ScanRepository, scanRepository } from "./scan.repository";
import type { ScanListQuery } from "./scan.schemas";
import { toPublicScan, type PublicScan, type ScanListResult } from "./scan.types";

type RepositoryScanSource = {
  sourceType: "github" | "zip";
  sourceRef: string;
  rootPath: string;
  createdAt: Date;
};

export class ScanService {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly uploads: UploadRepository,
    private readonly githubImports: GitHubImportRepository,
    private readonly scans: ScanRepository,
    private readonly parser: RepositoryParserService,
    private readonly fileIndexer: FileIndexerService,
    private readonly securityScanner: RuleBasedSecurityScannerService,
    private readonly chunkGenerator: ChunkGeneratorService,
    private readonly promptBuilder: AiPromptBuilderService,
    private readonly openAI: OpenAIService,
    private readonly findings: FindingRepository,
    private readonly progress: ScanProgressService,
  ) {}

  public async createScan(ownerId: string, projectId: string): Promise<PublicScan> {
    await this.ensureProjectOwnership(projectId, ownerId);
    await this.ensureNoActiveScan(projectId);
    const source = await this.resolveRepositorySource(projectId, ownerId);

    try {
      const scan = await this.scans.create({
        projectId,
        requestedByUserId: ownerId,
        sourceType: source.sourceType,
        sourceRef: source.sourceRef,
      });

      this.publishScanProgress(scan.id, scan.status, "Queued", 0);
      this.runScanPipeline(scan.id, source);

      return toPublicScan(scan);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ApiError({
          statusCode: 409,
          code: "ACTIVE_SCAN_EXISTS",
          message: "A scan is already running for this project.",
        });
      }

      throw error;
    }
  }

  public async getScans(ownerId: string, projectId: string, query: ScanListQuery): Promise<ScanListResult> {
    await this.ensureProjectOwnership(projectId, ownerId);
    const result = await this.scans.findManyByProjectAndOwner(projectId, ownerId, query);

    return {
      scans: result.scans.map(toPublicScan),
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
      },
    };
  }

  public async getScan(ownerId: string, projectId: string, scanId: string): Promise<PublicScan> {
    const scan = await this.getOwnedScan(ownerId, projectId, scanId);

    return toPublicScan(scan);
  }

  public async cancelScan(ownerId: string, projectId: string, scanId: string): Promise<PublicScan> {
    const scan = await this.getOwnedScan(ownerId, projectId, scanId);

    if (!this.isActiveStatus(scan.status)) {
      throw new ApiError({
        statusCode: 409,
        code: "SCAN_NOT_CANCELLABLE",
        message: "Only active scans can be cancelled.",
      });
    }

    const cancelledAt = new Date();
    const cancelledScan = await this.scans.markCancelled(
      scan.id,
      cancelledAt,
      this.calculateElapsedMs(scan, cancelledAt),
    );

    if (!cancelledScan || cancelledScan.status !== ScanStatus.CANCELLED) {
      throw new ApiError({
        statusCode: 409,
        code: "SCAN_NOT_CANCELLABLE",
        message: "Only active scans can be cancelled.",
      });
    }

    this.publishScanProgress(cancelledScan.id, cancelledScan.status, "Cancelled", cancelledScan.progress);

    return toPublicScan(cancelledScan);
  }

  public async retryScan(ownerId: string, projectId: string, scanId: string): Promise<PublicScan> {
    const failedScan = await this.getOwnedScan(ownerId, projectId, scanId);

    if (failedScan.status !== ScanStatus.FAILED) {
      throw new ApiError({
        statusCode: 409,
        code: "SCAN_NOT_RETRIABLE",
        message: "Only failed scans can be retried.",
      });
    }

    await this.ensureNoActiveScan(projectId);
    const source = await this.resolveRepositorySource(projectId, ownerId);

    try {
      const retryScan = await this.scans.create({
        projectId,
        requestedByUserId: ownerId,
        retryOfScanId: failedScan.id,
        attempt: failedScan.attempt + 1,
        sourceType: source.sourceType,
        sourceRef: source.sourceRef,
      });

      this.publishScanProgress(retryScan.id, retryScan.status, "Queued retry", 0);
      this.runScanPipeline(retryScan.id, source);

      return toPublicScan(retryScan);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ApiError({
          statusCode: 409,
          code: "ACTIVE_SCAN_EXISTS",
          message: "A scan is already running for this project.",
        });
      }

      throw error;
    }
  }

  private async ensureProjectOwnership(projectId: string, ownerId: string): Promise<void> {
    const project = await this.projects.findActiveByIdAndOwner(projectId, ownerId);

    if (!project) {
      throw new ApiError({
        statusCode: 404,
        code: "PROJECT_NOT_FOUND",
        message: "Project was not found.",
      });
    }
  }

  private async ensureNoActiveScan(projectId: string): Promise<void> {
    const activeScan = await this.scans.findActiveByProject(projectId);

    if (activeScan) {
      throw new ApiError({
        statusCode: 409,
        code: "ACTIVE_SCAN_EXISTS",
        message: "A scan is already running for this project.",
      });
    }
  }

  private async getOwnedScan(ownerId: string, projectId: string, scanId: string): Promise<Scan> {
    const scan = await this.scans.findByIdProjectAndOwner(scanId, projectId, ownerId);

    if (!scan) {
      throw new ApiError({
        statusCode: 404,
        code: "SCAN_NOT_FOUND",
        message: "Scan was not found.",
      });
    }

    return scan;
  }

  private async resolveRepositorySource(projectId: string, ownerId: string): Promise<RepositoryScanSource> {
    const [latestUpload, latestGitHubImport] = await Promise.all([
      this.uploads.findLatestByProjectAndOwner(projectId, ownerId),
      this.githubImports.findLatestByProjectAndOwner(projectId, ownerId),
    ]);

    const sources: RepositoryScanSource[] = [];

    if (latestUpload) {
      sources.push({
        sourceType: "zip",
        sourceRef: latestUpload.originalFilename,
        rootPath: latestUpload.extractedPath,
        createdAt: latestUpload.createdAt,
      });
    }

    if (latestGitHubImport) {
      sources.push({
        sourceType: "github",
        sourceRef: `${latestGitHubImport.owner}/${latestGitHubImport.name}`,
        rootPath: latestGitHubImport.localPath,
        createdAt: latestGitHubImport.createdAt,
      });
    }

    const latestSource = sources.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

    if (!latestSource) {
      throw new ApiError({
        statusCode: 404,
        code: "REPOSITORY_SOURCE_NOT_FOUND",
        message: "No uploaded or imported repository was found for this project.",
      });
    }

    return latestSource;
  }

  private runScanPipeline(scanId: string, source: RepositoryScanSource): void {
    queueMicrotask(() => {
      void this.executeScanPipeline(scanId, source);
    });
  }

  private async executeScanPipeline(scanId: string, source: RepositoryScanSource): Promise<void> {
    let currentScan: Scan | null = null;

    try {
      currentScan = await this.scans.markStarted(scanId);

      if (!currentScan || currentScan.status !== ScanStatus.PARSING || (await this.isCancelled(scanId))) {
        return;
      }

      this.publishScanProgress(scanId, ScanStatus.PARSING, "Parsing repository", 10);
      const parsedRepository = await this.parser.parseRepository(source.rootPath);

      if (await this.isCancelled(scanId)) {
        return;
      }

      currentScan = await this.scans.updateStatus(scanId, ScanStatus.INDEXING, 45);

      if (!currentScan || currentScan.status !== ScanStatus.INDEXING || (await this.isCancelled(scanId))) {
        return;
      }

      this.publishScanProgress(scanId, ScanStatus.INDEXING, "Indexing files", 45);
      const repositoryIndex = await this.fileIndexer.indexRepository(source.rootPath);

      if (await this.isCancelled(scanId)) {
        return;
      }

      this.publishScanProgress(scanId, ScanStatus.INDEXING, "Running rule-based scanner", 55);
      const ruleBasedSecurityScan = await this.securityScanner.scanRepository(repositoryIndex);
      const chunkPlan = this.chunkGenerator.generateChunks({
        repositoryIndex,
      });

      currentScan = await this.scans.updateStatus(scanId, ScanStatus.READY_FOR_AI, 60);

      if (!currentScan || currentScan.status !== ScanStatus.READY_FOR_AI || (await this.isCancelled(scanId))) {
        return;
      }

      this.publishScanProgress(scanId, ScanStatus.READY_FOR_AI, "Repository ready for AI scan", 60);
      currentScan = await this.scans.updateStatus(scanId, ScanStatus.AI_SCANNING, 65);

      if (!currentScan || currentScan.status !== ScanStatus.AI_SCANNING || (await this.isCancelled(scanId))) {
        return;
      }

      this.publishScanProgress(scanId, ScanStatus.AI_SCANNING, "Scanning chunks with AI", 65);
      const aiFindings = await this.runAiSecurityScan({
        scanId,
        projectId: currentScan.projectId,
        source,
        repositoryIndex,
        chunkPlan,
        chunks: chunkPlan.chunks,
      });

      currentScan = await this.scans.markProcessingResults(scanId, 90);

      if (!currentScan || currentScan.status !== ScanStatus.PROCESSING_RESULTS || (await this.isCancelled(scanId))) {
        return;
      }

      this.publishScanProgress(scanId, ScanStatus.PROCESSING_RESULTS, "Processing findings", 90);
      const securityFindings = this.dedupeFindings(
        this.applyDemoFindingsIfNeeded({
          repositoryIndex,
          findings: [...ruleBasedSecurityScan.findings, ...aiFindings],
        }),
      );
      const securitySummary = this.summarizeFindings(repositoryIndex.files.length, securityFindings);

      const completedAt = new Date();
      await this.findings.createManyFromSecurityFindings({
        projectId: currentScan.projectId,
        scanId,
        findings: securityFindings,
      });

      await this.scans.markCompletedWithSecurityResults({
        scanId,
        summary: parsedRepository.summary,
        securityFindings,
        securitySummary,
        completedAt,
        elapsedMs: this.calculateElapsedMs(currentScan, completedAt),
      });
      this.publishScanProgress(scanId, ScanStatus.COMPLETED, "Completed", 100);
    } catch (error) {
      await this.failScan(scanId, currentScan, error);
    }
  }

  private async failScan(scanId: string, currentScan: Scan | null, error: unknown): Promise<void> {
    const latestScan = (await this.scans.findById(scanId)) ?? currentScan;

    if (!latestScan || latestScan.status === ScanStatus.CANCELLED) {
      return;
    }

    const completedAt = new Date();
    const failureReason = error instanceof Error ? error.message : "Scan failed.";

    await this.scans.markFailed(scanId, failureReason, completedAt, this.calculateElapsedMs(latestScan, completedAt));
    this.publishScanProgress(scanId, ScanStatus.FAILED, "Failed", latestScan.progress);

    logger.warn("Repository scan failed.", {
      error,
      scanId,
    });
  }

  private async isCancelled(scanId: string): Promise<boolean> {
    const scan = await this.scans.findById(scanId);

    return scan?.status === ScanStatus.CANCELLED;
  }

  private async runAiSecurityScan(input: {
    scanId: string;
    projectId: string;
    source: RepositoryScanSource;
    repositoryIndex: Awaited<ReturnType<FileIndexerService["indexRepository"]>>;
    chunkPlan: ReturnType<ChunkGeneratorService["generateChunks"]>;
    chunks: RepositoryChunk[];
  }): Promise<SecurityFinding[]> {
    if (!this.openAI.isConfigured()) {
      logger.info("Skipping AI security scan because OpenAI is unavailable.", {
        reason: this.openAI.getDisabledReason() ?? "OPENAI_NOT_CONFIGURED",
        projectId: input.projectId,
      });
      this.publishScanProgress(input.scanId, ScanStatus.AI_SCANNING, "Skipping AI scan", 75);
      return [];
    }

    const findings: SecurityFinding[] = [];
    const totalChunks = Math.max(1, input.chunks.length);

    for (const [index, chunk] of input.chunks.entries()) {
      if (await this.isCancelled(input.scanId)) {
        return findings;
      }

      const percentage = 65 + Math.round((index / totalChunks) * 20);
      const currentFile = chunk.files[0]?.relativePath ?? null;

      this.publishScanProgress(input.scanId, ScanStatus.AI_SCANNING, "Scanning chunk with AI", percentage, currentFile);
      const prompt = this.promptBuilder.buildSecurityScanPrompt({
        project: {
          projectId: input.projectId,
          name: input.source.sourceRef,
          repositorySource: input.source.sourceType,
        },
        repositoryIndex: input.repositoryIndex,
        chunkPlan: input.chunkPlan,
        chunk,
        files: await this.loadChunkFileContents(chunk),
        scanFocus: [
          "Application security vulnerabilities",
          "Authentication and authorization flaws",
          "Injection, XSS, secrets, unsafe process execution, weak configuration, and missing validation",
        ],
        options: {
          maxRepositoryTreeEntries: 200,
          maxFileMetadataEntries: 100,
          maxFileContentChars: 18_000,
          maxChunkPlanEntries: 25,
        },
      });
      let result: Awaited<ReturnType<OpenAIService["scanSecurityChunk"]>>;

      try {
        result = await this.openAI.scanSecurityChunk({
          chunk,
          prompt,
        });
      } catch (error) {
        const logDetails = {
          ...this.createAiUnavailableLogDetails(error),
          projectId: input.projectId,
          scanId: input.scanId,
        };

        if (this.isExpectedAiFallback(error)) {
          logger.info("AI security scan unavailable; continuing with non-AI scan results.", logDetails);
        } else {
          logger.warn("AI security scan unavailable; continuing with non-AI scan results.", logDetails);
        }

        this.publishScanProgress(
          input.scanId,
          ScanStatus.AI_SCANNING,
          "AI unavailable; continuing with rule-based scan",
          Math.max(80, percentage),
          currentFile,
        );

        return findings;
      }

      if (await this.isCancelled(input.scanId)) {
        return findings;
      }

      findings.push(...result.findings);
      this.publishScanProgress(
        input.scanId,
        ScanStatus.AI_SCANNING,
        "Completed AI chunk",
        65 + Math.round(((index + 1) / totalChunks) * 20),
        currentFile,
      );
    }

    return findings;
  }

  private isExpectedAiFallback(error: unknown): boolean {
    return (
      error instanceof ApiError &&
      ["OPENAI_INVALID_API_KEY", "OPENAI_QUOTA_EXCEEDED", "OPENAI_NOT_CONFIGURED", "OPENAI_TIMEOUT"].includes(error.code)
    );
  }

  private createAiUnavailableLogDetails(error: unknown): Record<string, unknown> {
    if (error instanceof ApiError) {
      return {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      };
    }

    if (error instanceof Error) {
      return {
        errorName: error.name,
        message: this.redactSensitiveText(error.message),
      };
    }

    return {
      errorName: "UnknownError",
    };
  }

  private redactSensitiveText(value: string): string {
    return value.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***");
  }

  private applyDemoFindingsIfNeeded(input: {
    repositoryIndex: Awaited<ReturnType<FileIndexerService["indexRepository"]>>;
    findings: SecurityFinding[];
  }): SecurityFinding[] {
    if (!environment.demo.enabled || !environment.demo.findingsEnabled || input.findings.length > 0) {
      return input.findings;
    }

    const demoFindings = createDemoSecurityFindings(input.repositoryIndex);

    if (demoFindings.length > 0) {
      logger.info("Demo mode added sample security findings for an empty scan result.", {
        demoFindings: demoFindings.length,
      });
    }

    return demoFindings;
  }

  private async loadChunkFileContents(chunk: RepositoryChunk): Promise<PromptFileContent[]> {
    const files: PromptFileContent[] = [];

    for (const file of chunk.files) {
      const content = await this.readFileContent(file.absolutePath);

      if (content.length === 0) {
        continue;
      }

      files.push({
        relativePath: file.relativePath,
        content,
      });
    }

    return files;
  }

  private async readFileContent(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, "utf8");
    } catch {
      return "";
    }
  }

  private dedupeFindings(findings: SecurityFinding[]): SecurityFinding[] {
    const seen = new Set<string>();
    const dedupedFindings: SecurityFinding[] = [];

    for (const finding of findings) {
      const key = `${finding.severity}:${finding.title}:${finding.file}:${finding.line}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      dedupedFindings.push(finding);
    }

    return dedupedFindings.sort((left, right) => {
      const severityComparison = this.getSeverityRank(right.severity) - this.getSeverityRank(left.severity);

      if (severityComparison !== 0) {
        return severityComparison;
      }

      const fileComparison = left.file.localeCompare(right.file);

      if (fileComparison !== 0) {
        return fileComparison;
      }

      return left.line - right.line;
    });
  }

  private summarizeFindings(filesScanned: number, findings: SecurityFinding[]): SecurityScanSummary {
    return {
      filesScanned,
      findings: findings.length,
      critical: findings.filter((finding) => finding.severity === "CRITICAL").length,
      high: findings.filter((finding) => finding.severity === "HIGH").length,
      medium: findings.filter((finding) => finding.severity === "MEDIUM").length,
      low: findings.filter((finding) => finding.severity === "LOW").length,
    };
  }

  private getSeverityRank(severity: SecurityFinding["severity"]): number {
    const ranks: Record<SecurityFinding["severity"], number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return ranks[severity];
  }

  private publishScanProgress(
    scanId: string,
    status: ScanStatus,
    currentStep: string,
    percentage: number,
    currentFile: string | null = null,
  ): void {
    this.progress.publish({
      scanId,
      status,
      currentStep,
      currentFile,
      percentage,
    });
  }

  private isActiveStatus(status: ScanStatus): boolean {
    return ACTIVE_SCAN_STATUSES.includes(status as (typeof ACTIVE_SCAN_STATUSES)[number]);
  }

  private calculateElapsedMs(scan: Scan, completedAt: Date): number {
    return completedAt.getTime() - (scan.startedAt ?? scan.createdAt).getTime();
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}

export const scanService = new ScanService(
  projectRepository,
  uploadRepository,
  githubImportRepository,
  scanRepository,
  repositoryParserService,
  fileIndexerService,
  ruleBasedSecurityScannerService,
  chunkGeneratorService,
  aiPromptBuilderService,
  openAIService,
  findingRepository,
  scanProgressService,
);
