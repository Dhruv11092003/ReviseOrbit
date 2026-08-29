import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  ListTodo,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  Zap,
  Sparkles,
  ListChecks,
} from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import EmptyState from "../components/EmptyState";
import { TaskListSkeleton, StatCardSkeleton } from "../components/LoadingSkeleton";
import CompletionModal from "../components/CompletionModal";
import CompleteAllModal from "../components/CompleteAllModal";
import ActivateTasksModal from "../components/ActivateTasksModal";
import { isOverdue } from "../utils/date";

export default function Dashboard() {
  const { username } = useAuth();
  const [today, setToday] = useState([]);
  const [pending, setPending] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState(null);
  const [completeAllOpen, setCompleteAllOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p, a] = await Promise.all([
        api.fetchToday(),
        api.fetchPending(),
        api.fetchAll(),
      ]);
      setToday(Array.isArray(t) ? t : []);
      setPending(Array.isArray(p) ? p : []);
      setAllTasks(Array.isArray(a) ? a : []);
    } catch (err) {
      toast.error(err.message || "Failed to load dashboard data.");
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

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      const res = await api.activateTodayTasks();
      toast.success(`${res?.updatedCount ?? 0} task(s) activated.`);
      setActivateOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to activate tasks.");
    } finally {
      setActionLoading(false);
    }
  };

  const todayCount = today.length;
  const pendingCount = pending.length;
  const overdueCount = pending.filter((t) => isOverdue(t.nextReviseDate)).length;
  const todayPending = today.filter((t) => t.isPending);

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"
      >
        <div>
          <p className="text-sm text-[var(--color-text-dim)] mb-1">{dateLabel}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">
            Welcome back, <span className="text-gradient">{username}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/add"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:brightness-110 transition shadow-[0_0_20px_rgba(139,108,255,0.25)]"
          >
            <PlusCircle size={15} /> Add Revision
          </Link>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={CalendarClock} label="Due today" value={todayCount} accent="violet" delay={0} />
          <StatCard icon={ListTodo} label="Pending" value={pendingCount} accent="amber" delay={0.05} />
          <StatCard icon={TrendingUp} label="Overdue" value={overdueCount} accent="blue" delay={0.1} />
          <StatCard
            icon={CheckCircle2}
            label="Completed today"
            value={todayCount - todayPending.length}
            accent="emerald"
            delay={0.15}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-10">
        {todayPending.length > 0 && (
          <button
            onClick={() => setCompleteAllOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition"
          >
            <ListChecks size={15} className="text-emerald-500" /> Complete all today's tasks
          </button>
        )}
        <button
          onClick={() => setActivateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition"
        >
          <Zap size={15} className="text-violet-500" /> Activate today's tasks
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500" /> Today's Revision
        </h2>
        <Link to="/today" className="text-xs font-medium text-violet-500 hover:text-violet-400">
          View all →
        </Link>
      </div>

      {loading ? (
        <TaskListSkeleton />
      ) : today.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing scheduled for today"
          subtitle="You're free today — enjoy the break, or get ahead by adding a new revision."
          actionLabel="Add Revision"
          actionTo="/add"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <AnimatePresence>
            {today.slice(0, 4).map((task, i) => (
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
        count={todayPending.length}
        existingTasks={allTasks}
        onConfirm={handleCompleteAll}
        loading={actionLoading}
      />
      <ActivateTasksModal
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onConfirm={handleActivate}
        loading={actionLoading}
      />
    </div>
  );
}
