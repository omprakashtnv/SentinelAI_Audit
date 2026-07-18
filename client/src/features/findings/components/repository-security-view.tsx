import { motion } from "framer-motion";
import {
  ArrowDownAZ,
  Clock3,
  FileCode2,
  FolderTree,
  LayoutList,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { HighlightText } from "@/components/data-display/highlight-text";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FindingsPagination } from "@/features/findings/components/findings-pagination";
import {
  FINDING_SEVERITIES,
  FindingSeverityBadge,
  findingSeverityVariant,
  formatFindingOption,
} from "@/features/findings/finding-display";
import { useProjectFindingsQuery } from "@/features/findings/finding.hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { Finding, FindingListSummary, FindingSeverity, FindingStatus } from "@/types/finding";

type RepositorySecurityViewProps = {
  projectId: string;
};

type GroupMode = "folder" | "severity" | "category" | "owasp";
type SortMode = "severity" | "newest" | "file" | "status";

const STATUSES: Array<FindingStatus | "ALL"> = ["OPEN", "RESOLVED", "DISMISSED", "ALL"];
const GROUP_MODES: Array<{ value: GroupMode; label: string; icon: LucideIcon }> = [
  { value: "folder", label: "Folder", icon: FolderTree },
  { value: "severity", label: "Severity", icon: ShieldAlert },
  { value: "category", label: "Category", icon: Tags },
  { value: "owasp", label: "OWASP", icon: LayoutList },
];
const SORT_MODES: Array<{ value: SortMode; label: string; icon: LucideIcon }> = [
  { value: "severity", label: "Severity", icon: ShieldAlert },
  { value: "newest", label: "Newest", icon: Clock3 },
  { value: "file", label: "File", icon: FileCode2 },
  { value: "status", label: "Status", icon: ArrowDownAZ },
];
const REPOSITORY_SECURITY_PAGE_SIZE = 25;

