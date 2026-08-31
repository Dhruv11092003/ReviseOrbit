import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Database, ShieldCheck, ChevronRight, Orbit } from "lucide-react";
import BackgroundOrbs from "../components/BackgroundOrbs";

export default function Welcome() {
  const [showHow, setShowHow] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <BackgroundOrbs />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-[0_0_30px_rgba(139,108,255,0.4)] mb-4">
            <Orbit size={26} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">
            Welcome to Revise<span className="text-gradient">Orbit</span>
          </h1>
        </div>

        <div className="glass gradient-border rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-5">
            <div className="h-9 w-9 rounded-xl bg-violet-500/15 flex items-center justify-center border border-violet-500/20 shrink-0">
              <Database size={18} className="text-violet-500" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg mb-1">Your Data, Your Database</h2>
              <p className="text-sm text-[var(--color-text-dim)] leading-relaxed">
                ReviseOrbit is designed so your application data can stay in a MongoDB
                database that you control. Your users, revisions, and tasks are stored in
                your connected database — not centrally stored by ReviseOrbit.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/setup")}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:brightness-110 transition shadow-[0_0_25px_rgba(139,108,255,0.3)]"
          >
            <Database size={16} /> Connect Your Database
          </button>

          <button
            onClick={() => setShowHow((s) => !s)}
            className="w-full text-center text-xs font-medium text-[var(--color-text-dim)] hover:text-[var(--color-text)] mt-4 transition-colors"
          >
            {showHow ? "Hide details" : "How does this work?"}
          </button>

          {showHow && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t border-[var(--border-soft)] space-y-3 text-sm text-[var(--color-text-dim)] overflow-hidden"
            >
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  ReviseOrbit hosts the app and the servers that run it, but your
                  questions, revision schedule, and account are stored in a MongoDB
                  database that belongs to you — usually a free MongoDB Atlas cluster
                  you create in a couple of minutes.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  ReviseOrbit's own servers keep only the minimum needed to connect you
                  to the right database — never a copy of your questions or your
                  password. Your database connection details are encrypted and never
                  shown back to you or anyone else once saved.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  Because your data stays in a database you own, you're also
                  responsible for backing it up — MongoDB Atlas has simple built-in
                  backup options you can turn on.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <p className="text-center text-xs text-[var(--color-text-faint)] mt-5 flex items-center justify-center gap-1">
          Already connected a database? Continue to
          <button
            onClick={() => navigate("/signin")}
            className="text-violet-500 hover:text-violet-400 font-medium inline-flex items-center"
          >
            sign in <ChevronRight size={13} />
          </button>
        </p>
      </motion.div>
    </div>
  );
}
