import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  GitPullRequestArrow,
  ExternalLink,
  FileCode2,
  Gauge,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FindingSeverityBadge, formatFindingOption } from "@/features/findings/finding-display";
import {
  useDismissFindingMutation,
  useProjectFindingExplanationQuery,
  useProjectFindingQuery,
  useResolveFindingMutation,
} from "@/features/findings/finding.hooks";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-client";
import type { Finding, FindingCodeExample, FindingExplanation } from "@/types/finding";

export function FindingDetailsPage() {
  const { projectId, findingId } = useParams();
  const findingQuery = useProjectFindingQuery(projectId, findingId);
  const explanationQuery = useProjectFindingExplanationQuery(projectId, findingId);
  const resolveMutation = useResolveFindingMutation(projectId ?? "");
  const dismissMutation = useDismissFindingMutation(projectId ?? "");
  const finding = findingQuery.data;
  const explanation = explanationQuery.data;

  async function handleResolve() {
    if (!finding) {
      return;
    }

    try {
      await resolveMutation.mutateAsync(finding.id);
      toast.success("Finding resolved.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Unable to resolve finding.");
    }
  }

  async function handleDismiss() {
    if (!finding) {
      return;
    }

    try {
      await dismissMutation.mutateAsync(finding.id);
      toast.success("Finding dismissed.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Unable to dismiss finding.");
    }
  }

  if (!projectId || !findingId) {
    return <EmptyState icon={ShieldAlert} title="Finding unavailable" description="The finding route is incomplete." />;
  }

  if (findingQuery.isLoading || explanationQuery.isLoading) {
    return <FindingDetailsSkeleton />;
  }

  if (findingQuery.isError || explanationQuery.isError || !finding || !explanation) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Finding not found"
        description="This finding may have been deleted or is unavailable."
        action={
          <Button asChild type="button" variant="outline">
            <Link to={`/projects/${projectId}`}>Back to project</Link>
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
      className="flex flex-col gap-6"
    >
      <FindingHeader
        projectId={projectId}
        finding={finding}
        explanation={explanation}
        isResolving={resolveMutation.isPending}
        isDismissing={dismissMutation.isPending}
        onResolve={() => void handleResolve()}
        onDismiss={() => void handleDismiss()}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <ImpactCard title="Description" body={explanation.description} />
          <ImpactCard title="Why it matters" body={explanation.whyItMatters} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ImpactCard title="Business impact" body={explanation.businessImpact} />
            <ImpactCard title="Technical impact" body={explanation.technicalImpact} />
          </div>
          <RecommendationCard recommendation={explanation.recommendation} />
          <CodeExampleCard codeExample={explanation.codeExample} />
        </div>

        <aside className="space-y-4">
          <RiskCard finding={finding} explanation={explanation} />
          <StatusCard finding={finding} />
          <ReferencesCard references={explanation.references} />
        </aside>
      </div>
    </motion.div>
  );
}