export function RepositorySecurityView({ projectId }: RepositorySecurityViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [owaspFilter, setOwaspFilter] = useState<string>("ALL");
  const [groupMode, setGroupMode] = useState<GroupMode>("folder");
  const [sortMode, setSortMode] = useState<SortMode>("severity");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);
  const filterOptionsQuery = useProjectFindingsQuery(projectId, {
    page: 1,
    limit: 250,
  });
  const findingsQuery = useProjectFindingsQuery(projectId, {
    page,
    limit: REPOSITORY_SECURITY_PAGE_SIZE,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    severity: severityFilter === "ALL" ? undefined : severityFilter,
    category: categoryFilter === "ALL" ? undefined : categoryFilter,
    owasp: owaspFilter === "ALL" ? undefined : owaspFilter,
    search: debouncedSearch.trim() || undefined,
  });
  const rawFindings = findingsQuery.data?.findings ?? [];
  const filterOptionFindings = filterOptionsQuery.data?.findings ?? [];
  const categories = useMemo(
    () => uniqueValues(filterOptionFindings.map((finding) => finding.category).filter(isPresent)),
    [filterOptionFindings],
  );
  const owaspValues = useMemo(
    () => uniqueValues(filterOptionFindings.map((finding) => finding.owasp).filter(isPresent)),
    [filterOptionFindings],
  );
  const filteredFindings = useMemo(
    () => sortFindings(rawFindings, sortMode),
    [rawFindings, sortMode],
  );
  const groupedFindings = useMemo(() => groupFindings(filteredFindings, groupMode), [filteredFindings, groupMode]);
  const summary = useMemo(
    () => summarizeFindings(filteredFindings, findingsQuery.data?.summary),
    [filteredFindings, findingsQuery.data?.summary],
  );
  const meta = findingsQuery.data?.meta;

  function resetPage() {
    setPage(1);
  }

  if (findingsQuery.isLoading) {
    return <RepositorySecuritySkeleton />;
  }

  if (findingsQuery.isError) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Unable to load security findings"
        description="Refresh the page or verify the backend is running."
        action={
          <Button type="button" variant="outline" onClick={() => void findingsQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-5"
    >
      <div className="grid gap-3 md:grid-cols-5">
        <SecurityMetric label="Open" value={summary.open} tone="warning" />
        <SecurityMetric label="Critical" value={summary.critical} tone="danger" />
        <SecurityMetric label="High" value={summary.high} tone="danger" />
        <SecurityMetric label="Folders shown" value={summary.folders} tone="neutral" />
        <SecurityMetric label="Total" value={summary.total} tone="neutral" />
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle>Repository security</CardTitle>
              <CardDescription>Findings grouped across repository structure and risk dimensions.</CardDescription>
            </div>
            <SegmentedControl
              label="Group"
              value={groupMode}
              options={GROUP_MODES}
              onChange={(value) => setGroupMode(value as GroupMode)}
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_auto] xl:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
                placeholder="Search findings, files, categories, OWASP"
                className="pl-9"
              />
            </div>
            <SegmentedControl
              label="Sort"
              value={sortMode}
              options={SORT_MODES}
              onChange={(value) => setSortMode(value as SortMode)}
            />
          </div>

          <div className="space-y-3">
            <FilterStrip
              label="Status"
              value={statusFilter}
              options={STATUSES}
              onChange={(value) => {
                setStatusFilter(value as FindingStatus | "ALL");
                resetPage();
              }}
            />
            <FilterStrip
              label="Severity"
              value={severityFilter}
              options={["ALL", ...FINDING_SEVERITIES]}
              onChange={(value) => {
                setSeverityFilter(value as FindingSeverity | "ALL");
                resetPage();
              }}
            />
            <FilterStrip
              label="Category"
              value={categoryFilter}
              options={["ALL", ...categories]}
              onChange={(value) => {
                setCategoryFilter(value);
                resetPage();
              }}
            />
            <FilterStrip
              label="OWASP"
              value={owaspFilter}
              options={["ALL", ...owaspValues]}
              onChange={(value) => {
                setOwaspFilter(value);
                resetPage();
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredFindings.length > 0 ? (
            <div className="overflow-hidden border-y border-border">
              {groupedFindings.map((group, index) => (
                <FindingGroup key={group.key} group={group} searchQuery={search} showSeparator={index > 0} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
              <ShieldCheck className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-foreground">No findings match this view</p>
              <p className="mt-2 text-sm text-muted-foreground">Adjust filters or run a repository scan.</p>
            </div>
          )}
          {meta ? <FindingsPagination meta={meta} isLoading={findingsQuery.isFetching} onPageChange={setPage} /> : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SecurityMetric({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "neutral" }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        tone === "danger"
          ? "border-destructive/20 bg-destructive/5 text-destructive"
          : tone === "warning"
            ? "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300"
            : "border-border bg-muted/20 text-foreground",
      )}
    >
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FindingGroup({
  group,
  searchQuery,
  showSeparator,
}: {
  group: { key: string; label: string; findings: Finding[] };
  searchQuery: string;
  showSeparator: boolean;
}) {
  return (
    <section>
      {showSeparator ? <Separator /> : null}
      <div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground" title={group.label}>
            <HighlightText query={searchQuery}>{group.label}</HighlightText>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{group.findings.length} shown on this page</p>
        </div>
        <SeverityStack findings={group.findings} />
      </div>
      <div className="divide-y divide-border">
        {group.findings.map((finding) => (
          <FindingRow key={finding.id} finding={finding} searchQuery={searchQuery} />
        ))}
      </div>
    </section>
  );
}

function FindingRow({ finding, searchQuery }: { finding: Finding; searchQuery: string }) {
  const fileLocation = `${finding.file}:${finding.line}`;
  const folderName = getFolderName(finding.file);

  return (
    <Link
      to={`/projects/${finding.projectId}/findings/${finding.id}`}
      className="block transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="grid gap-0 lg:grid-cols-[132px_minmax(0,1fr)_220px]">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/10 px-4 py-3 lg:flex-col lg:items-start lg:border-b-0 lg:border-r">
          <FindingSeverityBadge severity={finding.severity} />
          <Badge variant="outline">{formatFindingOption(finding.status)}</Badge>
          <span className="text-xs text-muted-foreground">{finding.confidence ?? "UNKNOWN"} confidence</span>
        </div>

        <div className="min-w-0 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {finding.category ? (
              <Badge variant="secondary">
                <HighlightText query={searchQuery}>{formatFindingOption(finding.category)}</HighlightText>
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground" title={finding.owasp ?? "Unmapped OWASP"}>
              <HighlightText query={searchQuery}>{finding.owasp ?? "Unmapped OWASP"}</HighlightText>
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-foreground" title={finding.title}>
            <HighlightText query={searchQuery}>{finding.title}</HighlightText>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground" title={finding.description}>
            <HighlightText query={searchQuery}>{finding.description}</HighlightText>
          </p>
          <div className="mt-3 rounded-md border border-border bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
            <span className="block break-all" title={fileLocation}>
              <HighlightText query={searchQuery}>{fileLocation}</HighlightText>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/10 px-4 py-3 text-xs lg:flex-col lg:items-start lg:justify-start lg:border-l lg:border-t-0">
          <span className="text-muted-foreground">Folder</span>
          <span className="max-w-full truncate font-medium text-foreground" title={folderName}>
            {folderName}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SeverityStack({ findings }: { findings: Finding[] }) {
  const counts = FINDING_SEVERITIES.map((severity) => ({
    severity,
    count: findings.filter((finding) => finding.severity === severity).length,
  })).filter((entry) => entry.count > 0);

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {counts.map((entry) => (
        <Badge key={entry.severity} variant={findingSeverityVariant(entry.severity)}>
          {entry.severity.slice(0, 1)} {entry.count}
        </Badge>
      ))}
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
  options: Array<{ value: string; label: string; icon: LucideIcon }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-1">
      <span className="px-2 text-xs text-muted-foreground">{label}</span>
      {options.map((option) => {
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "flex h-8 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors",
              value === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterStrip({
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
    <div className="flex flex-col gap-2 md:flex-row md:items-start">
      <span className="w-20 shrink-0 pt-1 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            title={option === "ALL" ? "All" : formatFindingOption(option)}
            className={cn(
              "h-7 max-w-full truncate rounded-md border px-2 text-xs font-medium transition-colors",
              value === option
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => onChange(option)}
          >
            {option === "ALL" ? "All" : formatFindingOption(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function groupFindings(findings: Finding[], groupMode: GroupMode) {
  const groups = new Map<string, Finding[]>();

  for (const finding of findings) {
    const key = getGroupKey(finding, groupMode);
    groups.set(key, [...(groups.get(key) ?? []), finding]);
  }

  return [...groups.entries()]
    .map(([key, groupFindingsValue]) => ({
      key,
      label: groupMode === "severity" || groupMode === "category" ? formatFindingOption(key) : key,
      findings: groupFindingsValue,
    }))
    .sort((left, right) => {
      if (groupMode === "severity") {
        return FINDING_SEVERITIES.indexOf(left.key as FindingSeverity) - FINDING_SEVERITIES.indexOf(right.key as FindingSeverity);
      }

      return left.label.localeCompare(right.label);
    });
}

function getGroupKey(finding: Finding, groupMode: GroupMode): string {
  if (groupMode === "folder") {
    return getFolderName(finding.file);
  }

  if (groupMode === "severity") {
    return finding.severity;
  }

  if (groupMode === "category") {
    return finding.category ?? "Uncategorized";
  }

  return finding.owasp ?? "Unmapped OWASP";
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

    if (sortMode === "status") {
      return left.status.localeCompare(right.status);
    }

    return FINDING_SEVERITIES.indexOf(left.severity) - FINDING_SEVERITIES.indexOf(right.severity);
  });
}

function summarizeFindings(findings: Finding[], summary?: FindingListSummary) {
  return {
    total: summary?.total ?? findings.length,
    open: summary?.byStatus.OPEN ?? findings.filter((finding) => finding.status === "OPEN").length,
    critical: summary?.bySeverity.CRITICAL ?? findings.filter((finding) => finding.severity === "CRITICAL").length,
    high: summary?.bySeverity.HIGH ?? findings.filter((finding) => finding.severity === "HIGH").length,
    folders: new Set(findings.map((finding) => getFolderName(finding.file))).size,
  };
}

function getFolderName(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const segments = normalizedPath.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return "/";
  }

  return segments.slice(0, -1).join("/");
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function isPresent(value: string | null | undefined): value is string {
  return Boolean(value);
}

function RepositorySecuritySkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[34rem] w-full" />
    </div>
  );
}
