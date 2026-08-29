import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../services/api";
import RevisionForm from "../components/RevisionForm";

export default function AddRevision() {
  const [submitting, setSubmitting] = useState(false);
  const [existingTasks, setExistingTasks] = useState([]);

  // Loaded once just so the form can suggest a next-revision date that
  // doesn't collide with everything else already scheduled.
  useEffect(() => {
    api
      .fetchAll()
      .then((result) => setExistingTasks(Array.isArray(result) ? result : []))
      .catch(() => setExistingTasks([]));
  }, []);

  const handleSubmit = async (form) => {
    setSubmitting(true);
    try {
      await api.createRevision(form);
      toast.success("Revision added!");
      // refresh so the next suggested date accounts for what we just added
      const result = await api.fetchAll().catch(() => null);
      if (Array.isArray(result)) setExistingTasks(result);
      return true;
    } catch (err) {
      toast.error(err.message || "Failed to add revision.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <PlusCircle size={24} className="text-violet-500" /> Add Revision
        </h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">
          Log a new question and schedule when you'll revisit it.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass gradient-border rounded-2xl p-6 sm:p-8"
      >
        <RevisionForm onSubmit={handleSubmit} submitting={submitting} existingTasks={existingTasks} />
      </motion.div>
    </div>
  );
}
