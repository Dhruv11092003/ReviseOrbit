import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, ListChecks } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../services/api";
import TaskCard from "../components/TaskCard";
import EmptyState from "../components/EmptyState";
import { TaskListSkeleton } from "../components/LoadingSkeleton";
import CompletionModal from "../components/CompletionModal";
import CompleteAllModal from "../components/CompleteAllModal";

export default function Today() {
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState(null);
  const [completeAllOpen, setCompleteAllOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, all] = await Promise.all([api.fetchToday(), api.fetchAll()]);
      setTasks(Array.isArray(result) ? result : []);
      setAllTasks(Array.isArray(all) ? all : []);
    } catch (err) {
      toast.error(err.message || "Failed to load today's revisions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async (nextDate) => {
    if (!completingTask) return;
    setActionLoading(true);
    try {
      await api.completeRevision(completingTask._id, nextDate);
      toast.success("Task marked complete!");
      setCompletingTask(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to complete task.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteAll = async (nextDate) => {
    setActionLoading(true);
    try {
      const res = await api.completeAllToday(nextDate);
      toast.success(res?.message || "All today's revisions completed!");
      setCompleteAllOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to complete all tasks.");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingToday = tasks.filter((t) => t.isPending);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold flex items-center gap-2">
            <CalendarClock size={24} className="text-violet-500" /> Today's Revision
          </h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">
            {tasks.length} task{tasks.length === 1 ? "" : "s"} scheduled for today
          </p>
        </div>
        {pendingToday.length > 0 && (
          <button
            onClick={() => setCompleteAllOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500 to-emerald-400 text-emerald-950 hover:brightness-110 transition"
          >
            <ListChecks size={15} /> Complete all
          </button>
        )}
      </motion.div>

      {loading ? (
        <TaskListSkeleton count={6} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing scheduled for today"
          subtitle="You're free today — enjoy the break, or get ahead by adding a new revision."
          actionLabel="Add Revision"
          actionTo="/add"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {tasks.map((task, i) => (
              <TaskCard key={task._id} task={task} index={i} onComplete={setCompletingTask} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <CompletionModal
        open={Boolean(completingTask)}
        onClose={() => setCompletingTask(null)}
        task={completingTask}
        existingTasks={allTasks}
        onConfirm={handleComplete}
        loading={actionLoading}
      />
      <CompleteAllModal
        open={completeAllOpen}
        onClose={() => setCompleteAllOpen(false)}
        count={pendingToday.length}
        existingTasks={allTasks}
        onConfirm={handleCompleteAll}
        loading={actionLoading}
      />
    </div>
  );
}
