import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Lightbulb,
  Eye,
  ShieldAlert,
  GitBranch,
  Layers,
  Gauge,
  BookOpenCheck,
  ListTree,
} from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../services/api";
import EmptyState from "../components/EmptyState";
import EditRevisionModal from "../components/EditRevisionModal";
import {
  PATTERNS,
  PATTERN_CATEGORIES,
  NEVER_SEEN_IT_PROCEDURE,
  CONSTRAINT_COMPLEXITY_TABLE,
  ANTI_PATTERN_TABLE,
  getPatternById,
} from "../data/patterns";
import { resolvePatternDisplay } from "../data/patterns";

function matchesQuery(pattern, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystacks = [
    pattern.name,
    pattern.category,
    pattern.description,
    pattern.coreIdea,
    pattern.typicalDataStructure,
    ...(pattern.recognitionKeywords || []),
    ...(pattern.structuralSignals || []),
    ...(pattern.constraintSignals || []),
    ...(pattern.commonMistakes || []),
    ...(pattern.antiPatterns || []),
    ...(pattern.relatedPatterns || []).map((id) => getPatternById(id)?.name || id),
  ];
  return haystacks.some((h) => h && h.toLowerCase().includes(q));
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className="text-violet-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function TagList({ items }) {
  if (!items || items.length === 0) return <p className="text-sm text-[var(--color-text-faint)]">—</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="text-xs px-2 py-1 rounded-md bg-[var(--surface-1)] border border-[var(--border-soft)] text-[var(--color-text-dim)]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function PatternDetail({ pattern, onClose, relatedQuestions, onOpenQuestion }) {
  const category = PATTERN_CATEGORIES.find((c) => c.id === pattern.category);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
    >
      <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full sm:max-w-lg h-full glass border-l border-[var(--border-soft)] overflow-y-auto p-6"
        role="dialog"
        aria-modal="true"
        aria-label={pattern.name}
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-400 mb-1">{category?.name}</p>
            <h2 className="font-display text-xl font-semibold">{pattern.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close pattern details"
            className="p-1.5 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--surface-1)]"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-[var(--color-text-dim)] mb-6">{pattern.description}</p>

        <Section icon={Eye} title="LOOK FOR — recognition keywords">
          <TagList items={pattern.recognitionKeywords} />
        </Section>

        <Section icon={Layers} title="Structural signals">
          <TagList items={pattern.structuralSignals} />
        </Section>

        {pattern.constraintSignals?.length > 0 && (
          <Section icon={Gauge} title="Constraint signals">
            <TagList items={pattern.constraintSignals} />
          </Section>
        )}

        <Section icon={Lightbulb} title="Core idea">
          <p className="text-sm text-[var(--color-text)]">{pattern.coreIdea}</p>
        </Section>

        <Section icon={ListTree} title="Invariant">
          <p className="text-sm text-[var(--color-text)]">{pattern.invariant}</p>
        </Section>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-1">Data structure</h4>
            <p className="text-sm text-[var(--color-text-dim)]">{pattern.typicalDataStructure}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-1">Complexity</h4>
            <p className="text-sm text-[var(--color-text-dim)] font-mono-app">{pattern.complexity}</p>
          </div>
        </div>

        {pattern.diagram && (
          <Section icon={GitBranch} title="Diagram">
            <pre className="text-xs leading-relaxed bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg p-3 overflow-x-auto font-mono-app whitespace-pre">
              {pattern.diagram}
            </pre>
          </Section>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-500 mb-1">When to use</h4>
            <p className="text-sm text-[var(--color-text-dim)]">{pattern.whenToUse}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-1">When NOT to use</h4>
            <p className="text-sm text-[var(--color-text-dim)]">{pattern.whenNotToUse}</p>
          </div>
        </div>

        {pattern.commonMistakes?.length > 0 && (
          <Section icon={ShieldAlert} title="Common mistakes">
            <ul className="list-disc list-inside space-y-1 text-sm text-[var(--color-text-dim)]">
              {pattern.commonMistakes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Section>
        )}

        {pattern.antiPatterns?.length > 0 && (
          <Section icon={ShieldAlert} title="Anti-patterns — don't use this when...">
            <ul className="list-disc list-inside space-y-1 text-sm text-red-400/90">
              {pattern.antiPatterns.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Section>
        )}

        {pattern.relatedPatterns?.length > 0 && (
          <Section icon={Compass} title="Related patterns">
            <TagList items={pattern.relatedPatterns.map((id) => getPatternById(id)?.name).filter(Boolean)} />
          </Section>
        )}

        {pattern.examples?.length > 0 && (
          <Section icon={BookOpenCheck} title="Example questions">
            <TagList items={pattern.examples} />
          </Section>
        )}

        <div className="mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-2">
            Your questions using this pattern
          </h4>
          {relatedQuestions.length === 0 ? (
            <p className="text-sm text-[var(--color-text-faint)]">No revisions tagged with this pattern yet.</p>
          ) : (
            <div className="space-y-1.5">
              {relatedQuestions.map((q) => (
                <button
                  key={q._id}
                  onClick={() => onOpenQuestion(q)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition-colors"
                >
                  {q.type === "theory" ? q.title : q.questionName}
                  <span className="text-[var(--color-text-faint)]"> · {q.topic}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--color-text-faint)] pt-2 border-t border-[var(--border-soft)]">
          Handbook reference: {pattern.handbookReference}
        </p>
      </motion.div>
    </motion.div>
  );
}

function NeverSeenItHelper() {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass gradient-border rounded-2xl p-5 mb-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-display text-base font-semibold">
          <Compass size={17} className="text-violet-500" /> Never Seen This Problem?
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-[var(--color-text-faint)]" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-4 grid md:grid-cols-2 gap-6">
              <ol className="space-y-2 text-sm text-[var(--color-text-dim)] list-decimal list-inside">
                {NEVER_SEEN_IT_PROCEDURE.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)] mb-2">
                  Constraints → target complexity
                </h4>
                <div className="space-y-1">
                  {CONSTRAINT_COMPLEXITY_TABLE.map((row) => (
                    <div key={row.constraint} className="flex items-start gap-2 text-xs py-1 border-b border-[var(--border-soft)] last:border-0">
                      <span className="font-mono-app text-[var(--color-text)] w-32 shrink-0">{row.constraint}</span>
                      <span className="font-mono-app text-violet-400 w-28 shrink-0">{row.target}</span>
                      <span className="text-[var(--color-text-faint)]">{row.fits}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Patterns() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    api
      .fetchAll()
      .then((result) => setTasks(Array.isArray(result) ? result : []))
      .catch(() => setTasks([]));
  }, []);

  const filteredPatterns = useMemo(() => {
    return PATTERNS.filter((p) => (categoryFilter === "all" || p.category === categoryFilter) && matchesQuery(p, query));
  }, [query, categoryFilter]);

  const groups = useMemo(() => {
    return PATTERN_CATEGORIES.map((cat) => ({
      category: cat,
      items: filteredPatterns.filter((p) => p.category === cat.id),
    })).filter((g) => g.items.length > 0);
  }, [filteredPatterns]);

  const relatedQuestions = useMemo(() => {
    if (!selectedPattern) return [];
    return tasks.filter((t) => {
      if (t.primaryPattern === selectedPattern.id || (t.secondaryPatterns || []).includes(selectedPattern.id)) return true;
      const legacy = resolvePatternDisplay(t);
      return legacy?.id === selectedPattern.id;
    });
  }, [selectedPattern, tasks]);

  const handleSaveEdit = async (id, payload) => {
    setActionLoading(true);
    try {
      await api.updateRevision(id, payload);
      toast.success("Revision updated.");
      const result = await api.fetchAll().catch(() => null);
      if (Array.isArray(result)) setTasks(result);
      return true;
    } catch (err) {
      toast.error(err.message || "Failed to update revision.");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <Compass size={24} className="text-violet-500" /> Patterns
        </h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1 max-w-2xl">
          A DSA pattern-recognition reference: what to look for, what it signals structurally, and when NOT to
          reach for it — derived from the DSA Handbook's Pattern Recognition Guide.
        </p>
      </motion.div>

      <NeverSeenItHelper />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, keyword, signal, data structure..."
            className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-violet-400/60"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-2.5 py-2 text-sm outline-none focus:border-violet-400/60"
        >
          <option value="all">All categories</option>
          {PATTERN_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={Search} title="No patterns found" subtitle="Try a different search term or category." />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.category.id}>
              <h2 className="text-sm font-semibold text-[var(--color-text-dim)] mb-3 flex items-center gap-1.5">
                <ChevronRight size={14} className="text-violet-400" /> {group.category.name}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPattern(p)}
                    className="text-left glass rounded-xl p-4 border border-[var(--border-soft)] hover:border-violet-400/40 transition-colors"
                  >
                    <h3 className="font-display text-sm font-semibold mb-1">{p.name}</h3>
                    <p className="text-xs text-[var(--color-text-dim)] line-clamp-2">{p.description}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-10 glass rounded-2xl p-5">
        <h2 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
          <ShieldAlert size={15} className="text-red-400" /> Anti-Patterns: When the Obvious Choice Is Wrong
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-text-faint)] border-b border-[var(--border-soft)]">
                <th className="py-2 pr-4">Tempting choice</th>
                <th className="py-2 pr-4">Why it fails</th>
                <th className="py-2">Use instead</th>
              </tr>
            </thead>
            <tbody>
              {ANTI_PATTERN_TABLE.map((row) => (
                <tr key={row.tempting} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="py-2 pr-4 text-[var(--color-text)]">{row.tempting}</td>
                  <td className="py-2 pr-4 text-[var(--color-text-dim)]">{row.why}</td>
                  <td className="py-2 text-emerald-500">{row.useInstead}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedPattern && (
          <PatternDetail
            pattern={selectedPattern}
            onClose={() => setSelectedPattern(null)}
            relatedQuestions={relatedQuestions}
            onOpenQuestion={setEditingTask}
          />
        )}
      </AnimatePresence>

      <EditRevisionModal
        open={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        existingTasks={tasks}
        onSave={handleSaveEdit}
        submitting={actionLoading}
      />
    </div>
  );
}
