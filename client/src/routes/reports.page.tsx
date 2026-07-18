import { motion } from "framer-motion";
import { CheckCircle2, Copy, Download, FileCheck2, Printer, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectFindingsQuery } from "@/features/findings/finding.hooks";
import { useProjectsQuery } from "@/features/projects/project.hooks";
import { cn } from "@/lib/utils";
import type { Finding, FindingSeverity } from "@/types/finding";
import type { Project } from "@/types/project";

const REPORT_FINDING_LIMIT = 250;
const CERTIFICATE_COVERAGE = ["Authentication", "Authorization", "Secrets", "Logging"] as const;
const CERTIFICATE_SEVERITIES: FindingSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const CERTIFICATE_SCORE_WEIGHTS: Record<FindingSeverity, number> = {
  CRITICAL: 3,
  HIGH: 1.2,
  MEDIUM: 0.5,
  LOW: 0.2,
  INFO: 0.05,
};

export function ReportsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const projectsQuery = useProjectsQuery({ page: 1, limit: 100 });
  const projects = projectsQuery.data?.projects ?? [];
  const activeProjectId = selectedProjectId || projects[0]?.id || "";
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;
  const findingsQuery = useProjectFindingsQuery(activeProjectId || undefined, {
    page: 1,
    limit: REPORT_FINDING_LIMIT,
  });
  const findings = findingsQuery.data?.findings ?? [];
  const certificate = useMemo(
    () => (activeProject ? buildCertificate(activeProject, findings) : null),
    [activeProject, findings],
  );

  if (projectsQuery.isLoading) {
    return <ReportsSkeleton />;
  }

  if (projectsQuery.isError) {
    return (
      <EmptyState
        icon={FileCheck2}
        title="Reports unavailable"
        description="SentinelAI could not load your project list."
        action={
          <Button type="button" variant="outline" onClick={() => void projectsQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FileCheck2}
        title="No projects to certify"
        description="Create a project and run a scan to generate a Security Health Certificate."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-card">
              <FileCheck2 className="size-4 text-primary" aria-hidden="true" />
            </div>
            <Badge variant="outline">Audit report</Badge>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-normal text-foreground">Security Health Certificate</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Generate a board-ready security summary from the latest SentinelAI findings.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={activeProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="h-10 min-w-64 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            aria-label="Select project"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={!certificate}
            onClick={() => certificate && copyCertificate(certificate)}
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!certificate}
            onClick={() => certificate && downloadCertificate(certificate)}
          >
            <Download className="size-4" aria-hidden="true" />
            Download
          </Button>
          <Button type="button" disabled={!certificate} onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" />
            Print
          </Button>
        </div>
      </div>

      {findingsQuery.isError ? (
        <EmptyState
          icon={FileCheck2}
          title="Certificate findings unavailable"
          description="SentinelAI could not load findings for the selected project."
          action={
            <Button type="button" variant="outline" onClick={() => void findingsQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : findingsQuery.isLoading || !certificate ? (
        <ReportsSkeleton compact />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SecurityCertificate certificate={certificate} />
          <CertificateContext certificate={certificate} />
        </div>
      )}
    </motion.div>
  );
}

type SecurityCertificateModel = {
  repositoryName: string;
  generatedAt: string;
  generatedDateLabel: string;
  score: number;
  counts: Record<FindingSeverity, number>;
  coverage: typeof CERTIFICATE_COVERAGE;
  totalFindings: number;
};

function SecurityCertificate({ certificate }: { certificate: SecurityCertificateModel }) {
  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm print:border-foreground print:bg-white print:text-black">
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-background px-6 py-8 print:border-2 print:border-black">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">SentinelAI</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">Security Health Certificate</h2>
          </div>
          <div className="flex size-14 items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/10">
            <ShieldCheck className="size-7 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
        </div>

        <div className="grid gap-6 py-7 md:grid-cols-[1fr_220px] md:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Repository:</p>
            <p className="mt-2 break-all text-xl font-semibold text-foreground">{certificate.repositoryName}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 px-5 py-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">Overall Score</p>
            <div className="mt-2 flex items-end justify-center gap-1">
              <span className={cn("text-5xl font-semibold", scoreTone(certificate.score))}>{certificate.score}</span>
              <span className="pb-1 text-lg font-medium text-muted-foreground">/ 100</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-y border-border py-6 sm:grid-cols-4">
          {CERTIFICATE_SEVERITIES.map((severity) => (
            <SeverityCount key={severity} severity={severity} value={certificate.counts[severity]} />
          ))}
        </div>

        <div className="grid gap-6 py-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-foreground">OWASP Coverage</p>
            <div className="mt-4 space-y-3">
              {certificate.coverage.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Generated</p>
            <p className="mt-4 text-sm text-muted-foreground">{certificate.generatedDateLabel}</p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              This certificate summarizes current non-dismissed security findings and scanner coverage for the selected repository.
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-5 text-xs text-muted-foreground">
          Certificate generated by SentinelAI Security Auditor.
        </div>
      </div>
    </section>
  );
}

function CertificateContext({ certificate }: { certificate: SecurityCertificateModel }) {
  return (
    <aside className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Certificate summary</CardTitle>
          <CardDescription>Current report inputs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ContextRow label="Repository" value={certificate.repositoryName} />
          <ContextRow label="Findings counted" value={String(certificate.totalFindings)} />
          <ContextRow label="Generated" value={certificate.generatedDateLabel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coverage</CardTitle>
          <CardDescription>Included security control areas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {certificate.coverage.map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </aside>
  );
}

function SeverityCount({ severity, value }: { severity: FindingSeverity; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background/80 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{formatSeverity(severity)}</p>
      <p className={cn("mt-2 text-2xl font-semibold", severityTone(severity))}>{value}</p>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="break-all text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function ReportsSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-6">
      {!compact ? <Skeleton className="h-28 w-full" /> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[38rem] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    </div>
  );
}

function buildCertificate(project: Project, findings: Finding[]): SecurityCertificateModel {
  const countedFindings = findings.filter((finding) => finding.status !== "DISMISSED" && finding.status !== "RESOLVED");
  const counts = CERTIFICATE_SEVERITIES.reduce(
    (accumulator, severity) => ({
      ...accumulator,
      [severity]: countedFindings.filter((finding) => finding.severity === severity).length,
    }),
    { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 } as Record<FindingSeverity, number>,
  );
  const generatedAt = new Date().toISOString();

  return {
    repositoryName: project.repositoryUrl ? getRepositoryName(project.repositoryUrl) : project.name,
    generatedAt,
    generatedDateLabel: formatCertificateDate(generatedAt),
    score: calculateCertificateScore(counts),
    counts,
    coverage: CERTIFICATE_COVERAGE,
    totalFindings: countedFindings.length,
  };
}

function calculateCertificateScore(counts: Record<FindingSeverity, number>) {
  const deductions = Object.entries(counts).reduce((total, [severity, count]) => {
    return total + CERTIFICATE_SCORE_WEIGHTS[severity as FindingSeverity] * count;
  }, 0);

  return Math.max(0, Math.min(100, Math.round(100 - deductions)));
}

function getRepositoryName(repositoryUrl: string) {
  try {
    const url = new URL(repositoryUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const repo = parts[parts.length - 1]?.replace(/\.git$/i, "");

    return repo || repositoryUrl;
  } catch {
    return repositoryUrl;
  }
}

function formatCertificateDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatSeverity(severity: FindingSeverity) {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}

function scoreTone(score: number) {
  if (score >= 85) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (score >= 65) {
    return "text-amber-600 dark:text-amber-400";
  }

  return "text-destructive";
}

function severityTone(severity: FindingSeverity) {
  if (severity === "CRITICAL") {
    return "text-red-600 dark:text-red-400";
  }

  if (severity === "HIGH") {
    return "text-orange-600 dark:text-orange-400";
  }

  if (severity === "MEDIUM") {
    return "text-amber-600 dark:text-amber-400";
  }

  if (severity === "LOW") {
    return "text-sky-600 dark:text-sky-400";
  }

  return "text-muted-foreground";
}

function toCertificateText(certificate: SecurityCertificateModel) {
  return [
    "Security Health Certificate",
    "",
    `Repository: ${certificate.repositoryName}`,
    "",
    "Overall Score",
    `${certificate.score} / 100`,
    "",
    `Critical: ${certificate.counts.CRITICAL}`,
    `High: ${certificate.counts.HIGH}`,
    `Medium: ${certificate.counts.MEDIUM}`,
    `Low: ${certificate.counts.LOW}`,
    "",
    "OWASP Coverage",
    ...certificate.coverage.map((item) => `- ${item}`),
    "",
    `Generated: ${certificate.generatedDateLabel}`,
  ].join("\n");
}

async function copyCertificate(certificate: SecurityCertificateModel) {
  await navigator.clipboard.writeText(toCertificateText(certificate));
  toast.success("Certificate copied.");
}

function downloadCertificate(certificate: SecurityCertificateModel) {
  const blob = new Blob([toCertificateText(certificate)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${certificate.repositoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-security-certificate.txt`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  toast.success("Certificate downloaded.");
}
