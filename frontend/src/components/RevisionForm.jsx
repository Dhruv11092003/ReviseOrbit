import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, PlusCircle, Save, Link2, FileText, CalendarRange, BookOpen, Code2 } from "lucide-react";
import { getTodayDateString, formatDateForInput } from "../utils/date";
import { suggestNextDate } from "../utils/schedule";
import { resolveLegacyPatternName } from "../data/patterns";
import PatternSelector from "./PatternSelector";

function taskToFormState(task) {
  const legacyPattern = task.patternIdentified && task.patternIdentified !== "-" ? task.patternIdentified : "";
  const resolvedLegacyId = !task.primaryPattern ? resolveLegacyPatternName(legacyPattern) : null;

  return {
    type: task.type === "theory" ? "theory" : "leetcode",
    topic: task.topic || "",
    qname: task.questionName || "",
    qlink: task.link && task.link !== "-" ? task.link : "",
    bForce: task.bruteForce && task.bruteForce !== "-" ? task.bruteForce : "",
    optApp: task.optimalApproach && task.optimalApproach !== "-" ? task.optimalApproach : "",
    timeComp: task.timeComplexity && task.timeComplexity !== "-" ? task.timeComplexity : "",
    primaryPattern: task.primaryPattern || resolvedLegacyId || "",
    secondaryPatterns: Array.isArray(task.secondaryPatterns) ? task.secondaryPatterns : [],
    legacyPatternText: legacyPattern,
    additionalNotes: task.additionalNotes || "",
    title: task.title || "",
    whatToRevise: task.whatToRevise || "",
    shortNotes: task.shortNotes || "",
    keyConcepts: task.keyConcepts || "",
    commonMistakes: task.commonMistakes || "",
    exampleOrUseCase: task.exampleOrUseCase || "",
    currDate: formatDateForInput(task.currentDate) || getTodayDateString(),
    nextDate: formatDateForInput(task.nextReviseDate) || "",
  };
}

const blankForm = {
  type: "leetcode",
  topic: "",
  qname: "",
  qlink: "",
  bForce: "",
  optApp: "",
  timeComp: "",
  primaryPattern: "",
  secondaryPatterns: [],
  legacyPatternText: "",
  additionalNotes: "",
  title: "",
  whatToRevise: "",
  shortNotes: "",
  keyConcepts: "",
  commonMistakes: "",
  exampleOrUseCase: "",
  currDate: getTodayDateString(),
  nextDate: "",
};

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-[var(--color-text-faint)] mt-1">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/40 transition placeholder:text-[var(--color-text-faint)]";

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-7 w-7 rounded-lg bg-violet-500/15 flex items-center justify-center border border-violet-500/20">
        <Icon size={14} className="text-violet-500" />
      </div>
      <h3 className="font-display text-sm font-semibold text-[var(--color-text)]">{title}</h3>
    </div>
  );
}

