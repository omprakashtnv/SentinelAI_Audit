import type {
  CodeDiffLanguage,
  HighlightedInlineDiffToken,
  InlineDiffToken,
  SyntaxToken,
  SyntaxTokenKind,
} from "./code-diff-generator.types";

const JAVASCRIPT_KEYWORDS = new Set([
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "of",
  "return",
  "switch",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
]);

const TYPESCRIPT_KEYWORDS = new Set([
  ...JAVASCRIPT_KEYWORDS,
  "as",
  "declare",
  "enum",
  "implements",
  "interface",
  "keyof",
  "namespace",
  "private",
  "protected",
  "public",
  "readonly",
  "satisfies",
  "type",
]);

const PRISMA_KEYWORDS = new Set([
  "datasource",
  "enum",
  "generator",
  "model",
  "type",
]);

const PRISMA_TYPES = new Set([
  "BigInt",
  "Boolean",
  "Bytes",
  "DateTime",
  "Decimal",
  "Float",
  "Int",
  "Json",
  "String",
]);

const BOOLEAN_LITERALS = new Set(["false", "true"]);
const NULL_LITERALS = new Set(["null", "undefined"]);

export function highlightSyntax(line: string, language: CodeDiffLanguage): SyntaxToken[] {
  if (line.length === 0) {
    return [];
  }

  if (language === "markdown") {
    return highlightMarkdown(line);
  }

  if (language === "yaml") {
    return highlightYaml(line);
  }

  return highlightCodeLikeLine(line, language);
}

export function highlightInlineDiffTokens(
  tokens: InlineDiffToken[],
  language: CodeDiffLanguage,
): HighlightedInlineDiffToken[] {
  return tokens.flatMap((token) =>
    highlightSyntax(token.value, language).map((syntaxToken) => ({
      value: syntaxToken.value,
      change: token.change,
      syntax: syntaxToken.kind,
    })),
  );
}

function highlightMarkdown(line: string): SyntaxToken[] {
  const headingMatch = /^(#{1,6})(\s+.*)?$/.exec(line);

  if (headingMatch) {
    const tokens: SyntaxToken[] = [
      { value: headingMatch[1] ?? "", kind: "punctuation" },
      { value: headingMatch[2] ?? "", kind: "keyword" },
    ];

    return tokens.filter((token) => token.value.length > 0);
  }

  if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
    const markerLength = line.search(/\S/) + 2;
    return [
      { value: line.slice(0, markerLength), kind: "punctuation" },
      { value: line.slice(markerLength), kind: "plain" },
    ];
  }

  return tokenizeByInlineMarkup(line);
}

function highlightYaml(line: string): SyntaxToken[] {
  const keyMatch = /^(\s*[-]?\s*)([A-Za-z0-9_.-]+)(\s*:)(.*)$/.exec(line);

  if (!keyMatch) {
    return highlightCodeLikeLine(line, "text");
  }

  const tokens: SyntaxToken[] = [
    { value: keyMatch[1] ?? "", kind: "plain" },
    { value: keyMatch[2] ?? "", kind: "property" },
    { value: keyMatch[3] ?? "", kind: "punctuation" },
    ...highlightCodeLikeLine(keyMatch[4] ?? "", "yaml"),
  ];

  return tokens.filter((token) => token.value.length > 0);
}

function tokenizeByInlineMarkup(line: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  const pattern = /(`[^`]*`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > cursor) {
      tokens.push({ value: line.slice(cursor, match.index), kind: "plain" });
    }

    tokens.push({ value: match[0], kind: "string" });
    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) {
    tokens.push({ value: line.slice(cursor), kind: "plain" });
  }

  return tokens;
}

function highlightCodeLikeLine(line: string, language: CodeDiffLanguage): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let index = 0;

  while (index < line.length) {
    const current = line[index] ?? "";
    const next = line[index + 1] ?? "";

    if (isWhitespace(current)) {
      const end = consumeWhile(line, index, isWhitespace);
      tokens.push({ value: line.slice(index, end), kind: "plain" });
      index = end;
      continue;
    }

    if (current === "/" && next === "/") {
      tokens.push({ value: line.slice(index), kind: "comment" });
      break;
    }

    if (current === "#") {
      tokens.push({ value: line.slice(index), kind: language === "prisma" ? "comment" : "plain" });
      break;
    }

    if (current === "\"" || current === "'" || current === "`") {
      const end = consumeQuotedString(line, index, current);
      tokens.push({ value: line.slice(index, end), kind: "string" });
      index = end;
      continue;
    }

    if (isNumberStart(current, next)) {
      const end = consumeWhile(line, index, isNumberCharacter);
      tokens.push({ value: line.slice(index, end), kind: "number" });
      index = end;
      continue;
    }

    if (isIdentifierStart(current)) {
      const end = consumeWhile(line, index, isIdentifierCharacter);
      const word = line.slice(index, end);
      tokens.push({ value: word, kind: classifyIdentifier(word, line, index, end, language) });
      index = end;
      continue;
    }

    tokens.push({
      value: current,
      kind: isOperator(current) ? "operator" : "punctuation",
    });
    index += 1;
  }

  return tokens;
}

