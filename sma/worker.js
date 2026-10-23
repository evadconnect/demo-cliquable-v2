/* EVAD, SMA de Deva : système multi-agents qui répond aux questions des porteurs de projet.
 *
 * Un seul fichier, à déployer comme Cloudflare Worker (offre gratuite). Voir sma/README.md.
 * Le site (GitHub Pages) appelle ce Worker ; la clé du modèle d'IA reste ici, jamais dans le navigateur.
 *
 * Les agents :
 *   1. Orchestrateur : lit la question et la page, choisit l'agent spécialiste qui répond.
 *   2. Spécialistes : un par étape du parcours REGEN (Rêver, Explorer, Générer, Entreprendre, Nourrir),
 *      plus le Commun, Mon lieu et un Guide général (EVAD, carte, compte, données...).
 *   3. Gardien de la doctrine : relit chaque réponse. Aucun chiffre d'impact, vocabulaire EVAD,
 *      pas de tirets cadratins. Il fait réécrire la réponse si besoin, sinon il la remplace.
 *
 * Variables (Cloudflare > Worker > Settings > Variables and Secrets) :
 *   LLM_API_KEY      (secret, obligatoire) clé du fournisseur d'IA, par défaut Groq (gratuit)
 *   LLM_BASE_URL     (optionnel) API compatible OpenAI. Défaut : https://api.groq.com/openai/v1
 *   MODEL_AGENT      (optionnel) modèle des spécialistes. Défaut : llama-3.3-70b-versatile
 *   MODEL_RAPIDE     (optionnel) modèle de l'orchestrateur et du gardien. Défaut : llama-3.1-8b-instant
 *   KNOWLEDGE_URL    (optionnel) base de connaissances. Défaut : le fichier publié sur GitHub Pages
 *   ALLOWED_ORIGINS  (optionnel) sites autorisés, séparés par des virgules
 */

const DEFAUTS = {
  LLM_BASE_URL: "https://api.groq.com/openai/v1",
  MODEL_AGENT: "llama-3.3-70b-versatile",
  MODEL_RAPIDE: "llama-3.1-8b-instant",
  KNOWLEDGE_URL: "https://evadconnect.github.io/demo-cliquable-v2/assets/deva-knowledge.json",
  ALLOWED_ORIGINS: "https://evadconnect.github.io,http://localhost:8790,http://127.0.0.1:8790"
};

