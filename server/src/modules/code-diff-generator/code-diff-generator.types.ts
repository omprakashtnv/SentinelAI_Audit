export type CodeDiffLanguage =
  | "typescript"
  | "javascript"
  | "tsx"
  | "jsx"
  | "json"
  | "prisma"
  | "markdown"
  | "yaml"
  | "text";

export type CodeDiffLineType = "context" | "added" | "removed" | "modified";

export type InlineDiffChangeType = "unchanged" | "added" | "removed";

export type SyntaxTokenKind =
  | "plain"
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "function"
  | "type"
  | "property"
  | "operator"
  | "punctuation"
  | "boolean"
  | "null"
  | "tag"
  | "attribute";

export type SyntaxToken = {
  value: string;
  kind: SyntaxTokenKind;
};

export type InlineDiffToken = {
  value: string;
  change: InlineDiffChangeType;
};

export type HighlightedInlineDiffToken = InlineDiffToken & {
  syntax: SyntaxTokenKind;
};

export type CodeDiffInput = {
  originalCode: string;
  generatedSecureCode: string;
  language?: CodeDiffLanguage;
  originalFileName?: string;
  generatedFileName?: string;
  contextLines?: number;
  includeSyntaxHighlighting?: boolean;
};

export type CodeDiffLine = {
  id: string;
  type: CodeDiffLineType;
  marker: " " | "+" | "-";
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
  syntaxTokens: SyntaxToken[];
  inlineDiffTokens: HighlightedInlineDiffToken[];
  modifiedPairId: string | null;
};

export type CodeDiffHunk = {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: CodeDiffLine[];
};

export type CodeDiffSummary = {
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
  unchangedLines: number;
  totalLines: number;
};

export type CodeDiffResult = {
  language: CodeDiffLanguage;
  originalFileName: string;
  generatedFileName: string;
  unifiedDiff: string;
  hunks: CodeDiffHunk[];
  summary: CodeDiffSummary;
  generatedAt: string;
};
