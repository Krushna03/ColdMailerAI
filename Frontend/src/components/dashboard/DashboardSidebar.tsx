import React from "react";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  UserRound,
  Users,
  History,
  Mail,
  X,
  LucideIcon,
  Workflow,
  Inbox,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "../ui/button";
import { useLogout } from "../../helpers/tokenValidation";
import { RootState } from "../../context/store";
import { useInboundStats } from "../../hooks/useInbound";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  hasUnreadBadge?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "OUTREACH PIPELINE",
    items: [
      { label: "Mailboxes", to: "/dashboard/mailboxes", icon: Mail },
      { label: "Leads", to: "/dashboard/leads", icon: Users },
      { label: "Sequences", to: "/dashboard/sequences", icon: Workflow },
      { label: "Inbox & Replies", to: "/dashboard/inbox", icon: Inbox, hasUnreadBadge: true },
    ],
  },
  {
    title: "AI STUDIO",
    items: [
      { label: "Batch History", to: "/dashboard/batches", icon: History },
    ],
  },
  {
    title: "WORKSPACE",
    items: [
      { label: "Pricing & Billing", to: "/dashboard/pricing", icon: CreditCard },
      { label: "Profile", to: "/dashboard/profile", icon: UserRound },
    ],
  },
];

interface DashboardSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ mobile = false, onClose }: DashboardSidebarProps) {
  const user = useSelector((state: RootState) => state.auth.userData);
  const logoutUser = useLogout();
  const { data: inboundStats } = useInboundStats();
  const unreadCount = inboundStats?.unreadCount ?? 0;

  const handleLogout = async () => {
    await logoutUser({
      title: "Logged out",
      message: "You have been logged out successfully.",
      variant: "default",
      redirectTo: "/",
    });
  };

  return (
    <aside
      className={`custom-scroll flex h-full w-[260px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-surface-900 px-3.5 py-4 text-white ${
        mobile ? "shadow-2xl" : ""
      }`}
    >
      <div className="flex h-11 items-center px-2">
        <NavLink to="/dashboard" onClick={onClose} className="flex items-center gap-2">
          <img src="/white-logo.png" alt="ColdMailerAI" className="h-7 w-7 rounded" />
          <span className="text-lg font-semibold tracking-tight text-white">ColdMailerAI</span>
        </NavLink>
        {mobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dashboard navigation"
            className="rounded-md p-1 text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Button asChild className="mt-4 h-9 text-sm font-semibold rounded-md bg-brand text-white hover:bg-brand-400 shadow-none border-0 px-4">
        <NavLink to="/generate-email" onClick={onClose}>
          Generate Email
        </NavLink>
      </Button>

      <nav className="mt-4 space-y-1">
        {navSections.map((section, idx) => (
          <div
            key={section.title}
            className={`space-y-1 ${idx !== 0 ? "pt-2.5 border-t border-white/5" : ""}`}
          >
            <div className="px-3 pb-0.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </span>
            </div>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const NavigationIcon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-white/10 text-white font-semibold"
                          : "text-gray-300 hover:bg-white/5 hover:text-gray-200"
                      }`
                    }
                  >
                    <NavigationIcon className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="truncate">{item.label}</span>

                    {item.hasUnreadBadge && unreadCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[11px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-4 space-y-2 -mx-1.5">
        <div className="rounded-lg p-2 py-3 bg-surface-950 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-sm font-semibold text-white">
              {(user?.username || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-white">
                {user?.username || "User"}
              </p>
              <p className="truncate text-[11px] text-gray-400">
                {user?.email || "View profile"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-1 text-xs font-medium text-gray-400 transition bg-white/5 hover:bg-red-500/10 hover:text-red-300 border border-white/5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