/* ---------- Les agents spécialistes ---------- */
// faq : indices des questions de la FAQ utiles à l'agent (voir assets/deva-knowledge.json).
const AGENTS = {
  guide: {
    label: "Guide",
    role: "Tu présentes EVAD, la carte, le parcours REGEN, le compte, les données, la gratuité, le téléphone, et tu aides quand quelque chose ne marche pas. Tu réponds aux questions générales et tu orientes vers la bonne étape.",
    quand: "questions générales sur EVAD, la carte, les lieux, le compte, les données, le prix, qui fait EVAD, problèmes techniques, salutations",
    mode: "accueil", faq: "toutes", donnees: ["projets"]
  },
  reve: {
    label: "Rêver",
    role: "Tu accompagnes l'étape 1, Rêver : trouver l'inspiration dans les lieux existants, nommer le lieu, le situer, écrire la promesse (une phrase qu'un voisin comprend), décrire le rêve à 3 ans et le collectif. Tu aides à formuler, sans jamais écrire à la place du porteur s'il ne le demande pas.",
    quand: "nommer son lieu, écrire la promesse, le rêve, le collectif, s'inspirer des lieux existants, situer le lieu",
    mode: "orientation", faq: [5, 6, 17, 18, 22], donnees: ["projetExemple", "projets"]
  },
  explorer: {
    label: "Explorer",
    role: "Tu accompagnes l'étape 2, Explorer : découper le lieu en espaces (jardin, atelier, café...), puis accrocher à chaque espace des solutions du Commun. Tu proposes des solutions éprouvées adaptées à l'espace et au rêve du porteur, il choisit.",
    quand: "créer des espaces, choisir ou comparer des solutions, quoi faire pour un jardin, un atelier, l'eau, l'énergie, le réemploi",
    mode: "solutions", faq: [7, 4], donnees: ["espaces", "solutions", "familles"]
  },
  generer: {
    label: "Générer",
    role: "Tu accompagnes l'étape 3, Générer : dessiner les blocs de chaque espace sur la maquette 2.5D, puis y poser les solutions. Gris veut dire prévu, ambre en cours, vert vérifié. La taille d'un élément change le dessin, jamais l'impact. Le décor est libre.",
    quand: "maquette, poser une solution, dessiner les espaces, couleurs grises, jauges, décor, déplacer ou retirer un élément",
    mode: "modelisation", faq: [8, 23], donnees: ["solutionsCourtes"]
  },
  entreprendre: {
    label: "Entreprendre",
    role: "Tu accompagnes l'étape 4, Entreprendre : chaque solution posée devient une quête (un premier pas concret). Tu aides à choisir par où commencer, à répartir les rôles en conseil de lieu, à débloquer une quête.",
    quand: "quêtes, plan d'action, par quoi commencer, qui fait quoi, organisation du collectif, blocage",
    mode: "plan", faq: [9], donnees: ["quetes", "solutionsCourtes"]
  },
  nourrir: {
    label: "Nourrir",
    role: "Tu accompagnes l'étape 5, Nourrir : apporter des preuves de terrain (photo, mesure simple, date) pour que les éléments passent au vert, suivre les ICI, utiliser les exports (ODD, CSRD, PCAET, RSE). Trois preuves font passer le lieu à « Prouvé ».",
    quand: "preuves, vérification, ICI, Vadité, exports pour financeurs, passer au vert",
    mode: "verification", faq: [3, 4, 10], donnees: ["ici", "preuvesExemples", "exports"]
  },
  commun: {
    label: "Le Commun",
    role: "Tu présentes le Commun : la bibliothèque libre de solutions éprouvées sur le terrain, reliées à leurs preuves. Tu expliques une solution, compares des solutions, aides à proposer une nouvelle solution.",
    quand: "le Commun, expliquer une solution précise, proposer une solution, familles de solutions",
    mode: "commun", faq: [2, 4, 27], donnees: ["solutions", "ici", "familles"]
  },
  monlieu: {
    label: "Mon lieu",
    role: "Tu accompagnes le quotidien du lieu dans la page Mon lieu : quoi faire aujourd'hui, preuves attendues, élan de la semaine, espaces vides.",
    quand: "où j'en suis, mon tableau de bord, que faire aujourd'hui, résumé de mon projet, prochaine étape",
    mode: "monlieu", faq: [20, 27], donnees: ["quetes", "ici"]
  }
};
const AGENT_PAR_MODE = { accueil: "guide", commun: "commun", monlieu: "monlieu", orientation: "reve", solutions: "explorer", modelisation: "generer", plan: "entreprendre", verification: "nourrir" };

/* ---------- Gardien de la doctrine (règles sans IA) ---------- */
const MOTS_EXCLUS = /\b(avantages?|r[ée]compenses?|gagner|gagnez|gagnes|contreparties?|monnaies? locales?|cr[ée]dits?|graines?|vadins?|b[âa]tisseurs?|pilotes?|semeurs?)\b/i;
const UNITE_IMPACT = /\d[\d\s.,]*\s?(%|pour ?cent|kg|kilos?|tonnes?|t ?co2|t ?co₂|kwh|mwh|gwh|litres?|m3|m³|€|euros?|g ?co2|g ?co₂|co2e|co₂e)(?![a-z])/i;
const PRES_IMPACT = /(co2|co₂|carbone|[ée]mission|[ée]conomis|r[ée]duction|[ée]vit[ée])[^.!?]{0,50}\d|\d[^.!?]{0,30}(co2|co₂|carbone|[ée]mission)/i;

