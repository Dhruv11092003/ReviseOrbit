import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ListChecks, Search } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../services/api";
import EmptyState from "../components/EmptyState";
import { formatDate, toDateStringFromBackend, getTodayDateString } from "../utils/date";

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

export default function AllTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [sortKey, setSortKey] = useState("nextDate");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await api.fetchAll();
        setTasks(Array.isArray(result) ? result : []);
      } catch (err) {
        toast.error(err.message || "Failed to load tasks.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const topics = useMemo(() => {
    const set = new Set(tasks.map((t) => t.topic).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = tasks;

    if (topicFilter !== "all") {
      list = list.filter((t) => t.topic === topicFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.questionName?.toLowerCase().includes(q));
    }

    const sorted = [...list];
    if (sortKey === "nextDate") {
      sorted.sort((a, b) =>
        toDateStringFromBackend(a.nextReviseDate).localeCompare(toDateStringFromBackend(b.nextReviseDate))
      );
    } else if (sortKey === "topic") {
      sorted.sort((a, b) => (a.topic || "").localeCompare(b.topic || ""));
    } else if (sortKey === "name") {
      sorted.sort((a, b) => (a.questionName || "").localeCompare(b.questionName || ""));
    }
    return sorted;
  }, [tasks, topicFilter, search, sortKey]);

  const pendingCount = tasks.filter((t) => t.isPending).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <ListChecks size={24} className="text-violet-400" /> All Tasks
        </h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">
          {tasks.length} question{tasks.length === 1 ? "" : "s"} tracked in total · {pendingCount} pending
        </p>
      </motion.div>

      {!loading && tasks.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search question..."
              className="bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-violet-400/60 w-44 sm:w-56"
            />
          </div>
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
          subtitle="Add your first question to start tracking your revision schedule."
          actionLabel="Add Revision"
          actionTo="/add"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          subtitle="Try a different search term or topic filter."
        />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.6fr_1fr_1fr_1fr_110px_110px] gap-3 px-5 py-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)] border-b border-[var(--border-soft)]">
            <span>Question</span>
            <span>Topic</span>
            <span>Last revised</span>
            <span>Next revision</span>
            <span>Days left</span>
            <span>Status</span>
          </div>

          {filtered.map((task, i) => {
            const info = daysLeftInfo(task);
            return (
              <motion.div
                key={task._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
                className="grid grid-cols-2 gap-x-3 gap-y-1.5 md:grid-cols-[1.6fr_1fr_1fr_1fr_110px_110px] md:gap-3 px-5 py-4 border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-1)] transition-colors"
              >
                <div className="col-span-2 md:col-span-1">
                  <p className="font-medium text-[var(--color-text)]">{task.questionName}</p>
                  {task.patternIdentified && (
                    <p className="text-xs text-[var(--color-text-faint)] mt-0.5">{task.patternIdentified}</p>
                  )}
                </div>

                <div className="text-sm text-[var(--color-text-dim)] flex items-center">
                  <span className="md:hidden text-xs text-[var(--color-text-faint)] mr-1.5">Topic</span>
                  {task.topic}
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
                  <Pill tone={task.isPending ? "amber" : "emerald"}>
                    {task.isPending ? "Pending" : "Completed"}
                  </Pill>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
