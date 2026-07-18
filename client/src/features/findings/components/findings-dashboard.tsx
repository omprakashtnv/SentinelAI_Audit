import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileWarning,
  Search,
  ShieldCheck,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { HighlightText } from "@/components/data-display/highlight-text";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FindingsPagination } from "@/features/findings/components/findings-pagination";
import {
  FINDING_SEVERITIES,
  FINDING_SEVERITY_WEIGHTS,
  FindingSeverityBadge,
  formatFindingOption,
} from "@/features/findings/finding-display";
import {
  useDeleteFindingMutation,
  useDismissFindingMutation,
  useProjectFindingsQuery,
  useResolveFindingMutation,
} from "@/features/findings/finding.hooks";
import { useProjectScansQuery } from "@/features/scans/scan.hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-client";
import type { Finding, FindingListSummary, FindingSeverity, FindingStatus } from "@/types/finding";
import type { Scan } from "@/types/scan";

type FindingsDashboardProps = {
  projectId: string;
};

type SortMode = "severity" | "newest" | "file";

const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#f59e0b",
  LOW: "#2563eb",
  INFO: "#64748b",
};
const CHART_COLORS = ["#2563eb", "#dc2626", "#f97316", "#f59e0b", "#16a34a", "#64748b"];
const FINDINGS_ANALYTICS_LIMIT = 250;
const FINDINGS_PAGE_SIZE = 10;

