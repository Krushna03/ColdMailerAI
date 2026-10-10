import React, { useState, useEffect } from "react";
import { Menu, Sun, Moon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import DashboardSidebar from "./DashboardSidebar";
import { useCurrentUser } from "../../hooks/useUser";
import { Toaster } from "../ui/toaster";
import { RootState } from "../../context/store";
import NotificationBell from "../layout/NotificationBell";
import { ThemeProvider, useTheme } from "../../context/ThemeContext";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/mailboxes": "Mailboxes",
  "/dashboard/leads": "Leads",
  "/dashboard/sequences": "Sequences",
  "/dashboard/inbox": "Inbox & Replies",
  "/dashboard/batches": "Batch History",
  "/dashboard/pricing": "Pricing & Billing",
  "/dashboard/profile": "Profile & Settings",
};

const getPageTitle = (pathname: string): string => {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/dashboard/sequences/")) return "Sequence Details";
  if (pathname.startsWith("/dashboard/leads/")) return "Lead Details";
  return "Workspace";
};

function DashboardLayoutContent() {
  useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.userData);
  const title = getPageTitle(location.pathname);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("dashboard-light");
    } else {
      document.body.classList.remove("dashboard-light");
    }
    return () => {
      document.body.classList.remove("dashboard-light");
    };
  }, [theme]);

  return (
    <div
      className={`flex min-h-[100dvh] w-full overflow-x-clip font-sans transition-colors duration-150 ${
        theme === "light"
          ? "dashboard-light bg-surface-950 text-slate-900"
          : "bg-surface-950 text-white"
      }`}
    >
      <Toaster />

      <div className="sticky top-0 z-40 hidden h-[100dvh] shrink-0 self-start lg:block">
        <DashboardSidebar />
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close dashboard navigation"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <DashboardSidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-white/10 bg-surface-950 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open dashboard navigation"
            className="mr-3 rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-white tracking-tight">{title}</h1>
            <p className="hidden truncate text-xs text-gray-400 sm:block font-normal">
              Welcome back{user?.username ? `, ${user.username}` : ""}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <NotificationBell />

            {/* White / Dark Theme Switcher Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "light" ? "Switch to Dark theme" : "Switch to White theme"}
              aria-label="Toggle theme"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4 text-slate-700 hover:text-slate-900" />
              ) : (
                <Sun className="h-4 w-4 text-amber-300 hover:text-amber-200" />
              )}
            </button>

            <NavLink
              to="/dashboard/profile"
              aria-label="Open profile"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-xs font-semibold transition hover:bg-white/10"
            >
              {(user?.username || user?.email || "U").charAt(0).toUpperCase()}
            </NavLink>
          </div>
        </header>

        <main className="relative mx-auto w-full min-w-0 max-w-7xl px-4 pb-8 pt-3 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <ThemeProvider>
      <DashboardLayoutContent />
    </ThemeProvider>
  );
}
