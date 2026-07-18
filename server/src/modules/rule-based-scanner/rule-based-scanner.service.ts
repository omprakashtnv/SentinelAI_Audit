import fs from "node:fs/promises";
import path from "node:path";

import type { RepositoryIndex } from "../file-indexer";
import { defaultSecurityRules } from "./default-security-rules";
import type {
  RuleBasedScannerOptions,
  RuleBasedSecurityScanResult,
  SecurityFinding,
  SecurityRule,
  SecurityRuleContext,
  SecuritySourceFile,
} from "./rule-based-scanner.types";

export class RuleBasedSecurityScannerService {
  public constructor(private readonly defaultRules: SecurityRule[] = defaultSecurityRules) {}

  public async scanRepository(
    repositoryIndex: RepositoryIndex,
    options: RuleBasedScannerOptions = {},
  ): Promise<RuleBasedSecurityScanResult> {
    const files = await this.loadSourceFiles(repositoryIndex);
    const context: SecurityRuleContext = {
      repositoryIndex,
      files,
    };
    const rules = options.rules ?? this.defaultRules;
    const findings = this.sortFindings(this.dedupeFindings(rules.flatMap((rule) => rule.scan(context))));

    return {
      scannedAt: new Date().toISOString(),
      findings,
      summary: {
        filesScanned: files.length,
        findings: findings.length,
        critical: findings.filter((finding) => finding.severity === "CRITICAL").length,
        high: findings.filter((finding) => finding.severity === "HIGH").length,
        medium: findings.filter((finding) => finding.severity === "MEDIUM").length,
        low: findings.filter((finding) => finding.severity === "LOW").length,
      },
    };
  }

  private async loadSourceFiles(repositoryIndex: RepositoryIndex): Promise<SecuritySourceFile[]> {
    const files: SecuritySourceFile[] = [];

    for (const file of repositoryIndex.files) {
      if (!this.isPathInsideRoot(repositoryIndex.rootPath, file.absolutePath)) {
        continue;
      }

      const content = await this.safeReadTextFile(file.absolutePath);

      if (content === null) {
        continue;
      }

      files.push({
        metadata: file,
        content,
        lines: content.split(/\r?\n/),
      });
    }

    return files;
  }

  private async safeReadTextFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, "utf8");
    } catch {
      return null;
    }
  }

  private isPathInsideRoot(rootPath: string, targetPath: string): boolean {
    const relativePath = path.relative(rootPath, targetPath);

    return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
  }

  private dedupeFindings(findings: SecurityFinding[]): SecurityFinding[] {
    const seen = new Set<string>();
    const dedupedFindings: SecurityFinding[] = [];

    for (const finding of findings) {
      const key = `${finding.ruleId}:${finding.file}:${finding.line}:${finding.title}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      dedupedFindings.push(finding);
    }

    return dedupedFindings;
  }

  private sortFindings(findings: SecurityFinding[]): SecurityFinding[] {
    return [...findings].sort((left, right) => {
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

  private getSeverityRank(severity: SecurityFinding["severity"]): number {
    const ranks: Record<SecurityFinding["severity"], number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return ranks[severity];
  }
}

export const ruleBasedSecurityScannerService = new RuleBasedSecurityScannerService();
