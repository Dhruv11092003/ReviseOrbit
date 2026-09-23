import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ListChecks, Search, Pencil, Trash2, CheckCircle2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../services/api";
import EmptyState from "../components/EmptyState";
import CompletionModal from "../components/CompletionModal";
import EditRevisionModal from "../components/EditRevisionModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import { formatDate, toDateStringFromBackend, getTodayDateString } from "../utils/date";
import { PATTERNS, resolvePatternDisplay } from "../data/patterns";

function daysLeftInfo(task) {
  const target = toDateStringFromBackend(task.nextReviseDate);
  if (!target) return { text: "—", tone: "dim" };

  if (!task.isPending) return { text: "Completed", tone: "emerald" };

  const diffMs = new Date(target) - new Date(getTodayDateString());
  const diff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, tone: "red" };
  if (diff === 0) return { text: "Due today", tone: "amber" };
  return { text: `in ${diff}d`, tone: "blue" };
}

const toneClasses = {
  emerald: "bg-emerald-500/12 text-emerald-500 border-emerald-500/25",
  red: "bg-red-500/12 text-red-400 border-red-500/25",
  amber: "bg-amber-500/12 text-amber-500 border-amber-500/25",
  blue: "bg-blue-500/12 text-blue-400 border-blue-500/25",
  dim: "bg-[var(--surface-1)] text-[var(--color-text-dim)] border-[var(--border-soft)]",
};

