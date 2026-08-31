import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Database, Loader2, ShieldCheck, ExternalLink, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import BackgroundOrbs from "../components/BackgroundOrbs";

const STEPS = ["Create your MongoDB", "Connect it"];

export default function DatabaseSetup() {
  const [step, setStep] = useState(0);
  const [connectionString, setConnectionString] = useState("");
  const [label, setLabel] = useState("");
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [tested, setTested] = useState(false);
  const [error, setError] = useState("");
  const { setWorkspace } = useAuth();
  const navigate = useNavigate();

  const handleTest = async () => {
    if (!connectionString.trim()) {
      setError("Paste your MongoDB connection string first.");
      return;
    }
    setError("");
    setTesting(true);
    try {
      await api.testDbConnection(connectionString.trim());
      setTested(true);
      toast.success("Connection successful!");
    } catch (err) {
      setTested(false);
      setError(err.message || "Could not connect. Check your connection string.");
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    try {
      const { tenantId } = await api.setupTenant({
        connectionString: connectionString.trim(),
        label: label.trim(),
      });
      setWorkspace(tenantId);
      toast.success("Database connected!");
      navigate("/signup");
    } catch (err) {
      setError(err.message || "Could not finish setup. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <BackgroundOrbs />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${
                  i <= step
                    ? "bg-violet-500 border-violet-500 text-white"
                    : "border-[var(--border-soft)] text-[var(--color-text-faint)]"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  i <= step ? "text-[var(--color-text)]" : "text-[var(--color-text-faint)]"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-[var(--border-soft)]" />}
            </div>
          ))}
        </div>

        <div className="glass gradient-border rounded-2xl p-6 sm:p-8">
          {step === 0 && (
            <>
              <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
                <Database size={18} className="text-violet-500" /> Create Your MongoDB
              </h2>
              <p className="text-sm text-[var(--color-text-dim)] mb-4">
                ReviseOrbit does not need your MongoDB Atlas account password — only a
                connection string for a dedicated database user.
              </p>
              <ol className="space-y-2.5 text-sm text-[var(--color-text-dim)] list-decimal list-inside mb-6">
                <li>Create or log into MongoDB Atlas.</li>
                <li>Create a free cluster (M0 tier is fine to start).</li>
                <li>Create a dedicated database user for ReviseOrbit.</li>
                <li>Give that user only the permissions ReviseOrbit needs (read/write).</li>
                <li>Under Network Access, allow connections (0.0.0.0/0, or ReviseOrbit's IPs if known).</li>
                <li>Copy the connection string from "Connect your application".</li>
              </ol>
              <a
                href="https://www.mongodb.com/docs/atlas/getting-started/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-violet-500 hover:text-violet-400 mb-6"
              >
                MongoDB Atlas getting-started guide <ExternalLink size={12} />
              </a>
              <button
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:brightness-110 transition"
              >
                I have my connection string
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
                <Database size={18} className="text-violet-500" /> Connect Your Database
              </h2>
              <p className="text-sm text-[var(--color-text-dim)] mb-4">
                Your connection string is encrypted before it's stored and is never shown
                back to anyone, including you, once saved.
              </p>

              <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">
                MongoDB connection string
              </label>
              <input
                type="password"
                value={connectionString}
                onChange={(e) => {
                  setConnectionString(e.target.value);
                  setTested(false);
                }}
                placeholder="mongodb+srv://user:pass@cluster0.mongodb.net/mydb"
                className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-400/60 font-mono-app mb-4"
                autoComplete="off"
              />

              <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">
                Connection name (optional)
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="My ReviseOrbit database"
                className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-400/60 mb-4"
              />

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                  {error}
                </p>
              )}

              {tested && !error && (
                <p className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Connection verified.
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleTest}
                  disabled={testing || connecting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition disabled:opacity-50"
                >
                  {testing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Test Connection
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting || testing}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:brightness-110 transition disabled:opacity-60"
                >
                  {connecting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Connecting...
                    </>
                  ) : (
                    "Test & Connect"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
