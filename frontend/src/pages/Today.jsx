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
import EditRevisionModal from "../components/EditRevisionModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import { isOverdue } from "../utils/date";

export default function Today() {
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState(null);
  const [completeAllOpen, setCompleteAllOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
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

  const handleSaveEdit = async (id, payload) => {
    setActionLoading(true);
    try {
      await api.updateRevision(id, payload);
      toast.success("Revision updated.");
      await load();
      return true;
    } catch (err) {
      toast.error(err.message || "Failed to update revision.");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    setActionLoading(true);
    try {
      await api.deleteRevision(deletingTask._id);
      toast.success("Revision deleted.");
      setDeletingTask(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to delete revision.");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingToday = tasks.filter((t) => t.isPending);
  const overdueTasks = pendingToday.filter((t) => isOverdue(t.nextReviseDate));
  const dueTodayTasks = pendingToday.filter((t) => !isOverdue(t.nextReviseDate));

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
            {pendingToday.length} task{pendingToday.length === 1 ? "" : "s"} due
            {overdueTasks.length > 0 && ` (${overdueTasks.length} overdue)`}
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
        <div className="space-y-8">
          {overdueTasks.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-red-400 mb-3">Overdue</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {overdueTasks.map((task, i) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      index={i}
                      onComplete={setCompletingTask}
                      onEdit={setEditingTask}
                      onDelete={setDeletingTask}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
          {dueTodayTasks.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-text-dim)] mb-3">Due Today</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {dueTodayTasks.map((task, i) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      index={i}
                      onComplete={setCompletingTask}
                      onEdit={setEditingTask}
                      onDelete={setDeletingTask}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
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
      <EditRevisionModal
        open={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        existingTasks={allTasks}
        onSave={handleSaveEdit}
        submitting={actionLoading}
      />
      <DeleteConfirmModal
        open={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        task={deletingTask}
        onConfirm={handleConfirmDelete}
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
