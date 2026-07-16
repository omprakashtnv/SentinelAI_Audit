import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

export function AuditsPage() {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="Audit workspace is ready"
      description="Repository upload, GitHub import, scan orchestration, and finding review will attach here when business logic is added."
      action={<Button type="button">Prepare audit</Button>}
    />
  );
}

