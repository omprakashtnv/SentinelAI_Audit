import type { FindingSeverity, FindingStatus } from "@/types/finding";

export type FixPreviewLanguage =
  | "typescript"
  | "javascript"
  | "tsx"
  | "jsx"
  | "json"
  | "prisma"
  | "markdown"
  | "yaml"
  | "text";

export type FixPreviewEnhancement = {
  source: "template" | "openai";
  attemptedAi: boolean;
  usedAi: boolean;
  reason: string | null;
  model: string | null;
  responseId: string | null;
};

export type FixPreviewAssurance = {
  fixSource: string;
  confidenceScore: number;
  basedOn: string[];
  verification: string[];
};

export type FixPreviewPatch = {
  unifiedDiff: string;
  summary: {
    addedLines: number;
    removedLines: number;
    modifiedLines: number;
    unchangedLines: number;
    totalLines: number;
  };
};

export type FindingFixPreview = {
  findingId: string;
  projectId: string;
  ruleId: string | null;
  title: string;
  severity: FindingSeverity;
  status: FindingStatus;
  file: string;
  line: number;
  category: string | null;
  owasp: string | null;
  confidence: string | null;
  explanation: string;
  recommendation: string;
  originalCode: string;
  generatedFix: string;
  language: FixPreviewLanguage;
  patch: FixPreviewPatch;
  enhancement: FixPreviewEnhancement;
  assurance: FixPreviewAssurance;
};
