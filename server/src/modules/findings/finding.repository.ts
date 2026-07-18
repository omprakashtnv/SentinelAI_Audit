import { FindingSeverity, FindingStatus, Prisma, type Finding } from "@prisma/client";

import { prisma } from "../../db";
import type { SecurityFinding } from "../rule-based-scanner";
import type { CreateFindingInput, GetFindingsQuery, UpdateFindingInput } from "./finding.schemas";

const FINDING_SEVERITIES = [
  FindingSeverity.CRITICAL,
  FindingSeverity.HIGH,
  FindingSeverity.MEDIUM,
  FindingSeverity.LOW,
  FindingSeverity.INFO,
] as const;

const FINDING_STATUSES = [FindingStatus.OPEN, FindingStatus.DISMISSED, FindingStatus.RESOLVED] as const;

export type FindingListRepositoryResult = {
  findings: Finding[];
  total: number;
  summary: {
    total: number;
    bySeverity: Record<FindingSeverity, number>;
    byOpenSeverity: Record<FindingSeverity, number>;
    byStatus: Record<FindingStatus, number>;
  };
};

export class FindingRepository {
  public create(projectId: string, input: CreateFindingInput): Promise<Finding> {
    return prisma.finding.create({
      data: {
        projectId,
        scanId: input.scanId,
        ruleId: input.ruleId,
        severity: input.severity,
        title: input.title,
        description: input.description,
        file: input.file,
        line: input.line,
        category: input.category,
        owasp: input.owasp,
        recommendation: input.recommendation,
        confidence: input.confidence,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  }

  public async createManyFromSecurityFindings(input: {
    projectId: string;
    scanId: string;
    findings: SecurityFinding[];
  }): Promise<void> {
    if (input.findings.length === 0) {
      return;
    }

    await prisma.finding.createMany({
      data: input.findings.map((finding) => ({
        projectId: input.projectId,
        scanId: input.scanId,
        ruleId: finding.ruleId,
        severity: this.toFindingSeverity(finding.severity),
        title: finding.title.slice(0, 180),
        description: finding.description,
        file: finding.file,
        line: Math.max(1, finding.line),
        category: finding.category,
        owasp: finding.owasp,
        recommendation: finding.recommendation,
        confidence: finding.confidence,
        metadata: {},
      })),
    });
  }

  public async findManyByProjectAndOwner(
    projectId: string,
    ownerId: string,
    query: GetFindingsQuery,
  ): Promise<FindingListRepositoryResult> {
    const where = this.buildListWhere(projectId, ownerId, query);
    const skip = (query.page - 1) * query.limit;
    const severityCountQueries = FINDING_SEVERITIES.map((severity) =>
      prisma.finding.count({ where: { AND: [where, { severity }] } }),
    );
    const openSeverityCountQueries = FINDING_SEVERITIES.map((severity) =>
      prisma.finding.count({ where: { AND: [where, { severity }, { status: FindingStatus.OPEN }] } }),
    );
    const statusCountQueries = FINDING_STATUSES.map((status) =>
      prisma.finding.count({ where: { AND: [where, { status }] } }),
    );

    const [findings, total, ...summaryCounts] = await prisma.$transaction([
      prisma.finding.findMany({
        where,
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        skip,
        take: query.limit,
      }),
      prisma.finding.count({ where }),
      ...severityCountQueries,
      ...openSeverityCountQueries,
      ...statusCountQueries,
    ]);
    const severityCounts = summaryCounts.slice(0, FINDING_SEVERITIES.length);
    const openSeverityCounts = summaryCounts.slice(
      FINDING_SEVERITIES.length,
      FINDING_SEVERITIES.length * 2,
    );
    const statusCounts = summaryCounts.slice(FINDING_SEVERITIES.length * 2);

    return {
      findings,
      total,
      summary: {
        total,
        bySeverity: this.toSeverityCounts(severityCounts),
        byOpenSeverity: this.toSeverityCounts(openSeverityCounts),
        byStatus: this.toStatusCounts(statusCounts),
      },
    };
  }

  public findByIdProjectAndOwner(findingId: string, projectId: string, ownerId: string): Promise<Finding | null> {
    return prisma.finding.findFirst({
      where: {
        id: findingId,
        projectId,
        deletedAt: null,
        project: {
          ownerId,
          deletedAt: null,
        },
      },
    });
  }

  public async updateByIdProjectAndOwner(
    findingId: string,
    projectId: string,
    ownerId: string,
    input: UpdateFindingInput,
  ): Promise<Finding | null> {
    const result = await prisma.finding.updateMany({
      where: {
        id: findingId,
        projectId,
        deletedAt: null,
        project: {
          ownerId,
          deletedAt: null,
        },
      },
      data: {
        ruleId: input.ruleId,
        severity: input.severity,
        title: input.title,
        description: input.description,
        file: input.file,
        line: input.line,
        category: input.category,
        owasp: input.owasp,
        recommendation: input.recommendation,
        confidence: input.confidence,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findByIdProjectAndOwner(findingId, projectId, ownerId);
  }

  public async markDismissed(findingId: string, projectId: string, ownerId: string): Promise<Finding | null> {
    return this.setStatus(findingId, projectId, ownerId, FindingStatus.DISMISSED);
  }

  public async markResolved(findingId: string, projectId: string, ownerId: string): Promise<Finding | null> {
    return this.setStatus(findingId, projectId, ownerId, FindingStatus.RESOLVED);
  }

  public async softDelete(findingId: string, projectId: string, ownerId: string): Promise<boolean> {
    const result = await prisma.finding.updateMany({
      where: {
        id: findingId,
        projectId,
        deletedAt: null,
        project: {
          ownerId,
          deletedAt: null,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return result.count === 1;
  }

  private async setStatus(
    findingId: string,
    projectId: string,
    ownerId: string,
    status: FindingStatus,
  ): Promise<Finding | null> {
    const now = new Date();
    const result = await prisma.finding.updateMany({
      where: {
        id: findingId,
        projectId,
        deletedAt: null,
        project: {
          ownerId,
          deletedAt: null,
        },
      },
      data: {
        status,
        dismissedAt: status === FindingStatus.DISMISSED ? now : null,
        resolvedAt: status === FindingStatus.RESOLVED ? now : null,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findByIdProjectAndOwner(findingId, projectId, ownerId);
  }

  private toFindingSeverity(severity: SecurityFinding["severity"]): FindingSeverity {
    return FindingSeverity[severity];
  }

  private buildListWhere(
    projectId: string,
    ownerId: string,
    query: GetFindingsQuery,
  ): Prisma.FindingWhereInput {
    return {
      projectId,
      deletedAt: null,
      project: {
        ownerId,
        deletedAt: null,
      },
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.scanId ? { scanId: query.scanId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.owasp ? { owasp: query.owasp } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
              { file: { contains: query.search, mode: "insensitive" } },
              { category: { contains: query.search, mode: "insensitive" } },
              { owasp: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  }

  private toSeverityCounts(counts: number[]): Record<FindingSeverity, number> {
    return {
      [FindingSeverity.CRITICAL]: counts[0] ?? 0,
      [FindingSeverity.HIGH]: counts[1] ?? 0,
      [FindingSeverity.MEDIUM]: counts[2] ?? 0,
      [FindingSeverity.LOW]: counts[3] ?? 0,
      [FindingSeverity.INFO]: counts[4] ?? 0,
    };
  }

  private toStatusCounts(counts: number[]): Record<FindingStatus, number> {
    return {
      [FindingStatus.OPEN]: counts[0] ?? 0,
      [FindingStatus.DISMISSED]: counts[1] ?? 0,
      [FindingStatus.RESOLVED]: counts[2] ?? 0,
    };
  }
}

export const findingRepository = new FindingRepository();
