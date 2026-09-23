import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { PATTERNS, PATTERN_CATEGORIES, getPatternById } from "../data/patterns";

function matches(pattern, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    pattern.name.toLowerCase().includes(q) ||
    pattern.category.toLowerCase().includes(q) ||
    (pattern.recognitionKeywords || []).some((k) => k.toLowerCase().includes(q)) ||
    (pattern.structuralSignals || []).some((k) => k.toLowerCase().includes(q))
  );
}

function groupedFiltered(query, excludeIds) {
  const filtered = PATTERNS.filter((p) => !excludeIds.includes(p.id) && matches(p, query));
  const byCategory = new Map();
  for (const cat of PATTERN_CATEGORIES) byCategory.set(cat.id, []);
  for (const p of filtered) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category).push(p);
  }
  return PATTERN_CATEGORIES.map((cat) => ({ category: cat, items: byCategory.get(cat.id) || [] })).filter(
    (g) => g.items.length > 0
  );
}

/**
 * Searchable, grouped, keyboard-friendly pattern picker. Stores canonical
 * pattern ids (slugs from data/patterns.js), never arbitrary free text.
 *
 * `multiple`: false -> value is a single id string ("" for none), onChange(id)
 *             true  -> value is an array of ids, onChange(idsArray)
 */
export default function PatternSelector({
  value,
  onChange,
  multiple = false,
  label = "Pattern",
  placeholder = "Search patterns...",
  excludeIds = [],
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const selectedIds = multiple ? value || [] : value ? [value] : [];
  const groups = useMemo(() => groupedFiltered(query, excludeIds), [query, excludeIds]);
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  const selectPattern = (id) => {
    if (multiple) {
      const set = new Set(selectedIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      onChange(Array.from(set));
    } else {
      onChange(id);
      setOpen(false);
    }
  };

  const removeSelected = (id) => {
    if (multiple) onChange(selectedIds.filter((v) => v !== id));
    else onChange("");
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) selectPattern(item.id);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-3 py-2.5 text-sm text-left outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/40 transition"
      >
        <span className="flex flex-wrap gap-1.5 min-h-[20px]">
          {selectedIds.length === 0 && (
            <span className="text-[var(--color-text-faint)]">{multiple ? "Add secondary patterns..." : "Select a pattern..."}</span>
          )}
          {selectedIds.map((id) => {
            const p = getPatternById(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/25 text-xs"
              >
                {p ? p.name : id}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${p ? p.name : id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSelected(id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      removeSelected(id);
                    }
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  <X size={11} />
                </span>
              </span>
            );
          })}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-[var(--color-text-faint)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-1.5 w-full glass gradient-border rounded-xl overflow-hidden shadow-xl"
            role="listbox"
            aria-label={label}
          >
            <div className="p-2 border-b border-[var(--border-soft)]">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={placeholder}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border-soft)] rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-violet-400/60"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              {flatItems.length === 0 ? (
                <p className="px-3 py-4 text-sm text-[var(--color-text-faint)] text-center">No patterns found.</p>
              ) : (
                groups.map((group) => (
                  <div key={group.category.id} className="mb-1">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
                      {group.category.name}
                    </p>
                    {group.items.map((p) => {
                      const flatIndex = flatItems.indexOf(p);
                      const isActive = flatIndex === activeIndex;
                      const isSelected = selectedIds.includes(p.id);
                      return (
                        <button
                          type="button"
                          key={p.id}
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onClick={() => selectPattern(p.id)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${
                            isActive ? "bg-violet-500/15 text-[var(--color-text)]" : "text-[var(--color-text-dim)] hover:bg-[var(--surface-1)]"
                          }`}
                        >
                          <span>{p.name}</span>
                          {isSelected && <Check size={13} className="text-violet-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
