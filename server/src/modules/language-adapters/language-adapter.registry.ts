import { ExpressLanguageAdapter } from "./express-language.adapter";
import { JavaScriptLanguageAdapter } from "./javascript-language.adapter";
import type { LanguageAdapter, LanguageAdapterId } from "./language-adapter.types";
import { PrismaLanguageAdapter } from "./prisma-language.adapter";
import { ReactLanguageAdapter } from "./react-language.adapter";
import { TypeScriptLanguageAdapter } from "./typescript-language.adapter";

export function createDefaultLanguageAdapters(): LanguageAdapter[] {
  return [
    new TypeScriptLanguageAdapter(),
    new JavaScriptLanguageAdapter(),
    new ReactLanguageAdapter(),
    new ExpressLanguageAdapter(),
    new PrismaLanguageAdapter(),
  ];
}

export function createLanguageAdapterMap(adapters: LanguageAdapter[]): ReadonlyMap<LanguageAdapterId, LanguageAdapter> {
  const adaptersById = new Map<LanguageAdapterId, LanguageAdapter>();

  for (const adapter of adapters) {
    if (adaptersById.has(adapter.id)) {
      throw new Error(`Duplicate language adapter id: ${adapter.id}`);
    }

    adaptersById.set(adapter.id, adapter);
  }

  return adaptersById;
}
