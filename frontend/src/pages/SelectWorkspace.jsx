import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Database, ChevronRight, PlusCircle, X, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

function shortId(tenantId) {
  return tenantId.length > 12 ? `${tenantId.slice(0, 8)}…${tenantId.slice(-4)}` : tenantId;
}

/**
 * Lets a returning user pick which previously-connected database to sign
 * into, instead of always assuming the last one used. Picking one sets it
 * as the active workspace and moves on to /signin — connecting a brand new
 * database still goes through the existing /setup wizard.
 */
export default function SelectWorkspace() {
  const { workspaces, tenantId, setWorkspace, removeWorkspace, initializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initializing && workspaces.length === 0) {
      navigate("/welcome", { replace: true });
    }
  }, [initializing, workspaces.length, navigate]);

  const handleSelect = (id) => {
    setWorkspace(id);
    navigate("/signin");
  };

  const handleRemove = (e, id) => {
    e.stopPropagation();
    removeWorkspace(id);
  };

  return (
    <AuthLayout subtitle="Choose a workspace" wide>
      <div className="glass gradient-border rounded-2xl p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
          <Database size={18} className="text-violet-500" /> Which database?
        </h2>
        <p className="text-sm text-[var(--color-text-dim)] mb-5">
          Pick a previously connected database to sign in to, or connect a new one.
        </p>

        <div className="space-y-2 mb-5">
          <AnimatePresence initial={false}>
            {workspaces.map((w) => (
              <motion.button
                key={w.tenantId}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => handleSelect(w.tenantId)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                  w.tenantId === tenantId
                    ? "border-violet-400/50 bg-violet-500/10"
                    : "border-[var(--border-soft)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/15 flex items-center justify-center border border-violet-500/20 shrink-0">
                    <Database size={15} className="text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">
                      {w.label || "Unnamed workspace"}
                    </p>
                    <p className="text-xs text-[var(--color-text-faint)] font-mono-app truncate">
                      {shortId(w.tenantId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Forget this workspace"
                    title="Forget this workspace"
                    onClick={(e) => handleRemove(e, w.tenantId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleRemove(e, w.tenantId);
                    }}
                    className="p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-red-400 hover:bg-red-500/10"
                  >
                    <X size={14} />
                  </span>
                  <ChevronRight size={16} className="text-[var(--color-text-faint)]" />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <button
          onClick={() => navigate("/setup")}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition"
        >
          <PlusCircle size={15} /> Connect a new database
        </button>
      </div>

      {tenantId && (
        <button
          onClick={() => navigate("/signin")}
          className="w-full mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-violet-500 hover:text-violet-400"
        >
          <LogIn size={13} /> Continue to sign in
        </button>
      )}
    </AuthLayout>
  );
}
