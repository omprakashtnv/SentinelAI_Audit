import type { ReactNode } from "react";

type HighlightTextProps = {
  children: string | null | undefined;
  query: string;
  fallback?: ReactNode;
};

export function HighlightText({ children, query, fallback }: HighlightTextProps) {
  const text = children ?? "";
  const normalizedQuery = query.trim();

  if (!text) {
    return fallback ?? null;
  }

  if (!normalizedQuery) {
    return text;
  }

  const parts = text.split(new RegExp(`(${escapeRegExp(normalizedQuery)})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === normalizedQuery.toLowerCase() ? (
          <mark key={`${part}-${index}`} className="rounded bg-green-200 px-0.5 text-green-400">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