function controler(texte) {
  const problemes = [];
  if (UNITE_IMPACT.test(texte) || PRES_IMPACT.test(texte)) problemes.push("chiffre d'impact");
  const m = texte.match(MOTS_EXCLUS);
  if (m) problemes.push("mot exclu « " + m[0] + " »");
  return problemes;
}
function nettoyer(texte) {
  return texte
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")   // tirets cadratins et demi-cadratins
    .replace(/\*\*|__|^#+\s*/gm, "")          // pas de markdown dans la bulle
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---------- Base de connaissances ---------- */
let CACHE = { k: null, t: 0 };
async function connaissances(env) {
  if (CACHE.k && Date.now() - CACHE.t < 10 * 60 * 1000) return CACHE.k;
  const r = await fetch(conf(env, "KNOWLEDGE_URL"), { cf: { cacheTtl: 600 } });
  if (!r.ok) throw new Error("base de connaissances introuvable (" + r.status + ")");
  CACHE = { k: await r.json(), t: Date.now() };
  return CACHE.k;
}
function tranche(K, nom) {
  switch (nom) {
    case "projets": return { lieuxExistants: K.projets };
    case "projetExemple": return { projetExemple: K.projetExemple };
    case "espaces": return { espacesTypes: K.espaces };
    case "solutions": return { solutionsDuCommun: K.solutions };
    case "solutionsCourtes": return { solutionsDuCommun: K.solutions.map((s) => ({ nom: s.nom, famille: s.famille, difficulte: s.difficulte, cout: s.cout, ceQueCaChange: s.ceQueCaChange })) };
    case "familles": return { famillesDeSolutions: K.familles };
    case "quetes": return { quetes: K.quetes };
    case "ici": return { ICI: K.ici };
    case "preuvesExemples": return { exemplesDePreuves: K.solutions.map((s) => ({ solution: s.nom, preuve: s.exempleDePreuve })) };
    case "exports": return { exports: K.exports };
    default: return {};
  }
}

/* ---------- Appel au modèle (API compatible OpenAI : Groq, Mistral, Gemini, OpenRouter...) ---------- */
class QuotaError extends Error {}
async function llm(env, model, messages, opts = {}) {
  const r = await fetch(conf(env, "LLM_BASE_URL").replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + (env.LLM_API_KEY || env.GROQ_API_KEY) },
    body: JSON.stringify({
      model, messages, temperature: opts.temperature ?? 0.4, max_tokens: opts.max_tokens ?? 450,
      ...(opts.json ? { response_format: { type: "json_object" } } : {})
    })
  });
  if (r.status === 429) throw new QuotaError("quota atteint pour " + model);
  if (!r.ok) throw new Error("modèle " + model + " : HTTP " + r.status + " " + (await r.text()).slice(0, 200));
  const j = await r.json();
  return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
}
// Spécialiste : grand modèle, et repli sur le modèle rapide si le quota du grand est atteint.
async function llmAgent(env, messages, opts) {
  try { return { texte: await llm(env, conf(env, "MODEL_AGENT"), messages, opts), modele: conf(env, "MODEL_AGENT") }; }
  catch (e) {
    if (!(e instanceof QuotaError)) throw e;
    return { texte: await llm(env, conf(env, "MODEL_RAPIDE"), messages, opts), modele: conf(env, "MODEL_RAPIDE") };
  }
}
function lireJSON(t) {
  try { return JSON.parse(t); } catch (e) { /* le modèle a parfois du texte autour */ }
  const m = t && t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) { /* ignore */ } }
  return null;
}

