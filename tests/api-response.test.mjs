import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const filename = require.resolve("../services/api.ts");
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const apiModule = new Module(filename);
apiModule.require = () => ({
  storeAuthToken: async () => {},
  getStoredAuthToken: async () => null,
  deleteStoredAuthToken: async () => {},
});
apiModule._compile(compiled, filename);
const { api, ApiError } = apiModule.exports;

test("API handles JSON and HTML responses without exposing parser errors", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('<html>Proxy page</html>', { status: 200 });
    await assert.rejects(api.currentUser(), (error) =>
      error instanceof ApiError && error.message.includes("unexpected response"));
    globalThis.fetch = async () => new Response('<html>Unavailable</html>', { status: 503 });
    await assert.rejects(api.currentUser(), (error) =>
      error instanceof ApiError && error.status === 503 && error.message.includes("temporarily unavailable"));
    globalThis.fetch = async () => new Response(JSON.stringify({
      message: "Invalid input", errors: { code: ["This code has expired."] },
    }), { status: 422 });
    await assert.rejects(api.currentUser(), (error) => error.message === "This code has expired.");
    globalThis.fetch = async () => new Response(JSON.stringify({ id: "member-1" }));
    assert.deepEqual(await api.currentUser(), { id: "member-1" });
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await api.deleteVisit("visit-1"), undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
