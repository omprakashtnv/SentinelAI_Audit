import { motion } from "framer-motion";
import { BarChart3, FileText, LayoutDashboard, Settings, ShieldCheck, User, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Audits", href: "/audits", icon: ShieldCheck },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-sidebar px-4 py-5 lg:flex lg:flex-col">
      <SidebarBrand />
      <SidebarNavigation />
      <SidebarFooter />
    </aside>
  );
}

type MobileSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <motion.aside
        initial={{ x: -288 }}
        animate={{ x: 0 }}
        exit={{ x: -288 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-sidebar px-4 py-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <SidebarBrand />
          <Button type="button" variant="ghost" size="icon" aria-label="Close navigation" onClick={() => onOpenChange(false)}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <SidebarNavigation onNavigate={() => onOpenChange(false)} />
        <SidebarFooter />
      </motion.aside>
    </div>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <BarChart3 className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-5 text-sidebar-foreground">SentinelAI</p>
        <p className="text-xs text-muted-foreground">Security audit console</p>
      </div>
    </div>
  );
}

function SidebarNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="mt-8 flex flex-1 flex-col gap-1">
      {navigationItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-sidebar-accent"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <item.icon className="relative size-4" aria-hidden="true" />
              <span className="relative">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-card-foreground">Platform</p>
        <Badge variant="secondary">Foundation</Badge>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Core frontend shell ready for secure audit workflows.
      </p>
    </div>
  );
}
