import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as api from "../services/api";
import { ApiError } from "../services/httpClient";

const AuthContext = createContext(null);

const TENANT_KEY = "revise_orbit_tenant_id"; // not a secret - a workspace identifier
const USERNAME_KEY = "revise_orbit_username"; // display only, real session is the HttpOnly cookie
const WORKSPACES_KEY = "revise_orbit_workspaces"; // [{ tenantId, label }] remembered on this browser

function loadWorkspaces() {
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed.filter((w) => w && w.tenantId);
  } catch {
    // corrupted localStorage value — fall through to a fresh list
  }
  // Migrate anyone who only ever had the single legacy tenantId, so
  // existing users don't lose their remembered workspace.
  const legacyTenant = localStorage.getItem(TENANT_KEY);
  return legacyTenant ? [{ tenantId: legacyTenant, label: "" }] : [];
}

export function AuthProvider({ children }) {
  const [tenantId, setTenantIdState] = useState(() => localStorage.getItem(TENANT_KEY));
  const [workspaces, setWorkspacesState] = useState(loadWorkspaces);
  const [username, setUsername] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [dbUnavailable, setDbUnavailable] = useState(null); // null | message string

  const persistWorkspaces = useCallback((list) => {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(list));
    setWorkspacesState(list);
  }, []);

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

  // Sets the active workspace AND remembers it on this browser for the
  // workspace chooser (see pages/SelectWorkspace.jsx). Called both when a
  // brand-new database is connected (with a label) and when picking an
  // already-remembered one from the chooser (label omitted — keeps
  // whatever label it already has).
  const setWorkspace = useCallback(
    (newTenantId, label) => {
      localStorage.setItem(TENANT_KEY, newTenantId);
      setTenantIdState(newTenantId);

      const current = loadWorkspaces();
      const existing = current.find((w) => w.tenantId === newTenantId);
      const next = existing
        ? current.map((w) =>
            w.tenantId === newTenantId ? { ...w, label: label !== undefined ? label : w.label } : w
          )
        : [...current, { tenantId: newTenantId, label: label || "" }];
      persistWorkspaces(next);
    },
    [persistWorkspaces]
  );

  // Removes one remembered workspace from the chooser without touching the
  // customer's MongoDB. If it's the currently active one, also clears the
  // active session pointer (there's nothing left to be "active").
  const removeWorkspace = useCallback(
    (tenantIdToRemove) => {
      persistWorkspaces(loadWorkspaces().filter((w) => w.tenantId !== tenantIdToRemove));
      if (tenantIdToRemove === tenantId) {
        localStorage.removeItem(TENANT_KEY);
        localStorage.removeItem(USERNAME_KEY);
        setTenantIdState(null);
        setUsername(null);
      }
    },
    [persistWorkspaces, tenantId]
  );

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

  // Forgets the ACTIVE workspace entirely on THIS browser (e.g. after
  // disconnecting the database, where it can no longer be signed into
  // anyway) — does not touch the customer's MongoDB itself. Also drops it
  // from the remembered-workspaces list so a disconnected database doesn't
  // linger in the chooser.
  const forgetWorkspace = useCallback(() => {
    if (tenantId) persistWorkspaces(loadWorkspaces().filter((w) => w.tenantId !== tenantId));
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem(USERNAME_KEY);
    setTenantIdState(null);
    setUsername(null);
  }, [tenantId, persistWorkspaces]);

  const clearDbUnavailable = useCallback(() => setDbUnavailable(null), []);

  const value = {
    tenantId,
    hasWorkspace: Boolean(tenantId),
    workspaces,
    username,
    isAuthenticated: Boolean(username),
    initializing,
    dbUnavailable,
    clearDbUnavailable,
    setWorkspace,
    removeWorkspace,
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
