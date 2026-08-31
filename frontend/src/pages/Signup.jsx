import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, UserPlus, Orbit, Check, X as XIcon } from "lucide-react";
import toast from "react-hot-toast";
import * as api from "../services/api";
import { ApiError } from "../services/httpClient";
import { useAuth } from "../context/AuthContext";
import BackgroundOrbs from "../components/BackgroundOrbs";

// Mirrors the backend's password policy exactly:
// /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!#$%^&*()+=])[A-Za-z\d!#$%^&*()+=]{8,32}$/
const PASSWORD_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!#$%^&*()+=])[A-Za-z\d!#$%^&*()+=]{8,32}$/;

const rules = [
  { test: (p) => p.length >= 8 && p.length <= 32, label: "8–32 characters" },
  { test: (p) => /[A-Za-z]/.test(p), label: "At least one letter" },
  { test: (p) => /\d/.test(p), label: "At least one number" },
  { test: (p) => /[@!#$%^&*()+=]/.test(p), label: "One special character (@!#$%^&*()+=)" },
];

export default function Signup() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { tenantId, hasWorkspace, initializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initializing && !hasWorkspace) {
      navigate("/welcome", { replace: true });
    }
  }, [initializing, hasWorkspace, navigate]);

  const passwordValid = PASSWORD_REGEX.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (!name.trim() || !username.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!passwordValid) {
      setError("Password doesn't meet the requirements below.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await api.signup({ tenantId, name: name.trim(), username: username.trim(), password });
      toast.success("Account created! Please sign in.");
      navigate("/signin");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
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
          <p className="text-sm text-[var(--color-text-dim)] mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass gradient-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">Name</label>
            <input
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/40 transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Dhruv"
            />
          </div>
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
                autoComplete="new-password"
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
            <div className="mt-2 space-y-1">
              {rules.map((r) => {
                const ok = password.length > 0 && r.test(password);
                return (
                  <div key={r.label} className="flex items-center gap-1.5 text-xs">
                    {ok ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <XIcon size={12} className="text-[var(--color-text-faint)]" />
                    )}
                    <span className={ok ? "text-emerald-500" : "text-[var(--color-text-faint)]"}>
                      {r.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-dim)] mb-1.5">
              Confirm password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              className="w-full bg-[var(--surface-1)] border border-[var(--border-soft)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/40 transition"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
            {confirm.length > 0 && confirm !== password && (
              <p className="text-xs text-red-500 mt-1">Passwords don't match.</p>
            )}
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
                <Loader2 size={15} className="animate-spin" /> Creating account...
              </>
            ) : (
              <>
                <UserPlus size={15} /> Create account
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-dim)] mt-5">
          Already have an account?{" "}
          <Link to="/signin" className="text-violet-500 hover:text-violet-400 font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
