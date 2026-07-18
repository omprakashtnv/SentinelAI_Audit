import { DiffEditor, Editor } from "@monaco-editor/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Code2,
  Download,
  FileCode2,
  GitPullRequestArrow,
  ShieldAlert,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FindingSeverityBadge } from "@/features/findings/finding-display";
import { useProjectFindingFixPreviewQuery } from "@/features/findings/finding.hooks";
import { useMonacoTheme } from "@/hooks/use-monaco-theme";
import { cn } from "@/lib/utils";
import type { FindingFixPreview } from "@/types/fix-preview";
import type { FindingSeverity } from "@/types/finding";

export function FixPreviewPage() {
  const { projectId, findingId } = useParams();
  const fixPreviewQuery = useProjectFindingFixPreviewQuery(projectId, findingId);
  const preview = fixPreviewQuery.data;
  const editorTheme = useMonacoTheme();

  if (!projectId || !findingId) {
    return <EmptyState icon={ShieldAlert} title="Fix preview unavailable" description="The fix preview route is incomplete." />;
  }

  if (fixPreviewQuery.isLoading) {
    return <FixPreviewSkeleton />;
  }

  if (fixPreviewQuery.isError || !preview) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Fix preview not found"
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
      className="flex flex-col gap-5"
    >
      <Button asChild type="button" variant="ghost" className="w-fit">
        <Link to={`/projects/${projectId}/findings/${preview.findingId}`}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Finding details
        </Link>
      </Button>

      <FixPreviewHeader
        preview={preview}
        onCopyCode={() => void copyToClipboard(preview.generatedFix, "Generated fix copied.")}
        onDownloadPatch={() => downloadPatch(preview.patch.unifiedDiff, buildPatchFileName(preview))}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <CodeDiffPanel preview={preview} editorTheme={editorTheme} />
          <CodeSnapshotGrid preview={preview} editorTheme={editorTheme} />
        </div>

        <aside className="space-y-5">
          <FixAssurancePanel preview={preview} />
          <ExplanationPanel preview={preview} />
          <PatchSummary preview={preview} />
        </aside>
      </div>
    </motion.div>
  );
}

function FixPreviewHeader({
  preview,
  onCopyCode,
  onDownloadPatch,
}: {
  preview: FindingFixPreview;
  onCopyCode: () => void;
  onDownloadPatch: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FindingSeverityBadge severity={preview.severity} />
              <Badge variant={preview.status === "RESOLVED" ? "success" : preview.status === "DISMISSED" ? "secondary" : "warning"}>
                {formatOption(preview.status)}
              </Badge>
              <Badge variant="outline">{preview.owasp ?? "Unmapped OWASP"}</Badge>
              {preview.enhancement.usedAi ? <Badge variant="success">OpenAI enhanced</Badge> : <Badge variant="outline">Template engine</Badge>}
            </div>
            <CardTitle className="mt-4 text-2xl leading-8 tracking-normal">{preview.title}</CardTitle>
            <CardDescription className="mt-2 break-all">
              {preview.file}:{preview.line}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onCopyCode}>
              <Clipboard className="size-4" aria-hidden="true" />
              Copy code
            </Button>
            <Button type="button" onClick={onDownloadPatch}>
              <Download className="size-4" aria-hidden="true" />
              Download patch
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-5 md:grid-cols-3">
        <IssueMetric label="Severity" value={preview.severity} severity={preview.severity} />
        <IssueMetric label="Confidence" value={preview.confidence ?? "Unknown"} />
        <IssueMetric label="Source" value={preview.enhancement.usedAi ? "OpenAI" : "Template"} />
      </CardContent>
    </Card>
  );
}

function FixAssurancePanel({ preview }: { preview: FindingFixPreview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
          Fix verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <AssuranceMetric label="Fix Source" value={preview.assurance.fixSource} verified />
        <AssuranceMetric label="Confidence" value={`${preview.assurance.confidenceScore}%`} />
        <AssuranceList label="Based On" values={preview.assurance.basedOn} />
        <AssuranceList label="Verification" values={preview.assurance.verification} checked />
      </CardContent>
    </Card>
  );
}

