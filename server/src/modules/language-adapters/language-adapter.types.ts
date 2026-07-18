import type { SecurityKnowledgeBaseCategory } from "../security-knowledge-base";

export type LanguageAdapterId = "typescript" | "javascript" | "react" | "express" | "prisma";

export type LanguageAdapterRuntime = "node" | "browser" | "react" | "express" | "prisma";

export type LanguageAdapterInput = {
  ruleId?: string;
  category?: SecurityKnowledgeBaseCategory;
  title?: string;
  filePath?: string;
  vulnerableCode?: string;
  secureCode?: string;
  projectUsesTypeScript?: boolean;
};

export type LanguageAdapterOutput = {
  adapter: LanguageAdapterId;
  displayName: string;
  runtime: LanguageAdapterRuntime;
  secureCode: string;
  bestPractices: string[];
  frameworkRecommendations: string[];
  requiredDependencies: string[];
  validationChecklist: string[];
};

export type LanguageAdapterDescriptor = {
  id: LanguageAdapterId;
  displayName: string;
  runtime: LanguageAdapterRuntime;
  supportedExtensions: string[];
};

export interface LanguageAdapter {
  readonly id: LanguageAdapterId;
  readonly displayName: string;
  readonly runtime: LanguageAdapterRuntime;
  readonly supportedExtensions: readonly string[];
  supports(input: LanguageAdapterInput): boolean;
  generate(input: LanguageAdapterInput): LanguageAdapterOutput;
}

export class UnsupportedLanguageAdapterError extends Error {
  public readonly code = "LANGUAGE_ADAPTER_NOT_SUPPORTED";

  public constructor(adapterId: string) {
    super(`Language adapter is not supported: ${adapterId}`);
    this.name = "UnsupportedLanguageAdapterError";
  }
}