function TypeSelector({ value, onChange, disabled }) {
  const options = [
    { id: "leetcode", label: "LeetCode Question", icon: Code2 },
    { id: "theory", label: "Theory", icon: BookOpen },
  ];
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Revision type">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          disabled={disabled}
          onClick={() => onChange(id)}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition disabled:opacity-50 disabled:cursor-not-allowed ${
            value === id
              ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white border-transparent shadow-[0_0_20px_rgba(139,108,255,0.25)]"
              : "bg-[var(--surface-1)] border-[var(--border-soft)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <Icon size={15} /> {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Shared create/edit form. When `task` is provided the form starts prefilled
 * for editing that revision (type is locked — converting a LeetCode entry
 * into a Theory entry, or vice versa, isn't a "correction", so it isn't
 * offered here); otherwise it starts blank for a brand-new revision.
 */
export default function RevisionForm({ onSubmit, submitting, existingTasks = [], task = null }) {
  const isEdit = Boolean(task);
  const [form, setForm] = useState(() => (task ? taskToFormState(task) : blankForm));
  const [errors, setErrors] = useState({});

  // Prefill a sensible next-revision date for a brand-new question (rung 0
  // of the ladder), spread away from days that are already full. Only
  // fills it in while the field is still untouched, so it never overwrites
  // something the person already picked or is editing.
  useEffect(() => {
    if (!isEdit && !form.nextDate) {
      setForm((f) => ({ ...f, nextDate: suggestNextDate(0, existingTasks) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingTasks.length]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.topic.trim()) e.topic = "Topic is required.";
    if (form.type === "leetcode") {
      if (!form.qname.trim()) e.qname = "Question name is required.";
      if (form.qlink.trim()) {
        try {
          new URL(form.qlink.trim());
        } catch {
          e.qlink = "Enter a valid URL (including https://).";
        }
      }
      if (!form.primaryPattern) e.primaryPattern = "Pick the primary pattern this question uses.";
    } else {
      if (!form.title.trim()) e.title = "Theory title is required.";
    }
    if (!form.currDate) e.currDate = "Current date is required.";
    if (!form.nextDate) e.nextDate = "Next revision date is required.";
    if (form.currDate && form.nextDate && form.nextDate < form.currDate) {
      e.nextDate = "Next revision date must be on or after the current date.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    type: form.type,
    topic: form.topic,
    qname: form.qname,
    qlink: form.qlink,
    bForce: form.bForce,
    optApp: form.optApp,
    timeComp: form.timeComp,
    primaryPattern: form.primaryPattern,
    secondaryPatterns: form.secondaryPatterns,
    pattern: form.legacyPatternText || undefined,
    additionalNotes: form.additionalNotes,
    title: form.title,
    whatToRevise: form.whatToRevise,
    shortNotes: form.shortNotes,
    keyConcepts: form.keyConcepts,
    commonMistakes: form.commonMistakes,
    exampleOrUseCase: form.exampleOrUseCase,
    currDate: form.currDate,
    nextDate: form.nextDate,
  });

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const ok = await onSubmit(buildPayload());
    if (ok && !isEdit) {
      setForm({ ...blankForm, nextDate: suggestNextDate(0, existingTasks) });
      setErrors({});
    }
  };

  const isLeetcode = form.type === "leetcode";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader icon={FileText} title="Revision Type" />
        <TypeSelector value={form.type} onChange={set("type")} disabled={isEdit} />
        {isEdit && (
          <p className="text-xs text-[var(--color-text-faint)] mt-2">
            Type can't be changed after creation — add a new revision if you meant to log the other kind.
          </p>
        )}
      </motion.section>

      {isLeetcode ? (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <SectionHeader icon={Code2} title="Question Information" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Topic *">
              <input className={inputClass} placeholder="Arrays, Graphs, DP..." value={form.topic} onChange={update("topic")} />
              {errors.topic && <p className="text-xs text-red-500 mt-1">{errors.topic}</p>}
            </Field>
            <Field label="Question name *">
              <input className={inputClass} placeholder="Two Sum" value={form.qname} onChange={update("qname")} />
              {errors.qname && <p className="text-xs text-red-500 mt-1">{errors.qname}</p>}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Question link">
                <div className="relative">
                  <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
                  <input
                    className={`${inputClass} pl-9`}
                    placeholder="https://leetcode.com/problems/two-sum/"
                    value={form.qlink}
                    onChange={update("qlink")}
                  />
                </div>
                {errors.qlink && <p className="text-xs text-red-500 mt-1">{errors.qlink}</p>}
              </Field>
            </div>
          </div>
        </motion.section>
      ) : (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <SectionHeader icon={BookOpen} title="Theory Information" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Topic *">
              <input className={inputClass} placeholder="Binary Search, Graphs..." value={form.topic} onChange={update("topic")} />
              {errors.topic && <p className="text-xs text-red-500 mt-1">{errors.topic}</p>}
            </Field>
            <Field label="Theory title *">
              <input className={inputClass} placeholder="Binary Search on the Answer" value={form.title} onChange={update("title")} />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </Field>
            <div className="sm:col-span-2">
              <Field label="What to revise">
                <textarea
                  className={`${inputClass} min-h-[70px] resize-y`}
                  placeholder="The core mechanism to re-derive from memory..."
                  value={form.whatToRevise}
                  onChange={update("whatToRevise")}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Key concepts">
                <textarea
                  className={`${inputClass} min-h-[70px] resize-y`}
                  placeholder="The ideas this topic actually depends on..."
                  value={form.keyConcepts}
                  onChange={update("keyConcepts")}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Short notes">
                <textarea className={`${inputClass} min-h-[60px] resize-y`} value={form.shortNotes} onChange={update("shortNotes")} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Common mistakes / pitfalls">
                <textarea className={`${inputClass} min-h-[60px] resize-y`} value={form.commonMistakes} onChange={update("commonMistakes")} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Example / use case">
                <textarea className={`${inputClass} min-h-[60px] resize-y`} value={form.exampleOrUseCase} onChange={update("exampleOrUseCase")} />
              </Field>
            </div>
          </div>
        </motion.section>
      )}

      {isLeetcode && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionHeader icon={FileText} title="Solution Notes" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Brute force">
                <textarea
                  className={`${inputClass} min-h-[70px] resize-y`}
                  placeholder="Describe the brute-force approach..."
                  value={form.bForce}
                  onChange={update("bForce")}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Optimal approach">
                <textarea
                  className={`${inputClass} min-h-[70px] resize-y`}
                  placeholder="Describe the optimal approach..."
                  value={form.optApp}
                  onChange={update("optApp")}
                />
              </Field>
            </div>
            <Field label="Time complexity">
              <input className={inputClass} placeholder="O(n)" value={form.timeComp} onChange={update("timeComp")} />
            </Field>
            <div />
            <div className="sm:col-span-2">
              <PatternSelector value={form.primaryPattern} onChange={set("primaryPattern")} label="Primary pattern" required />
              {errors.primaryPattern && <p className="text-xs text-red-500 mt-1">{errors.primaryPattern}</p>}
              {form.legacyPatternText && !form.primaryPattern && (
                <p className="text-xs text-amber-500 mt-1.5">
                  Previously recorded as "{form.legacyPatternText}" — pick the closest canonical pattern above (kept as-is if you don't).
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <PatternSelector
                value={form.secondaryPatterns}
                onChange={set("secondaryPatterns")}
                label="Secondary patterns"
                multiple
                excludeIds={form.primaryPattern ? [form.primaryPattern] : []}
              />
            </div>
          </div>
        </motion.section>
      )}

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <SectionHeader icon={FileText} title="Additional Notes" />
        <Field label="Mistakes, edge cases, reminders, alternate approaches...">
          <textarea
            className={`${inputClass} min-h-[70px] resize-y`}
            placeholder="Anything worth remembering next time you revise this..."
            value={form.additionalNotes}
            onChange={update("additionalNotes")}
          />
        </Field>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <SectionHeader icon={CalendarRange} title="Revision Schedule" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Current date *" hint={isEdit ? "Manual correction — doesn't count as completing a revision." : undefined}>
            <input type="date" className={inputClass} value={form.currDate} onChange={update("currDate")} />
            {errors.currDate && <p className="text-xs text-red-500 mt-1">{errors.currDate}</p>}
          </Field>
          <Field
            label="Next revision date *"
            hint={isEdit ? "Manual correction — doesn't count as completing a revision." : "Suggested so it doesn't pile up with other revisions."}
          >
            <input type="date" className={inputClass} value={form.nextDate} onChange={update("nextDate")} />
            {errors.nextDate && <p className="text-xs text-red-400 mt-1">{errors.nextDate}</p>}
          </Field>
        </div>
      </motion.section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:brightness-110 transition disabled:opacity-60 shadow-[0_0_30px_rgba(139,108,255,0.25)]"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" /> {isEdit ? "Saving..." : "Adding..."}
          </>
        ) : isEdit ? (
          <>
            <Save size={16} /> Save Changes
          </>
        ) : (
          <>
            <PlusCircle size={16} /> Add Revision
          </>
        )}
      </button>
    </form>
  );
}
