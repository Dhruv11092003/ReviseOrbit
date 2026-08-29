import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as api from "../services/api";
import { JWT_ENABLED } from "../services/httpClient";

const AuthContext = createContext(null);

const STORAGE_KEY = "dsa_username";

export function AuthProvider({ children }) {
  const [username, setUsername] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Restore session across refresh.
    //
    // JWT mode: the real credential lives in an HttpOnly cookie the
    // browser already re-sends automatically; we only rehydrate the
    // *display* username from localStorage so the UI doesn't flash a
    // signed-out state, and a 401 from any protected call will still
    // correctly clear it below.
    //
    // Non-JWT mode: the original backend issues no token at all, so
    // there is nothing to verify — the stored username is the entire
    // session. This is documented as a real limitation in the README,
    // not treated as secure authentication.
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setUsername(stored);
    setInitializing(false);

    const onUnauthorized = () => {
      localStorage.removeItem(STORAGE_KEY);
      setUsername(null);
    };
    window.addEventListener("dsa:unauthorized", onUnauthorized);
    return () => window.removeEventListener("dsa:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.signin({ username, password });
    const uname = data?.username || username;
    localStorage.setItem(STORAGE_KEY, uname);
    setUsername(uname);
    return uname;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUsername(null);
  }, []);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUsername(null);
  }, []);

  const value = {
    username,
    isAuthenticated: Boolean(username),
    initializing,
    jwtEnabled: JWT_ENABLED,
    login,
    logout,
    handleUnauthorized,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