/* ---------- 1. Orchestrateur ---------- */
async function orchestrer(env, question, mode, historique) {
  const parDefaut = AGENT_PAR_MODE[mode] || "guide";
  const liste = Object.entries(AGENTS).map(([id, a]) => `- ${id} : ${a.quand}`).join("\n");
  const contexte = historique.slice(-2).map((h) => (h.role === "user" ? "Utilisateur : " : "Deva : ") + h.text).join("\n");
  const sys = `Tu es l'orchestrateur du système multi-agents de Deva, l'assistant d'EVAD. Tu choisis UN agent pour répondre.
Agents :
${liste}
L'utilisateur est sur la page « ${mode} » (agent naturel de cette page : ${parDefaut}). En cas de doute, choisis ${parDefaut}.
Réponds uniquement en JSON : {"agent": "<id>"}`;
  try {
    const t = await llm(env, conf(env, "MODEL_RAPIDE"), [
      { role: "system", content: sys },
      { role: "user", content: (contexte ? "Échange précédent :\n" + contexte + "\n\n" : "") + "Question : " + question }
    ], { json: true, temperature: 0, max_tokens: 40 });
    const j = lireJSON(t);
    if (j && AGENTS[j.agent]) return j.agent;
  } catch (e) { /* orchestrateur indisponible : on garde l'agent de la page */ }
  return parDefaut;
}

/* ---------- 2. Spécialiste ---------- */
function promptSpecialiste(K, id, projet, page) {
  const a = AGENTS[id];
  const faq = a.faq === "toutes" ? K.faq : a.faq.map((i) => K.faq[i]).filter(Boolean);
  const base = Object.assign({ essentiel: K.faq.slice(0, 5), faq, etapes: K.etapes, conseilsDeLEtape: K.modes[a.mode] },
    ...a.donnees.map((d) => tranche(K, d)));
  return `Tu es Deva, l'assistant d'EVAD, une plateforme qui aide les collectifs à faire pousser des lieux régénératifs, du rêve à la preuve (parcours REGEN : Rêver, Explorer, Générer, Entreprendre, Nourrir).
Dans le système multi-agents, tu es l'agent « ${a.label} ». ${a.role}

Règles absolues :
${K.doctrine.regles.map((r) => "- " + r).join("\n")}
- Si on te demande un chiffre d'impact, réponds dans l'esprit de : « ${K.doctrine.impact} »
- Tu tutoies, tu es chaleureux et concret. 2 à 5 phrases, pas de listes à puces, pas de markdown.
- Tu réponds dans la langue de l'utilisateur (français par défaut).
- Tu t'appuies d'abord sur la base de connaissances ci-dessous et sur le projet du porteur. Si l'information n'y est pas, tu le dis simplement et tu proposes une piste, sans inventer de faits sur EVAD.
- Si la question relève d'une autre étape, réponds brièvement et indique l'étape où le faire.

Page actuelle : ${page || "inconnue"}.
Projet du porteur (sur son appareil) : ${JSON.stringify(projet || {})}

Base de connaissances :
${JSON.stringify(base)}

Réponds uniquement en JSON : {"reponse": "<ta réponse>", "suggestions": ["<question de suivi courte>", "<question de suivi courte>"]}
Les suggestions sont des questions que l'utilisateur pourrait te poser ensuite (0 à 2, moins de 60 caractères).`;
}

/* ---------- 3. Gardien ---------- */
async function garder(env, K, texte) {
  let t = nettoyer(texte);
  let problemes = controler(t);
  if (!problemes.length) return { texte: t, corrige: false };
  try {
    const r = await llm(env, conf(env, "MODEL_RAPIDE"), [
      { role: "system", content: "Tu es le gardien de la doctrine d'EVAD. Réécris le texte en gardant son sens et son ton, en corrigeant : " + problemes.join(", ") + ". Aucun chiffre d'impact (CO2, kg, tonnes, kWh, litres, euros, pourcentages) : renvoie plutôt vers les preuves de terrain, Vadance et Vadité. Mots interdits : avantage, récompense, gagner, contrepartie, monnaie locale, crédit, graine, vadin, bâtisseur, pilote, semeur. Réponds uniquement avec le texte réécrit." },
      { role: "user", content: t }
    ], { temperature: 0, max_tokens: 450 });
    t = nettoyer(r);
    problemes = controler(t);
  } catch (e) { /* gardien IA indisponible : on applique la règle stricte ci-dessous */ }
  if (problemes.length) t = K.doctrine.impact;
  return { texte: t, corrige: true };
}

