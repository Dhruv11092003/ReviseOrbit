import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import Modal from "./Modal";
import { minSelectableDate, getTodayDateString } from "../utils/date";
import { suggestNextDate } from "../utils/schedule";

export default function CompletionModal({ open, onClose, task, existingTasks = [], onConfirm, loading }) {
  const [nextDate, setNextDate] = useState("");
  const [error, setError] = useState("");

  // Re-suggest a date every time a new task is opened for completion, using
  // the spaced-repetition ladder (task.revisionCount) and spreading it away
  // from days that already have a full load.
  useEffect(() => {
    if (open && task) {
      setNextDate(suggestNextDate(task.revisionCount, existingTasks));
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?._id]);

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
    <Modal open={open} onClose={onClose} title="Complete revision">
      {task && (
        <div className="mb-4">
          <p className="text-sm text-[var(--color-text-dim)]">
            Mark <span className="text-[var(--color-text)] font-medium">{task.questionName}</span> as
            completed and schedule its next revision.
          </p>
        </div>
      )}

      <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">
        Next revision date
      </label>
      <input
        type="date"
        value={nextDate}
        min={minSelectableDate()}
        onChange={(e) => setNextDate(e.target.value)}
        className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/40 transition"
      />
      <p className="text-xs text-[var(--color-text-faint)] mt-1.5">
        Suggested using your revision history — feel free to change it.
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
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-500 to-emerald-400 text-emerald-950 hover:brightness-110 transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Completing...
            </>
          ) : (
            <>
              <CheckCircle2 size={14} /> Mark complete
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
