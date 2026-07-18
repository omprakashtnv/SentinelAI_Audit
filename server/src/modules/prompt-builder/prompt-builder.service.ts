import type { RepositoryChunk, RepositoryChunkPlan } from "../chunk-generator";
import type { IndexedRepositoryFile, RepositoryIndex } from "../file-indexer";
import type { SecurityFinding } from "../rule-based-scanner";
import {
  DEFAULT_MAX_CHUNK_PLAN_ENTRIES,
  DEFAULT_MAX_FILE_CONTENT_CHARS,
  DEFAULT_MAX_FILE_METADATA_ENTRIES,
  DEFAULT_MAX_REPOSITORY_TREE_ENTRIES,
} from "./prompt-builder.constants";
import type {
  BasePromptInput,
  CodeExplanationPromptInput,
  PatchGenerationPromptInput,
  PromptBuilderOptions,
  PromptFileContent,
  PromptProjectContext,
  ReportGenerationPromptInput,
  SecurityScanPromptInput,
} from "./prompt-builder.types";

type TreeNode = {
  children: Map<string, TreeNode>;
  isFile: boolean;
};

type ResolvedPromptOptions = Required<PromptBuilderOptions>;

export class AiPromptBuilderService {
  public buildSecurityScanPrompt(input: SecurityScanPromptInput): string {
    const sections = [
      this.formatHeader("Security Scan"),
      this.formatInstructions([
        "Act as a senior application security auditor.",
        "Analyze the provided repository context and source files for concrete security vulnerabilities.",
        "Prioritize exploitable findings over style concerns.",
        "Do not invent files, dependencies, routes, or vulnerabilities not supported by the supplied context.",
      ]),
      this.formatSharedContext(input),
      this.formatScanFocus(input.scanFocus),
      this.formatSelectedChunk(input.chunk),
      this.formatFileContents(input.files, input.options),
      this.formatExpectedOutput([
        "Return JSON only with a findings array.",
        "Each finding must include severity, title, description, file, line, owasp, recommendation, and confidence.",
        "Do not return markdown, code fences, prose, or fields outside the required schema.",
      ]),
    ];

    return this.cleanPrompt(sections);
  }

  public buildPatchGenerationPrompt(input: PatchGenerationPromptInput): string {
    const sections = [
      this.formatHeader("Patch Generation"),
      this.formatInstructions([
        "Act as a principal software engineer producing minimal secure patches.",
        "Generate fixes only for the supplied findings and source files.",
        "Preserve existing architecture, naming conventions, error handling, and public contracts.",
        "Avoid unrelated refactors.",
      ]),
      this.formatSharedContext(input),
      this.formatFindings(input.findings),
      this.formatConstraints(input.constraints),
      this.formatFileContents(input.files, input.options),
      this.formatExpectedOutput([
        "Return a concise patch plan followed by file-by-file code changes.",
        "Explain why each change mitigates the finding.",
        "Call out any required tests or migrations.",
      ]),
    ];

    return this.cleanPrompt(sections);
  }

  public buildReportGenerationPrompt(input: ReportGenerationPromptInput): string {
    const sections = [
      this.formatHeader("Report Generation"),
      this.formatInstructions([
        "Act as a professional security auditor writing a client-ready report.",
        "Use only the supplied project context, repository metadata, chunks, and findings.",
        "Separate business risk from engineering remediation details.",
      ]),
      this.formatSharedContext(input),
      this.formatAudience(input.audience),
      this.formatFindings(input.findings),
      this.formatExpectedOutput([
        "Return an executive summary, scope, methodology, risk overview, detailed findings, remediation roadmap, and appendix.",
        "Include severity counts and OWASP references.",
        "Keep the language precise, evidence-based, and suitable for a SaaS audit report.",
      ]),
    ];

    return this.cleanPrompt(sections);
  }

  public buildCodeExplanationPrompt(input: CodeExplanationPromptInput): string {
    const sections = [
      this.formatHeader("Code Explanation"),
      this.formatInstructions([
        "Act as a senior engineer explaining code clearly and accurately.",
        "Use repository context to explain how the target file fits into the system.",
        "Do not speculate beyond the supplied source and metadata.",
      ]),
      this.formatSharedContext(input),
      this.formatTargetFile(input),
      this.formatQuestion(input.question),
      this.formatExpectedOutput([
        "Explain the file purpose, main responsibilities, important flows, dependencies, and security-relevant behavior.",
        "Mention assumptions or missing context explicitly.",
      ]),
    ];

    return this.cleanPrompt(sections);
  }

