import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { App } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { createApp } from "json-server/lib/app.js";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { json } from "milliparsec";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
const file = resolve(process.cwd(), process.env.DB_FILE ?? "server/db.json");
const db = new Low(new JSONFile(file), { visits: [], profile: {}, users: [], completions: [], wishlists: [], rewards: [] });
await db.read();
db.data.users ??= [];
db.data.completions ??= [];
db.data.wishlists ??= [];
db.data.rewards ??= [];
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(hash).toString("hex")}`;
}

async function passwordMatches(password, stored) {
  if (!stored?.includes(":")) return password === stored; // migrate development accounts on next sign-in
  const [salt, expectedHex] = stored.split(":");
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const sessions = new Map();
const app = new App();
app.use(cors());
app.options("*", cors());
app.use(json());

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    language: user.language ?? "English",
    plan: user.plan ?? "free",
  };
}

function bearerToken(req) {
  const authorization = req.headers.authorization ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
}

function authenticatedUser(req) {
  const token = bearerToken(req);
  const userId = token ? sessions.get(token) : null;
  return db.data.users.find((user) => String(user.id) === String(userId));
}

function requireUser(req, res) {
  const user = authenticatedUser(req);
  if (!user) res.status(401).json({ message: "Unauthenticated." });
  return user;
}

app.post("/auth/register", async (req, res) => {
  const { name, email, password, passwordConfirmation } = req.body ?? {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(422).json({ message: "Name, email, and a 6-character password are required." });
  }
  if (password !== passwordConfirmation) {
    return res.status(422).json({ message: "Password confirmation does not match." });
  }
  const normalizedEmail = String(email).trim().toLocaleLowerCase();
  if (db.data.users.some((user) => user.email.toLocaleLowerCase() === normalizedEmail)) {
    return res.status(422).json({ message: "An account with this email already exists." });
  }

  const user = { id: randomUUID(), name: String(name).trim(), email: normalizedEmail, password: await hashPassword(password), language: "English", plan: "free" };
  db.data.users.push(user);
  await db.write();
  const token = `dev-${randomUUID()}`;
  sessions.set(token, user.id);
  return res.status(201).json({ token, user: publicUser(user) });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = String(email ?? "").trim().toLocaleLowerCase();
  const user = db.data.users.find((candidate) => candidate.email.toLocaleLowerCase() === normalizedEmail);
  if (user && !(await passwordMatches(password, user.password))) return res.status(422).json({ message: "Invalid email or password." });
  if (!user) return res.status(422).json({ message: "Invalid email or password." });
  const token = `dev-${randomUUID()}`;
  sessions.set(token, user.id);
  return res.json({ token, user: publicUser(user) });
});

app.get("/auth/me", (req, res) => {
  const user = authenticatedUser(req);
  return user ? res.json(publicUser(user)) : res.status(401).json({ message: "Unauthenticated." });
});

app.post("/auth/logout", (req, res) => {
  const token = bearerToken(req);
  if (token) sessions.delete(token);
  return res.status(204).send();
});

app.get("/profile", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  return res.json({
    ...publicUser(user),
    nationality: user.nationality ?? "",
    dateOfBirth: user.dateOfBirth ?? "",
    photoUri: user.photoUri ?? null,
  });
});

app.put("/profile", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const allowed = ["name", "email", "language", "nationality", "dateOfBirth", "photoUri"];
  allowed.forEach((key) => {
    if (req.body?.[key] !== undefined) user[key] = req.body[key];
  });
  await db.write();
  return res.json({
    ...publicUser(user),
    nationality: user.nationality ?? "",
    dateOfBirth: user.dateOfBirth ?? "",
    photoUri: user.photoUri ?? null,
  });
});

app.get("/visits", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  return res.json(db.data.visits.filter((visit) => String(visit.userId) === String(user.id)));
});

app.post("/visits", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const visit = { ...req.body, id: randomUUID(), userId: user.id, places: req.body?.places ?? [] };
  db.data.visits.push(visit);
  await db.write();
  return res.status(201).json(visit);
});

app.put("/visits/:id", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const index = db.data.visits.findIndex(
    (visit) => String(visit.id) === String(req.params.id) && String(visit.userId) === String(user.id),
  );
  if (index < 0) return res.status(404).json({ message: "Visit not found." });
  const visit = { ...req.body, id: db.data.visits[index].id, userId: user.id };
  db.data.visits[index] = visit;
  await db.write();
  return res.json(visit);
});

app.delete("/visits/:id", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const index = db.data.visits.findIndex(
    (visit) => String(visit.id) === String(req.params.id) && String(visit.userId) === String(user.id),
  );
  if (index < 0) return res.status(404).json({ message: "Visit not found." });
  db.data.visits.splice(index, 1);
  await db.write();
  return res.status(204).send();
});

app.get("/me/travel-state", (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  return res.json({
    completedSightIds: db.data.completions.filter(x => x.userId === user.id).map(x => x.sightId),
    wishlistIds: db.data.wishlists.filter(x => x.userId === user.id).map(x => x.targetId),
    rewards: db.data.rewards.filter(x => x.userId === user.id),
    plan: user.plan ?? "free",
  });
});

app.put("/me/completions/:sightId", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const sightId = String(req.params.sightId);
  const index = db.data.completions.findIndex(x => x.userId === user.id && x.sightId === sightId);
  if (req.body?.completed === false && index >= 0) db.data.completions.splice(index, 1);
  if (req.body?.completed !== false && index < 0) db.data.completions.push({ id: randomUUID(), userId: user.id, sightId, completedAt: new Date().toISOString() });
  await db.write(); return res.json({ sightId, completed: req.body?.completed !== false });
});

app.put("/me/wishlist/:targetId", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  const targetId = String(req.params.targetId);
  const index = db.data.wishlists.findIndex(x => x.userId === user.id && x.targetId === targetId);
  if (req.body?.saved === false && index >= 0) db.data.wishlists.splice(index, 1);
  if (req.body?.saved !== false && index < 0) db.data.wishlists.push({ id: randomUUID(), userId: user.id, targetId, savedAt: new Date().toISOString() });
  await db.write(); return res.json({ targetId, saved: req.body?.saved !== false });
});

app.put("/me/plan", async (req, res) => {
  const user = requireUser(req, res); if (!user) return;
  if (!["free", "pro"].includes(req.body?.plan)) return res.status(422).json({ message: "Plan must be free or pro." });
  user.plan = req.body.plan; await db.write(); return res.json({ plan: user.plan });
});

app.use("/users", (_req, res) => {
  return res.status(404).json({ message: "Use the /auth endpoints." });
});

app.use(createApp(db));

app.listen(port, () => {
  console.log(`Stampo development API running at http://${host}:${port}`);
  console.log("Auth: POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/logout");
}, host);
