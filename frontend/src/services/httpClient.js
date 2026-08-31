import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true, // sends/receives the HttpOnly session cookie
  timeout: 15000,
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
      // Session invalid/expired — clear it and send the person to sign in.
      window.dispatchEvent(new CustomEvent("dsa:unauthorized"));
    }
    if (status === 403) {
      // Authenticated, but this workspace's database isn't connected/active
      // right now — different situation from "not signed in".
      window.dispatchEvent(new CustomEvent("dsa:db-unavailable", { detail: { message } }));
    }

    return Promise.reject(new ApiError(message, status, error.code));
  }
);

export default API_URL;
