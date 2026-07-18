import {
  highlightInlineDiffTokens,
  highlightSyntax,
} from "./syntax-highlighter";
import type {
  CodeDiffHunk,
  CodeDiffInput,
  CodeDiffLanguage,
  CodeDiffLine,
  CodeDiffLineType,
  CodeDiffResult,
  CodeDiffSummary,
  InlineDiffChangeType,
  InlineDiffToken,
} from "./code-diff-generator.types";

type RawDiffLineType = "context" | "added" | "removed";

type RawDiffLine = {
  type: RawDiffLineType;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
};

type NormalizedDiffLine = Omit<RawDiffLine, "type"> & {
  type: CodeDiffLineType;
  modifiedPairId: string | null;
};

type ModifiedPair = {
  removed: string;
  added: string;
};

const DEFAULT_CONTEXT_LINES = 3;
const MAX_CONTEXT_LINES = 20;
const DEFAULT_ORIGINAL_FILE = "original";
const DEFAULT_GENERATED_FILE = "secure";
const MAX_LINE_DIFF_MATRIX_CELLS = 1_500_000;
const MAX_INLINE_DIFF_MATRIX_CELLS = 20_000;

export class CodeDiffGeneratorService {
  public generateDiff(input: CodeDiffInput): CodeDiffResult {
    const originalFileName = input.originalFileName ?? DEFAULT_ORIGINAL_FILE;
    const generatedFileName = input.generatedFileName ?? DEFAULT_GENERATED_FILE;
    const language = input.language ?? this.inferLanguage(generatedFileName, originalFileName);
    const contextLines = this.normalizeContextLines(input.contextLines);
    const includeSyntaxHighlighting = input.includeSyntaxHighlighting ?? true;
    const rawLines = this.computeLineDiff(
      this.splitCodeLines(input.originalCode),
      this.splitCodeLines(input.generatedSecureCode),
    );
    const normalizedLines = this.markModifiedLines(rawLines);
    const modifiedPairs = this.buildModifiedPairMap(normalizedLines);
    const hunks = this.buildHunks(normalizedLines, modifiedPairs, language, contextLines, includeSyntaxHighlighting);
    const unifiedDiff = this.buildUnifiedDiff(originalFileName, generatedFileName, hunks);

    return {
      language,
      originalFileName,
      generatedFileName,
      unifiedDiff,
      hunks,
      summary: this.summarize(normalizedLines),
      generatedAt: new Date().toISOString(),
    };
  }

  private computeLineDiff(originalLines: string[], generatedLines: string[]): RawDiffLine[] {
    const originalLength = originalLines.length;
    const generatedLength = generatedLines.length;

    if ((originalLength + 1) * (generatedLength + 1) > MAX_LINE_DIFF_MATRIX_CELLS) {
      return this.computeLinearLineDiff(originalLines, generatedLines);
    }

    const columns = generatedLength + 1;
    const table = new Uint32Array((originalLength + 1) * (generatedLength + 1));

    const getScore = (row: number, column: number): number => table[row * columns + column] ?? 0;
    const setScore = (row: number, column: number, value: number): void => {
      table[row * columns + column] = value;
    };

    for (let oldIndex = originalLength - 1; oldIndex >= 0; oldIndex -= 1) {
      for (let newIndex = generatedLength - 1; newIndex >= 0; newIndex -= 1) {
        if ((originalLines[oldIndex] ?? "") === (generatedLines[newIndex] ?? "")) {
          setScore(oldIndex, newIndex, getScore(oldIndex + 1, newIndex + 1) + 1);
        } else {
          setScore(oldIndex, newIndex, Math.max(getScore(oldIndex + 1, newIndex), getScore(oldIndex, newIndex + 1)));
        }
      }
    }

    const rawLines: RawDiffLine[] = [];
    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < originalLength && newIndex < generatedLength) {
      const oldLine = originalLines[oldIndex] ?? "";
      const newLine = generatedLines[newIndex] ?? "";

      if (oldLine === newLine) {
        rawLines.push({
          type: "context",
          oldLineNumber: oldIndex + 1,
          newLineNumber: newIndex + 1,
          content: oldLine,
        });
        oldIndex += 1;
        newIndex += 1;
      } else if (getScore(oldIndex + 1, newIndex) >= getScore(oldIndex, newIndex + 1)) {
        rawLines.push({
          type: "removed",
          oldLineNumber: oldIndex + 1,
          newLineNumber: null,
          content: oldLine,
        });
        oldIndex += 1;
      } else {
        rawLines.push({
          type: "added",
          oldLineNumber: null,
          newLineNumber: newIndex + 1,
          content: newLine,
        });
        newIndex += 1;
      }
    }

