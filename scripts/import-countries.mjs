import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { countries } from "countries-list";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

import { ensureCatalog } from "../server/lib/catalog.mjs";
import { importCountry } from "./import-country.mjs";

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));
const rawArgs = process.argv.slice(2);
const all = rawArgs.includes("--all");
const codes = (
  all ? Object.keys(countries) : rawArgs.filter((arg) => !arg.startsWith("--"))
).map((code) => code.toUpperCase());
if (!codes.length || codes.some((code) => !countries[code])) {
  console.error(
    "Use --all or provide ISO codes, for example: npm run import:countries -- FR DE IT",
  );
  process.exitCode = 1;
} else {
  const dbFile = process.env.DB_FILE ?? "server/db.json";
  const db = new Low(new JSONFile(resolve(process.cwd(), dbFile)), {});
  await db.read();
  db.data ??= {};
  ensureCatalog(db);
  const signature = createHash("sha1")
    .update([...codes].sort().join(","))
    .digest("hex");
  let run = db.data.importRuns.find(
    (item) => item.signature === signature && item.status !== "completed",
  );
  if (!run) {
    run = {
      id: randomUUID(),
      signature,
      mode: all ? "all" : "list",
      codes,
      completedCodes: [],
      failures: {},
      status: "running",
      createdAt: new Date().toISOString(),
    };
    db.data.importRuns.push(run);
  }
  run.status = "running";
  run.updatedAt = new Date().toISOString();
  await db.write();
  const batchSize = Math.max(1, Number(process.env.IMPORT_BATCH_SIZE ?? 5));
  const delayMs = Math.max(250, Number(process.env.IMPORT_DELAY_MS ?? 1500));
  const pending = codes.filter((code) => !run.completedCodes.includes(code));
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    for (const code of pending.slice(offset, offset + batchSize)) {
      let error;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const summary = await importCountry(code, { dbFile });
          run.completedCodes.push(code);
          delete run.failures[code];
          console.log(
            `[${run.completedCodes.length}/${codes.length}] ${code}: ${summary.cities} cities, ${summary.sights} sights`,
          );
          error = null;
          break;
        } catch (caught) {
          error = caught;
          if (attempt < 3) await wait(1000 * 2 ** (attempt - 1));
        }
      }
      if (error) {
        run.failures[code] = {
          message: error.message,
          attempts: 3,
          updatedAt: new Date().toISOString(),
        };
        console.error(`${code}: ${error.message}`);
      }
      await db.read();
      ensureCatalog(db);
      const savedRun = db.data.importRuns.find((item) => item.id === run.id);
      Object.assign(savedRun, run, { updatedAt: new Date().toISOString() });
      await db.write();
      await wait(delayMs);
    }
    if (offset + batchSize < pending.length) await wait(delayMs * 2);
  }
  run.status =
    run.completedCodes.length === codes.length ? "completed" : "partial";
  run.completedAt =
    run.status === "completed" ? new Date().toISOString() : null;
  await db.read();
  ensureCatalog(db);
  Object.assign(
    db.data.importRuns.find((item) => item.id === run.id),
    run,
  );
  await db.write();
  console.log(
    `Import ${run.status}: ${run.completedCodes.length}/${codes.length} countries. Re-run the same command to resume failures.`,
  );
}
