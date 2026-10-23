# Deva, système multi-agents (SMA)

Deva répond aux questions des porteurs de projet sur tout le parcours (carte, Commun, Rêver, Explorer, Générer, Entreprendre, Nourrir, Mon lieu) grâce à une IA, organisée en plusieurs agents.

## Comment ça marche

```
Navigateur (site GitHub Pages)
   │  question + page + derniers échanges + résumé du projet
   ▼
Worker Cloudflare  (sma/worker.js, la clé d'IA est cachée ici)
   1. Orchestrateur  : choisit l'agent qui doit répondre
   2. Spécialiste    : Guide, Rêver, Explorer, Générer, Entreprendre, Nourrir, Le Commun, Mon lieu
   3. Gardien        : vérifie la doctrine (aucun chiffre d'impact, vocabulaire, typographie)
   │
   ▼
Réponse + 0 à 2 questions de suivi + nom de l'agent (affiché sous la bulle)
```

- **Orchestrateur** : petit modèle rapide. Il lit la question et la page, et choisit un spécialiste. En cas de doute ou de panne, c'est l'agent de la page qui répond.
- **Spécialistes** : chacun reçoit seulement la partie utile de la base de connaissances (`assets/deva-knowledge.json`) et le résumé du projet du porteur (nom, promesse, espaces, solutions posées, preuves, prochaine étape). Ni email, ni identifiant de compte.
- **Gardien** : contrôle par règles chaque réponse. S'il trouve un chiffre d'impact ou un mot exclu, il fait réécrire la réponse ; si le problème persiste, il la remplace par la phrase de doctrine (« Je ne calcule pas l'impact à ta place... »). Les tirets cadratins sont remplacés automatiquement.
- **Repli** : si le Worker n'est pas configuré, ne répond pas, ou si le quota gratuit est atteint, Deva répond avec ses règles locales, comme avant. Le site ne casse jamais.

## Coût : gratuit

| Service | Offre gratuite | Rôle |
|---|---|---|
| Groq (console.groq.com) | sans carte bancaire ; limites par minute et par jour | le modèle d'IA (Llama 3.3 70B, et Llama 3.1 8B pour l'orchestrateur et le gardien) |
| Cloudflare Workers | 100 000 requêtes par jour | cache la clé et fait tourner les agents |

Chaque question coûte 2 à 3 appels au modèle (orchestrateur, spécialiste, et gardien seulement si besoin), soit environ 2 000 à 4 000 jetons. Quand le grand modèle atteint sa limite, le Worker passe sur le petit ; quand les deux sont épuisés, Deva repasse sur ses règles locales.

Le Worker accepte toute API compatible OpenAI : on peut remplacer Groq par Mistral, Gemini ou OpenRouter en changeant `LLM_BASE_URL`, `MODEL_AGENT` et `MODEL_RAPIDE`, sans toucher au code.

## Mise en service (15 minutes)

1. **Clé d'IA** : créer un compte sur https://console.groq.com, puis *API Keys* > *Create API Key*. Copier la clé.
2. **Worker** : créer un compte sur https://dash.cloudflare.com, puis *Workers & Pages* > *Create* > *Worker* (modèle « Hello World »). Le nommer `deva-sma`, *Deploy*.
3. *Edit code* : remplacer tout le code par le contenu de `sma/worker.js`, puis *Deploy*.
4. *Settings* > *Variables and Secrets* > *Add* : type **Secret**, nom `LLM_API_KEY`, valeur : la clé Groq. Enregistrer.
5. Ouvrir l'adresse du Worker (`https://deva-sma.<compte>.workers.dev`) dans le navigateur : on doit lire `"ok":true` et `"cle":true`.
6. Dans `assets/deva.js`, mettre cette adresse dans `SMA_URL`, puis publier sur GitHub.

Variables optionnelles : `LLM_BASE_URL`, `MODEL_AGENT`, `MODEL_RAPIDE`, `KNOWLEDGE_URL` (par défaut la base publiée sur GitHub Pages), `ALLOWED_ORIGINS` (sites autorisés à appeler le Worker, par défaut GitHub Pages et localhost:8790).

## Mettre à jour les connaissances de Deva

Les agents lisent `assets/deva-knowledge.json`, généré depuis `assets/data.js`. Après toute modification de `data.js` :

```bash
node tools/build-deva-knowledge.mjs
```

puis publier. Le Worker relit la base toutes les 10 minutes.

## Points à valider avec l'équipe

- **Données envoyées** : la question, les derniers échanges et le résumé du projet passent par Cloudflare et par le fournisseur d'IA (Groq, société américaine). Les offres gratuites peuvent utiliser ces données selon leurs conditions. À mentionner dans la page données personnelles, ou choisir un fournisseur européen (Mistral) pour la production.
- **Empreinte carbone** : le compteur de `data.js` (`deva.carbone.parQuestion`) a été pensé pour des réponses par règles. Avec l'IA, l'empreinte d'une question est plus élevée : la valeur et la note sont à revoir.
- **Limites gratuites** : suffisantes pour une bêta avec quelques testeurs à la fois, pas pour un lancement public.
