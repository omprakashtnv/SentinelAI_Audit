import { AlertTriangle, CheckCircle2, FileCode2, Loader2, RotateCcw, ShieldCheck, TimerReset, XCircle } from "lucide-react";
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
import { useRepositorySourceQuery } from "@/features/repository-explorer/repository-explorer.hooks";
import { useScanProgress } from "@/features/scans/use-scan-progress";
import { ApiClientError } from "@/services/api/api-client";
import type { Scan, ScanProgressSnapshot, ScanStatus } from "@/types/scan";

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
  const repositorySourceQuery = useRepositorySourceQuery(projectId);
  const createScanMutation = useCreateProjectScanMutation(projectId);
  const cancelScanMutation = useCancelProjectScanMutation(projectId);
  const retryScanMutation = useRetryProjectScanMutation(projectId);
  const latestScan = scansQuery.data?.scans[0];
  const hasRepositorySource = Boolean(repositorySourceQuery.data);
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
          <Button
            type="button"
            disabled={createScanMutation.isPending || isActive || !hasRepositorySource}
            onClick={() => void handleStartScan()}
          >
            {createScanMutation.isPending || isActive ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
            {!hasRepositorySource ? "Attach repository" : latestScan ? "Run scan" : "Start scan"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasRepositorySource ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            Upload a ZIP file or import a GitHub repository before starting a scan.
          </div>
        ) : null}

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
  const hasDemoFindings = findings.some((finding) => finding.ruleId.startsWith("demo."));

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/10 px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={scan.status} />
              {isProgressConnected ? <Badge variant="success">Live</Badge> : null}
              <Badge variant="outline">{percentage}%</Badge>
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{currentStep}</p>
            <p className="mt-1 max-w-3xl break-all text-xs text-muted-foreground">
              {currentFile ?? "Waiting for file activity"}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-80">
            <ScanFact icon={TimerReset} label="Elapsed" value={formatDuration(scan.elapsedMs)} />
            <ScanFact icon={FileCode2} label="Files parsed" value={String(scan.parsedFiles || summary?.filesScanned || 0)} />
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
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

      <FindingsDashboard projectId={projectId} />
    </div>
  );
}

function ScanFact({ icon: Icon, label, value }: { icon: typeof TimerReset; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
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
