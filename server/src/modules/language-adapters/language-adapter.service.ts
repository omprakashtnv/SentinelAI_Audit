import { createDefaultLanguageAdapters, createLanguageAdapterMap } from "./language-adapter.registry";
import type {
  LanguageAdapter,
  LanguageAdapterDescriptor,
  LanguageAdapterId,
  LanguageAdapterInput,
  LanguageAdapterOutput,
} from "./language-adapter.types";
import { UnsupportedLanguageAdapterError } from "./language-adapter.types";

export class LanguageAdapterService {
  private readonly adaptersById: ReadonlyMap<LanguageAdapterId, LanguageAdapter>;

  public constructor(adapters: LanguageAdapter[] = createDefaultLanguageAdapters()) {
    this.adaptersById = createLanguageAdapterMap(adapters);
  }

  public generate(adapterId: LanguageAdapterId, input: LanguageAdapterInput): LanguageAdapterOutput {
    return this.getAdapter(adapterId).generate(input);
  }

  public generateForSupportedAdapters(input: LanguageAdapterInput): LanguageAdapterOutput[] {
    return [...this.adaptersById.values()]
      .filter((adapter) => adapter.supports(input))
      .map((adapter) => adapter.generate(input));
  }

  public inferAdapterId(filePath: string): LanguageAdapterId | null {
    const normalizedPath = filePath.toLowerCase();

    if (normalizedPath.endsWith(".prisma") || normalizedPath.includes("prisma")) {
      return "prisma";
    }

    if (normalizedPath.endsWith(".tsx") || normalizedPath.endsWith(".jsx")) {
      return "react";
    }

    if (normalizedPath.includes("app.") || normalizedPath.includes("server.") || normalizedPath.includes("routes")) {
      return "express";
    }

    if (normalizedPath.endsWith(".ts")) {
      return "typescript";
    }

    if (normalizedPath.endsWith(".js") || normalizedPath.endsWith(".mjs") || normalizedPath.endsWith(".cjs")) {
      return "javascript";
    }

    return null;
  }

  public generateForFile(filePath: string, input: LanguageAdapterInput): LanguageAdapterOutput | null {
    const adapterId = this.inferAdapterId(filePath);

    if (!adapterId) {
      return null;
    }

    return this.generate(adapterId, {
      ...input,
      filePath,
    });
  }

  public listAdapters(): LanguageAdapterDescriptor[] {
    return [...this.adaptersById.values()].map((adapter) => ({
      id: adapter.id,
      displayName: adapter.displayName,
      runtime: adapter.runtime,
      supportedExtensions: [...adapter.supportedExtensions],
    }));
  }

  public hasAdapter(adapterId: LanguageAdapterId): boolean {
    return this.adaptersById.has(adapterId);
  }

  private getAdapter(adapterId: LanguageAdapterId): LanguageAdapter {
    const adapter = this.adaptersById.get(adapterId);

    if (!adapter) {
      throw new UnsupportedLanguageAdapterError(adapterId);
    }

    return adapter;
  }
}

export const languageAdapterService = new LanguageAdapterService();
