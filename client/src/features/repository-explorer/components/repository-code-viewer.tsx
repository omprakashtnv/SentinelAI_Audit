import Editor from "@monaco-editor/react";
import { AlertCircle, Code2, Copy, FileCode2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/app/theme/theme-provider";
import type { RepositoryFileContent, RepositoryFileMetadata, RepositoryLanguage } from "@/types/repository";

type RepositoryCodeViewerProps = {
  selectedFile: RepositoryFileMetadata | null;
  fileContent: RepositoryFileContent | undefined;
  isLoading: boolean;
  isError: boolean;
};

export function RepositoryCodeViewer({
  selectedFile,
  fileContent,
  isLoading,
  isError,
}: RepositoryCodeViewerProps) {
  const editorTheme = useMonacoTheme();

  if (!selectedFile) {
    return (
      <div className="flex min-h-[32rem] items-center justify-center border-t border-border bg-background px-6 text-center">
        <div>
          <div className="mx-auto flex size-10 items-center justify-center rounded-md border border-border bg-muted/30">
            <Code2 className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">No file selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[32rem] flex-1 flex-col overflow-hidden">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <FileCode2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="truncate text-sm font-medium text-foreground">{selectedFile.relativePath}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatFileSize(selectedFile.sizeBytes)} · {selectedFile.language} ·{" "}
            {selectedFile.sha256.slice(0, 12)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!fileContent?.content}
          onClick={() => copyToClipboard(fileContent?.content ?? "")}
          title="Copy file contents"
        >
          <Copy className="size-4" aria-hidden="true" />
          Copy
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-2 border-t border-border p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : isError ? (
        <div className="flex min-h-[28rem] items-center justify-center border-t border-border px-6 text-center">
          <div>
            <AlertCircle className="mx-auto size-6 text-destructive" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">Unable to load file</p>
          </div>
        </div>
      ) : (
        <div className="min-h-[28rem] flex-1 border-t border-border">
          <Editor
            height="100%"
            language={toMonacoLanguage(selectedFile.language)}
            theme={editorTheme}
            value={fileContent?.content ?? ""}
            loading={<EditorLoading />}
            options={{
              automaticLayout: true,
              contextmenu: true,
              fontFamily:
                "JetBrains Mono, SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace",
              fontLigatures: true,
              fontSize: 13,
              lineHeight: 21,
              minimap: { enabled: false },
              padding: { top: 14, bottom: 14 },
              readOnly: true,
              renderLineHighlight: "line",
              scrollBeyondLastLine: false,
              wordWrap: "on",
            }}
          />
        </div>
      )}
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

function useMonacoTheme() {
  const { theme } = useTheme();
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return useMemo(() => {
    if (theme === "dark" || (theme === "system" && systemDark)) {
      return "vs-dark";
    }

    return "light";
  }, [systemDark, theme]);
}

function toMonacoLanguage(language: RepositoryLanguage) {
  const monacoLanguageMap: Record<RepositoryLanguage, string> = {
    javascript: "javascript",
    json: "json",
    markdown: "markdown",
    prisma: "plaintext",
    typescript: "typescript",
    yaml: "yaml",
  };

  return monacoLanguageMap[language];
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

async function copyToClipboard(value: string) {
  await navigator.clipboard.writeText(value);
  toast.success("Copied.");
}
