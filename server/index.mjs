import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { App } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { createApp } from "json-server/lib/app.js";
import { countries, getEmojiFlag } from "countries-list";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { json } from "milliparsec";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
const file = resolve(process.cwd(), process.env.DB_FILE ?? "server/db.json");
const db = new Low(new JSONFile(file), {
  visits: [],
  profile: {},
  users: [],
  completions: [],
  wishlists: [],
  rewards: [],
  collectionProgress: [],
});
await db.read();
db.data.users ??= [];
db.data.completions ??= [];
db.data.wishlists ??= [];
db.data.rewards ??= [];
db.data.collectionProgress ??= [];
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

const HOME_CONTINENT_TOTALS = {
  AF: 54,
  AN: 0,
  AS: 48,
  EU: 44,
  NA: 23,
  OC: 14,
  SA: 12,
};
const HOME_SCORE_MAXIMUMS = {
  continents: 7,
  countries: 48.75,
  cities: 10,
  airports: 8,
  sights: 20,
  challenges: 6.25,
};
const COLLECTIONS = [
  {
    id: "wonders",
    title: "Seven Wonders",
    detail: "Visit all 7 wonders",
    defaultProgress: 12,
  },
  {
    id: "seas",
    title: "Seven Seas",
    detail: "Sail or visit all 7 seas",
    defaultProgress: 8,
  },
  {
    id: "unesco",
    title: "UNESCO Explorer",
    detail: "Visit heritage sites",
    defaultProgress: 14,
  },
  {
    id: "parks",
    title: "National Parks",
    detail: "Visit national parks",
    defaultProgress: 16,
  },
  {
    id: "usa",
    title: "United States Explorer",
    detail: "Visit all 50 states",
    defaultProgress: 0,
  },
];
const COUNTRY_CATALOG = {
  FR: {
    name: "France",
    flag: "🇫🇷",
    heroCities: [
      { name: "Paris", imageKey: "paris-eiffel" },
      { name: "Lyon", imageKey: "lyon" },
      { name: "Marseille", imageKey: "marseille" },
      { name: "Nice", imageKey: "nice" },
      { name: "Paris", imageKey: "paris-notre-dame" },
    ],
    featuredIn: ["🏛️ Cultural Icons", "🥐 Food Capitals", "✨ European Gems"],
    sights: [
      { id: "eiffel", name: "Eiffel Tower", imageKey: "eiffel" },
      { id: "louvre", name: "Louvre Museum", imageKey: "louvre" },
      { id: "arc", name: "Arc de Triomphe", imageKey: "arc" },
      {
        id: "versailles",
        name: "Palace of Versailles",
        imageKey: "versailles",
      },
      {
        id: "mont-saint-michel",
        name: "Mont-Saint-Michel",
        imageKey: "mont-saint-michel",
      },
      {
        id: "pont-du-gard",
        name: "Pont du Gard",
        imageKey: "pont-du-gard",
        premium: true,
      },
      {
        id: "villefranche",
        name: "Villefranche-sur-Mer",
        imageKey: "villefranche",
        premium: true,
      },
    ],
  },
};

function collectionsFor(userId) {
  return COLLECTIONS.map((collection) => {
    const saved = db.data.collectionProgress.find(
      (item) =>
        String(item.userId) === String(userId) &&
        item.collectionId === collection.id,
    );
    const progress = Math.min(
      100,
      Math.max(0, Number(saved?.progress ?? collection.defaultProgress)),
    );
    return {
      id: collection.id,
      title: collection.title,
      detail: collection.detail,
      progress,
      status: progress >= 100 ? "completed" : "active",
      updatedAt: saved?.updatedAt,
    };
  });
}

function cappedPoints(count, each, maximum) {
  return Math.min(Math.max(0, count) * each, maximum);
}

