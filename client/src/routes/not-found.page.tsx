import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The page you are looking for does not exist in this workspace.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Return dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

