import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import Modal from "./Modal";

export default function DeleteConfirmModal({ open, onClose, task, onConfirm, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Delete this revision?">
      <div className="flex items-start gap-3 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
        <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <p className="text-sm text-red-600 dark:text-red-300">
          {task && (
            <>
              <span className="font-medium">{task.type === "theory" ? task.title : task.questionName}</span>{" "}
            </>
          )}
          will be permanently removed. This action cannot be undone.
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
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-red-500 to-red-400 text-red-950 hover:brightness-110 transition disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Deleting...
            </>
          ) : (
            <>
              <Trash2 size={14} /> Delete
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
