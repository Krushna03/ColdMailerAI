import { CreditCard, LayoutDashboard, LogOut, Sparkles, UserRound, Users, History, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "../ui/button";
import { useLogout } from "../../helpers/tokenValidation";

const navigation = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, end: true },
  { label: "Leads", to: "/dashboard/leads", icon: Users },
  { label: "Batch History", to: "/dashboard/batches", icon: History },
  { label: "Pricing", to: "/dashboard/pricing", icon: CreditCard },
  { label: "Profile", to: "/dashboard/profile", icon: UserRound },
];

export default function DashboardSidebar({ mobile = false, onClose }) {
  const user = useSelector((state) => state.auth.userData);
  const logoutUser = useLogout();

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
      className={`custom-scroll flex h-full w-[280px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-surface-950/95 p-3 px-4 text-white backdrop-blur-xl ${
        mobile ? "shadow-2xl" : ""
      }`}
    >
      <div className="flex h-14 items-center justify-center px-2">
        <NavLink to="/dashboard" onClick={onClose} className="flex items-center gap-2">
          <img src="/white-logo.png" alt="ColdMailerAI" className="h-9 w-9 rounded p-1" />
          <span className="text-xl font-semibold tracking-wide">ColdMailerAI</span>
        </NavLink>
        {mobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dashboard navigation"
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <Button asChild className="mt-6 h-11 text-md rounded-xl bg-brand text-white hover:bg-brand-400">
        <NavLink to="/generate-email" onClick={onClose}>
          <Sparkles className="h-4 w-4" />
          Generate Email
        </NavLink>
      </Button>

      <nav className="mt-6 space-y-1">
        {navigation.map((item) => {
          const NavigationIcon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-md font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <NavigationIcon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2">
        <div className="block rounded-2xl p-3 transition bg-white/5 hover:bg-white/[0.07]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold">
              {(user?.username || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {user?.username || "ColdMailer user"}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {user?.email || "View profile"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 transition bg-white/5 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
