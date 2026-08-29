import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListTodo, ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../services/api";
import TaskCard from "../components/TaskCard";
import EmptyState from "../components/EmptyState";
import { TaskListSkeleton } from "../components/LoadingSkeleton";
import CompletionModal from "../components/CompletionModal";
import { toDateStringFromBackend } from "../utils/date";

const SORTS = {
  nextDate: (a, b) => toDateStringFromBackend(a.nextReviseDate).localeCompare(toDateStringFromBackend(b.nextReviseDate)),
  topic: (a, b) => (a.topic || "").localeCompare(b.topic || ""),
  name: (a, b) => (a.questionName || "").localeCompare(b.questionName || ""),
};

export default function Pending() {
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [sortKey, setSortKey] = useState("nextDate");
  const [topicFilter, setTopicFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, all] = await Promise.all([api.fetchPending(), api.fetchAll()]);
      setTasks(Array.isArray(result) ? result : []);
      setAllTasks(Array.isArray(all) ? all : []);
    } catch (err) {
      toast.error(err.message || "Failed to load pending revisions.");
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

  const topics = useMemo(() => {
    const set = new Set(tasks.map((t) => t.topic).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (topicFilter !== "all") list = list.filter((t) => t.topic === topicFilter);
    return [...list].sort(SORTS[sortKey]);
  }, [tasks, sortKey, topicFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold flex items-center gap-2">
            <ListTodo size={24} className="text-amber-600" /> Pending
          </h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">
            {tasks.length} revision{tasks.length === 1 ? "" : "s"} awaiting review
          </p>
        </div>
      </motion.div>

      {!loading && tasks.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={13} className="text-[var(--color-text-faint)]" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-violet-400/60"
            >
              <option value="nextDate">Sort: Next date</option>
              <option value="topic">Sort: Topic</option>
              <option value="name">Sort: Question name</option>
            </select>
          </div>
          {topics.length > 1 && (
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-violet-400/60"
            >
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All topics" : t}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <TaskListSkeleton count={6} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="You're all caught up"
          subtitle="No pending revisions right now. New tasks will show up here once they're activated."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map((task, i) => (
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
    </div>
  );
}
