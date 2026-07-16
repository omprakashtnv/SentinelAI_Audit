import { FileText } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

export function ReportsPage() {
  return (
    <EmptyState
      icon={FileText}
      title="Report center is ready"
      description="Professional audit report generation, exports, and review history can be built on this route."
      action={
        <Button type="button" variant="outline">
          View templates
        </Button>
      }
    />
  );
}

