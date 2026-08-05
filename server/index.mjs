import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { App } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { createApp } from "json-server/lib/app.js";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { json } from "milliparsec";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
const file = resolve(process.cwd(), process.env.DB_FILE ?? "server/db.json");
const db = new Low(new JSONFile(file), { visits: [], profile: {}, users: [] });
await db.read();
db.data.users ??= [];

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

  const user = { id: randomUUID(), name: String(name).trim(), email: normalizedEmail, password, language: "English" };
  db.data.users.push(user);
  await db.write();
  const token = `dev-${randomUUID()}`;
  sessions.set(token, user.id);
  return res.status(201).json({ token, user: publicUser(user) });
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = String(email ?? "").trim().toLocaleLowerCase();
  const user = db.data.users.find(
    (candidate) => candidate.email.toLocaleLowerCase() === normalizedEmail && candidate.password === password,
  );
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

app.use(createApp(db));

app.listen(port, host, () => {
  console.log(`Stampo development API running at http://${host}:${port}`);
  console.log("Auth: POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/logout");
});
