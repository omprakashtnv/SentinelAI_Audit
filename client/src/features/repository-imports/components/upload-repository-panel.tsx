import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  FileArchive,
  Github,
  Loader2,
  RefreshCw,
  SearchCode,
  UploadCloud,
} from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { FormError } from "@/components/feedback/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useImportGitHubRepositoryMutation,
  useUploadRepositoryZipMutation,
} from "@/features/repository-imports/repository-import.hooks";
import {
  githubRepositoryImportSchema,
  validateZipFile,
  type GitHubRepositoryImportValues,
} from "@/features/repository-imports/repository-import.schemas";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/services/api/api-client";
import type { RepositoryImportResult } from "@/types/repository-import";

type UploadMode = "zip" | "github";

type UploadRepositoryPanelProps = {
  projectId: string;
};

export function UploadRepositoryPanel({ projectId }: UploadRepositoryPanelProps) {
  const [mode, setMode] = useState<UploadMode>("zip");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<RepositoryImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const zipMutation = useUploadRepositoryZipMutation(projectId);
  const githubMutation = useImportGitHubRepositoryMutation(projectId);
  const githubForm = useForm<GitHubRepositoryImportValues>({
    resolver: zodResolver(githubRepositoryImportSchema),
    defaultValues: {
      repositoryUrl: "",
    },
  });

  const isImporting = zipMutation.isPending || githubMutation.isPending;

  function handleFileSelection(file: File | null) {
    const validationMessage = validateZipFile(file);
    setSelectedFile(file);
    setZipError(validationMessage);
    setResult(null);
    setUploadProgress(0);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files.item(0));
  }

  async function handleZipUpload() {
    const validationMessage = validateZipFile(selectedFile);
    setZipError(validationMessage);

    if (!selectedFile || validationMessage) {
      return;
    }

    try {
      setResult(null);
      setUploadProgress(2);
      const upload = await zipMutation.mutateAsync({
        file: selectedFile,
        onProgress: setUploadProgress,
      });
      setUploadProgress(100);
      setResult({ source: "zip", upload });
      toast.success("Repository uploaded.");
    } catch (error) {
      setUploadProgress(0);
      toast.error(error instanceof ApiClientError ? error.message : "Upload failed.");
    }
  }

  async function handleGitHubImport(values: GitHubRepositoryImportValues) {
    try {
      setResult(null);
      const repository = await githubMutation.mutateAsync(values.repositoryUrl);
      setResult({ source: "github", repository });
      toast.success("Repository imported.");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "GitHub import failed.");
    }
  }

  function handleReset() {
    setResult(null);
    setSelectedFile(null);
    setZipError(null);
    setUploadProgress(0);
    githubForm.reset();
    zipMutation.reset();
    githubMutation.reset();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <div className="border-b border-border p-4">
          <SegmentedSourcePicker value={mode} disabled={isImporting} onChange={setMode} />
        </div>

        <AnimatePresence mode="wait">
          {mode === "zip" ? (
            <motion.div
              key="zip"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="p-4 sm:p-5"
            >
              <div
                className={cn(
                  "relative flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/20 hover:bg-muted/30",
                )}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <motion.div
                  animate={isDragging ? { scale: 1.05, y: -2 } : { scale: 1, y: 0 }}
                  className="flex size-12 items-center justify-center rounded-md border border-border bg-background"
                >
                  <UploadCloud className="size-6 text-muted-foreground" aria-hidden="true" />
                </motion.div>
                <h2 className="mt-4 text-base font-semibold text-foreground">ZIP archive</h2>
                <p className="mt-2 text-sm text-muted-foreground">{selectedFile?.name ?? "No file selected"}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isImporting}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileArchive className="size-4" aria-hidden="true" />
                    Select ZIP
                  </Button>
                  <Button type="button" disabled={isImporting || Boolean(zipError) || !selectedFile} onClick={handleZipUpload}>
                    {zipMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                    Upload
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="sr-only"
                  onChange={(event) => handleFileSelection(event.target.files?.item(0) ?? null)}
                />
              </div>

              <FormError message={zipError ?? (zipMutation.error instanceof ApiClientError ? zipMutation.error.message : undefined)} />
              <ProgressStatus
                label={zipMutation.isPending ? "Uploading archive" : selectedFile ? "Ready to upload" : "Waiting for archive"}
                progress={uploadProgress}
                active={zipMutation.isPending}
              />
            </motion.div>
          ) : (
            <motion.form
              key="github"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-5 p-4 sm:p-5"
              onSubmit={githubForm.handleSubmit(handleGitHubImport)}
            >
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md border border-border bg-background">
                    <Github className="size-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">GitHub repository</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Public repositories only</p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  <Label htmlFor="repositoryUrl">Repository URL</Label>
                  <Input
                    id="repositoryUrl"
                    placeholder="https://github.com/acme/sentinelai"
                    disabled={isImporting}
                    {...githubForm.register("repositoryUrl")}
                  />
                  <FieldError message={githubForm.formState.errors.repositoryUrl?.message} />
                </div>
              </div>

              <FormError message={githubMutation.error instanceof ApiClientError ? githubMutation.error.message : undefined} />
              <ProgressStatus
                label={githubMutation.isPending ? "Importing repository" : "Ready to import"}
                progress={githubMutation.isPending ? 72 : 0}
                active={githubMutation.isPending}
                indeterminate={githubMutation.isPending}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isImporting}>
                  {githubMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  Import
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </section>

      <StatusPanel
        projectId={projectId}
        result={result}
        isImporting={isImporting}
        onReset={handleReset}
      />
    </div>
  );
}

function SegmentedSourcePicker({
  value,
  disabled,
  onChange,
}: {
  value: UploadMode;
  disabled: boolean;
  onChange: (value: UploadMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-md border border-border bg-muted/30 p-1">
      {[
        { value: "zip" as const, label: "ZIP Upload", icon: FileArchive },
        { value: "github" as const, label: "GitHub URL", icon: Github },
      ].map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            title={option.label}
            className={cn(
              "relative flex h-9 items-center justify-center gap-2 rounded-sm text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-60",
              isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {isSelected ? (
              <motion.span
                layoutId="repository-upload-mode"
                className="absolute inset-0 rounded-sm bg-background shadow-sm"
                transition={{ duration: 0.18 }}
              />
            ) : null}
            <Icon className="relative size-4" aria-hidden="true" />
            <span className="relative truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ProgressStatus({
  label,
  progress,
  active,
  indeterminate = false,
}: {
  label: string;
  progress: number;
  active: boolean;
  indeterminate?: boolean;
}) {
  const boundedProgress = Math.max(0, Math.min(progress, 100));

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Badge variant={active ? "warning" : boundedProgress === 100 ? "success" : "outline"}>
          {active ? "Working" : boundedProgress === 100 ? "Complete" : "Idle"}
        </Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={
            indeterminate
              ? { width: ["18%", "82%", "28%"], x: ["0%", "18%", "340%"] }
              : { width: `${boundedProgress}%`, x: "0%" }
          }
          transition={indeterminate ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{boundedProgress}%</p>
    </div>
  );
}

function StatusPanel({
  projectId,
  result,
  isImporting,
  onReset,
}: {
  projectId: string;
  result: RepositoryImportResult | null;
  isImporting: boolean;
  onReset: () => void;
}) {
  return (
    <aside className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm">
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col"
          >
            <div className="flex size-11 items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/10">
              <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">Repository ready</h2>
            <RepositorySummary result={result} />
            <div className="mt-6 grid gap-2">
              <Button asChild type="button">
                <Link to={`/projects/${projectId}/repository`}>
                  <SearchCode className="size-4" aria-hidden="true" />
                  Explore repository
                </Link>
              </Button>
              <Button type="button" variant="outline" onClick={onReset}>
                <RefreshCw className="size-4" aria-hidden="true" />
                Import another
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex size-11 items-center justify-center rounded-md border border-border bg-muted/30">
              {isImporting ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : (
                <UploadCloud className="size-5 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">Upload status</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <StatusRow label="Validation" value="Client and API" />
              <StatusRow label="Storage" value="Temporary repository workspace" />
              <StatusRow label="Next" value="Repository explorer" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

function RepositorySummary({ result }: { result: RepositoryImportResult }) {
  if (result.source === "zip") {
    return (
      <div className="mt-4 grid gap-3 text-sm">
        <StatusRow label="Source" value="ZIP archive" />
        <StatusRow label="Filename" value={result.upload.originalFilename} />
        <StatusRow label="Size" value={formatFileSize(result.upload.sizeBytes)} />
        <StatusRow label="Uploaded" value={formatDate(result.upload.createdAt)} />
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 text-sm">
      <StatusRow label="Source" value="GitHub" />
      <StatusRow label="Repository" value={`${result.repository.owner}/${result.repository.name}`} />
      <StatusRow label="Branch" value={result.repository.defaultBranch} />
      <StatusRow label="Commit" value={result.repository.commitSha.slice(0, 12)} />
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
