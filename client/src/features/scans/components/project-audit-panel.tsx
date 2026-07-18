import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FindingsDashboard } from "@/features/findings/components/findings-dashboard";
import {
  useCancelProjectScanMutation,
  useCreateProjectScanMutation,
  useProjectScansQuery,
  useRetryProjectScanMutation,
} from "@/features/scans/scan.hooks";
import { useScanProgress } from "@/features/scans/use-scan-progress";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-client";
import type { Scan, ScanProgressSnapshot, ScanStatus, SecuritySeverity } from "@/types/scan";

type ProjectAuditPanelProps = {
  projectId: string;
};

const ACTIVE_SCAN_STATUSES: ScanStatus[] = [
  "QUEUED",
  "PARSING",
  "INDEXING",
  "READY_FOR_AI",
  "AI_SCANNING",
  "PROCESSING_RESULTS",
];

export function ProjectAuditPanel({ projectId }: ProjectAuditPanelProps) {
  const scansQuery = useProjectScansQuery(projectId);
  const createScanMutation = useCreateProjectScanMutation(projectId);
  const cancelScanMutation = useCancelProjectScanMutation(projectId);
  const retryScanMutation = useRetryProjectScanMutation(projectId);
  const latestScan = scansQuery.data?.scans[0];
  const isActive = latestScan ? ACTIVE_SCAN_STATUSES.includes(latestScan.status) : false;
  const scanProgress = useScanProgress(projectId, latestScan?.id, isActive);

  async function handleStartScan() {
    try {
      await createScanMutation.mutateAsync();
      toast.success("Security scan started.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Unable to start scan.");
    }
  }

  async function handleCancelScan(scanId: string) {
    try {
      await cancelScanMutation.mutateAsync(scanId);
      toast.success("Scan cancelled.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Unable to cancel scan.");
    }
  }

  async function handleRetryScan(scanId: string) {
    try {
      await retryScanMutation.mutateAsync(scanId);
      toast.success("Scan restarted.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Unable to retry scan.");
    }
  }

  if (scansQuery.isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Security audit</CardTitle>
          <CardDescription>Run the rule-based scanner and review repository findings.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {latestScan?.status === "FAILED" ? (
            <Button
              type="button"
              variant="outline"
              disabled={retryScanMutation.isPending}
              onClick={() => void handleRetryScan(latestScan.id)}
            >
              {retryScanMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="size-4" aria-hidden="true" />}
              Retry
            </Button>
          ) : null}
          {isActive && latestScan ? (
            <Button
              type="button"
              variant="outline"
              disabled={cancelScanMutation.isPending}
              onClick={() => void handleCancelScan(latestScan.id)}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="button" disabled={createScanMutation.isPending || isActive} onClick={() => void handleStartScan()}>
            {createScanMutation.isPending || isActive ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
            {latestScan ? "Run scan" : "Start scan"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {scansQuery.isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Unable to load scans.
          </div>
        ) : latestScan ? (
          <ScanDetails
            projectId={projectId}
            scan={latestScan}
            progress={scanProgress.progress}
            isProgressConnected={scanProgress.isConnected}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <ShieldCheck className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">No scans yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Upload or import a repository, then start a security scan.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScanDetails({
  projectId,
  scan,
  progress,
  isProgressConnected,
}: {
  projectId: string;
  scan: Scan;
  progress: ScanProgressSnapshot | null;
  isProgressConnected: boolean;
}) {
  const summary = scan.securitySummary;
  const findings = scan.securityFindings;
  const percentage = progress?.percentage ?? scan.progress;
  const currentStep = progress?.currentStep ?? formatStatus(scan.status);
  const currentFile = progress?.currentFile ?? null;
  const eta = progress?.estimatedTimeRemainingMs ?? null;
  const hasDemoFindings = findings.some((finding) => finding.ruleId.startsWith("demo."));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Status" value={formatStatus(scan.status)} badge={<StatusBadge status={scan.status} />} />
        <Metric label="Stage" value={currentStep} badge={isProgressConnected ? <Badge variant="success">Live</Badge> : null} />
        <Metric label="Findings" value={String(summary?.findings ?? findings.length)} />
        <Metric label="ETA" value={formatDuration(eta)} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
        </div>
        <div className="mt-3 grid gap-2 rounded-lg border border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground sm:grid-cols-[160px_1fr]">
          <span className="font-medium text-foreground">Current step</span>
          <span>{currentStep}</span>
          <span className="font-medium text-foreground">Current file</span>
          <span className="break-all">{currentFile ?? "Waiting for file activity"}</span>
          <span className="font-medium text-foreground">Elapsed</span>
          <span>{formatDuration(scan.elapsedMs)}</span>
        </div>
      </div>

      {scan.failureReason ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {scan.failureReason}
        </div>
      ) : null}

      {hasDemoFindings ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Demo mode generated sample findings because the live scan did not produce vulnerabilities.
        </div>
      ) : null}

      {summary ? <SeveritySummary summary={summary} /> : null}
      <FindingsDashboard projectId={projectId} />
    </div>
  );
}

function Metric({ label, value, badge }: { label: string; value: string; badge?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {badge}
      </div>
    </div>
  );
}

function SeveritySummary({ summary }: { summary: NonNullable<Scan["securitySummary"]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <SeverityMetric severity="CRITICAL" value={summary.critical} />
      <SeverityMetric severity="HIGH" value={summary.high} />
      <SeverityMetric severity="MEDIUM" value={summary.medium} />
      <SeverityMetric severity="LOW" value={summary.low} />
    </div>
  );
}

function SeverityMetric({ severity, value }: { severity: SecuritySeverity; value: number }) {
  return (
    <div className={cn("rounded-lg border px-3 py-3", severityTone(severity))}>
      <p className="text-xs font-medium">{severity}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ScanStatus }) {
  const variant: BadgeProps["variant"] = status === "COMPLETED" ? "success" : status === "FAILED" ? "destructive" : status === "CANCELLED" ? "outline" : "warning";
  const Icon = status === "COMPLETED" ? CheckCircle2 : status === "FAILED" ? XCircle : AlertTriangle;

  return (
    <Badge variant={variant}>
      <Icon className="mr-1 size-3" aria-hidden="true" />
      {formatStatus(status)}
    </Badge>
  );
}

function severityTone(severity: SecuritySeverity) {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return "border-destructive/20 bg-destructive/5 text-destructive";
  }

  if (severity === "MEDIUM") {
    return "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300";
  }

  return "border-border bg-muted/20 text-muted-foreground";
}

function formatStatus(status: ScanStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "-";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1000);

  return `${minutes}m ${seconds}s`;
}