  private formatSharedContext(input: BasePromptInput): string {
    return this.cleanPrompt([
      this.formatProjectContext(input.project),
      this.formatRepositorySummary(input.repositoryIndex),
      this.formatRepositoryTree(input.repositoryIndex, input.options),
      this.formatFileMetadata(input.repositoryIndex.files, input.options),
      this.formatChunkPlan(input.chunkPlan, input.options),
    ]);
  }

  private formatHeader(title: string): string {
    return `# ${title} Prompt`;
  }

  private formatInstructions(instructions: string[]): string {
    return this.formatSection("Instructions", instructions.map((instruction) => `- ${instruction}`).join("\n"));
  }

  private formatProjectContext(project: PromptProjectContext): string {
    const rows = [
      `Name: ${project.name}`,
      project.projectId ? `Project ID: ${project.projectId}` : null,
      project.description ? `Description: ${project.description}` : null,
      project.repositoryUrl ? `Repository URL: ${project.repositoryUrl}` : null,
      project.repositorySource ? `Repository Source: ${project.repositorySource}` : null,
      project.defaultBranch ? `Default Branch: ${project.defaultBranch}` : null,
      project.techStack?.length ? `Tech Stack: ${project.techStack.join(", ")}` : null,
    ].filter((row): row is string => row !== null);

    return this.formatSection("Project Context", rows.join("\n"));
  }

  private formatRepositorySummary(repositoryIndex: RepositoryIndex): string {
    const rows = [
      `Repository Root: ${repositoryIndex.rootPath}`,
      `Indexed At: ${repositoryIndex.indexedAt}`,
      `Indexed Files: ${repositoryIndex.summary.indexedFiles}`,
      `Discovered Files: ${repositoryIndex.summary.totalFilesDiscovered}`,
      `Skipped Entries: ${repositoryIndex.summary.skippedEntries}`,
      `Indexed Bytes: ${repositoryIndex.summary.totalIndexedBytes}`,
    ];

    return this.formatSection("Repository Summary", rows.join("\n"));
  }

  private formatRepositoryTree(repositoryIndex: RepositoryIndex, options?: PromptBuilderOptions): string {
    const resolvedOptions = this.resolveOptions(options);
    const tree = this.createRepositoryTree(repositoryIndex.files);
    const lines = this.renderTree(tree, "", resolvedOptions.maxRepositoryTreeEntries);
    const omittedCount = Math.max(0, repositoryIndex.files.length - resolvedOptions.maxRepositoryTreeEntries);
    const body = omittedCount > 0 ? `${lines.join("\n")}\n... omitted ${omittedCount} additional files` : lines.join("\n");

    return this.formatSection("Repository Structure", body || "(empty)");
  }

  private formatFileMetadata(files: IndexedRepositoryFile[], options?: PromptBuilderOptions): string {
    const resolvedOptions = this.resolveOptions(options);
    const visibleFiles = files.slice(0, resolvedOptions.maxFileMetadataEntries);
    const lines = visibleFiles.map((file) => {
      const absolutePath = resolvedOptions.includeAbsolutePaths ? ` | absolute=${file.absolutePath}` : "";

      return [
        `- path=${file.relativePath}`,
        `language=${file.language}`,
        `extension=${file.extension}`,
        `sizeBytes=${file.sizeBytes}`,
        `lines=${file.lineCount}`,
        `sha256=${file.sha256}`,
        `modified=${file.lastModifiedAt}${absolutePath}`,
      ].join(" | ");
    });
    const omittedCount = Math.max(0, files.length - visibleFiles.length);

    if (omittedCount > 0) {
      lines.push(`... omitted ${omittedCount} additional file metadata entries`);
    }

    return this.formatSection("File Metadata", lines.join("\n") || "(empty)");
  }

