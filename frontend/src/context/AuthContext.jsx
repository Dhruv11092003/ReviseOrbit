import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as api from "../services/api";
import { ApiError } from "../services/httpClient";

const AuthContext = createContext(null);

const TENANT_KEY = "revise_orbit_tenant_id"; // not a secret - a workspace identifier
const USERNAME_KEY = "revise_orbit_username"; // display only, real session is the HttpOnly cookie

export function AuthProvider({ children }) {
  const [tenantId, setTenantIdState] = useState(() => localStorage.getItem(TENANT_KEY));
  const [username, setUsername] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [dbUnavailable, setDbUnavailable] = useState(null); // null | message string

  useEffect(() => {
    async function restore() {
      const storedTenant = localStorage.getItem(TENANT_KEY);
      if (!storedTenant) {
        setInitializing(false);
        return;
      }
      // Ask the server to confirm the session cookie is still valid rather
      // than trusting whatever username we last cached locally.
      try {
        const me = await api.whoAmI();
        setUsername(me.username);
        localStorage.setItem(USERNAME_KEY, me.username);
      } catch {
        setUsername(null);
        localStorage.removeItem(USERNAME_KEY);
      } finally {
        setInitializing(false);
      }
    }
    restore();

    const onUnauthorized = () => {
      setUsername(null);
      localStorage.removeItem(USERNAME_KEY);
    };
    const onDbUnavailable = (e) => setDbUnavailable(e.detail?.message || "Database unavailable.");

    window.addEventListener("dsa:unauthorized", onUnauthorized);
    window.addEventListener("dsa:db-unavailable", onDbUnavailable);
    return () => {
      window.removeEventListener("dsa:unauthorized", onUnauthorized);
      window.removeEventListener("dsa:db-unavailable", onDbUnavailable);
    };
  }, []);

  const setWorkspace = useCallback((newTenantId) => {
    localStorage.setItem(TENANT_KEY, newTenantId);
    setTenantIdState(newTenantId);
  }, []);

  const login = useCallback(
    async (usernameInput, password) => {
      if (!tenantId) throw new ApiError("No workspace connected yet.", 400);
      const data = await api.signin({ tenantId, username: usernameInput, password });
      const uname = data?.username || usernameInput;
      localStorage.setItem(USERNAME_KEY, uname);
      setUsername(uname);
      return uname;
    },
    [tenantId]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // even if the network call fails, clear local state
    }
    localStorage.removeItem(USERNAME_KEY);
    setUsername(null);
  }, []);

  // Forgets the workspace entirely on THIS browser (e.g. after disconnecting
  // the database) — does not touch the customer's MongoDB itself.
  const forgetWorkspace = useCallback(() => {
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem(USERNAME_KEY);
    setTenantIdState(null);
    setUsername(null);
  }, []);

  const clearDbUnavailable = useCallback(() => setDbUnavailable(null), []);

  const value = {
    tenantId,
    hasWorkspace: Boolean(tenantId),
    username,
    isAuthenticated: Boolean(username),
    initializing,
    dbUnavailable,
    clearDbUnavailable,
    setWorkspace,
    login,
    logout,
    forgetWorkspace,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
