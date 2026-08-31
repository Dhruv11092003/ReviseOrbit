import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, LogIn, Orbit } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../services/httpClient";
import BackgroundOrbs from "../components/BackgroundOrbs";

export default function Signin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, hasWorkspace, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!initializing && !hasWorkspace) {
      navigate("/welcome", { replace: true });
    }
  }, [initializing, hasWorkspace, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      toast.success("Welcome back!");
      const dest = location.state?.from?.pathname || "/dashboard";
      navigate(dest, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <BackgroundOrbs />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-[0_0_30px_rgba(139,108,255,0.4)] mb-4">
            <Orbit size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-semibold">
            Revision<span className="text-gradient">Orbit</span>
          </h1>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">Sign in to keep your streak going</p>
        </div>

        <form onSubmit={handleSubmit} className="glass gradient-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">Username</label>
            <input
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/40 transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="dhruv123"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/40 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:brightness-110 transition disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Signing in...
              </>
            ) : (
              <>
                <LogIn size={15} /> Sign in
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-dim)] mt-5">
          Don't have an account?{" "}
          <Link to="/signup" className="text-violet-500 hover:text-violet-400 font-medium">
            Create one
          </Link>
        </p>
        <p className="text-center text-xs text-[var(--color-text-faint)] mt-3">
          <Link to="/welcome" className="hover:text-[var(--color-text-dim)]">
            Wrong workspace? Connect a different database
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
