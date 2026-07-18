import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { FindingSeverity } from "@/types/finding";

export const FINDING_SEVERITIES: FindingSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

export const FINDING_SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 1,
};

export function findingSeverityVariant(severity: FindingSeverity): BadgeProps["variant"] {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return "destructive";
  }

  if (severity === "MEDIUM") {
    return "warning";
  }

  if (severity === "LOW") {
    return "outline";
  }

  return "secondary";
}

export function FindingSeverityBadge({ severity }: { severity: FindingSeverity }) {
  return <Badge variant={findingSeverityVariant(severity)}>{severity}</Badge>;
}

export function formatFindingOption(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
