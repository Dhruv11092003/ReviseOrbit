import { motion } from "framer-motion";
import { Orbit, Database, ShieldCheck, Code2, Compass } from "lucide-react";
import BackgroundOrbs from "./BackgroundOrbs";

const FEATURES = [
  { icon: Code2, text: "Track LeetCode questions and theory topics side by side" },
  { icon: Compass, text: "A DSA pattern-recognition reference — know what to look for" },
  { icon: Database, text: "Your data lives in a MongoDB database you own and control" },
  { icon: ShieldCheck, text: "Tenant-isolated by design — your workspace, your data" },
];

/**
 * Full-viewport auth shell: a branding panel on the left (large screens)
 * and the actual form on the right, so the page uses the whole laptop
 * screen instead of one small card floating in an empty background.
 * Collapses to just the form, centered, on small screens.
 */
export default function AuthLayout({ subtitle, children, wide = false }) {
  return (
    <div className="min-h-screen w-full flex">
      <BackgroundOrbs />

      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] shrink-0 flex-col justify-between p-12 border-r border-[var(--border-soft)]">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,108,255,0.35)]">
            <Orbit size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold tracking-tight text-lg">
            Revision<span className="text-gradient">Orbit</span>
          </span>
        </div>

        <div>
          <h2 className="font-display text-3xl xl:text-4xl font-semibold leading-tight mb-4">
            Never lose track of
            <br /> what you've studied.
          </h2>
          <p className="text-sm text-[var(--color-text-dim)] max-w-sm mb-8">
            Spaced-repetition revision scheduling for DSA questions and theory, backed by
            a pattern-recognition reference you can actually use before solving a problem.
          </p>
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-sm text-[var(--color-text-dim)]">
                <div className="h-6 w-6 rounded-lg bg-violet-500/15 flex items-center justify-center border border-violet-500/20 shrink-0 mt-0.5">
                  <Icon size={12} className="text-violet-400" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-[var(--color-text-faint)]">
          Made by Dhruv Kulshrestha
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-10 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`w-full ${wide ? "max-w-xl" : "max-w-sm"}`}
        >
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-[0_0_30px_rgba(139,108,255,0.4)] mb-4">
              <Orbit size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-2xl font-semibold">
              Revision<span className="text-gradient">Orbit</span>
            </h1>
            {subtitle && <p className="text-sm text-[var(--color-text-dim)] mt-1">{subtitle}</p>}
          </div>
          {subtitle && (
            <p className="hidden lg:block text-sm text-[var(--color-text-dim)] mb-6 text-center">
              {subtitle}
            </p>
          )}

          {children}
        </motion.div>
      </div>
    </div>
  );
}
