import { useState } from "react";
import { Menu } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import DashboardSidebar from "./DashboardSidebar";
import { useCurrentUser } from "../../hooks/useUser";
import { Toaster } from "../ui/toaster";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/dashboard/leads": "Leads",
  "/dashboard/pricing": "Pricing & billing",
  "/dashboard/profile": "Profile",
  "/dashboard/batches": "Batch history",
};

export default function DashboardLayout() {
  useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const user = useSelector((state) => state.auth.userData);
  const title = pageTitles[location.pathname] || "Workspace";

  return (
    // overflow-x-clip contains any wide child without turning this into a
    // scroll container, which would break the sticky sidebar and header.
    <div className="flex min-h-[100dvh] w-full overflow-x-clip bg-surface-950 text-white">
      <Toaster />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 top-16 h-[30rem] w-[30rem] rounded-full bg-brand/15 blur-[150px]" />
        <div className="absolute -bottom-28 left-1/4 h-[24rem] w-[24rem] rounded-full bg-blue-500/10 blur-[140px]" />
      </div>

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
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-white/10 bg-surface-950/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open dashboard navigation"
            className="mr-3 rounded-lg p-2 text-gray-300 hover:bg-white/10 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{title}</p>
            <p className="hidden truncate text-xs text-gray-500 sm:block">
              Welcome back{user?.username ? `, ${user.username}` : ""}
            </p>
          </div>
          <NavLink
            to="/dashboard/profile"
            aria-label="Open profile"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold transition hover:bg-white/10"
          >
            {(user?.username || user?.email || "U").charAt(0).toUpperCase()}
          </NavLink>
        </header>

        <main className="relative mx-auto w-full min-w-0 max-w-7xl px-4 pb-6 pt-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
  