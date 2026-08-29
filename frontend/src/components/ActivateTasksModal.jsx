import { AlertTriangle, Loader2, Zap } from "lucide-react";
import Modal from "./Modal";

export default function ActivateTasksModal({ open, onClose, onConfirm, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Manually activate today's tasks?">
      <div className="flex items-start gap-3 mb-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 dark:text-amber-200">
          Normally these tasks are activated automatically at the start of a new day.
          Use this only if the automatic activation did not run.
        </p>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:brightness-110 transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Activating...
            </>
          ) : (
            <>
              <Zap size={14} /> Activate tasks
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
