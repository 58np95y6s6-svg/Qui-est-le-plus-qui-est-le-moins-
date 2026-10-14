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

// ---------- Mode « J'ai déjà / Jamais » ----------
const JD_MIN = { collegues: 100, amis: 100, famille: 100, trash: 100, hot: 100 };
const jd = [];
for (const f of FILES) {
  const path = join(root, "src", "jai-deja", `${f}.json`);
  try { jd.push(...JSON.parse(readFileSync(path, "utf8"))); } catch { errors.push(`fichier manquant ou invalide : src/jai-deja/${f}.json`); }
}
for (const q of jd) {
  const w = q.id ?? "?";
  if (ids.has(q.id)) errors.push(`${w} : id en double`);
  ids.add(q.id);
  if (!/^(As-tu déjà|T'es-tu déjà|T’es-tu déjà) /.test(q.question ?? "") || !q.question.trim().endsWith("?")) errors.push(`${w} : la question doit commencer par « As-tu déjà » et finir par « ? »`);
  if (q.question?.length > 130) errors.push(`${w} : question de plus de 130 caractères`);
  if (!/\{count\}/.test(q.reveal ?? "") || !/\{total\}/.test(q.reveal ?? "")) errors.push(`${w} : reveal sans {count} ou {total}`);
  if (!POLARITIES.includes(q.polarity) || ![1, 2, 3].includes(q.intensity)) errors.push(`${w} : polarité ou intensité invalide`);
  const adultTheme = q.themes?.some((t) => t === "trash" || t === "hot");
  if (adultTheme !== !!q.adult || (q.adult && !q.fullExcluded)) errors.push(`${w} : champs adult / fullExcluded incohérents`);
  if (q.aboutRoom && q.intensity === 3 && !q.sensitive) errors.push(`${w} : question aboutRoom d'intensité 3 non marquée sensitive`);
}
const jdPrep = jd.map((q) => ({ id: q.id, b: bigrams(norm(q.question ?? "")) }));
for (let i = 0; i < jdPrep.length; i++)
  for (let j = i + 1; j < jdPrep.length; j++)
    if (dice(jdPrep[i].b, jdPrep[j].b) > 0.85) errors.push(`quasi-doublon J'ai déjà : ${jdPrep[i].id} ≈ ${jdPrep[j].id}`);
const jdRows = FILES.map((t) => { const qs = jd.filter((q) => q.themes?.includes(t)); if (qs.length < JD_MIN[t]) errors.push(`J'ai déjà / ${t} : ${qs.length} questions, minimum ${JD_MIN[t]}`);
  return { thème: t, total: qs.length, aboutRoom: qs.filter((q) => q.aboutRoom).length, sensitive: qs.filter((q) => q.sensitive).length, "int 1/2/3": [1, 2, 3].map((i) => qs.filter((q) => q.intensity === i).length).join("/") }; });
console.log("\nJ'ai déjà / Jamais"); console.table(jdRows);

// ---------- Mode « Quiz culture » ----------
const CATS = ["musique-fr", "histoire", "geographie", "cinema-series", "sport", "sciences", "gastronomie", "langue-fr", "pop-culture", "art-litterature", "jeux-video", "annees-80-2000"];
const quiz = [];
for (const c of CATS) {
  try { quiz.push(...JSON.parse(readFileSync(join(root, "src", "quiz", `${c}.json`), "utf8"))); } catch { errors.push(`fichier manquant ou invalide : src/quiz/${c}.json`); }
}
const pos = [0, 0, 0, 0];
for (const q of quiz) {
  const w = q.id ?? "?";
  if (ids.has(q.id)) errors.push(`${w} : id en double`);
  ids.add(q.id);
  if (!CATS.includes(q.category)) errors.push(`${w} : catégorie inconnue`);
  if (!["easy", "medium", "hard"].includes(q.difficulty)) errors.push(`${w} : difficulté invalide`);
  if (!Array.isArray(q.choices) || q.choices.length !== 4 || new Set(q.choices.map(norm)).size !== 4) errors.push(`${w} : il faut 4 choix distincts`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${w} : index de réponse invalide`); else pos[q.answer]++;
  if (!q.question?.trim().endsWith("?") && !q.question?.includes("…")) errors.push(`${w} : la question doit finir par « ? »`);
  if (typeof q.fact !== "string" || !q.fact.trim()) errors.push(`${w} : anecdote manquante`);
}
const qPrep = quiz.map((q) => ({ id: q.id, b: bigrams(norm(q.question ?? "")) }));
for (let i = 0; i < qPrep.length; i++)
  for (let j = i + 1; j < qPrep.length; j++)
    if (dice(qPrep[i].b, qPrep[j].b) > 0.85) errors.push(`quasi-doublon Quiz : ${qPrep[i].id} ≈ ${qPrep[j].id}`);
const qRows = CATS.map((c) => { const qs = quiz.filter((q) => q.category === c); const d = (x) => qs.filter((q) => q.difficulty === x).length;
  if (d("easy") < 15 || d("medium") < 15 || d("hard") < 15) errors.push(`Quiz / ${c} : il faut au moins 15 questions par difficulté`);
  return { catégorie: c, total: qs.length, facile: d("easy"), moyen: d("medium"), difficile: d("hard") }; });
console.log("\nQuiz culture"); console.table(qRows);
const posPct = pos.map((n) => pct(n, quiz.length || 1));
console.log(`Position de la bonne réponse (%) : ${posPct.join(" / ")}`);
if (quiz.length && posPct.some((x) => x < 18 || x > 32)) errors.push("Quiz : position de la bonne réponse trop déséquilibrée");

if (errors.length) { console.error(`\n${errors.length} erreur(s) :\n- ` + errors.join("\n- ")); process.exit(1); }
writeFileSync(join(root, "questions.fr.json"), JSON.stringify(all, null, 2) + "\n");
writeFileSync(join(root, "jai-deja.fr.json"), JSON.stringify(jd, null, 2) + "\n");
writeFileSync(join(root, "quiz.fr.json"), JSON.stringify(quiz, null, 2) + "\n");
console.log(`OK : ${all.length} « Qui est le plus ? », ${jd.length} « J'ai déjà », ${quiz.length} questions de quiz. Fichiers fusionnés régénérés.`);
