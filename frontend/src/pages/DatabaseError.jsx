import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Settings as SettingsIcon, HelpCircle } from "lucide-react";
import BackgroundOrbs from "../components/BackgroundOrbs";

export default function DatabaseError({ message, onRetry }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <BackgroundOrbs />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass gradient-border rounded-2xl p-6 sm:p-8 text-center"
      >
        <div className="h-12 w-12 rounded-2xl bg-red-500/15 flex items-center justify-center border border-red-500/20 mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <h1 className="font-display text-lg font-semibold mb-2">Database Connection Problem</h1>
        <p className="text-sm text-[var(--color-text-dim)] mb-6">
          {message || "ReviseOrbit could not connect to your database."}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:brightness-110 transition"
          >
            <RefreshCw size={15} /> Retry Connection
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition"
          >
            <SettingsIcon size={15} /> Database Settings
          </button>
          <a
            href="https://www.mongodb.com/docs/atlas/troubleshoot-connection/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition"
          >
            <HelpCircle size={15} /> Troubleshooting
          </a>
        </div>
      </motion.div>
    </div>
  );
}
