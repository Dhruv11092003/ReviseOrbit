import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, CheckCheck } from "lucide-react";
import Modal from "./Modal";
import { minSelectableDate, getTodayDateString } from "../utils/date";
import { suggestNextDate } from "../utils/schedule";

export default function CompleteAllModal({ open, onClose, count, existingTasks = [], onConfirm, loading }) {
  const [nextDate, setNextDate] = useState("");
  const [error, setError] = useState("");

  // Bulk-complete uses the ladder's second rung (7 days) as a sensible
  // baseline for a mixed batch, then spreads away from full days.
  useEffect(() => {
    if (open) {
      setNextDate(suggestNextDate(1, existingTasks));
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = () => {
    if (!nextDate) {
      setError("Please choose a next revision date.");
      return;
    }
    if (nextDate < getTodayDateString()) {
      setError("Next revision date can't be in the past.");
      return;
    }
    setError("");
    onConfirm(nextDate);
  };

  return (
    <Modal open={open} onClose={onClose} title="Complete all today's revisions?">
      <div className="flex items-start gap-3 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 dark:text-amber-200">
          All {count} of today's revision task{count === 1 ? "" : "s"} will be marked
          complete and moved to the selected next revision date. This can't be undone.
        </p>
      </div>

      <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">
        Next revision date for all
      </label>
      <input
        type="date"
        value={nextDate}
        min={minSelectableDate()}
        onChange={(e) => setNextDate(e.target.value)}
        className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/40 transition"
      />
      <p className="text-xs text-[var(--color-text-faint)] mt-1.5">
        Suggested to keep future days from getting overloaded — feel free to change it.
      </p>
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}

      <div className="flex gap-2 mt-6">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 hover:brightness-110 transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Completing all...
            </>
          ) : (
            <>
              <CheckCheck size={14} /> Complete all
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