export function FindingsDashboard({ projectId }: FindingsDashboardProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "ALL">("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("severity");
  const [findingsPage, setFindingsPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);
  const findingFilters = {
    status: statusFilter === "ALL" ? undefined : statusFilter,
    severity: severityFilter === "ALL" ? undefined : severityFilter,
    search: debouncedSearch.trim() || undefined,
  };
  const analyticsFindingsQuery = useProjectFindingsQuery(projectId, {
    ...findingFilters,
    page: 1,
    limit: FINDINGS_ANALYTICS_LIMIT,
  });
  const paginatedFindingsQuery = useProjectFindingsQuery(projectId, {
    ...findingFilters,
    page: findingsPage,
    limit: FINDINGS_PAGE_SIZE,
  });
  const scansQuery = useProjectScansQuery(projectId);
  const dismissMutation = useDismissFindingMutation(projectId);
  const resolveMutation = useResolveFindingMutation(projectId);
  const deleteMutation = useDeleteFindingMutation(projectId);
  const analyticsFindings = useMemo(
    () => analyticsFindingsQuery.data?.findings ?? [],
    [analyticsFindingsQuery.data?.findings],
  );
  const paginatedFindings = useMemo(
    () => sortFindings(paginatedFindingsQuery.data?.findings ?? [], sortMode),
    [paginatedFindingsQuery.data?.findings, sortMode],
  );
  const scans = scansQuery.data?.scans ?? [];
  const analyticsSummary = analyticsFindingsQuery.data?.summary;
  const analytics = useMemo(
    () => buildSecurityAnalytics(analyticsFindings, scans, analyticsSummary),
    [analyticsFindings, scans, analyticsSummary],
  );
  const findingsMeta = paginatedFindingsQuery.data?.meta;

  function resetFindingsPage() {
    setFindingsPage(1);
  }

  async function handleDismiss(findingId: string) {
    try {
      await dismissMutation.mutateAsync(findingId);
      toast.success("Finding dismissed.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Unable to dismiss finding.");
    }
  }

  async function handleResolve(findingId: string) {
    try {
      await resolveMutation.mutateAsync(findingId);
      toast.success("Finding resolved.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Unable to resolve finding.");
    }
  }

  async function handleDelete(findingId: string) {
    try {
      await deleteMutation.mutateAsync(findingId);
      toast.success("Finding deleted.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Unable to delete finding.");
    }
  }

  if (analyticsFindingsQuery.isLoading || scansQuery.isLoading) {
    return <FindingsDashboardSkeleton />;
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-semibold tracking-normal text-foreground">Security dashboard</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Monitor repository risk, scan history, vulnerability patterns, and critical files.
          </p>
        </div>
      </motion.div>

      <SecurityOverview analytics={analytics} />

      {/* <div className="grid gap-4">
        <DashboardPanel
          title="Risk trend"
          description="Security score movement across recent scans."
          icon={BarChart3}
          className="min-h-72"
        >
          <ChartFrame isEmpty={analytics.riskTrend.length === 0} emptyLabel="No completed scans yet" heightClassName="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.riskTrend}>
                <defs>
                  <linearGradient id="riskTrendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} fill="url(#riskTrendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </DashboardPanel>
      </div> */}

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Severity distribution" description="Findings by severity." icon={AlertTriangle}>
          <ChartFrame isEmpty={analytics.severityChartData.every((item) => item.count === 0)} emptyLabel="No severity data">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.severityChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="severity" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {analytics.severityChartData.map((entry) => (
                    <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </DashboardPanel>

        <DashboardPanel title="OWASP distribution" description="Risk mapped to OWASP categories." icon={ShieldAlert}>
          <ChartFrame isEmpty={analytics.owaspChartData.length === 0} emptyLabel="No OWASP data">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.owaspChartData}
                  dataKey="count"
                  nameKey="owasp"
                  innerRadius={58}
                  outerRadius={96}
                  paddingAngle={2}
                >
                  {analytics.owaspChartData.map((entry, index) => (
                    <Cell key={entry.owasp} fill={chartColor(index)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardPanel title="Most common vulnerabilities" description="Recurring issue families." icon={FileWarning}>
          <ChartFrame isEmpty={analytics.commonVulnerabilities.length === 0} emptyLabel="No vulnerability patterns">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.commonVulnerabilities} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis type="category" dataKey="label" width={140} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </DashboardPanel>

        <DashboardPanel title="Top critical files" description="Files with the heaviest risk concentration." icon={FileWarning}>
          <div className="space-y-2">
            {analytics.topCriticalFiles.length > 0 ? (
              analytics.topCriticalFiles.map((file) => (
                <div key={file.file} className="rounded-lg border border-border bg-muted/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-foreground" title={file.file}>
                      {file.file}
                    </p>
                    <Badge variant={file.critical > 0 ? "destructive" : "warning"}>{file.score}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{file.critical} critical</span>
                    <span>{file.high} high</span>
                    <span>{file.total} total</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyPanel label="No critical file hotspots" />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent scans" description="Latest repository scan activity." icon={Clock3}>
          <RecentScansList scans={analytics.recentScans} />
        </DashboardPanel>
      </div>

      <div className="grid gap-4">
        <DashboardPanel title="Findings" description="Filtered security findings with direct triage actions." icon={Search}>
          <div className="mb-4 space-y-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetFindingsPage();
                  }}
                  placeholder="Search findings, files, OWASP"
                  className="pl-9"
                />
              </div>
              <SegmentedControl
                label="Sort"
                value={sortMode}
                options={["severity", "newest", "file"]}
                onChange={(value) => setSortMode(value as SortMode)}
              />
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <SegmentedControl
                label="Status"
                value={statusFilter}
                options={["OPEN", "DISMISSED", "RESOLVED", "ALL"]}
                onChange={(value) => {
                  setStatusFilter(value as FindingStatus | "ALL");
                  resetFindingsPage();
                }}
              />
              <SegmentedControl
                label="Severity"
                value={severityFilter}
                options={["ALL", ...FINDING_SEVERITIES]}
                onChange={(value) => {
                  setSeverityFilter(value as FindingSeverity | "ALL");
                  resetFindingsPage();
                }}
              />
            </div>
          </div>

          {paginatedFindingsQuery.isError ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Unable to load findings.
            </div>
          ) : paginatedFindingsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
              ))}
            </div>
          ) : paginatedFindings.length > 0 ? (
            <div className="space-y-2">
              {paginatedFindings.map((finding) => (
                <FindingRow
                  key={finding.id}
                  finding={finding}
                  searchQuery={search}
                  onDismiss={(findingId) => void handleDismiss(findingId)}
                  onResolve={(findingId) => void handleResolve(findingId)}
                  onDelete={(findingId) => void handleDelete(findingId)}
                />
              ))}
              {findingsMeta ? (
                <FindingsPagination
                  meta={findingsMeta}
                  isLoading={paginatedFindingsQuery.isFetching}
                  onPageChange={setFindingsPage}
                />
              ) : null}
            </div>
          ) : (
            <EmptyPanel label="No findings match this view" />
          )}
        </DashboardPanel>
      </div>
    </div>
  );
}

function DashboardPanel({
  title,
  description,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}
    >
      <div className="flex items-start gap-3 border-b border-border px-4 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </motion.section>
  );
}

function SecurityOverview({ analytics }: { analytics: SecurityAnalytics }) {
  const risk = getRiskLabel(analytics.securityScore);
  const latestScan = analytics.recentScans[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm"
    >
      <div className="grid gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-b border-border bg-muted/10 px-5 py-5 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Security score</p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">{risk.label}</h3>
            </div>
            <Badge variant={risk.variant}>{risk.badge}</Badge>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <ScoreRing score={analytics.securityScore} />
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
            Score uses open findings with capped deductions so repeated low-risk patterns do not hide critical signals.
          </p>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewStat label="Open risk" value={analytics.openFindings} helper="active findings" tone="warning" />
            <OverviewStat label="Critical + High" value={analytics.criticalHighFindings} helper="priority queue" tone="danger" />
            <OverviewStat label="Total findings" value={analytics.totalFindings} helper="current view" tone="neutral" />
            <OverviewStat label="Latest scan" value={latestScan ? formatFindingOption(latestScan.status) : "No scan"} helper={latestScan?.sourceRef ?? "not started"} tone="success" />
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">Severity mix</p>
                <p className="text-xs text-muted-foreground">{analytics.totalFindings} findings</p>
              </div>
              <div className="space-y-2">
                {analytics.severityChartData.map((entry) => (
                  <SeverityBar key={entry.severity} severity={entry.severity} count={entry.count} total={analytics.totalFindings} />
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/10 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Critical files</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{analytics.topCriticalFiles.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">files with high-risk concentration</p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
  const angle = Math.round(score * 3.6);

  return (
    <div
      className="grid size-40 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${angle}deg, hsl(var(--muted)) ${angle}deg)` }}
    >
      <div className="grid size-32 place-items-center rounded-full border border-border bg-card">
        <div className="text-center">
          <p className="text-4xl font-semibold text-foreground">{score}</p>
          <p className="mt-1 text-xs text-muted-foreground">/ 100</p>
        </div>
      </div>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number | string;
  helper: string;
  tone: "danger" | "warning" | "success" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        tone === "danger"
          ? "border-destructive/20 bg-destructive/5"
          : tone === "warning"
            ? "border-amber-500/20 bg-amber-500/5"
            : tone === "success"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-border bg-muted/10",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold text-foreground" title={String(value)}>
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground" title={helper}>
        {helper}
      </p>
    </div>
  );
}

function SeverityBar({ severity, count, total }: { severity: FindingSeverity; count: number; total: number }) {
  const width = total > 0 ? Math.max(2, Math.round((count / total) * 100)) : 0;

  return (
    <div className="grid gap-2 sm:grid-cols-[80px_minmax(0,1fr)_48px] sm:items-center">
      <span className="text-xs font-medium text-muted-foreground">{severity}</span>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: SEVERITY_COLORS[severity] }} />
      </div>
      <span className="text-right text-xs font-medium text-foreground">{count}</span>
    </div>
  );
}

function ChartFrame({
  isEmpty,
  emptyLabel,
  children,
  heightClassName = "h-72",
}: {
  isEmpty: boolean;
  emptyLabel: string;
  children: ReactNode;
  heightClassName?: string;
}) {
  return <div className={heightClassName}>{isEmpty ? <EmptyPanel label={emptyLabel} /> : children}</div>;
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="grid h-full min-h-40 place-items-center rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <div>
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
      </div>
    </div>
  );
}

function RecentScansList({ scans }: { scans: Scan[] }) {
  if (scans.length === 0) {
    return <EmptyPanel label="No scans yet" />;
  }

  return (
    <div className="space-y-2">
      {scans.map((scan) => (
        <div key={scan.id} className="rounded-lg border border-border bg-muted/20 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground" title={scan.sourceRef ?? "Repository scan"}>
                {scan.sourceRef ?? "Repository scan"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(scan.createdAt)}</p>
            </div>
            <Badge variant={scan.status === "COMPLETED" ? "success" : scan.status === "FAILED" ? "destructive" : "warning"}>
              {formatFindingOption(scan.status)}
            </Badge>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${scan.progress}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FindingRow({
  finding,
  searchQuery,
  onDismiss,
  onResolve,
  onDelete,
}: {
  finding: Finding;
  searchQuery: string;
  onDismiss: (findingId: string) => void;
  onResolve: (findingId: string) => void;
  onDelete: (findingId: string) => void;
}) {
  const fileLocation = `${finding.file}:${finding.line}`;
  const category = finding.category ? formatFindingOption(finding.category) : "Uncategorized";
  const confidence = finding.confidence ?? "UNKNOWN";
  const canResolve = finding.status !== "RESOLVED";
  const canDismiss = finding.status !== "DISMISSED";

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-background transition-colors hover:bg-muted/25">
      <div className="grid gap-0 xl:grid-cols-[136px_minmax(0,1fr)_220px]">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-3 xl:flex-col xl:items-start xl:border-b-0 xl:border-r">
          <FindingSeverityBadge severity={finding.severity} />
          <Badge variant="outline">{formatFindingOption(finding.status)}</Badge>
          <span className="text-xs font-medium text-muted-foreground">{confidence} confidence</span>
        </div>

        <div className="min-w-0 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" title={category}>
              {category}
            </Badge>
            <span className="text-xs text-muted-foreground" title={finding.owasp ?? "Unmapped OWASP"}>
              <HighlightText query={searchQuery}>{finding.owasp ?? "Unmapped OWASP"}</HighlightText>
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold leading-6 text-foreground" title={finding.title}>
            <HighlightText query={searchQuery}>{finding.title}</HighlightText>
          </h4>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground" title={finding.description}>
            <HighlightText query={searchQuery}>{finding.description}</HighlightText>
          </p>
          <div className="mt-3 rounded-md border border-border bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
            <span className="block break-all" title={fileLocation}>
              <HighlightText query={searchQuery}>{fileLocation}</HighlightText>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-muted/10 px-4 py-3 xl:border-l xl:border-t-0">
          <Button asChild type="button" size="sm" variant="outline" className="w-full justify-center">
            <Link to={`/projects/${finding.projectId}/findings/${finding.id}`}>Details</Link>
          </Button>
          {canResolve || canDismiss ? (
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
              {canResolve ? (
                <Button type="button" size="sm" variant="outline" className="justify-center" onClick={() => onResolve(finding.id)}>
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Resolve
                </Button>
              ) : null}
              {canDismiss ? (
                <Button type="button" size="sm" variant="outline" className="justify-center" onClick={() => onDismiss(finding.id)}>
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  Dismiss
                </Button>
              ) : null}
            </div>
          ) : null}
          <Button type="button" size="sm" variant="ghost" className="w-full justify-center text-muted-foreground" onClick={() => onDelete(finding.id)}>
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-1">
      <span className="px-2 text-xs text-muted-foreground">{label}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={cn(
            "h-7 rounded px-2 text-xs font-medium transition-colors",
            value === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          onClick={() => onChange(option)}
        >
          {formatFindingOption(option)}
        </button>
      ))}
    </div>
  );
}

type SecurityAnalytics = ReturnType<typeof buildSecurityAnalytics>;

function buildSecurityAnalytics(findings: Finding[], scans: Scan[], summary?: FindingListSummary) {
  const openFindings = findings.filter((finding) => finding.status === "OPEN");
  const counts = summary?.bySeverity ?? countSeverities(findings);
  const openCounts = summary?.byOpenSeverity ?? countSeverities(openFindings);
  const securityScore = calculateSecurityScore(openCounts);
  const owaspCounts = countBy(findings, (finding) => finding.owasp ?? "Unmapped");
  const vulnerabilityCounts = countBy(findings, (finding) => finding.title);
  const fileRisk = buildTopCriticalFiles(findings);

  return {
    counts,
    openCounts,
    securityScore,
    openFindings: summary?.byStatus.OPEN ?? openFindings.length,
    totalFindings: summary?.total ?? findings.length,
    criticalHighFindings: openCounts.CRITICAL + openCounts.HIGH,
    severityChartData: FINDING_SEVERITIES.map((severity) => ({
      severity,
      count: counts[severity],
    })),
    owaspChartData: [...owaspCounts.entries()]
      .map(([owasp, count]) => ({ owasp, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 7),
    commonVulnerabilities: [...vulnerabilityCounts.entries()]
      .map(([label, count]) => ({ label: truncateLabel(label, 32), count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6),
    topCriticalFiles: fileRisk,
    recentScans: scans.slice(0, 6),
    riskTrend: buildRiskTrend(scans),
  };
}

function countSeverities(findings: Finding[]): Record<FindingSeverity, number> {
  return FINDING_SEVERITIES.reduce(
    (accumulator, severity) => ({
      ...accumulator,
      [severity]: findings.filter((finding) => finding.severity === severity).length,
    }),
    {} as Record<FindingSeverity, number>,
  );
}

function buildRiskTrend(scans: Scan[]) {
  return scans
    .filter((scan) => scan.securitySummary)
    .slice(0, 8)
    .reverse()
    .map((scan) => ({
      label: formatShortDate(scan.createdAt),
      score: calculateSecurityScore({
        CRITICAL: scan.securitySummary?.critical ?? 0,
        HIGH: scan.securitySummary?.high ?? 0,
        MEDIUM: scan.securitySummary?.medium ?? 0,
        LOW: scan.securitySummary?.low ?? 0,
        INFO: 0,
      }),
    }));
}

function buildTopCriticalFiles(findings: Finding[]) {
  const byFile = new Map<string, { file: string; critical: number; high: number; total: number; score: number }>();

  for (const finding of findings) {
    const current = byFile.get(finding.file) ?? {
      file: finding.file,
      critical: 0,
      high: 0,
      total: 0,
      score: 0,
    };

    current.total += 1;
    current.score += FINDING_SEVERITY_WEIGHTS[finding.severity];

    if (finding.severity === "CRITICAL") {
      current.critical += 1;
    }

    if (finding.severity === "HIGH") {
      current.high += 1;
    }

    byFile.set(finding.file, current);
  }

  return [...byFile.values()]
    .filter((entry) => entry.critical > 0 || entry.high > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
}

function calculateSecurityScore(counts: Record<FindingSeverity, number>) {
  const deductions =
    Math.min(55, counts.CRITICAL * 18) +
    Math.min(35, counts.HIGH * 7) +
    Math.min(18, counts.MEDIUM * 3) +
    Math.min(8, counts.LOW * 0.25) +
    Math.min(3, counts.INFO * 0.1);

  return Math.max(0, Math.min(100, Math.round(100 - deductions)));
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function sortFindings(findings: Finding[], sortMode: SortMode) {
  return [...findings].sort((left, right) => {
    if (sortMode === "newest") {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }

    if (sortMode === "file") {
      const fileComparison = left.file.localeCompare(right.file);

      return fileComparison !== 0 ? fileComparison : left.line - right.line;
    }

    return FINDING_SEVERITIES.indexOf(left.severity) - FINDING_SEVERITIES.indexOf(right.severity);
  });
}

function scoreColor(score: number) {
  if (score >= 85) {
    return "#16a34a";
  }

  if (score >= 65) {
    return "#f59e0b";
  }

  return "#dc2626";
}

function getRiskLabel(score: number): { label: string; badge: string; variant: BadgeProps["variant"] } {
  if (score >= 85) {
    return {
      label: "Healthy security posture",
      badge: "Low risk",
      variant: "success",
    };
  }

  if (score >= 65) {
    return {
      label: "Review recommended",
      badge: "Moderate risk",
      variant: "warning",
    };
  }

  if (score >= 40) {
    return {
      label: "Prioritize remediation",
      badge: "High risk",
      variant: "destructive",
    };
  }

  return {
    label: "Immediate attention required",
    badge: "Critical risk",
    variant: "destructive",
  };
}

function chartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length] ?? "#64748b";
}

function truncateLabel(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function FindingsDashboardSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