function classifyIdentifier(
  word: string,
  line: string,
  start: number,
  end: number,
  language: CodeDiffLanguage,
): SyntaxTokenKind {
  if (BOOLEAN_LITERALS.has(word)) {
    return "boolean";
  }

  if (NULL_LITERALS.has(word)) {
    return "null";
  }

  if (language === "prisma") {
    if (PRISMA_KEYWORDS.has(word)) {
      return "keyword";
    }

    if (PRISMA_TYPES.has(word) || /^[A-Z]/.test(word)) {
      return "type";
    }
  }

  if ((language === "typescript" || language === "tsx") && TYPESCRIPT_KEYWORDS.has(word)) {
    return "keyword";
  }

  if ((language === "javascript" || language === "jsx" || language === "json") && JAVASCRIPT_KEYWORDS.has(word)) {
    return "keyword";
  }

  if ((language === "tsx" || language === "jsx") && isJsxTag(line, start, end)) {
    return start > 0 && line[start - 1] === " " ? "attribute" : "tag";
  }

  if (nextNonWhitespace(line, end) === "(") {
    return "function";
  }

  if (previousNonWhitespace(line, start) === "." || isJsonProperty(line, start, end, language)) {
    return "property";
  }

  if (/^[A-Z]/.test(word) && (language === "typescript" || language === "tsx")) {
    return "type";
  }

  return "plain";
}

function isJsonProperty(line: string, _start: number, end: number, language: CodeDiffLanguage): boolean {
  return language === "json" && nextNonWhitespace(line, end) === ":";
}

function isJsxTag(line: string, start: number, end: number): boolean {
  const before = previousNonWhitespace(line, start);
  const after = nextNonWhitespace(line, end);
  return before === "<" || before === "/" || after === "=";
}

function consumeQuotedString(line: string, start: number, quote: string): number {
  let index = start + 1;
  let escaped = false;

  while (index < line.length) {
    const current = line[index] ?? "";

    if (escaped) {
      escaped = false;
      index += 1;
      continue;
    }

    if (current === "\\") {
      escaped = true;
      index += 1;
      continue;
    }

    if (current === quote) {
      return index + 1;
    }

    index += 1;
  }

  return line.length;
}

function consumeWhile(line: string, start: number, predicate: (value: string) => boolean): number {
  let index = start;

  while (index < line.length && predicate(line[index] ?? "")) {
    index += 1;
  }

  return index;
}

function previousNonWhitespace(line: string, start: number): string | null {
  for (let index = start - 1; index >= 0; index -= 1) {
    const value = line[index] ?? "";

    if (!isWhitespace(value)) {
      return value;
    }
  }

  return null;
}

function nextNonWhitespace(line: string, start: number): string | null {
  for (let index = start; index < line.length; index += 1) {
    const value = line[index] ?? "";

    if (!isWhitespace(value)) {
      return value;
    }
  }

  return null;
}

function isWhitespace(value: string): boolean {
  return /\s/.test(value);
}

function isIdentifierStart(value: string): boolean {
  return /[A-Za-z_$]/.test(value);
}

function isIdentifierCharacter(value: string): boolean {
  return /[A-Za-z0-9_$-]/.test(value);
}

function isNumberStart(current: string, next: string): boolean {
  return /\d/.test(current) || (current === "." && /\d/.test(next));
}

function isNumberCharacter(value: string): boolean {
  return /[0-9._]/.test(value);
}

function isOperator(value: string): boolean {
  return /[=+\-*/%<>!&|?:]/.test(value);
}
