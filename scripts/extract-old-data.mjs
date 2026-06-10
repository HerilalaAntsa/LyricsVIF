#!/usr/bin/env node
/**
 * Lit tmp/old-repo/db-data.js (ancien dépôt HerilalaAntsa/FihiranaVIF),
 * eval le tableau JS (sandbox node:vm) et dump le contenu brut en JSON
 * à tmp/old-repo/db-data.raw.json — étape préparatoire au migrate_songs.py.
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const SRC = path.resolve("tmp/old-repo/db-data.js");
const OUT = path.resolve("tmp/old-repo/db-data.raw.json");

const code = fs.readFileSync(SRC, "utf-8");

const sandbox = { data: null, console, module: { exports: null } };
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: "db-data.js" });

const result = sandbox.module.exports ?? sandbox.data;
if (!Array.isArray(result)) {
  console.error("ERREUR : aucun tableau exporté");
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify(result, null, 2), "utf-8");
console.log(`OK ${result.length} entrées → ${OUT}`);