function challengePointsFor(userId) {
  return Math.min(
    HOME_SCORE_MAXIMUMS.challenges,
    db.data.rewards
      .filter(
        (reward) =>
          String(reward.userId) === String(userId) && reward.unlocked !== false,
      )
      .reduce(
        (total, reward) =>
          total + Number(reward.krooPoints ?? reward.points ?? 0),
        0,
      ),
  );
}

function levelFor(score) {
  if (score >= 75) return "Kroo Master";
  if (score >= 50) return "Voyager";
  if (score >= 30) return "Wayfarer";
  if (score >= 15) return "Explorer";
  if (score >= 5) return "Traveler";
  return "Wanderer";
}

function homeDashboardFor(user) {
  const visits = db.data.visits.filter(
    (visit) => String(visit.userId) === String(user.id),
  );
  const countries = new Set(
    visits.map((visit) => visit.countryCode).filter(Boolean),
  );
  const continents = new Set(
    visits.map((visit) => visit.continentCode).filter(Boolean),
  );
  const cities = new Set(visits.map((visit) => visit.cityId).filter(Boolean));
  const airports = visits.reduce(
    (total, visit) =>
      total +
      (visit.places ?? []).filter((place) => place.type === "airport").length,
    0,
  );
  const recordedSightIds = visits.flatMap((visit) =>
    (visit.places ?? [])
      .filter((place) => place.type === "sight")
      .map((place) => String(place.id)),
  );
  const completedSightIds = db.data.completions
    .filter((completion) => String(completion.userId) === String(user.id))
    .map((completion) => String(completion.sightId));
  const sights = new Set([...recordedSightIds, ...completedSightIds]).size;
  const challengePoints = challengePointsFor(user.id);
  const rawScore =
    cappedPoints(continents.size, 1, HOME_SCORE_MAXIMUMS.continents) +
    cappedPoints(countries.size, 0.25, HOME_SCORE_MAXIMUMS.countries) +
    cappedPoints(cities.size, 0.005, HOME_SCORE_MAXIMUMS.cities) +
    cappedPoints(airports, 0.01, HOME_SCORE_MAXIMUMS.airports) +
    cappedPoints(sights, 0.002, HOME_SCORE_MAXIMUMS.sights) +
    challengePoints;
  const score = Math.round(Math.min(100, rawScore) * 1000) / 1000;
  const continentCountries = {};
  visits.forEach((visit) => {
    if (!visit.continentCode || !visit.countryCode) return;
    continentCountries[visit.continentCode] ??= new Set();
    continentCountries[visit.continentCode].add(visit.countryCode);
  });

  return {
    counts: {
      continents: continents.size,
      countries: countries.size,
      cities: cities.size,
      airports,
      sights,
    },
    score,
    level: levelFor(score),
    challengePoints,
    worldProgress: Math.round((countries.size / 195) * 100),
    visitedCountryCodes: [...countries].sort(),
    continentCounts: Object.fromEntries(
      Object.keys(HOME_CONTINENT_TOTALS).map((code) => [
        code,
        continentCountries[code]?.size ?? 0,
      ]),
    ),
    updatedAt: new Date().toISOString(),
  };
}

app.post("/auth/register", async (req, res) => {
  const { name, email, password, passwordConfirmation } = req.body ?? {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(422).json({
      message: "Name, email, and a 6-character password are required.",
    });
  }
  if (password !== passwordConfirmation) {
    return res
      .status(422)
      .json({ message: "Password confirmation does not match." });
  }
  const normalizedEmail = String(email).trim().toLocaleLowerCase();
  if (
    db.data.users.some(
      (user) => user.email.toLocaleLowerCase() === normalizedEmail,
    )
  ) {
    return res
      .status(422)
      .json({ message: "An account with this email already exists." });
  }

  const user = {
    id: randomUUID(),
    name: String(name).trim(),
    email: normalizedEmail,
    password: await hashPassword(password),
    language: "English",
    plan: "free",
  };
  db.data.users.push(user);
  await db.write();
  const token = `dev-${randomUUID()}`;
  sessions.set(token, user.id);
  return res.status(201).json({ token, user: publicUser(user) });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = String(email ?? "")
    .trim()
    .toLocaleLowerCase();
  const user = db.data.users.find(
    (candidate) => candidate.email.toLocaleLowerCase() === normalizedEmail,
  );
  if (user && !(await passwordMatches(password, user.password)))
    return res.status(422).json({ message: "Invalid email or password." });
  if (!user)
    return res.status(422).json({ message: "Invalid email or password." });
  const token = `dev-${randomUUID()}`;
  sessions.set(token, user.id);
  return res.json({ token, user: publicUser(user) });
});

