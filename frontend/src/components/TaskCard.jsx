import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  Tag,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDate, isToday, isOverdue } from "../utils/date";

function StatusBadge({ task }) {
  if (!task.isPending) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/12 text-emerald-500 border border-emerald-500/20">
        <CheckCircle2 size={12} /> Completed
      </span>
    );
  }
  if (isOverdue(task.nextReviseDate)) {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/12 text-red-500 border border-red-500/20">
        Overdue
      </span>
    );
  }
  if (isToday(task.nextReviseDate)) {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/12 text-amber-600 border border-amber-500/20">
        Due today
      </span>
    );
  }
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/12 text-blue-500 border border-blue-500/20">
      Upcoming
    </span>
  );
}

export default function TaskCard({ task, onComplete, index = 0 }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
      whileHover={{ y: -3 }}
      className="glass gradient-border rounded-2xl p-5 relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-violet-500/90">
          <Tag size={11} /> {task.topic || "General"}
        </span>
        <StatusBadge task={task} />
      </div>

      <h3 className="font-display text-base font-semibold leading-snug mb-1 pr-1">
        {task.questionName}
      </h3>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-dim)] mb-3">
        {task.timeComplexity && (
          <span className="font-mono-app flex items-center gap-1">
            <Clock size={12} /> {task.timeComplexity}
          </span>
        )}
        {task.patternIdentified && (
          <span className="flex items-center gap-1">
            <Sparkles size={12} /> {task.patternIdentified}
          </span>
        )}
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors mb-1"
      >
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} />
        </motion.span>
        {expanded ? "Hide details" : "Show details"}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1 space-y-2.5 text-sm">
              {task.bruteForce && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-faint)] mb-0.5">
                    Brute force
                  </p>
                  <p className="text-[var(--color-text-dim)]">{task.bruteForce}</p>
                </div>
              )}
              {task.optimalApproach && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-faint)] mb-0.5">
                    Optimal approach
                  </p>
                  <p className="text-[var(--color-text-dim)]">{task.optimalApproach}</p>
                </div>
              )}
              <div className="flex gap-6 pt-1">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-faint)] mb-0.5">
                    Last revised
                  </p>
                  <p className="font-mono-app text-xs text-[var(--color-text-dim)]">
                    {formatDate(task.currentDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-faint)] mb-0.5">
                    Next revision
                  </p>
                  <p className="font-mono-app text-xs text-[var(--color-text-dim)]">
                    {formatDate(task.nextReviseDate)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-soft)]">
        {task.link && (
          <a
            href={task.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--color-text)] transition-colors border border-[var(--border-soft)]"
          >
            Solve Question <ExternalLink size={12} />
          </a>
        )}
        {task.isPending && onComplete && (
          <button
            onClick={() => onComplete(task)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-emerald-500/90 to-emerald-400/90 hover:brightness-110 text-emerald-950 transition"
          >
            <CheckCircle2 size={13} /> Complete
          </button>
        )}
      </div>
    </motion.div>
  );
}
