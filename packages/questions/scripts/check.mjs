// Contrôle de la banque de questions : `node packages/questions/scripts/check.mjs`
// Fusionne src/*.json dans questions.fr.json puis vérifie les règles du §7 du prompt.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["collegues", "amis", "famille", "trash", "hot"];
const MIN = { collegues: 160, amis: 160, famille: 160, trash: 120, hot: 120 };
const FORMATS = ["most", "least", "who_for", "most_likely"];
const POLARITIES = ["positive", "negative", "neutral"];
const BASE = ["collegues", "amis", "famille"];

const errors = [];
const all = [];
for (const f of FILES) {
  if (!readdirSync(join(root, "src")).includes(`${f}.json`)) { errors.push(`fichier manquant : src/${f}.json`); continue; }
  all.push(...JSON.parse(readFileSync(join(root, "src", `${f}.json`), "utf8")));
}

const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const bigrams = (t) => { const s = new Set(); for (let i = 0; i < t.length - 1; i++) s.add(t.slice(i, i + 2)); return s; };
const dice = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return (2 * n) / (a.size + b.size); };

const ids = new Set();
for (const q of all) {
  const where = `${q.id ?? "?"}`;
  if (ids.has(q.id)) errors.push(`${where} : id en double`);
  ids.add(q.id);
  if (typeof q.text !== "string" || !q.text.trim().endsWith("?")) errors.push(`${where} : le texte doit finir par « ? »`);
  if (q.text?.length > 110) errors.push(`${where} : texte de plus de 110 caractères`);
  if (!FORMATS.includes(q.format)) errors.push(`${where} : format inconnu « ${q.format} »`);
  if (!POLARITIES.includes(q.polarity)) errors.push(`${where} : polarité inconnue « ${q.polarity} »`);
  if (![1, 2, 3].includes(q.intensity)) errors.push(`${where} : intensité invalide`);
  if (!Array.isArray(q.themes) || !q.themes.length) errors.push(`${where} : aucun thème`);
  if (typeof q.verdict !== "string" || !q.verdict.includes("{name}")) errors.push(`${where} : verdict sans {name}`);
  const adultTheme = q.themes?.some((t) => t === "trash" || t === "hot");
  if (adultTheme !== !!q.adult) errors.push(`${where} : « adult » incohérent avec les thèmes`);
  if (q.adult && !q.fullExcluded) errors.push(`${where} : question adulte sans fullExcluded`);
  if (q.adult && q.themes.some((t) => BASE.includes(t))) errors.push(`${where} : question adulte mélangée à un thème tout public`);
}

// Quasi-doublons (similarité de Dice sur bigrammes > 0,85)
const prepared = all.map((q) => ({ id: q.id, b: bigrams(norm(q.text ?? "")) }));
const near = [];
for (let i = 0; i < prepared.length; i++)
  for (let j = i + 1; j < prepared.length; j++)
    if (dice(prepared[i].b, prepared[j].b) > 0.85) near.push(`${prepared[i].id} ≈ ${prepared[j].id}`);
for (const n of near) errors.push(`quasi-doublon : ${n}`);

// Statistiques et ratios par thème
const pct = (n, d) => Math.round((n / d) * 100);
const rows = [];
for (const t of FILES) {
  const qs = all.filter((q) => q.themes?.includes(t));
  const c = (k, v) => qs.filter((q) => q[k] === v).length;
  const n = qs.length || 1;
  rows.push({ thème: t, total: qs.length, "pos %": pct(c("polarity", "positive"), n), "nég %": pct(c("polarity", "negative"), n), "neu %": pct(c("polarity", "neutral"), n),
    "most %": pct(c("format", "most"), n), "least %": pct(c("format", "least"), n), "pour/susc. %": pct(c("format", "who_for") + c("format", "most_likely"), n),
    "int 1/2/3": [1, 2, 3].map((i) => c("intensity", i)).join("/") });
  if (qs.length < MIN[t]) errors.push(`${t} : ${qs.length} questions, minimum ${MIN[t]}`);
  if (BASE.includes(t)) {
    const own = all.filter((q) => q.themes?.[0] === t), m = own.length || 1, o = (k, v) => own.filter((q) => q[k] === v).length;
    if (Math.abs(pct(o("polarity", "positive"), m) - 40) > 5 || Math.abs(pct(o("polarity", "negative"), m) - 40) > 5) errors.push(`${t} : ratio positif/négatif hors tolérance`);
    if (pct(o("format", "most"), m) < 35 || pct(o("format", "least"), m) < 20 || pct(o("format", "who_for") + o("format", "most_likely"), m) < 25) errors.push(`${t} : répartition des formats hors cible`);
  }
}
const full = all.filter((q) => !q.fullExcluded);
console.table(rows);
console.log(`Total : ${all.length} questions · mode Full : ${full.length} · adultes : ${all.filter((q) => q.adult).length}`);

if (errors.length) { console.error(`\n${errors.length} erreur(s) :\n- ` + errors.join("\n- ")); process.exit(1); }
writeFileSync(join(root, "questions.fr.json"), JSON.stringify(all, null, 2) + "\n");
console.log("OK, questions.fr.json régénéré.");