function FindingHeader({
  projectId,
  finding,
  explanation,
  isResolving,
  isDismissing,
  onResolve,
  onDismiss,
}: {
  projectId: string;
  finding: Finding;
  explanation: FindingExplanation;
  isResolving: boolean;
  isDismissing: boolean;
  onResolve: () => void;
  onDismiss: () => void;
}) {
  const canResolve = finding.status !== "RESOLVED";
  const canDismiss = finding.status !== "DISMISSED";

  return (
    <div className="flex flex-col gap-4">
      <Button asChild type="button" variant="ghost" className="w-fit">
        <Link to={`/projects/${projectId}`}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Project audit
        </Link>
      </Button>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <FindingSeverityBadge severity={finding.severity} />
                <StatusBadge status={finding.status} />
                <Badge variant="outline">{explanation.riskLevel.label} risk</Badge>
              </div>
              <CardTitle className="mt-4 text-2xl tracking-normal">{explanation.title}</CardTitle>
              <CardDescription className="mt-2 break-all">
                {finding.file}:{finding.line}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild type="button" variant="outline">
                <Link to={`/projects/${projectId}/findings/${finding.id}/fix-preview`}>
                  <GitPullRequestArrow className="size-4" aria-hidden="true" />
                  Preview fix
                </Link>
              </Button>
              {canResolve ? (
                <Button type="button" variant="outline" disabled={isResolving} onClick={onResolve}>
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Resolve
                </Button>
              ) : null}
              {canDismiss ? (
                <Button type="button" variant="outline" disabled={isDismissing} onClick={onDismiss}>
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  Dismiss
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

function ImpactCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ recommendation }: { recommendation: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm leading-6 text-emerald-700 dark:text-emerald-300">
          {recommendation}
        </div>
      </CardContent>
    </Card>
  );
}

function CodeExampleCard({ codeExample }: { codeExample: FindingCodeExample | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Code example</CardTitle>
        <CardDescription>Vulnerable pattern and a safer implementation direction.</CardDescription>
      </CardHeader>
      <CardContent>
        {codeExample ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <CodeBlock title="Vulnerable" tone="danger" code={codeExample.vulnerable} />
            <CodeBlock title="Secure" tone="success" code={codeExample.secure} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No code example is available for this custom finding.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CodeBlock({ title, tone, code }: { title: string; tone: "danger" | "success"; code: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium",
          tone === "danger" ? "bg-destructive/5 text-destructive" : "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
        )}
      >
        <FileCode2 className="size-3.5" aria-hidden="true" />
        {title}
      </div>
      <pre className="max-h-72 overflow-auto bg-muted/30 p-3 text-xs leading-5 text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function RiskCard({ finding, explanation }: { finding: Finding; explanation: FindingExplanation }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Metric label="Severity" value={finding.severity} badge={<FindingSeverityBadge severity={finding.severity} />} />
        <Metric label="OWASP" value={explanation.owasp ?? "Unmapped"} />
        <Metric label="File path" value={finding.file} />
        <Metric label="Line number" value={String(finding.line)} />
        <Separator />
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Gauge className="size-3.5" aria-hidden="true" />
              Confidence
            </span>
            <span>{Math.round(explanation.confidence.score * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(explanation.confidence.score * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{explanation.confidence.label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard({ finding }: { finding: Finding }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Metric label="Current status" value={formatFindingOption(finding.status)} badge={<StatusBadge status={finding.status} />} />
        <Metric label="Resolved" value={finding.resolvedAt ? formatDate(finding.resolvedAt) : "Not resolved"} />
        <Metric label="Dismissed" value={finding.dismissedAt ? formatDate(finding.dismissedAt) : "Not dismissed"} />
        <Metric label="Created" value={formatDate(finding.createdAt)} />
      </CardContent>
    </Card>
  );
}

function ReferencesCard({ references }: { references: FindingExplanation["references"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>References</CardTitle>
      </CardHeader>
      <CardContent>
        {references.length > 0 ? (
          <div className="space-y-2">
            {references.map((reference) => (
              <Button key={reference.url} asChild type="button" variant="outline" className="w-full justify-between">
                <a href={reference.url} target="_blank" rel="noreferrer">
                  {reference.title}
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No external references are mapped for this finding.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, badge }: { label: string; value: string; badge?: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex min-w-0 items-center gap-2">
        <span className="break-all text-sm font-medium text-foreground">{value}</span>
        {badge}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Finding["status"] }) {
  const variant: BadgeProps["variant"] =
    status === "RESOLVED" ? "success" : status === "DISMISSED" ? "secondary" : "warning";
  const Icon = status === "RESOLVED" ? CheckCircle2 : status === "DISMISSED" ? XCircle : AlertTriangle;

  return (
    <Badge variant={variant}>
      <Icon className="mr-1 size-3" aria-hidden="true" />
      {formatFindingOption(status)}
    </Badge>
  );
}

function FindingDetailsSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
