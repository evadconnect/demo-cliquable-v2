# EVAD, bêta du parcours REGEN

**En ligne : https://evadconnect.github.io/demo-cliquable/**

Du rêve à la preuve : carte vivante, le Commun, puis les 5 étapes REGEN (Rêver, Explorer, Générer, Entreprendre, Nourrir).
HTML, CSS et JavaScript sans framework ni build ; comptes et données sur Supabase, carte OpenStreetMap (Leaflet).

## Bêta : comptes et données (Supabase)

- Les comptes sont ceux de Supabase (email + mot de passe), les mêmes que le prototype EVAD.
- Chaque testeur crée **son propre lieu** (nom, commune géolocalisée, promesse, collectif) sur un terrain vierge. Le projet est enregistré en ligne (table `regen_projets`, protégée par compte) et mis en cache sur l'appareil.
- La carte publique montre les lieux des testeurs qui ont coché « Afficher mon lieu sur la carte » (vue `regen_carte`, colonnes limitées), plus des projets d'exemple marqués « Exemple ».

### Vue `regen_carte` : ce que la carte attend

Si la vue est absente (erreur 404 « Could not find the table public.regen_carte »), la carte **ne plante pas** : elle retombe sur les 8 lieux d'exemple et l'annonce par un bandeau « Carte en mode exemple : les lieux publics ne sont pas encore chargés ». À l'étape Rêver, une note sous la case « Afficher mon lieu » précise que la publication n'est pas encore active. Pour activer la carte publique, exécuter `supabase/regen-beta.sql`, qui crée la vue ainsi :

| Colonne | Type | Origine |
|---|---|---|
| `id` | uuid | `regen_projets.id` |
| `nom`, `promesse`, `lieu`, `collectif` | text | colonnes du projet |
| `lat`, `lng` | double precision | position du lieu |
| `statut` | text (`reve`, `encours`, `prouve`) | avancement |
| `placed` | jsonb | `data -> 'placed'` (solutions posées, sans les preuves) |
| `updated_at` | timestamptz | dernière modification |