function AssuranceMetric({ label, value, verified = false }: { label: string; value: string; verified?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}:</p>
      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        {verified ? <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" /> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function AssuranceList({ label, values, checked = false }: { label: string; values: string[]; checked?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}:</p>
      <ul className="mt-2 space-y-2">
        {values.map((value) => (
          <li key={value} className="flex items-start gap-2 text-sm text-foreground">
            {checked ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
            ) : (
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
            )}
            <span>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CodeDiffPanel({ preview, editorTheme }: { preview: FindingFixPreview; editorTheme: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitPullRequestArrow className="size-4 text-muted-foreground" aria-hidden="true" />
              Side-by-side diff
            </CardTitle>
            <CardDescription>Original Code and Generated Fix</CardDescription>
          </div>
          <Badge variant={preview.enhancement.usedAi ? "success" : "outline"}>{preview.language}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground">
          <div className="border-r border-border px-4 py-2">Original Code</div>
          <div className="px-4 py-2">Generated Fix</div>
        </div>
        <div className="h-[34rem] min-h-[28rem]">
          <DiffEditor
            height="100%"
            language={toMonacoLanguage(preview.language)}
            original={preview.originalCode}
            modified={preview.generatedFix}
            theme={editorTheme}
            loading={<EditorLoading />}
            options={{
              automaticLayout: true,
              fontFamily: "JetBrains Mono, SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace",
              fontLigatures: true,
              fontSize: 13,
              lineHeight: 21,
              minimap: { enabled: false },
              originalEditable: false,
              readOnly: true,
              renderSideBySide: true,
              scrollBeyondLastLine: false,
              wordWrap: "on",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CodeSnapshotGrid({ preview, editorTheme }: { preview: FindingFixPreview; editorTheme: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <CodeSnapshot
        title="Original Code"
        tone="danger"
        code={preview.originalCode}
        language={toMonacoLanguage(preview.language)}
        editorTheme={editorTheme}
      />
      <CodeSnapshot
        title="Generated Fix"
        tone="success"
        code={preview.generatedFix}
        language={toMonacoLanguage(preview.language)}
        editorTheme={editorTheme}
      />
    </div>
  );
}

function CodeSnapshot({
  title,
  tone,
  code,
  language,
  editorTheme,
}: {
  title: string;
  tone: "danger" | "success";
  code: string;
  language: string;
  editorTheme: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className={cn(
          "border-b border-border py-3",
          tone === "danger" ? "bg-destructive/5" : "bg-emerald-500/5",
        )}
      >
        <CardTitle
          className={cn(
            "flex items-center gap-2 text-xs uppercase tracking-normal",
            tone === "danger" ? "text-destructive" : "text-emerald-700 dark:text-emerald-300",
          )}
        >
          <FileCode2 className="size-4" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-72">
          <DiffPreviewEditor code={code} language={language} editorTheme={editorTheme} />
        </div>
      </CardContent>
    </Card>
  );
}

function DiffPreviewEditor({
  code,
  language,
  editorTheme,
}: {
  code: string;
  language: string;
  editorTheme: string;
}) {
  return (
    <Editor
      height="100%"
      language={language}
      value={code}
      theme={editorTheme}
      loading={<EditorLoading />}
      options={{
        automaticLayout: true,
        fontFamily: "JetBrains Mono, SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace",
        fontSize: 13,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        minimap: { enabled: false },
        readOnly: true,
        scrollBeyondLastLine: false,
        wordWrap: "on",
      }}
    />
  );
}

function ExplanationPanel({ preview }: { preview: FindingFixPreview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-muted-foreground" aria-hidden="true" />
          Explanation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TextBlock label="Issue" value={preview.explanation} />
        <TextBlock label="Recommendation" value={preview.recommendation} />
        <TextBlock
          label="Enhancement"
          value={
            preview.enhancement.usedAi
              ? `Enhanced by ${preview.enhancement.model ?? "OpenAI"}.`
              : `Using built-in template engine${preview.enhancement.reason ? ` (${formatOption(preview.enhancement.reason)})` : ""}.`
          }
        />
      </CardContent>
    </Card>
  );
}

function PatchSummary({ preview }: { preview: FindingFixPreview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="size-4 text-muted-foreground" aria-hidden="true" />
          Patch
        </CardTitle>
        <CardDescription>Unified diff preview</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <PatchStat label="Added" value={preview.patch.summary.addedLines} tone="success" />
          <PatchStat label="Removed" value={preview.patch.summary.removedLines} tone="danger" />
          <PatchStat label="Modified" value={preview.patch.summary.modifiedLines} tone="neutral" />
        </div>
        <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs leading-5 text-foreground">
          <code>{preview.patch.unifiedDiff}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

function IssueMetric({
  label,
  value,
  severity,
}: {
  label: string;
  value: string;
  severity?: FindingSeverity;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/70 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {severity ? <SeverityDot severity={severity} /> : <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />}
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SeverityDot({ severity }: { severity: FindingSeverity }) {
  return (
    <span
      className={cn(
        "size-2.5 rounded-full",
        severity === "CRITICAL" && "bg-red-500",
        severity === "HIGH" && "bg-orange-500",
        severity === "MEDIUM" && "bg-amber-500",
        severity === "LOW" && "bg-sky-500",
        severity === "INFO" && "bg-muted-foreground",
      )}
    />
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function PatchStat({ label, value, tone }: { label: string; value: number; tone: "success" | "danger" | "neutral" }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold",
          tone === "success" && "text-emerald-600 dark:text-emerald-400",
          tone === "danger" && "text-destructive",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EditorLoading() {
  return (
    <div className="grid gap-2 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-10/12" />
      <Skeleton className="h-4 w-8/12" />
    </div>
  );
}

function FixPreviewSkeleton() {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Skeleton className="h-[34rem] w-full" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
        <div className="space-y-5">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}

function toMonacoLanguage(language: FindingFixPreview["language"]) {
  if (language === "tsx") {
    return "typescript";
  }

  if (language === "jsx") {
    return "javascript";
  }

  if (language === "prisma" || language === "text") {
    return "plaintext";
  }

  return language;
}

async function copyToClipboard(value: string, successMessage: string) {
  await navigator.clipboard.writeText(value);
  toast.success(successMessage);
}

function downloadPatch(patch: string, fileName: string) {
  const blob = new Blob([patch], { type: "text/x-diff;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  toast.success("Patch prepared.");
}

function buildPatchFileName(preview: FindingFixPreview) {
  const safeTitle = preview.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safeTitle || "security-fix"}.patch`;
}

function formatOption(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
