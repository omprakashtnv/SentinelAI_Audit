import { ScanStatus } from "@prisma/client";

export const ACTIVE_SCAN_STATUSES = [
  ScanStatus.QUEUED,
  ScanStatus.PARSING,
  ScanStatus.INDEXING,
  ScanStatus.READY_FOR_AI,
  ScanStatus.AI_SCANNING,
  ScanStatus.PROCESSING_RESULTS,
] as const;

export const TERMINAL_SCAN_STATUSES = [
  ScanStatus.COMPLETED,
  ScanStatus.FAILED,
  ScanStatus.CANCELLED,
] as const;

export const SCAN_PROGRESS_SNAPSHOT_TTL_MS = 30 * 60 * 1000;
