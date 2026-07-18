import { AlertTriangle, CheckCircle2, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteFindingMutation,
  useDismissFindingMutation,
  useProjectFindingsQuery,
  useResolveFindingMutation,
} from "@/features/findings/finding.hooks";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-client";
import type { Finding, FindingSeverity, FindingStatus } from "@/types/finding";

type FindingsDashboardProps = {
  projectId: string;
};

type SortMode = "severity" | "newest" | "file";
type GroupMode = "severity" | "owasp";

const SEVERITIES: FindingSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 1,
};
const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#f59e0b",
  LOW: "#2563eb",
  INFO: "#64748b",
};

export function FindingsDashboard({ projectId }: FindingsDashboardProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "ALL">("OPEN");
  const [sortMode, setSortMode] = useState<SortMode>("severity");
  const [groupMode, setGroupMode] = useState<GroupMode>("severity");
  const findingsQuery = useProjectFindingsQuery(projectId, {
    limit: 100,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    severity: severityFilter === "ALL" ? undefined : severityFilter,
    search: search.trim() || undefined,
  });
  const dismissMutation = useDismissFindingMutation(projectId);
  const resolveMutation = useResolveFindingMutation(projectId);
  const deleteMutation = useDeleteFindingMutation(projectId);
  const findings = useMemo(
    () => sortFindings(findingsQuery.data?.findings ?? [], sortMode),
    [findingsQuery.data?.findings, sortMode],
  );
  const statistics = useMemo(() => calculateStatistics(findings), [findings]);
  const groupedFindings = useMemo(() => groupFindings(findings, groupMode), [findings, groupMode]);

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

  if (findingsQuery.isLoading) {
    return <FindingsDashboardSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle>Findings dashboard</CardTitle>
          <CardDescription>Prioritize, filter, and track security findings across this project.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <SegmentedControl
            label="Status"
            value={statusFilter}
            options={["OPEN", "DISMISSED", "RESOLVED", "ALL"]}
            onChange={(value) => setStatusFilter(value as FindingStatus | "ALL")}
          />
          <SegmentedControl
            label="Group"
            value={groupMode}
            options={["severity", "owasp"]}
            onChange={(value) => setGroupMode(value as GroupMode)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Critical" value={statistics.counts.CRITICAL} severity="CRITICAL" />
          <StatCard label="High" value={statistics.counts.HIGH} severity="HIGH" />
          <StatCard label="Medium" value={statistics.counts.MEDIUM} severity="MEDIUM" />
          <StatCard label="Low" value={statistics.counts.LOW} severity="LOW" />
          <SecurityScoreCard score={statistics.securityScore} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Severity distribution</CardTitle>
              <CardDescription>Open risk volume by severity.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statistics.severityChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="severity" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statistics.severityChartData.map((entry) => (
                      <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>OWASP grouping</CardTitle>
              <CardDescription>Finding concentration by OWASP category.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {statistics.owaspChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statistics.owaspChartData}
                      dataKey="count"
                      nameKey="owasp"
                      innerRadius={54}
                      outerRadius={92}
                      paddingAngle={2}
                    >
                      {statistics.owaspChartData.map((entry, index) => (
                        <Cell key={entry.owasp} fill={chartColor(index)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search findings, files, OWASP"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <SegmentedControl
              label="Severity"
              value={severityFilter}
              options={["ALL", ...SEVERITIES]}
              onChange={(value) => setSeverityFilter(value as FindingSeverity | "ALL")}
            />
            <SegmentedControl
              label="Sort"
              value={sortMode}
              options={["severity", "newest", "file"]}
              onChange={(value) => setSortMode(value as SortMode)}
            />
          </div>
        </div>

        {findingsQuery.isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Unable to load findings.
          </div>
        ) : findings.length > 0 ? (
          <div className="space-y-4">
            {groupedFindings.map((group) => (
              <FindingGroup
                key={group.key}
                title={group.label}
                findings={group.findings}
                onDismiss={(findingId) => void handleDismiss(findingId)}
                onResolve={(findingId) => void handleResolve(findingId)}
                onDelete={(findingId) => void handleDelete(findingId)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <ShieldCheck className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">No findings match this view</p>
            <p className="mt-2 text-sm text-muted-foreground">Run a scan or adjust the filters.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, severity }: { label: string; value: number; severity: FindingSeverity }) {
  return (
    <div className={cn("rounded-lg border px-4 py-4", severityTone(severity))}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SecurityScoreCard({ score }: { score: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-4 py-4">
      <p className="text-xs font-medium text-muted-foreground">Security Score</p>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-semibold text-foreground">{score}</p>
        <span className="pb-1 text-xs text-muted-foreground">/ 100</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", score >= 85 ? "bg-emerald-500" : score >= 65 ? "bg-amber-500" : "bg-destructive")} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function FindingGroup({
  title,
  findings,
  onDismiss,
  onResolve,
  onDelete,
}: {
  title: string;
  findings: Finding[];
  onDismiss: (findingId: string) => void;
  onResolve: (findingId: string) => void;
  onDelete: (findingId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="outline">{findings.length}</Badge>
      </div>
      <div className="space-y-2">
        {findings.map((finding) => (
          <FindingRow
            key={finding.id}
            finding={finding}
            onDismiss={onDismiss}
            onResolve={onResolve}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function FindingRow({
  finding,
  onDismiss,
  onResolve,
  onDelete,
}: {
  finding: Finding;
  onDismiss: (findingId: string) => void;
  onResolve: (findingId: string) => void;
  onDelete: (findingId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <Badge variant="outline">{finding.status}</Badge>
            <h4 className="text-sm font-semibold text-foreground">{finding.title}</h4>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{finding.description}</p>
          {finding.recommendation ? (
            <p className="mt-2 text-sm leading-6 text-foreground">
              <span className="font-medium">Recommendation:</span> {finding.recommendation}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="break-all">{finding.file}:{finding.line}</span>
            <span>{finding.owasp ?? "Unmapped OWASP"}</span>
            <span>{finding.confidence ?? "UNKNOWN"} confidence</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onResolve(finding.id)}>
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Resolve
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onDismiss(finding.id)}>
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            Dismiss
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(finding.id)}>
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
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
    <div className="flex items-center gap-2 rounded-md border border-border bg-background p-1">
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
          {formatOption(option)}
        </button>
      ))}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  const variant: BadgeProps["variant"] = severity === "CRITICAL" || severity === "HIGH" ? "destructive" : severity === "MEDIUM" ? "warning" : severity === "LOW" ? "outline" : "secondary";

  return <Badge variant={variant}>{severity}</Badge>;
}

function EmptyChartState() {
  return (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      No OWASP data
    </div>
  );
}

function FindingsDashboardSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}

function calculateStatistics(findings: Finding[]) {
  const counts = SEVERITIES.reduce(
    (accumulator, severity) => ({
      ...accumulator,
      [severity]: findings.filter((finding) => finding.severity === severity).length,
    }),
    {} as Record<FindingSeverity, number>,
  );
  const deductions = SEVERITIES.reduce((total, severity) => total + counts[severity] * SEVERITY_WEIGHTS[severity], 0);
  const owaspCounts = new Map<string, number>();

  findings.forEach((finding) => {
    const key = finding.owasp ?? "Unmapped";
    owaspCounts.set(key, (owaspCounts.get(key) ?? 0) + 1);
  });

  return {
    counts,
    securityScore: Math.max(0, Math.min(100, 100 - deductions)),
    severityChartData: SEVERITIES.map((severity) => ({
      severity,
      count: counts[severity],
    })),
    owaspChartData: [...owaspCounts.entries()]
      .map(([owasp, count]) => ({ owasp, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6),
  };
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

    return SEVERITIES.indexOf(left.severity) - SEVERITIES.indexOf(right.severity);
  });
}

function groupFindings(findings: Finding[], groupMode: GroupMode) {
  const groups = new Map<string, Finding[]>();

  findings.forEach((finding) => {
    const key = groupMode === "severity" ? finding.severity : finding.owasp ?? "Unmapped OWASP";
    groups.set(key, [...(groups.get(key) ?? []), finding]);
  });

  return [...groups.entries()].map(([key, groupFindingsValue]) => ({
    key,
    label: groupMode === "severity" ? formatOption(key) : key,
    findings: groupFindingsValue,
  }));
}

function severityTone(severity: FindingSeverity) {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return "border-destructive/20 bg-destructive/5 text-destructive";
  }

  if (severity === "MEDIUM") {
    return "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300";
  }

  if (severity === "LOW") {
    return "border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300";
  }

  return "border-border bg-muted/20 text-muted-foreground";
}

function chartColor(index: number) {
  const colors = ["#2563eb", "#dc2626", "#f97316", "#f59e0b", "#16a34a", "#64748b"];

  return colors[index % colors.length] ?? "#64748b";
}

function formatOption(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