app.get("/auth/me", (req, res) => {
  const user = authenticatedUser(req);
  return user
    ? res.json(publicUser(user))
    : res.status(401).json({ message: "Unauthenticated." });
});

app.put("/auth/password", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const { currentPassword, newPassword } = req.body ?? {};
  if (!(await passwordMatches(String(currentPassword ?? ""), user.password))) {
    return res
      .status(422)
      .json({ message: "The current password is incorrect." });
  }
  if (String(newPassword ?? "").length < 8) {
    return res.status(422).json({
      message: "The new password must contain at least 8 characters.",
    });
  }
  user.password = await hashPassword(String(newPassword));
  await db.write();
  return res.status(204).send();
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
  const allowed = [
    "name",
    "email",
    "language",
    "nationality",
    "dateOfBirth",
    "photoUri",
  ];
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
  return res.json(
    db.data.visits.filter((visit) => String(visit.userId) === String(user.id)),
  );
});

app.post("/visits", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const visit = {
    ...req.body,
    id: randomUUID(),
    userId: user.id,
    places: req.body?.places ?? [],
  };
  db.data.visits.push(visit);
  await db.write();
  return res.status(201).json(visit);
});

app.put("/visits/:id", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const index = db.data.visits.findIndex(
    (visit) =>
      String(visit.id) === String(req.params.id) &&
      String(visit.userId) === String(user.id),
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
    (visit) =>
      String(visit.id) === String(req.params.id) &&
      String(visit.userId) === String(user.id),
  );
  if (index < 0) return res.status(404).json({ message: "Visit not found." });
  db.data.visits.splice(index, 1);
  await db.write();
  return res.status(204).send();
});

app.get("/me/travel-state", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  return res.json({
    completedSightIds: db.data.completions
      .filter((x) => x.userId === user.id)
      .map((x) => x.sightId),
    wishlistIds: db.data.wishlists
      .filter((x) => x.userId === user.id)
      .map((x) => x.targetId),
    rewards: db.data.rewards.filter((x) => x.userId === user.id),
    challengePoints: challengePointsFor(user.id),
    collections: collectionsFor(user.id),
    plan: user.plan ?? "free",
  });
});

app.get("/me/home", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  return res.json(homeDashboardFor(user));
});

app.get("/countries/:code", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const code = String(req.params.code ?? "").toUpperCase();
  const countryIdentity = countries[code];
  const catalog = COUNTRY_CATALOG[code] ?? {
    name: countryIdentity?.name ?? code,
    flag: countryIdentity ? getEmojiFlag(code) : "🌍",
    heroCities: [],
    featuredIn: [],
    sights: [],
  };
  const visits = db.data.visits.filter(
    (visit) =>
      String(visit.userId) === String(user.id) && visit.countryCode === code,
  );
  const completedIds = new Set(
    db.data.completions
      .filter((completion) => String(completion.userId) === String(user.id))
      .map((completion) => String(completion.sightId)),
  );
  const visitedCities = [
    ...new Map(
      visits.map((visit) => [
        String(visit.cityId),
        { id: String(visit.cityId), name: String(visit.cityName) },
      ]),
    ).values(),
  ];
  const recordedSightIds = visits.flatMap((visit) =>
    (visit.places ?? [])
      .filter((place) => place.type === "sight")
      .map((place) => String(place.id)),
  );
  const airportNames = new Set(
    visits.flatMap((visit) =>
      (visit.places ?? [])
        .filter((place) => place.type === "airport")
        .map((place) => String(place.name)),
    ),
  );
  const catalogSightIds = new Set(catalog.sights.map((sight) => sight.id));
  const completedCountryIds = [...completedIds].filter((id) =>
    catalogSightIds.has(id),
  );
  return res.json({
    code,
    name: catalog.name,
    flag: catalog.flag,
    heroCities: catalog.heroCities,
    featuredIn: catalog.featuredIn,
    sights: catalog.sights.map((sight) => ({
      ...sight,
      premium: sight.premium === true,
      completed: completedIds.has(sight.id),
    })),
    stats: {
      cities: visitedCities.length,
      sights: new Set([...recordedSightIds, ...completedCountryIds]).size,
      airports: airportNames.size,
    },
    visitedCities,
  });
});

