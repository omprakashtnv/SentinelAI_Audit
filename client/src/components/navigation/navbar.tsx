import { LogOut, Menu, Search, User } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ThemeToggle } from "@/app/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type NavbarProps = {
  onOpenNavigation: () => void;
};

export function Navbar({ onOpenNavigation }: NavbarProps) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const isProjectsPage = location.pathname === "/projects";

  useEffect(() => {
    const trimmedSearch = debouncedSearch.trim();

    if (!trimmedSearch || isProjectsPage) {
      return;
    }

    navigate(`/projects?search=${encodeURIComponent(trimmedSearch)}&page=1`);
  }, [debouncedSearch, isProjectsPage, navigate]);

  useEffect(() => {
    if (isProjectsPage && search) {
      setSearch("");
    }
  }, [isProjectsPage, search]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitSearch(search);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    submitSearch(event.currentTarget.value);
  }

  function submitSearch(value: string) {
    const trimmedSearch = value.trim();

    if (!trimmedSearch) {
      setSearch("");
      navigate("/projects");
      return;
    }

    setSearch("");
    navigate(`/projects?search=${encodeURIComponent(trimmedSearch)}&page=1`);
  }

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

        {isProjectsPage ? (
          <div className="hidden min-w-0 flex-1 md:block" />
        ) : (
          <form className="relative hidden min-w-0 flex-1 md:block" onSubmit={handleSearchSubmit}>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Search projects from navigation"
              className="h-9 max-w-md bg-muted/45 pl-9"
              placeholder="Search projects"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </form>
        )}

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