Filtre de la vue : `public = true and lat is not null and lng is not null and nom <> ''`. Droits : `grant select on public.regen_carte to anon, authenticated` (la table `regen_projets` reste, elle, protégée par RLS : chaque compte ne lit et n'écrit que ses propres lignes, aucun accès `anon`). Aucune donnée de compte ni de preuve détaillée ne transite par la vue.
- Base utilisée : constante `ENV` en haut de `assets/backend.js`. Depuis octobre 2026 : `"prod"` (base réelle) ; l'ancien projet staging evad-dev a été supprimé (son domaine ne résout plus).

### Mise en service
1. Dans Supabase (staging d'abord) > SQL Editor : exécuter `supabase/regen-beta.sql`.
2. Authentication > URL Configuration : ajouter `https://evadconnect.github.io/demo-cliquable/` (et `http://localhost:8790/`) aux Redirect URLs, pour les liens de confirmation et de mot de passe oublié.
3. Quand c'est validé : relancer le SQL sur la base prod et passer `ENV` à `"prod"`.

## Vérifications rapides

Typographie : aucun tiret cadratin (U+2014) ni demi-cadratin (U+2013) dans les textes ; on écrit avec des virgules, des deux-points et des points.

```bash
grep -rnE "$(printf '\xe2\x80\x94|\xe2\x80\x93')" --include=*.html --include=*.js --include=*.md . && echo "Tirets à corriger" || echo "OK : aucun tiret cadratin"
```

Vocabulaire : les mots exclus par la doctrine ne doivent pas apparaître dans l'interface (on dit « projet régénératif », « porteur de projet », « contributeur », « financeur »).

```bash
grep -rniE "avantage|récompense|\bgagner\b|contrepartie|monnaie locale|crédits?|\bgraines?\b|vadin|bâtisseur|\bpilote\b|semeur" --include=*.html --include=*.js . || echo "OK : vocabulaire conforme"
```

Le mot « point » se vérifie à la main : il reste acceptable pour la géographie (mais on préfère « marqueur » ou « lieu » dans les textes de Deva), jamais au sens de points à gagner.

## Lancer en local

Ouvrir `index.html` dans le navigateur, directement.

Ou avec un petit serveur statique :

```bash
python3 -m http.server 8790
```

puis http://localhost:8790

## Déployer sur Vercel

Importer le dossier tel quel (preset « Other », aucune commande de build, dossier de sortie : la racine). Aucune configuration nécessaire.
En ligne de commande : `npx vercel` depuis ce dossier.

## Où modifier quoi

| Fichier | Contenu |
|---|---|
| `assets/data.js` | **Toutes les données de démo** : projet fil rouge, 8 projets voisins, 12 solutions du Commun, 6 ICI, 10 quêtes, maquette 2.5D, répliques de Deva, cadres d'export |
| `assets/app.js` | État de la démo (localStorage), barre du haut, carte, logique de chaque écran |
| `assets/scene.js` | Scène 2.5D isométrique en SVG (bâtiments, solutions posées en gris, ambre ou vert) |
- `assets/isomap.js` : carte illustrée isométrique de la France (SVG dessiné par règles, sans tuile ni image ; zoom à la molette ou au pincement, déplacement en glissant) ; vue par défaut de l'accueil, la carte OpenStreetMap reste disponible via la bascule « Carte ».
| `assets/deva.js` | Panneau Deva, réponses scriptées |
| `assets/styles.css` | Charte graphique (couleurs en variables en haut du fichier) |

## Bon à savoir

- L'état (nom du projet, solutions choisies et posées, quêtes, preuves) vit dans le `localStorage` du navigateur. Le bouton « Réinitialiser la démo » en pied de page remet tout à zéro.
- Deva ne produit jamais de chiffre d'impact : les jauges et les barres ne bougent que par les actions du visiteur.
- La carte de l'accueil (et de Rêver) est une vraie carte open source : Leaflet + tuiles OpenStreetMap. Chaque lieu a de vraies coordonnées (`lat`/`lng` dans `data.js`), et sur Rêver on situe son propre lieu en cliquant la carte ou en glissant son marqueur. Hors-ligne, la démo retombe automatiquement sur une carte stylisée en SVG.
- Le projet passe au vert sur la carte à partir de 3 preuves saisies à l'étape Nourrir.
- Deux niveaux d'accès : les pages publiques (accueil, Le Commun) sont ouvertes à tous, avec Deva et un bouton « Se connecter » ; l'espace de travail (les 5 étapes du parcours) demande un accès. Entrer dans le parcours (ou cliquer « Créer mon projet ») ouvre l'écran d'accès « Créer un accès / J'ai déjà un accès ». Bêta sans backend : pas de mot de passe, un simple prénom crée une session locale (`state.session`) stockée sur l'appareil ; « Déconnexion » l'efface.
- Sur l'accueil (public), la sidebar de gauche est Deva en mode accueil : elle présente la Vision 2030 et propose les portes (créer un projet, visiter la carte, parcourir le Commun). La carte occupe la droite.
- Parcours type : accueil → « Créer mon projet » → « Utiliser l'exemple » → ajouter 3 ou 4 solutions → les poser sur la maquette → « C'est parti » → saisir 3 preuves → « Voir la carte ».

## Enrichir Deva (réponses par règles)

Deva répond sans modèle de langage, par règles, dans cet ordre : salutations et politesses, réponses contextuelles de la page (où j'en suis, prochaine étape, mon lieu), règle de doctrine sur l'impact (jamais de chiffre), réponses construites depuis les données (une solution, un ICI, les solutions d'une famille), puis la FAQ à mots-clés (expressions exactes prioritaires, une faute de frappe tolérée sur les mots de cinq lettres et plus), et enfin un repli qui propose trois questions proches.

Pour ajouter une réponse : une entrée dans `D.deva.faq` de `assets/data.js`, avec `q` (la question telle qu'on la propose en chip), `k` (les mots-clés, en minuscules, avec et sans accents) et `a` (la réponse, sans tiret cadratin et sans chiffre d'impact).

```js
{ q: "Peut-on venir visiter ?", k: ["visiter un lieu", "portes ouvertes", "venir voir"],
  a: "Chaque lieu prouvé indique dans sa fiche comment le contacter : écris au collectif, il te dira quand passer." }
```
