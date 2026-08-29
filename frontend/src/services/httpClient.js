import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const JWT_ENABLED = import.meta.env.VITE_ENABLE_JWT === "true";
export const EDIT_DELETE_ENABLED =
  import.meta.env.VITE_ENABLE_EDIT_DELETE === "true";

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive the HttpOnly auth cookie when JWT mode is on
  timeout: 15000,
});

// When JWT mode is off (plain original backend), we still attach the
// username as a bearer-ish header so a future backend can recognize the
// caller without us inventing a fake token. It is never treated as a
// security boundary on the frontend.
http.interceptors.request.use((config) => {
  const username = localStorage.getItem("dsa_username");
  if (username && !JWT_ENABLED) {
    config.headers["X-Username"] = username;
  }
  return config;
});

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const FRIENDLY_FALLBACK = {
  400: "That request looks invalid. Please check the fields and try again.",
  401: "You need to sign in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That already exists.",
  500: "Something went wrong on the server. Please try again.",
};

/** Extracts a clean, human-readable message from any backend response shape. */
export function extractErrorMessage(error) {
  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return "The request timed out. Please try again.";
    }
    return "Can't reach the server. Check your connection and that the backend is running.";
  }

  const { status, data } = error.response;
  let raw = data;

  if (typeof raw === "object" && raw !== null) {
    raw = raw.message || raw.error || raw.result || null;
  }

  if (typeof raw === "string" && raw.trim().length > 0 && raw.length < 300) {
    // Guard against accidentally-leaked stack traces / internals.
    const looksLikeInternals = /at\s+\w+.*\(.*:\d+:\d+\)|mongodb|mongoose|ECONNREFUSED|node_modules/i.test(
      raw
    );
    if (!looksLikeInternals) return raw;
  }

  return FRIENDLY_FALLBACK[status] || "Unexpected error. Please try again.";
}

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = extractErrorMessage(error);
    const status = error.response?.status;
    if (status === 401) {
      // Centralized unauthorized handling: notify the app so AuthContext
      // can clear the session and any protected route redirects to /signin.
      window.dispatchEvent(new CustomEvent("dsa:unauthorized"));
    }
    return Promise.reject(new ApiError(message, status, error.code));
  }
);

export default API_URL;