/* ---------- Petite protection contre les abus (par instance) ---------- */
const VISITES = new Map();
function tropDeDemandes(ip) {
  const now = Date.now(), fen = 60 * 1000, max = 20;
  const l = (VISITES.get(ip) || []).filter((t) => now - t < fen);
  l.push(now); VISITES.set(ip, l);
  if (VISITES.size > 5000) VISITES.clear();
  return l.length > max;
}

/* ---------- Serveur ---------- */
function conf(env, k) { return (env && env[k]) || DEFAUTS[k]; }
function cors(env, origin) {
  const ok = conf(env, "ALLOWED_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean);
  const allow = ok.includes("*") ? "*" : (ok.includes(origin) ? origin : ok[0]);
  return { "access-control-allow-origin": allow, "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "content-type", vary: "Origin" };
}
function json(obj, status, h) { return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...h } }); }
const court = (s, n) => String(s || "").slice(0, n);

export async function repondre(env, body) {
  const question = court(body.question, 800).trim();
  if (!question) return { status: 400, data: { erreur: "question vide" } };
  const mode = AGENT_PAR_MODE[body.mode] ? body.mode : "accueil";
  const historique = (Array.isArray(body.historique) ? body.historique : []).slice(-8)
    .filter((h) => h && (h.role === "user" || h.role === "assistant"))
    .map((h) => ({ role: h.role, text: court(h.text, 600) }));
  const K = await connaissances(env);

  const agent = await orchestrer(env, question, mode, historique);
  const messages = [{ role: "system", content: promptSpecialiste(K, agent, body.projet, court(body.page, 40)) }]
    .concat(historique.map((h) => ({ role: h.role, content: h.text })))
    .concat([{ role: "user", content: question }]);
  const { texte, modele } = await llmAgent(env, messages, { json: true });
  const j = lireJSON(texte) || { reponse: texte };
  const garde = await garder(env, K, String(j.reponse || texte));
  const suggestions = (Array.isArray(j.suggestions) ? j.suggestions : [])
    .map((s) => nettoyer(String(s)).slice(0, 80)).filter((s) => s && !controler(s).length).slice(0, 2);
  return { status: 200, data: { reponse: garde.texte, suggestions, agent, agentLabel: AGENTS[agent].label, gardien: garde.corrige ? "corrigé" : "ok", modele } };
}

export default {
  async fetch(req, env) {
    const h = cors(env, req.headers.get("origin") || "");
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (req.method === "GET") return json({ ok: true, service: "SMA de Deva (EVAD)", agents: Object.keys(AGENTS), cle: !!(env.LLM_API_KEY || env.GROQ_API_KEY) }, 200, h);
    if (req.method !== "POST") return json({ erreur: "méthode non autorisée" }, 405, h);
    if (!(env.LLM_API_KEY || env.GROQ_API_KEY)) return json({ erreur: "clé LLM_API_KEY absente" }, 503, h);
    if (tropDeDemandes(req.headers.get("cf-connecting-ip") || "?")) return json({ erreur: "trop de questions, attends une minute" }, 429, h);
    let body;
    try { body = await req.json(); } catch (e) { return json({ erreur: "JSON invalide" }, 400, h); }
    try {
      const r = await repondre(env, body);
      return json(r.data, r.status, h);
    } catch (e) {
      const quota = e instanceof QuotaError;
      console.log("[SMA Deva]", e && e.message);
      return json({ erreur: quota ? "quota" : "indisponible" }, quota ? 429 : 502, h);
    }
  }
};
