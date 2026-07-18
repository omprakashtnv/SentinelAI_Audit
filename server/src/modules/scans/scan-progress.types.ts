import type { ScanStatus } from "@prisma/client";

export type ScanProgressSnapshot = {
  scanId: string;
  status: ScanStatus;
  currentStep: string;
  currentFile: string | null;
  percentage: number;
  estimatedTimeRemainingMs: number | null;
  updatedAt: string;
};

export type ScanProgressUpdate = {
  scanId: string;
  status: ScanStatus;
  currentStep: string;
  currentFile?: string | null;
  percentage: number;
};

export type ScanProgressListener = (snapshot: ScanProgressSnapshot) => void;

