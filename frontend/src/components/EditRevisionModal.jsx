import Modal from "./Modal";
import RevisionForm from "./RevisionForm";

/**
 * Reuses RevisionForm in edit mode instead of a separate form — populates
 * every field from the existing task, validates, and PUTs only through
 * api.updateRevision (a manual edit; never touches revisionCount).
 */
export default function EditRevisionModal({ open, onClose, task, existingTasks = [], onSave, submitting }) {
  const handleSubmit = async (payload) => {
    if (!task) return false;
    const ok = await onSave(task._id, payload);
    if (ok) onClose();
    return ok;
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit revision" maxWidth="max-w-2xl">
      {task && <RevisionForm task={task} onSubmit={handleSubmit} submitting={submitting} existingTasks={existingTasks} />}
    </Modal>
  );
}
