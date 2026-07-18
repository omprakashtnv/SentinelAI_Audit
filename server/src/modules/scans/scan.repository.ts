import { Prisma, ScanStatus, type Scan } from "@prisma/client";

import { prisma } from "../../db";
import type { SecurityFinding, SecurityScanSummary } from "../rule-based-scanner";
import { ACTIVE_SCAN_STATUSES } from "./scan.constants";
import type { ScanListQuery } from "./scan.schemas";

export type ScanCreateData = {
  projectId: string;
  requestedByUserId: string;
  retryOfScanId?: string;
  attempt?: number;
  sourceType: string;
  sourceRef: string;
};

export type ScanSummaryData = {
  totalFilesDiscovered: number;
  parsedFiles: number;
  skippedFiles: number;
  totalParsedBytes: number;
};

export class ScanRepository {
  public create(data: ScanCreateData): Promise<Scan> {
    return prisma.scan.create({
      data: {
        projectId: data.projectId,
        requestedByUserId: data.requestedByUserId,
        retryOfScanId: data.retryOfScanId,
        attempt: data.attempt,
        sourceType: data.sourceType,
        sourceRef: data.sourceRef,
      },
    });
  }

  public findActiveByProject(projectId: string): Promise<Scan | null> {
    return prisma.scan.findFirst({
      where: {
        projectId,
        status: {
          in: [...ACTIVE_SCAN_STATUSES],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  public findById(scanId: string): Promise<Scan | null> {
    return prisma.scan.findUnique({
      where: { id: scanId },
    });
  }

  public findByIdProjectAndOwner(scanId: string, projectId: string, ownerId: string): Promise<Scan | null> {
    return prisma.scan.findFirst({
      where: {
        id: scanId,
        projectId,
        project: {
          ownerId,
          deletedAt: null,
        },
      },
    });
  }

  public async findManyByProjectAndOwner(
    projectId: string,
    ownerId: string,
    query: ScanListQuery,
  ): Promise<{ scans: Scan[]; total: number }> {
    const where: Prisma.ScanWhereInput = {
      projectId,
      project: {
        ownerId,
        deletedAt: null,
      },
    };
    const skip = (query.page - 1) * query.limit;

    const [scans, total] = await prisma.$transaction([
      prisma.scan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.limit,
      }),
      prisma.scan.count({ where }),
    ]);

    return { scans, total };
  }

  public async markStarted(scanId: string): Promise<Scan | null> {
    const result = await prisma.scan.updateMany({
      where: {
        id: scanId,
        status: ScanStatus.QUEUED,
      },
      data: {
        status: ScanStatus.PARSING,
        progress: 10,
        startedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return this.findById(scanId);
    }

    return this.findById(scanId);
  }

  public async updateStatus(scanId: string, status: ScanStatus, progress: number): Promise<Scan | null> {
    const result = await prisma.scan.updateMany({
      where: {
        id: scanId,
        status: {
          in: [...ACTIVE_SCAN_STATUSES],
        },
      },
      data: {
        status,
        progress,
      },
    });

    if (result.count === 0) {
      return this.findById(scanId);
    }

    return this.findById(scanId);
  }

  public async markProcessingResults(scanId: string, progress: number): Promise<Scan | null> {
    const result = await prisma.scan.updateMany({
      where: {
        id: scanId,
        status: {
          in: [...ACTIVE_SCAN_STATUSES],
        },
      },
      data: {
        status: ScanStatus.PROCESSING_RESULTS,
        progress,
      },
    });

    if (result.count === 0) {
      return this.findById(scanId);
    }

    return this.findById(scanId);
  }

  public async markCompletedWithSecurityResults(input: {
    scanId: string;
    summary: ScanSummaryData;
    securityFindings: SecurityFinding[];
    securitySummary: SecurityScanSummary;
    completedAt: Date;
    elapsedMs: number;
  }): Promise<Scan | null> {
    const result = await prisma.scan.updateMany({
      where: {
        id: input.scanId,
        status: {
          in: [...ACTIVE_SCAN_STATUSES],
        },
      },
      data: {
        status: ScanStatus.COMPLETED,
        progress: 100,
        totalFilesDiscovered: input.summary.totalFilesDiscovered,
        parsedFiles: input.summary.parsedFiles,
        skippedFiles: input.summary.skippedFiles,
        totalParsedBytes: input.summary.totalParsedBytes,
        securityFindings: input.securityFindings as unknown as Prisma.InputJsonValue,
        securitySummary: input.securitySummary as unknown as Prisma.InputJsonValue,
        completedAt: input.completedAt,
        elapsedMs: input.elapsedMs,
      },
    });

    if (result.count === 0) {
      return this.findById(input.scanId);
    }

    return this.findById(input.scanId);
  }

  public async markFailed(scanId: string, failureReason: string, completedAt: Date, elapsedMs: number): Promise<Scan | null> {
    const result = await prisma.scan.updateMany({
      where: {
        id: scanId,
        status: {
          in: [...ACTIVE_SCAN_STATUSES],
        },
      },
      data: {
        status: ScanStatus.FAILED,
        failureReason,
        completedAt,
        elapsedMs,
      },
    });

    if (result.count === 0) {
      return this.findById(scanId);
    }

    return this.findById(scanId);
  }

  public async markCancelled(scanId: string, cancelledAt: Date, elapsedMs: number): Promise<Scan | null> {
    const result = await prisma.scan.updateMany({
      where: {
        id: scanId,
        status: {
          in: [...ACTIVE_SCAN_STATUSES],
        },
      },
      data: {
        status: ScanStatus.CANCELLED,
        cancelledAt,
        completedAt: cancelledAt,
        elapsedMs,
      },
    });

    if (result.count === 0) {
      return this.findById(scanId);
    }

    return this.findById(scanId);
  }
}

export const scanRepository = new ScanRepository();
