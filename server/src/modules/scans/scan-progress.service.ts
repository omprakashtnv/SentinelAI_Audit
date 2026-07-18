import { EventEmitter } from "node:events";

import { SCAN_PROGRESS_SNAPSHOT_TTL_MS, TERMINAL_SCAN_STATUSES } from "./scan.constants";
import type { ScanProgressListener, ScanProgressSnapshot, ScanProgressUpdate } from "./scan-progress.types";

export class ScanProgressService {
  private readonly emitter = new EventEmitter();
  private readonly snapshots = new Map<string, ScanProgressSnapshot>();
  private readonly startedAtByScan = new Map<string, number>();
  private readonly cleanupTimers = new Map<string, NodeJS.Timeout>();

  public constructor() {
    this.emitter.setMaxListeners(0);
  }

  public publish(update: ScanProgressUpdate): ScanProgressSnapshot {
    const now = Date.now();
    const startedAt = this.startedAtByScan.get(update.scanId) ?? now;

    this.startedAtByScan.set(update.scanId, startedAt);

    const percentage = this.clampPercentage(update.percentage);
    const snapshot: ScanProgressSnapshot = {
      scanId: update.scanId,
      status: update.status,
      currentStep: update.currentStep,
      currentFile: update.currentFile ?? null,
      percentage,
      estimatedTimeRemainingMs: this.estimateRemainingMs(startedAt, now, percentage),
      updatedAt: new Date(now).toISOString(),
    };

    this.snapshots.set(update.scanId, snapshot);
    this.emitter.emit(this.getEventName(update.scanId), snapshot);

    if (this.isTerminalStatus(update.status)) {
      this.startedAtByScan.delete(update.scanId);
      this.scheduleSnapshotCleanup(update.scanId);
    } else {
      this.clearSnapshotCleanup(update.scanId);
    }

    return snapshot;
  }

  public getSnapshot(scanId: string): ScanProgressSnapshot | null {
    return this.snapshots.get(scanId) ?? null;
  }

  public subscribe(scanId: string, listener: ScanProgressListener): () => void {
    const eventName = this.getEventName(scanId);

    this.emitter.on(eventName, listener);

    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  private getEventName(scanId: string): string {
    return `scan-progress:${scanId}`;
  }

  private estimateRemainingMs(startedAt: number, now: number, percentage: number): number | null {
    if (percentage <= 0 || percentage >= 100) {
      return null;
    }

    const elapsedMs = now - startedAt;
    const estimatedTotalMs = elapsedMs / (percentage / 100);

    return Math.max(0, Math.round(estimatedTotalMs - elapsedMs));
  }

  private clampPercentage(percentage: number): number {
    return Math.min(100, Math.max(0, Math.round(percentage)));
  }

  private isTerminalStatus(status: ScanProgressUpdate["status"]): boolean {
    return TERMINAL_SCAN_STATUSES.includes(status as (typeof TERMINAL_SCAN_STATUSES)[number]);
  }

  private scheduleSnapshotCleanup(scanId: string): void {
    this.clearSnapshotCleanup(scanId);

    const timer = setTimeout(() => {
      this.snapshots.delete(scanId);
      this.startedAtByScan.delete(scanId);
      this.cleanupTimers.delete(scanId);
    }, SCAN_PROGRESS_SNAPSHOT_TTL_MS);

    timer.unref?.();
    this.cleanupTimers.set(scanId, timer);
  }

  private clearSnapshotCleanup(scanId: string): void {
    const timer = this.cleanupTimers.get(scanId);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.cleanupTimers.delete(scanId);
  }
}

export const scanProgressService = new ScanProgressService();
