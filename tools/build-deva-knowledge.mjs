// Génère assets/deva-knowledge.json à partir de assets/data.js.
// C'est la base de connaissances que lit le SMA de Deva (sma/worker.js).
// À relancer après chaque modification de data.js :  node tools/build-deva-knowledge.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(root, "assets/data.js"), "utf8"), sandbox);
const D = sandbox.window.EVAD_DATA;

const fam = Object.fromEntries(D.familles.map((f) => [f.id, f.label]));
const iciNom = Object.fromEntries(D.ici.map((i) => [i.id, i.nom]));
const solNom = Object.fromEntries(D.solutions.map((s) => [s.id, s.nom]));
const niveau = ["", "faible", "moyen", "élevé"];

const solutions = D.solutions.map((s) => ({
  nom: s.nom, famille: fam[s.famille] || s.famille, ceQueCaChange: s.change,
  difficulte: niveau[s.difficulte] || "", cout: niveau[s.cout] || "",
  eprouveeSurProjets: s.eprouve, nourritLesICI: (s.ici || []).map((i) => iciNom[i] || i),
  exempleDePreuve: s.mesureExemple
}));
const ici = D.ici.map((i) => ({ nom: i.nom, famille: (D.iciFamilles.find((f) => f.id === i.famille) || {}).label, ceQuOnObserve: i.observe }));
const quetes = D.quetes.map((q) => ({ titre: q.titre, solution: solNom[q.solution] || q.solution, conseil: q.aide }));
const projets = (D.projets || []).map((p) => ({ nom: p.nom, lieu: p.lieu, statut: (D.statuts[p.statut] || {}).label || p.statut, promesse: p.promesse }));
const espaces = (D.espaces || []).map((e) => ({ nom: e.nom, solutionsSuggerees: (D.suggestionsParEspace[e.id] || []).map((id) => solNom[id] || id) }));
const mode = (id) => { const m = D.deva.modes[id] || {}; return { intro: m.intro, questionsReponses: (m.suggestions || []).map((s) => ({ q: s.q, r: s.a })) }; };

const K = {
  version: new Date().toISOString().slice(0, 10),
  etapes: D.steps.map((s, n) => `${n + 1}. ${s.label}`),
  statuts: Object.values(D.statuts).map((s) => s.label),
  doctrine: {
    impact: D.deva.impactLieu,
    regles: [
      "Deva propose, l'humain décide. Deva ne décide jamais à la place du collectif.",
      "Deva ne produit JAMAIS de chiffre d'impact (CO2, tonnes, kg, kWh, litres, euros économisés, pourcentages de réduction...). L'impact se lit dans Vadance (prévu) et Vadité (vérifié), nourries par les preuves de terrain.",
      "Vérifié bat généré : on préfère une solution éprouvée sur le terrain à une idée inventée. Si le Commun n'a pas la réponse, Deva le dit au lieu d'inventer.",
      "Vocabulaire : on dit « projet régénératif », « porteur de projet », « contributeur », « financeur ». On n'emploie jamais : avantage, récompense, gagner, contrepartie, monnaie locale, crédit, graine, vadin, bâtisseur, pilote, semeur.",
      "Typographie : jamais de tiret cadratin ni demi-cadratin ; on écrit avec des virgules, des deux-points et des points."
    ],
    vocabulaire: "Chez EVAD, on ne parle pas d'avantages ni de récompenses. On parle de projets régénératifs, de porteurs de projet, de contributeurs et de financeurs : ce qui compte, c'est ce que le lieu change, prouvé sur le terrain.",
    carbone: D.deva.carbone && D.deva.carbone.note
  },
  faq: (D.deva.faq || []).map((e) => ({ q: e.q, r: e.a })).filter((e) => e.q),
  projetExemple: { nom: D.projet.nom, lieu: D.projet.lieu, promesse: D.projet.promesse, collectif: D.projet.collectif, reve: D.projet.reveExemple },
  familles: Object.values(fam),
  solutions, ici, quetes, projets, espaces,
  exports: Object.values(D.exports || {}).map((e) => ({ titre: e.titre, intro: e.intro })),
  modes: Object.fromEntries(Object.keys(D.deva.modes).map((id) => [id, mode(id)]))
};
writeFileSync(join(root, "assets/deva-knowledge.json"), JSON.stringify(K, null, 1));
console.log("assets/deva-knowledge.json écrit :", JSON.stringify(K).length, "caractères");