  private formatChunkPlan(chunkPlan: RepositoryChunkPlan | undefined, options?: PromptBuilderOptions): string {
    if (!chunkPlan) {
      return this.formatSection("Chunk Information", "No chunk plan supplied.");
    }

    const resolvedOptions = this.resolveOptions(options);
    const visibleChunks = chunkPlan.chunks.slice(0, resolvedOptions.maxChunkPlanEntries);
    const omittedCount = Math.max(0, chunkPlan.chunks.length - visibleChunks.length);
    const chunkLines = visibleChunks.map((chunk) => this.formatChunkSummary(chunk));

    if (omittedCount > 0) {
      chunkLines.push(`... omitted ${omittedCount} additional chunks`);
    }

    const body = [
      `Generated At: ${chunkPlan.generatedAt}`,
      `Repository Root: ${chunkPlan.repositoryRoot}`,
      `Total Chunks: ${chunkPlan.summary.totalChunks}`,
      `Total Estimated Tokens: ${chunkPlan.summary.estimatedTokenCount}`,
      `Max Tokens Per Chunk: ${chunkPlan.summary.maxTokens}`,
      `Oversized Files: ${chunkPlan.summary.oversizedFiles}`,
      "",
      chunkLines.join("\n"),
    ].join("\n");

    return this.formatSection("Chunk Information", body);
  }

  private formatSelectedChunk(chunk: RepositoryChunk | undefined): string {
    if (!chunk) {
      return this.formatSection("Selected Chunk", "No specific chunk supplied. Use the full repository context.");
    }

    const files = chunk.files
      .map((file) => `- ${file.relativePath} (${file.role}, ${file.language}, ${file.estimatedTokenCount} tokens)`)
      .join("\n");

    return this.formatSection("Selected Chunk", `${this.formatChunkSummary(chunk)}\nFiles:\n${files}`);
  }

  private formatChunkSummary(chunk: RepositoryChunk): string {
    const fileList = chunk.files.map((file) => file.relativePath).join(", ");

    return [
      `- id=${chunk.chunkId}`,
      `priority=${chunk.priority}`,
      `language=${chunk.language}`,
      `estimatedTokens=${chunk.estimatedTokenCount}`,
      `files=[${fileList}]`,
    ].join(" | ");
  }

  private formatFileContents(files: PromptFileContent[] | undefined, options?: PromptBuilderOptions): string {
    if (!files?.length) {
      return this.formatSection("Source Files", "No source file contents supplied.");
    }

    const resolvedOptions = this.resolveOptions(options);
    const blocks = files.map((file) => {
      const content = this.truncate(file.content, resolvedOptions.maxFileContentChars);

      return [`File: ${file.relativePath}`, "```", content, "```"].join("\n");
    });

    return this.formatSection("Source Files", blocks.join("\n\n"));
  }

  private formatFindings(findings: SecurityFinding[]): string {
    if (findings.length === 0) {
      return this.formatSection("Security Findings", "No findings supplied.");
    }

    const body = findings
      .map((finding, index) =>
        [
          `${index + 1}. ${finding.title}`,
          `   Rule: ${finding.ruleId}`,
          `   Severity: ${finding.severity}`,
          `   File: ${finding.file}:${finding.line}`,
          `   Category: ${finding.category}`,
          `   OWASP: ${finding.owasp}`,
          `   Confidence: ${finding.confidence}`,
          `   Description: ${finding.description}`,
        ].join("\n"),
      )
      .join("\n\n");

    return this.formatSection("Security Findings", body);
  }

  private formatScanFocus(scanFocus: string[] | undefined): string {
    if (!scanFocus?.length) {
      return this.formatSection("Scan Focus", "Full security review across the supplied repository context.");
    }

    return this.formatSection("Scan Focus", scanFocus.map((focus) => `- ${focus}`).join("\n"));
  }

  private formatConstraints(constraints: string[] | undefined): string {
    if (!constraints?.length) {
      return this.formatSection("Patch Constraints", "Use minimal, production-ready changes that fit the existing codebase.");
    }

    return this.formatSection("Patch Constraints", constraints.map((constraint) => `- ${constraint}`).join("\n"));
  }

  private formatAudience(audience: ReportGenerationPromptInput["audience"]): string {
    return this.formatSection("Report Audience", audience ?? "engineering");
  }

