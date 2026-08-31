import { http } from "./httpClient";

// ---- Tenant / database setup --------------------------------------------

export async function setupTenant({ connectionString, label }) {
  const res = await http.post("/api/tenant/setup", { connectionString, label });
  return res.data; // { tenantId }
}

export async function testDbConnection(connectionString) {
  const res = await http.post("/api/tenant/db/test", { connectionString });
  return res.data;
}

export async function getDbStatus() {
  const res = await http.get("/api/tenant/status");
  return res.data;
}

export async function reconnectDb(connectionString) {
  const res = await http.post("/api/tenant/db/reconnect", { connectionString });
  return res.data;
}

export async function disconnectDb() {
  const res = await http.post("/api/tenant/db/disconnect");
  return res.data;
}

// ---- Auth ----------------------------------------------------------------
// tenantId identifies which workspace/database to sign into. It's not a
// secret — think of it like a workspace slug — so it's fine for the
// frontend to read/send it plainly.

export async function signup({ tenantId, name, username, password }) {
  const res = await http.post("/signup", { tenantId, name, username, password });
  return res.data;
}

export async function signin({ tenantId, username, password }) {
  const res = await http.post("/signin", { tenantId, username, password });
  return res.data;
}

export async function logout() {
  const res = await http.post("/logout");
  return res.data;
}

export async function whoAmI() {
  const res = await http.get("/me");
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

export async function updateRevision(id, payload) {
  const res = await http.put(`/updateEntry/${id}`, payload);
  return res.data;
}

export async function deleteRevision(id) {
  const res = await http.delete(`/deleteEntry/${id}`);
  return res.data;
}
