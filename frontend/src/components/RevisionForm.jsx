import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, PlusCircle, Link2, FileText, CalendarRange } from "lucide-react";
import { getTodayDateString } from "../utils/date";
import { suggestNextDate } from "../utils/schedule";

const initial = {
  topic: "",
  qname: "",
  qlink: "",
  bForce: "",
  optApp: "",
  timeComp: "",
  pattern: "",
  currDate: getTodayDateString(),
  nextDate: "",
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">
        {label}
      </label>
      {children}
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

export default function RevisionForm({ onSubmit, submitting, existingTasks = [] }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  // Prefill a sensible next-revision date for a brand-new question (rung 0
  // of the ladder), spread away from days that are already full. Only
  // fills it in while the field is still untouched, so it never overwrites
  // something the person already picked.
  useEffect(() => {
    if (!form.nextDate) {
      setForm((f) => ({ ...f, nextDate: suggestNextDate(0, existingTasks) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingTasks.length]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.topic.trim()) e.topic = "Topic is required.";
    if (!form.qname.trim()) e.qname = "Question name is required.";
    if (form.qlink.trim()) {
      try {
        new URL(form.qlink.trim());
      } catch {
        e.qlink = "Enter a valid URL (including https://).";
      }
    }
    if (!form.currDate) e.currDate = "Current date is required.";
    if (!form.nextDate) e.nextDate = "Next revision date is required.";
    if (form.currDate && form.nextDate && form.nextDate < form.currDate) {
      e.nextDate = "Next revision date must be on or after the current date.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const ok = await onSubmit(form);
    if (ok) {
      setForm({
        ...initial,
        currDate: getTodayDateString(),
        nextDate: suggestNextDate(0, existingTasks),
      });
      setErrors({});
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader icon={FileText} title="Question Information" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Topic *">
            <input
              className={inputClass}
              placeholder="Arrays, Graphs, DP..."
              value={form.topic}
              onChange={update("topic")}
            />
            {errors.topic && <p className="text-xs text-red-500 mt-1">{errors.topic}</p>}
          </Field>
          <Field label="Question name *">
            <input
              className={inputClass}
              placeholder="Two Sum"
              value={form.qname}
              onChange={update("qname")}
            />
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

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
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
          <Field label="Pattern identified">
            <input className={inputClass} placeholder="Hashmap, Two Pointers..." value={form.pattern} onChange={update("pattern")} />
          </Field>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SectionHeader icon={CalendarRange} title="Revision Schedule" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Current date *">
            <input type="date" className={inputClass} value={form.currDate} onChange={update("currDate")} />
            {errors.currDate && <p className="text-xs text-red-500 mt-1">{errors.currDate}</p>}
          </Field>
          <Field label="Next revision date *">
            <input type="date" className={inputClass} value={form.nextDate} onChange={update("nextDate")} />
            <p className="text-xs text-[var(--color-text-faint)] mt-1">
              Suggested so it doesn't pile up with other revisions.
            </p>
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
            <Loader2 size={16} className="animate-spin" /> Adding...
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
