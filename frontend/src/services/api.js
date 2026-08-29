import { http, EDIT_DELETE_ENABLED } from "./httpClient";

// ---- Auth --------------------------------------------------------------

export async function signup({ name, username, password }) {
  const res = await http.post("/signup", { name, username, password });
  // Backend sends 201 with plain text "User Created" on success, or 200
  // with a plain-text password-policy message on validation failure (it
  // does not use a 4xx status for that case), so we detect it here.
  if (
    res.status === 200 &&
    typeof res.data === "string" &&
    /password/i.test(res.data)
  ) {
    const err = new Error(res.data);
    err.isValidation = true;
    throw err;
  }
  return res.data;
}

export async function signin({ username, password }) {
  const res = await http.post("/signin", { username, password });
  // Current backend returns res.status(200).send({username}, "...") — the
  // second arg to res.send() is ignored by Express, so we only ever get
  // { username } back. No token is issued by the unpatched backend.
  return res.data;
}

// ---- Revisions -----------------------------------------------------------

export async function fetchToday() {
  const res = await http.get("/fetchToday");
  return res.data.result;
}

export async function fetchPending() {
  const res = await http.get("/fetchPending");
  return res.data.result;
}

export async function fetchAll() {
  const res = await http.get("/fetchAll");
  return res.data.result;
}

export async function createRevision(payload) {
  const res = await http.post("/newEntry", payload);
  return res.data;
}

export async function completeRevision(id, nextDate) {
  const res = await http.post(`/updateCompletion/${id}`, { nextDate });
  return res.data;
}

export async function completeAllToday(nextDate) {
  const res = await http.post("/updateTodayAll", { nextDate });
  return res.data;
}

export async function activateTodayTasks() {
  const res = await http.post("/activateTodayTasks");
  return res.data;
}

// ---- Edit / Delete ---------------------------------------------------
// The backend supplied to us does not implement these. They are only
// wired up (and only rendered in the UI) when VITE_ENABLE_EDIT_DELETE=true,
// which corresponds to running the patched backend in /backend-patch.

export async function updateRevision(id, payload) {
  if (!EDIT_DELETE_ENABLED) {
    throw new Error(
      "Editing is not available: the connected backend has no /updateEntry endpoint."
    );
  }
  const res = await http.put(`/updateEntry/${id}`, payload);
  return res.data;
}

export async function deleteRevision(id) {
  if (!EDIT_DELETE_ENABLED) {
    throw new Error(
      "Deleting is not available: the connected backend has no /deleteEntry endpoint."
    );
  }
  const res = await http.delete(`/deleteEntry/${id}`);
  return res.data;
}
