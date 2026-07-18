import { ApiError } from "../../shared/errors/api-error";
import { findingExplanationService, FindingExplanationService, type FindingExplanation } from "../finding-explanation";
import { ProjectRepository, projectRepository } from "../projects/project.repository";
import { ScanRepository, scanRepository } from "../scans/scan.repository";
import { FindingRepository, findingRepository } from "./finding.repository";
import type { CreateFindingInput, GetFindingsQuery, UpdateFindingInput } from "./finding.schemas";
import { toPublicFinding, type FindingListResult, type PublicFinding } from "./finding.types";

export class FindingService {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly scans: ScanRepository,
    private readonly findings: FindingRepository,
    private readonly explanations: FindingExplanationService,
  ) {}

  public async createFinding(ownerId: string, projectId: string, input: CreateFindingInput): Promise<PublicFinding> {
    await this.ensureProjectOwnership(projectId, ownerId);

    if (input.scanId) {
      await this.ensureScanOwnership(input.scanId, projectId, ownerId);
    }

    const finding = await this.findings.create(projectId, input);

    return toPublicFinding(finding);
  }

  public async getFindings(ownerId: string, projectId: string, query: GetFindingsQuery): Promise<FindingListResult> {
    await this.ensureProjectOwnership(projectId, ownerId);
    const result = await this.findings.findManyByProjectAndOwner(projectId, ownerId, query);

    return {
      findings: result.findings.map(toPublicFinding),
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
      },
    };
  }

  public async getFinding(ownerId: string, projectId: string, findingId: string): Promise<PublicFinding> {
    const finding = await this.findings.findByIdProjectAndOwner(findingId, projectId, ownerId);

    if (!finding) {
      throw this.notFound();
    }

    return toPublicFinding(finding);
  }

  public async getFindingExplanation(
    ownerId: string,
    projectId: string,
    findingId: string,
  ): Promise<FindingExplanation> {
    const finding = await this.getFinding(ownerId, projectId, findingId);

    return this.explanations.explain(finding);
  }

  public async updateFinding(
    ownerId: string,
    projectId: string,
    findingId: string,
    input: UpdateFindingInput,
  ): Promise<PublicFinding> {
    await this.ensureProjectOwnership(projectId, ownerId);
    const finding = await this.findings.updateByIdProjectAndOwner(findingId, projectId, ownerId, input);

    if (!finding) {
      throw this.notFound();
    }

    return toPublicFinding(finding);
  }

  public async dismissFinding(ownerId: string, projectId: string, findingId: string): Promise<PublicFinding> {
    const finding = await this.findings.markDismissed(findingId, projectId, ownerId);

    if (!finding) {
      throw this.notFound();
    }

    return toPublicFinding(finding);
  }

  public async resolveFinding(ownerId: string, projectId: string, findingId: string): Promise<PublicFinding> {
    const finding = await this.findings.markResolved(findingId, projectId, ownerId);

    if (!finding) {
      throw this.notFound();
    }

    return toPublicFinding(finding);
  }

  public async deleteFinding(ownerId: string, projectId: string, findingId: string): Promise<void> {
    const deleted = await this.findings.softDelete(findingId, projectId, ownerId);

    if (!deleted) {
      throw this.notFound();
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

  private async ensureScanOwnership(scanId: string, projectId: string, ownerId: string): Promise<void> {
    const scan = await this.scans.findByIdProjectAndOwner(scanId, projectId, ownerId);

    if (!scan) {
      throw new ApiError({
        statusCode: 404,
        code: "SCAN_NOT_FOUND",
        message: "Scan was not found.",
      });
    }
  }

  private notFound(): ApiError {
    return new ApiError({
      statusCode: 404,
      code: "FINDING_NOT_FOUND",
      message: "Finding was not found.",
    });
  }
}

export const findingService = new FindingService(
  projectRepository,
  scanRepository,
  findingRepository,
  findingExplanationService,
);