  private formatTargetFile(input: CodeExplanationPromptInput): string {
    const metadata = input.targetFileMetadata
      ? [
          `Language: ${input.targetFileMetadata.language}`,
          `Extension: ${input.targetFileMetadata.extension}`,
          `Size Bytes: ${input.targetFileMetadata.sizeBytes}`,
          `Lines: ${input.targetFileMetadata.lineCount}`,
          `SHA256: ${input.targetFileMetadata.sha256}`,
          `Last Modified: ${input.targetFileMetadata.lastModifiedAt}`,
        ].join("\n")
      : "No target file metadata supplied.";
    const content = this.truncate(input.targetFile.content, this.resolveOptions(input.options).maxFileContentChars);

    return this.formatSection(
      "Target File",
      [`Path: ${input.targetFile.relativePath}`, metadata, "Source:", "```", content, "```"].join("\n"),
    );
  }

  private formatQuestion(question: string | undefined): string {
    return this.formatSection("Question", question ?? "Explain this code and its role in the repository.");
  }

  private formatExpectedOutput(requirements: string[]): string {
    return this.formatSection("Expected Output", requirements.map((requirement) => `- ${requirement}`).join("\n"));
  }

  private formatSection(title: string, body: string): string {
    return `## ${title}\n${body}`;
  }

  private createRepositoryTree(files: IndexedRepositoryFile[]): TreeNode {
    const root: TreeNode = {
      children: new Map<string, TreeNode>(),
      isFile: false,
    };

    for (const file of files) {
      const segments = file.relativePath.split(/[\\/]/).filter(Boolean);
      let currentNode = root;

      segments.forEach((segment, index) => {
        const existingNode = currentNode.children.get(segment);
        const childNode =
          existingNode ??
          ({
            children: new Map<string, TreeNode>(),
            isFile: index === segments.length - 1,
          } satisfies TreeNode);

        if (!existingNode) {
          currentNode.children.set(segment, childNode);
        }

        currentNode = childNode;
      });
    }

    return root;
  }

  private renderTree(root: TreeNode, prefix: string, maxEntries: number): string[] {
    const lines: string[] = [];
    const entries = [...root.children.entries()].sort(([leftName, leftNode], [rightName, rightNode]) => {
      if (leftNode.isFile !== rightNode.isFile) {
        return leftNode.isFile ? 1 : -1;
      }

      return leftName.localeCompare(rightName);
    });

    for (const [name, node] of entries) {
      if (lines.length >= maxEntries) {
        break;
      }

      lines.push(`${prefix}${node.isFile ? "- " : "+ "}${name}`);

      if (!node.isFile && lines.length < maxEntries) {
        const childLines = this.renderTree(node, `${prefix}  `, maxEntries - lines.length);
        lines.push(...childLines);
      }
    }

    return lines;
  }

  private truncate(value: string, maxChars: number): string {
    if (value.length <= maxChars) {
      return value;
    }

    return `${value.slice(0, maxChars)}\n[truncated ${value.length - maxChars} characters]`;
  }

  private resolveOptions(options: PromptBuilderOptions | undefined): ResolvedPromptOptions {
    return {
      maxRepositoryTreeEntries: Math.max(1, options?.maxRepositoryTreeEntries ?? DEFAULT_MAX_REPOSITORY_TREE_ENTRIES),
      maxFileMetadataEntries: Math.max(1, options?.maxFileMetadataEntries ?? DEFAULT_MAX_FILE_METADATA_ENTRIES),
      maxFileContentChars: Math.max(1, options?.maxFileContentChars ?? DEFAULT_MAX_FILE_CONTENT_CHARS),
      maxChunkPlanEntries: Math.max(1, options?.maxChunkPlanEntries ?? DEFAULT_MAX_CHUNK_PLAN_ENTRIES),
      includeAbsolutePaths: options?.includeAbsolutePaths ?? false,
    };
  }

  private cleanPrompt(sections: Array<string | null | undefined>): string {
    return sections
      .filter((section): section is string => Boolean(section?.trim()))
      .map((section) => section.trim())
      .join("\n\n")
      .replace(/\r\n/g, "\n")
      .trim();
  }
}

export const aiPromptBuilderService = new AiPromptBuilderService();
