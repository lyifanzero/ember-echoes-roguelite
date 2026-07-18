import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const client = path.join(dist, "client");
const server = path.join(dist, "server");

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });
await mkdir(path.join(dist, ".openai"), { recursive: true });

for (const file of ["index.html", "styles.css", "balance.js", "game.js"]) {
  await cp(path.join(root, file), path.join(client, file));
}

const hosting = JSON.parse(await readFile(path.join(root, ".openai", "hosting.json"), "utf8"));
await writeFile(path.join(dist, ".openai", "hosting.json"), `${JSON.stringify(hosting, null, 2)}\n`);
await writeFile(path.join(server, "index.js"), `export default {\n  async fetch(request, env) {\n    return env.ASSETS.fetch(request);\n  }\n};\n`);

console.log("Built mobile-ready game for Sites hosting.");
