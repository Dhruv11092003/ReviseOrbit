import { motion } from "framer-motion";
import { useCountUp } from "../hooks/useCountUp";

const accents = {
  violet: "from-violet-500/20 to-violet-500/0 text-violet-500 border-violet-500/20",
  emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-500 border-emerald-500/20",
  amber: "from-amber-500/20 to-amber-500/0 text-amber-600 border-amber-500/20",
  blue: "from-blue-500/20 to-blue-500/0 text-blue-500 border-blue-500/20",
};

export default function StatCard({ icon: Icon, label, value, accent = "violet", delay = 0 }) {
  const count = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3 }}
      className={`glass rounded-2xl p-5 relative overflow-hidden border ${accents[accent].split(" ").slice(2).join(" ")}`}
    >
      <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${accents[accent].split(" ").slice(0, 2).join(" ")} blur-xl`} />
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-dim)]">{label}</p>
        <Icon size={16} className={accents[accent].split(" ")[2]} />
      </div>
      <p className="font-display text-3xl font-semibold">{count}</p>
    </motion.div>
  );
}
