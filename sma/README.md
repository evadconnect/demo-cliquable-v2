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
- **Repli** : si le Worker n'est pas configuré, ne répond pas, ou si le quota est atteint, Deva répond avec ses règles locales, comme avant. Le site ne casse jamais.

## Coût : gratuit pour une bêta

| Service | Offre | Rôle |
|---|---|---|
| Mistral (console.mistral.ai), société française | offre « Experiment » gratuite avec limites de débit ; offres payantes au jeton au-delà | le modèle d'IA (Mistral Small pour les spécialistes, Ministral 8B pour l'orchestrateur et le gardien) |
| Cloudflare Workers | 100 000 requêtes par jour | cache la clé et fait tourner les agents |

Chaque question coûte 2 à 3 appels au modèle (orchestrateur, spécialiste, et gardien seulement si besoin), soit environ 2 000 à 4 000 jetons. Quand le grand modèle atteint sa limite, le Worker passe sur le petit ; quand les deux sont épuisés, Deva repasse sur ses règles locales.

Le Worker accepte toute API compatible OpenAI : Groq (`https://api.groq.com/openai/v1`, `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`), Gemini ou OpenRouter se branchent en changeant `LLM_BASE_URL`, `MODEL_AGENT` et `MODEL_RAPIDE`, sans toucher au code. Mistral a été retenu pour garder les données en Europe.

## Mise en service (15 minutes)

1. **Clé d'IA** : créer un compte sur https://console.mistral.ai, choisir l'offre (Experiment, gratuite, suffit pour la bêta), puis *API Keys* > *Create new key*. Copier la clé.
2. **Worker** : créer un compte sur https://dash.cloudflare.com, puis *Workers & Pages* > *Create* > *Worker* (modèle « Hello World »). Le nommer `deva-sma`, *Deploy*.
3. *Edit code* : remplacer tout le code par le contenu de `sma/worker.js`, puis *Deploy*.
4. *Settings* > *Variables and Secrets* > *Add* : type **Secret**, nom `LLM_API_KEY`, valeur : la clé Mistral. Enregistrer. (Mistral est le fournisseur par défaut du Worker : aucune autre variable à poser.)
5. Ouvrir l'adresse du Worker (`https://deva-sma.<compte>.workers.dev`) dans le navigateur : on doit lire `"ok":true` et `"cle":true`.
6. Dans `assets/deva.js`, mettre cette adresse dans `SMA_URL`, puis publier sur GitHub.

Variables optionnelles : `LLM_BASE_URL`, `MODEL_AGENT`, `MODEL_RAPIDE`, `KNOWLEDGE_URL` (par défaut la base publiée sur GitHub Pages), `ALLOWED_ORIGINS` (sites autorisés à appeler le Worker, par défaut GitHub Pages et localhost:8790).

## Modèle local et gratuit (Ollama), sans serveur ni clé

Le même SMA peut tourner entièrement sur un ordinateur, avec un modèle libre (Qwen 2.5, 3 milliards de paramètres). Rien ne sort de la machine, rien n'est payant. Le fichier `sma/worker.js` est alors chargé directement par le navigateur et appelle Ollama.

En mode local, le SMA passe en mode léger : l'orchestrateur et le gardien fonctionnent par règles (mots-clés, contrôle de doctrine), seules les connaissances liées à la question sont envoyées au modèle (recherche par mots, environ 3 fois moins de texte), et chaque question ne fait qu'un appel. Le Worker utilise l'API native d'Ollama : le modèle reste chargé 30 minutes et la réponse s'affiche mot à mot. Sur un ordinateur sans carte graphique dédiée, compter de quelques secondes à une minute par réponse, la première étant la plus lente (chargement du modèle).

1. Installer Ollama : https://ollama.com/download
2. Dans le Terminal :
   ```bash
   ollama pull qwen2.5:3b
   launchctl setenv OLLAMA_ORIGINS "https://evadconnect.github.io,http://localhost:8790"
   ```
   puis quitter et relancer l'application Ollama (la deuxième ligne autorise le site à lui parler).
3. Ouvrir le site avec `?deva=local` à la fin de l'adresse, par exemple https://evadconnect.github.io/demo-cliquable-v2/?deva=local. Si Chrome demande l'accès au réseau local, accepter. Le choix est mémorisé ; `?deva=off` revient au fonctionnement normal.

Sous chaque réponse, Deva affiche « Agent ..., modèle local ». Si Ollama n'est pas lancé ou injoignable, Deva répond par règles et l'indique sous la bulle.

Limite des navigateurs : depuis le site publié en https, Chrome bloque souvent l'appel vers `localhost` (règle « accès au réseau privé ») à moins d'afficher une demande d'autorisation, et Ollama ne renvoie pas l'en-tête qui lèverait ce blocage. Le mode local est donc fiable depuis une page en `http://localhost:8790` (serveur local), et aléatoire depuis GitHub Pages.

Pour changer de modèle (plus rapide : `qwen2.5:1.5b` ; meilleur mais plus lent : `qwen2.5:7b`), modifier `SMA_LOCAL.modele` dans `assets/deva.js`.

Limite : ce mode ne sert qu'à la personne assise devant l'ordinateur (démonstrations, développement). Pour les vrais utilisateurs, il faut soit le Worker en ligne ci-dessus, soit un serveur d'EVAD qui fait tourner Ollama.

## Mettre à jour les connaissances de Deva

Les agents lisent `assets/deva-knowledge.json`, généré depuis `assets/data.js`. Après toute modification de `data.js` :

```bash
node tools/build-deva-knowledge.mjs
```

puis publier. Le Worker relit la base toutes les 10 minutes.

## Points à valider avec l'équipe

- **Données envoyées** : la question, les derniers échanges et le résumé du projet (nom du lieu, promesse, espaces, solutions, preuves, étape ; ni prénom, ni email, ni identifiant) passent par Cloudflare et par Mistral (société française, données traitées en Europe). L'offre gratuite « Experiment » autorise Mistral à utiliser les échanges pour améliorer ses modèles ; les offres payantes non. À mentionner dans la page données personnelles.
- **Empreinte carbone** : le compteur de `data.js` (`deva.carbone.parQuestion`) a été pensé pour des réponses par règles. Avec l'IA, l'empreinte d'une question est plus élevée : la valeur et la note sont à revoir.
- **Limites gratuites** : suffisantes pour une bêta avec quelques testeurs à la fois, pas pour un lancement public.
