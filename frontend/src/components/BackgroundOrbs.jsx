import { motion } from "framer-motion";

export default function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[var(--color-bg)]">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "34px 34px",
        }}
      />
      <motion.div
        className="orb bg-violet-500"
        style={{ width: 520, height: 520, top: "-10%", left: "-8%" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="orb bg-blue-500"
        style={{ width: 460, height: 460, top: "20%", right: "-10%" }}
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="orb bg-emerald-500"
        style={{ width: 380, height: 380, bottom: "-12%", left: "30%", opacity: 0.18 }}
        animate={{ x: [0, 25, 0], y: [0, -25, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