app.get("/collections", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const status = String(req.query?.status ?? "all").toLocaleLowerCase();
  if (!["all", "active", "completed"].includes(status)) {
    return res
      .status(422)
      .json({ message: "Status must be all, active, or completed." });
  }
  const collections = collectionsFor(user.id);
  return res.json(
    status === "all"
      ? collections
      : collections.filter((item) => item.status === status),
  );
});

app.put("/me/collections/:collectionId", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const collection = COLLECTIONS.find(
    (item) => item.id === String(req.params.collectionId),
  );
  if (!collection)
    return res.status(404).json({ message: "Collection not found." });
  const progress = Number(req.body?.progress);
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    return res
      .status(422)
      .json({ message: "Progress must be between 0 and 100." });
  }
  let saved = db.data.collectionProgress.find(
    (item) =>
      String(item.userId) === String(user.id) &&
      item.collectionId === collection.id,
  );
  if (!saved) {
    saved = {
      id: randomUUID(),
      userId: user.id,
      collectionId: collection.id,
      progress: 0,
    };
    db.data.collectionProgress.push(saved);
  }
  saved.progress = progress;
  saved.updatedAt = new Date().toISOString();
  await db.write();
  return res.json(
    collectionsFor(user.id).find((item) => item.id === collection.id),
  );
});

app.put("/me/completions/:sightId", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const sightId = String(req.params.sightId);
  const index = db.data.completions.findIndex(
    (x) => x.userId === user.id && x.sightId === sightId,
  );
  if (req.body?.completed === false && index >= 0)
    db.data.completions.splice(index, 1);
  if (req.body?.completed !== false && index < 0)
    db.data.completions.push({
      id: randomUUID(),
      userId: user.id,
      sightId,
      completedAt: new Date().toISOString(),
    });
  await db.write();
  return res.json({ sightId, completed: req.body?.completed !== false });
});

app.put("/me/wishlist/:targetId", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const targetId = String(req.params.targetId);
  const index = db.data.wishlists.findIndex(
    (x) => x.userId === user.id && x.targetId === targetId,
  );
  if (req.body?.saved === false && index >= 0)
    db.data.wishlists.splice(index, 1);
  if (req.body?.saved !== false && index < 0)
    db.data.wishlists.push({
      id: randomUUID(),
      userId: user.id,
      targetId,
      savedAt: new Date().toISOString(),
    });
  await db.write();
  return res.json({ targetId, saved: req.body?.saved !== false });
});

app.put("/me/plan", async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  if (!["free", "pro"].includes(req.body?.plan))
    return res.status(422).json({ message: "Plan must be free or pro." });
  user.plan = req.body.plan;
  await db.write();
  return res.json({ plan: user.plan });
});

app.use("/users", (_req, res) => {
  return res.status(404).json({ message: "Use the /auth endpoints." });
});

app.use(createApp(db));

app.listen(
  port,
  () => {
    console.log(`Stampo development API running at http://${host}:${port}`);
    console.log(
      "Auth: POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/logout",
    );
  },
  host,
);