    while (oldIndex < originalLength) {
      rawLines.push({
        type: "removed",
        oldLineNumber: oldIndex + 1,
        newLineNumber: null,
        content: originalLines[oldIndex] ?? "",
      });
      oldIndex += 1;
    }

    while (newIndex < generatedLength) {
      rawLines.push({
        type: "added",
        oldLineNumber: null,
        newLineNumber: newIndex + 1,
        content: generatedLines[newIndex] ?? "",
      });
      newIndex += 1;
    }

    return rawLines;
  }

  private computeLinearLineDiff(originalLines: string[], generatedLines: string[]): RawDiffLine[] {
    const rawLines: RawDiffLine[] = [];
    const sharedLength = Math.min(originalLines.length, generatedLines.length);

    for (let index = 0; index < sharedLength; index += 1) {
      const originalLine = originalLines[index] ?? "";
      const generatedLine = generatedLines[index] ?? "";

      if (originalLine === generatedLine) {
        rawLines.push({
          type: "context",
          oldLineNumber: index + 1,
          newLineNumber: index + 1,
          content: originalLine,
        });
      } else {
        rawLines.push({
          type: "removed",
          oldLineNumber: index + 1,
          newLineNumber: null,
          content: originalLine,
        });
        rawLines.push({
          type: "added",
          oldLineNumber: null,
          newLineNumber: index + 1,
          content: generatedLine,
        });
      }
    }

    for (let index = sharedLength; index < originalLines.length; index += 1) {
      rawLines.push({
        type: "removed",
        oldLineNumber: index + 1,
        newLineNumber: null,
        content: originalLines[index] ?? "",
      });
    }

    for (let index = sharedLength; index < generatedLines.length; index += 1) {
      rawLines.push({
        type: "added",
        oldLineNumber: null,
        newLineNumber: index + 1,
        content: generatedLines[index] ?? "",
      });
    }

    return rawLines;
  }

  private markModifiedLines(lines: RawDiffLine[]): NormalizedDiffLine[] {
    const normalizedLines: NormalizedDiffLine[] = lines.map((line) => ({
      ...line,
      type: line.type,
      modifiedPairId: null,
    }));
    let index = 0;
    let pairIndex = 1;

    while (index < normalizedLines.length) {
      if (normalizedLines[index]?.type !== "removed") {
        index += 1;
        continue;
      }

      const removedStart = index;
      const removedEnd = this.consumeLineType(normalizedLines, removedStart, "removed");

      if (normalizedLines[removedEnd]?.type !== "added") {
        index = removedEnd;
        continue;
      }

      const addedStart = removedEnd;
      const addedEnd = this.consumeLineType(normalizedLines, addedStart, "added");
      const pairCount = Math.min(removedEnd - removedStart, addedEnd - addedStart);

      for (let pairOffset = 0; pairOffset < pairCount; pairOffset += 1) {
        const pairId = `m${pairIndex}`;
        const removedLine = normalizedLines[removedStart + pairOffset];
        const addedLine = normalizedLines[addedStart + pairOffset];

        if (removedLine && addedLine) {
          removedLine.type = "modified";
          removedLine.modifiedPairId = pairId;
          addedLine.type = "modified";
          addedLine.modifiedPairId = pairId;
          pairIndex += 1;
        }
      }

      index = addedEnd;
    }

    return normalizedLines;
  }

  private consumeLineType(lines: NormalizedDiffLine[], start: number, type: RawDiffLineType): number {
    let index = start;

    while (lines[index]?.type === type) {
      index += 1;
    }

    return index;
  }

  private buildModifiedPairMap(lines: NormalizedDiffLine[]): ReadonlyMap<string, ModifiedPair> {
    const pairs = new Map<string, Partial<ModifiedPair>>();

    for (const line of lines) {
      if (!line.modifiedPairId) {
        continue;
      }

      const current = pairs.get(line.modifiedPairId) ?? {};

      if (line.oldLineNumber !== null) {
        current.removed = line.content;
      }

      if (line.newLineNumber !== null) {
        current.added = line.content;
      }

      pairs.set(line.modifiedPairId, current);
    }

    return new Map(
      [...pairs.entries()]
        .filter((entry) => entry[1].removed !== undefined || entry[1].added !== undefined)
        .map(([pairId, pair]) => [
          pairId,
          {
            removed: pair.removed ?? "",
            added: pair.added ?? "",
          },
        ]),
    );
  }

  private buildHunks(
    lines: NormalizedDiffLine[],
    modifiedPairs: ReadonlyMap<string, ModifiedPair>,
    language: CodeDiffLanguage,
    contextLines: number,
    includeSyntaxHighlighting: boolean,
  ): CodeDiffHunk[] {
    const changedIndexes = lines
      .map((line, index) => (line.type === "context" ? null : index))
      .filter((index): index is number => index !== null);

    if (changedIndexes.length === 0) {
      return [];
    }

    const ranges = this.buildMergedHunkRanges(changedIndexes, lines.length, contextLines);

    return ranges.map((range) => {
      const hunkLines = lines
        .slice(range.start, range.end + 1)
        .map((line, localIndex) =>
          this.toCodeDiffLine(
            line,
            range.start + localIndex,
            modifiedPairs,
            language,
            includeSyntaxHighlighting,
          ),
        );
      const oldLines = hunkLines.filter((line) => line.marker !== "+").length;
      const newLines = hunkLines.filter((line) => line.marker !== "-").length;
      const oldStart = this.resolveHunkStart(lines, range.start, "oldLineNumber", oldLines);
      const newStart = this.resolveHunkStart(lines, range.start, "newLineNumber", newLines);

      return {
        oldStart,
        oldLines,
        newStart,
        newLines,
        header: `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@`,
        lines: hunkLines,
      };
    });
  }

  private buildMergedHunkRanges(
    changedIndexes: number[],
    lineCount: number,
    contextLines: number,
  ): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];

    for (const changedIndex of changedIndexes) {
      const nextRange = {
        start: Math.max(0, changedIndex - contextLines),
        end: Math.min(lineCount - 1, changedIndex + contextLines),
      };
      const previousRange = ranges[ranges.length - 1];

      if (previousRange && nextRange.start <= previousRange.end + 1) {
        previousRange.end = Math.max(previousRange.end, nextRange.end);
      } else {
        ranges.push(nextRange);
      }
    }

    return ranges;
  }

  private toCodeDiffLine(
    line: NormalizedDiffLine,
    index: number,
    modifiedPairs: ReadonlyMap<string, ModifiedPair>,
    language: CodeDiffLanguage,
    includeSyntaxHighlighting: boolean,
  ): CodeDiffLine {
    const marker = this.getMarker(line);
    const inlineTokens = this.buildInlineTokens(line, modifiedPairs);

    return {
      id: `L${index + 1}`,
      type: line.type,
      marker,
      oldLineNumber: line.oldLineNumber,
      newLineNumber: line.newLineNumber,
      content: line.content,
      syntaxTokens: includeSyntaxHighlighting ? highlightSyntax(line.content, language) : [],
      inlineDiffTokens: includeSyntaxHighlighting
        ? highlightInlineDiffTokens(inlineTokens, language)
        : inlineTokens.map((token) => ({ ...token, syntax: "plain" })),
      modifiedPairId: line.modifiedPairId,
    };
  }

  private buildInlineTokens(line: NormalizedDiffLine, modifiedPairs: ReadonlyMap<string, ModifiedPair>): InlineDiffToken[] {
    if (line.type !== "modified" || !line.modifiedPairId) {
      return [
        {
          value: line.content,
          change: this.getInlineChangeType(line.type),
        },
      ];
    }

    const pair = modifiedPairs.get(line.modifiedPairId);

    if (!pair) {
      return [{ value: line.content, change: this.getInlineChangeType(line.type) }];
    }

    return line.oldLineNumber !== null
      ? this.computeInlineDiff(pair.removed, pair.added, "removed")
      : this.computeInlineDiff(pair.removed, pair.added, "added");
  }

  private computeInlineDiff(
    removedContent: string,
    addedContent: string,
    side: Exclude<InlineDiffChangeType, "unchanged">,
  ): InlineDiffToken[] {
    const removedTokens = this.tokenizeInlineContent(removedContent);
    const addedTokens = this.tokenizeInlineContent(addedContent);
    const operations = this.computeTokenDiff(removedTokens, addedTokens);
    const selectedOperations = operations.filter((operation) => {
      if (side === "removed") {
        return operation.change !== "added";
      }

      return operation.change !== "removed";
    });

    return this.mergeInlineTokens(
      selectedOperations.map((operation) => ({
        value: operation.value,
        change: operation.change === "unchanged" ? "unchanged" : side,
      })),
    );
  }

  private computeTokenDiff(removedTokens: string[], addedTokens: string[]): InlineDiffToken[] {
    const removedLength = removedTokens.length;
    const addedLength = addedTokens.length;

    if ((removedLength + 1) * (addedLength + 1) > MAX_INLINE_DIFF_MATRIX_CELLS) {
      return [
        { value: removedTokens.join(""), change: "removed" },
        { value: addedTokens.join(""), change: "added" },
      ];
    }

    const columns = addedLength + 1;
    const table = new Uint32Array((removedLength + 1) * (addedLength + 1));
    const getScore = (row: number, column: number): number => table[row * columns + column] ?? 0;
    const setScore = (row: number, column: number, value: number): void => {
      table[row * columns + column] = value;
    };

    for (let removedIndex = removedLength - 1; removedIndex >= 0; removedIndex -= 1) {
      for (let addedIndex = addedLength - 1; addedIndex >= 0; addedIndex -= 1) {
        if ((removedTokens[removedIndex] ?? "") === (addedTokens[addedIndex] ?? "")) {
          setScore(removedIndex, addedIndex, getScore(removedIndex + 1, addedIndex + 1) + 1);
        } else {
          setScore(
            removedIndex,
            addedIndex,
            Math.max(getScore(removedIndex + 1, addedIndex), getScore(removedIndex, addedIndex + 1)),
          );
        }
      }
    }

    const operations: InlineDiffToken[] = [];
    let removedIndex = 0;
    let addedIndex = 0;

    while (removedIndex < removedLength && addedIndex < addedLength) {
      const removedToken = removedTokens[removedIndex] ?? "";
      const addedToken = addedTokens[addedIndex] ?? "";

      if (removedToken === addedToken) {
        operations.push({ value: removedToken, change: "unchanged" });
        removedIndex += 1;
        addedIndex += 1;
      } else if (getScore(removedIndex + 1, addedIndex) >= getScore(removedIndex, addedIndex + 1)) {
        operations.push({ value: removedToken, change: "removed" });
        removedIndex += 1;
      } else {
        operations.push({ value: addedToken, change: "added" });
        addedIndex += 1;
      }
    }

    while (removedIndex < removedLength) {
      operations.push({ value: removedTokens[removedIndex] ?? "", change: "removed" });
      removedIndex += 1;
    }

    while (addedIndex < addedLength) {
      operations.push({ value: addedTokens[addedIndex] ?? "", change: "added" });
      addedIndex += 1;
    }

    return operations;
  }

  private tokenizeInlineContent(content: string): string[] {
    return content.match(/(\s+|[A-Za-z0-9_$]+|.)/g) ?? [];
  }

  private mergeInlineTokens(tokens: InlineDiffToken[]): InlineDiffToken[] {
    const merged: InlineDiffToken[] = [];

    for (const token of tokens) {
      const previous = merged[merged.length - 1];

      if (previous && previous.change === token.change) {
        previous.value += token.value;
      } else {
        merged.push({ ...token });
      }
    }

    return merged;
  }

  private resolveHunkStart(
    lines: NormalizedDiffLine[],
    rangeStart: number,
    lineNumberKey: "oldLineNumber" | "newLineNumber",
    lineCount: number,
  ): number {
    if (lineCount === 0) {
      const previousLineNumber = this.findPreviousLineNumber(lines, rangeStart, lineNumberKey);
      return previousLineNumber ?? 0;
    }

    for (let index = rangeStart; index < lines.length; index += 1) {
      const lineNumber = lines[index]?.[lineNumberKey];

      if (lineNumber !== null && lineNumber !== undefined) {
        return lineNumber;
      }
    }

    return 1;
  }

  private findPreviousLineNumber(
    lines: NormalizedDiffLine[],
    rangeStart: number,
    lineNumberKey: "oldLineNumber" | "newLineNumber",
  ): number | null {
    for (let index = rangeStart - 1; index >= 0; index -= 1) {
      const lineNumber = lines[index]?.[lineNumberKey];

      if (lineNumber !== null && lineNumber !== undefined) {
        return lineNumber;
      }
    }

    return null;
  }

  private buildUnifiedDiff(originalFileName: string, generatedFileName: string, hunks: CodeDiffHunk[]): string {
    return [
      `diff --git a/${originalFileName} b/${generatedFileName}`,
      `--- a/${originalFileName}`,
      `+++ b/${generatedFileName}`,
      ...hunks.flatMap((hunk) => [hunk.header, ...hunk.lines.map((line) => `${line.marker}${line.content}`)]),
    ].join("\n");
  }

  private summarize(lines: NormalizedDiffLine[]): CodeDiffSummary {
    const modifiedPairIds = new Set(lines.map((line) => line.modifiedPairId).filter((value): value is string => Boolean(value)));
    const addedLines = lines.filter((line) => line.type === "added").length;
    const removedLines = lines.filter((line) => line.type === "removed").length;
    const unchangedLines = lines.filter((line) => line.type === "context").length;

    return {
      addedLines,
      removedLines,
      modifiedLines: modifiedPairIds.size,
      unchangedLines,
      totalLines: lines.length,
    };
  }

  private getMarker(line: NormalizedDiffLine): " " | "+" | "-" {
    if (line.oldLineNumber !== null && line.newLineNumber === null) {
      return "-";
    }

    if (line.oldLineNumber === null && line.newLineNumber !== null) {
      return "+";
    }

    return " ";
  }

  private getInlineChangeType(type: CodeDiffLineType): InlineDiffChangeType {
    if (type === "added") {
      return "added";
    }

    if (type === "removed") {
      return "removed";
    }

    return "unchanged";
  }

  private splitCodeLines(code: string): string[] {
    const normalizedCode = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    if (normalizedCode.length === 0) {
      return [];
    }

    const lines = normalizedCode.split("\n");

    if (normalizedCode.endsWith("\n")) {
      lines.pop();
    }

    return lines;
  }

  private normalizeContextLines(contextLines: number | undefined): number {
    if (typeof contextLines !== "number" || Number.isNaN(contextLines)) {
      return DEFAULT_CONTEXT_LINES;
    }

    return Math.max(0, Math.min(MAX_CONTEXT_LINES, Math.floor(contextLines)));
  }

  private inferLanguage(generatedFileName: string, originalFileName: string): CodeDiffLanguage {
    const fileName = `${generatedFileName} ${originalFileName}`.toLowerCase();

    if (fileName.includes(".tsx")) {
      return "tsx";
    }

    if (fileName.includes(".jsx")) {
      return "jsx";
    }

    if (fileName.includes(".ts")) {
      return "typescript";
    }

    if (fileName.includes(".js") || fileName.includes(".mjs") || fileName.includes(".cjs")) {
      return "javascript";
    }

    if (fileName.includes(".json")) {
      return "json";
    }

    if (fileName.includes(".prisma")) {
      return "prisma";
    }

    if (fileName.includes(".md") || fileName.includes(".markdown")) {
      return "markdown";
    }

    if (fileName.includes(".yaml") || fileName.includes(".yml")) {
      return "yaml";
    }

    return "text";
  }
}

export const codeDiffGeneratorService = new CodeDiffGeneratorService();