function Pill({ tone, children }) {
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

const selectClass =
  "bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-violet-400/60";

export default function AllTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [patternFilter, setPatternFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("nextDate");
  const [completingTask, setCompletingTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.fetchAll();
      setTasks(Array.isArray(result) ? result : []);
    } catch (err) {
      toast.error(err.message || "Failed to load tasks.");
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

  const topics = useMemo(() => {
    const set = new Set(tasks.map((t) => t.topic).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [tasks]);

  const patternsInUse = useMemo(() => {
    const ids = new Set(tasks.flatMap((t) => [t.primaryPattern, ...(t.secondaryPatterns || [])]).filter(Boolean));
    return PATTERNS.filter((p) => ids.has(p.id));
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;

    if (topicFilter !== "all") list = list.filter((t) => t.topic === topicFilter);
    if (typeFilter !== "all") list = list.filter((t) => (t.type || "leetcode") === typeFilter);
    if (statusFilter === "pending") list = list.filter((t) => t.isPending);
    if (statusFilter === "completed") list = list.filter((t) => !t.isPending);
    if (patternFilter !== "all") {
      list = list.filter((t) => t.primaryPattern === patternFilter || (t.secondaryPatterns || []).includes(patternFilter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => {
        const name = t.type === "theory" ? t.title : t.questionName;
        return (name || "").toLowerCase().includes(q) || (t.topic || "").toLowerCase().includes(q);
      });
    }

    const sorted = [...list];
    if (sortKey === "nextDate") {
      sorted.sort((a, b) => toDateStringFromBackend(a.nextReviseDate).localeCompare(toDateStringFromBackend(b.nextReviseDate)));
    } else if (sortKey === "currentDate") {
      sorted.sort((a, b) => toDateStringFromBackend(a.currentDate).localeCompare(toDateStringFromBackend(b.currentDate)));
    } else if (sortKey === "topic") {
      sorted.sort((a, b) => (a.topic || "").localeCompare(b.topic || ""));
    } else if (sortKey === "name") {
      sorted.sort((a, b) => {
        const an = a.type === "theory" ? a.title : a.questionName;
        const bn = b.type === "theory" ? b.title : b.questionName;
        return (an || "").localeCompare(bn || "");
      });
    } else if (sortKey === "pattern") {
      sorted.sort((a, b) => (resolvePatternDisplay(a)?.name || "").localeCompare(resolvePatternDisplay(b)?.name || ""));
    }
    return sorted;
  }, [tasks, topicFilter, typeFilter, statusFilter, patternFilter, search, sortKey]);

  const pendingCount = tasks.filter((t) => t.isPending).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <ListChecks size={24} className="text-violet-400" /> All Tasks
        </h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">
          {tasks.length} revision{tasks.length === 1 ? "" : "s"} tracked in total · {pendingCount} pending
        </p>
      </motion.div>

      {!loading && tasks.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              aria-label="Search tasks"
              className={`${selectClass} pl-8 w-44 sm:w-56`}
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass} aria-label="Filter by type">
            <option value="all">All types</option>
            <option value="leetcode">LeetCode</option>
            <option value="theory">Theory</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className={selectClass} aria-label="Filter by topic">
            {topics.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All topics" : t}
              </option>
            ))}
          </select>
          {patternsInUse.length > 0 && (
            <select value={patternFilter} onChange={(e) => setPatternFilter(e.target.value)} className={selectClass} aria-label="Filter by pattern">
              <option value="all">All patterns</option>
              {patternsInUse.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className={selectClass} aria-label="Sort by">
            <option value="nextDate">Sort: Next revision</option>
            <option value="currentDate">Sort: Last revised</option>
            <option value="topic">Sort: Topic</option>
            <option value="name">Sort: Name</option>
            <option value="pattern">Sort: Pattern</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--surface-1)] animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No revisions yet"
          subtitle="Add your first question or theory topic to start tracking your revision schedule."
          actionLabel="Add Revision"
          actionTo="/add"
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching tasks" subtitle="Try a different search term or filter." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.5fr_0.9fr_1fr_0.9fr_0.9fr_90px_100px_110px] gap-3 px-5 py-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)] border-b border-[var(--border-soft)]">
            <span>Name</span>
            <span>Topic</span>
            <span>Pattern</span>
            <span>Last revised</span>
            <span>Next revision</span>
            <span>Days left</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filtered.map((task, i) => {
            const info = daysLeftInfo(task);
            const pattern = resolvePatternDisplay(task);
            const name = task.type === "theory" ? task.title || "Untitled theory" : task.questionName;
            return (
              <motion.div
                key={task._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
                className="grid grid-cols-2 gap-x-3 gap-y-1.5 md:grid-cols-[1.5fr_0.9fr_1fr_0.9fr_0.9fr_90px_100px_110px] md:gap-3 px-5 py-4 border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-1)] transition-colors"
              >
                <div className="col-span-2 md:col-span-1">
                  <span
                    className={`inline-block text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded mr-1.5 align-middle ${
                      task.type === "theory" ? "bg-blue-500/10 text-blue-400" : "bg-violet-500/10 text-violet-400"
                    }`}
                  >
                    {task.type === "theory" ? "Theory" : "LC"}
                  </span>
                  <span className="font-medium text-[var(--color-text)]">{name}</span>
                </div>

                <div className="text-sm text-[var(--color-text-dim)] flex items-center">
                  <span className="md:hidden text-xs text-[var(--color-text-faint)] mr-1.5">Topic</span>
                  {task.topic}
                </div>

                <div className="text-sm text-[var(--color-text-dim)] flex items-center truncate">
                  <span className="md:hidden text-xs text-[var(--color-text-faint)] mr-1.5">Pattern</span>
                  {pattern ? pattern.name : "—"}
                </div>

                <div className="text-sm text-[var(--color-text-dim)] font-mono-app flex items-center">
                  <span className="md:hidden text-xs text-[var(--color-text-faint)] mr-1.5 font-sans">Last</span>
                  {formatDate(task.currentDate)}
                </div>

                <div className="text-sm text-[var(--color-text-dim)] font-mono-app flex items-center">
                  <span className="md:hidden text-xs text-[var(--color-text-faint)] mr-1.5 font-sans">Next</span>
                  {formatDate(task.nextReviseDate)}
                </div>

                <div className="flex items-center">
                  <Pill tone={info.tone}>{info.text}</Pill>
                </div>

                <div className="flex items-center">
                  <Pill tone={task.isPending ? "amber" : "emerald"}>{task.isPending ? "Pending" : "Completed"}</Pill>
                </div>

                <div className="col-span-2 md:col-span-1 flex items-center gap-1.5">
                  {task.type !== "theory" && task.link && task.link !== "-" && (
                    <a
                      href={task.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open question link"
                      title="Open link"
                      className="p-1.5 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--surface-2)]"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  {task.isPending && (
                    <button
                      onClick={() => setCompletingTask(task)}
                      aria-label="Complete revision"
                      title="Complete"
                      className="p-1.5 rounded-lg text-[var(--color-text-dim)] hover:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <CheckCircle2 size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => setEditingTask(task)}
                    aria-label="Edit revision"
                    title="Edit"
                    className="p-1.5 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--surface-2)]"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeletingTask(task)}
                    aria-label="Delete revision"
                    title="Delete"
                    className="p-1.5 rounded-lg text-[var(--color-text-dim)] hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <CompletionModal
        open={Boolean(completingTask)}
        onClose={() => setCompletingTask(null)}
        task={completingTask}
        existingTasks={tasks}
        onConfirm={handleComplete}
        loading={actionLoading}
      />
      <EditRevisionModal
        open={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        existingTasks={tasks}
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
    </div>
  );
}
