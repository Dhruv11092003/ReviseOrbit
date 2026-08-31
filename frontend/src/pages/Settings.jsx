import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Database, RefreshCw, Unplug, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";

export default function Settings() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { forgetWorkspace } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const s = await api.getDbStatus();
      setStatus(s);
    } catch (err) {
      toast.error(err.message || "Failed to load database status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleTest = async () => {
    setTesting(true);
    try {
      await api.getDbStatus();
      toast.success("Your database connection is healthy.");
      await load();
    } catch (err) {
      toast.error(err.message || "Could not verify the connection.");
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.disconnectDb();
      toast.success("Database disconnected.");
      forgetWorkspace();
      navigate("/welcome");
    } catch (err) {
      toast.error(err.message || "Failed to disconnect.");
    } finally {
      setDisconnecting(false);
      setDisconnectOpen(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <Database size={24} className="text-violet-500" /> Settings
        </h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">Manage your connected database.</p>
      </motion.div>

      <div className="glass gradient-border rounded-2xl p-6 sm:p-8">
        <h2 className="font-display font-semibold text-lg mb-4">Database</h2>

        {loading ? (
          <div className="h-16 rounded-xl bg-[var(--surface-1)] animate-pulse" />
        ) : status?.connected ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-500">Connected</span>
            </div>
            <p className="text-sm text-[var(--color-text-dim)] mb-6">
              Your application data — users, revisions, and tasks — is stored in your
              connected MongoDB database. ReviseOrbit never keeps a separate central copy
              of it.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition disabled:opacity-50"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Test Connection
              </button>
              <button
                onClick={() => navigate("/setup")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition"
              >
                <RefreshCw size={14} /> Reconnect
              </button>
              <button
                onClick={() => setDisconnectOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 transition"
              >
                <Unplug size={14} /> Disconnect
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-400">Not connected</span>
            </div>
            <p className="text-sm text-[var(--color-text-dim)] mb-6">
              ReviseOrbit can't reach your database right now.
            </p>
            <button
              onClick={() => navigate("/setup")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:brightness-110 transition"
            >
              <Database size={14} /> Database Setup
            </button>
          </>
        )}
      </div>

      <Modal open={disconnectOpen} onClose={() => setDisconnectOpen(false)} title="Disconnect database?">
        <div className="flex items-start gap-3 mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-200">
            This removes ReviseOrbit's stored connection to your database. Your MongoDB
            and its data are untouched. You'll need to connect a database again before
            you can sign in.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDisconnectOpen(false)}
            disabled={disconnecting}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-soft)] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:brightness-110 transition disabled:opacity-60"
          >
            {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
            Disconnect
          </button>
        </div>
      </Modal>
    </div>
  );
}
