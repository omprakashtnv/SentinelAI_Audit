import { Outlet } from "react-router-dom";
import { useState } from "react";

import { Navbar } from "@/components/navigation/navbar";
import { MobileSidebar, Sidebar } from "@/components/navigation/sidebar";

export function DashboardLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <MobileSidebar open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen} />
      <div className="min-h-screen lg:pl-72">
        <Navbar onOpenNavigation={() => setIsMobileSidebarOpen(true)} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
