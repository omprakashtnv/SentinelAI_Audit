import { Settings } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

export function SettingsPage() {
  return (
    <EmptyState
      icon={Settings}
      title="Settings shell is ready"
      description="Environment, workspace, notification, and future security preferences can be added without changing the app shell."
      action={
        <Button type="button" variant="outline">
          Configure later
        </Button>
      }
    />
  );
}

