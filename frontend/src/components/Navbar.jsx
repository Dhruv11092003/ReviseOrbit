import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarClock,
  ListTodo,
  PlusCircle,
  ListChecks,
  LogOut,
  Menu,
  X,
  Orbit,
  Sun,
  Moon,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/today", label: "Today", icon: CalendarClock },
  { to: "/pending", label: "Pending", icon: ListTodo },
  { to: "/all", label: "All Tasks", icon: ListChecks },
  { to: "/add", label: "Add Revision", icon: PlusCircle },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--surface-1)] transition-colors ${className}`}
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/signin");
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="glass border-b border-[var(--border-soft)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,108,255,0.35)]">
              <Orbit size={17} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold tracking-tight text-[15px] sm:text-base">
              Revision<span className="text-gradient">Orbit</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--surface-2)] text-[var(--color-text)]"
                      : "text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--surface-1)]"
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-1.5">
            <ThemeToggle />
            <span className="text-sm text-[var(--color-text-dim)] px-2">
              {username}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text-dim)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>

          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle />
            <button
              className="p-2 text-[var(--color-text-dim)]"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden glass border-b border-[var(--border-soft)] overflow-hidden"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-[var(--surface-2)] text-[var(--color-text)]"
                        : "text-[var(--color-text-dim)]"
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
              <div className="h-px bg-[var(--border-soft)] my-1.5" />
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-sm text-[var(--color-text-dim)]">{username}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-400"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
