import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function EmptyState({ icon: Icon, title, subtitle, actionLabel, actionTo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-10 flex flex-col items-center text-center gap-3"
    >
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center border border-[var(--border-soft)]">
        <Icon size={26} className="text-violet-500" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="text-sm text-[var(--color-text-dim)] max-w-sm">{subtitle}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:brightness-110 transition"
        >
          {actionLabel}
        </Link>
      )}
    </motion.div>
  );
}
