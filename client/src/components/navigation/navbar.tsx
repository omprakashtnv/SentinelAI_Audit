import { LogOut, Menu, Search, User } from "lucide-react";
import { Link } from "react-router-dom";

import { ThemeToggle } from "@/app/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/use-auth";

type NavbarProps = {
  onOpenNavigation: () => void;
};

export function Navbar({ onOpenNavigation }: NavbarProps) {
  const { logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenNavigation}
        >
          <Menu className="size-4" aria-hidden="true" />
        </Button>

        <div className="hidden min-w-0 flex-1 md:block">
          <div className="flex h-9 max-w-md items-center gap-2 rounded-md border border-input bg-muted/45 px-3 text-sm text-muted-foreground">
            <Search className="size-4" aria-hidden="true" />
            <span>Search audits, reports, findings</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild type="button" variant="outline" className="hidden sm:inline-flex">
            <Link to="/projects/new">New project</Link>
          </Button>
          <Button asChild type="button" variant="ghost" size="icon" aria-label="Open profile">
            <Link to="/profile">
              <User className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Logout ${user?.email ?? ""}`} onClick={() => void logout()}>
            <LogOut className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
