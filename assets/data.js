/* EVAD, démo cliquable : toutes les données de démo.
   Modifier ici les projets, solutions, ICI, quêtes et répliques de Deva.
   Rien n'est envoyé nulle part : tout est fictif. */
window.EVAD_DATA = {
  steps: [
    { id: "rever", label: "Rêver", href: "rever.html", deva: "orientation" },
    { id: "explorer", label: "Explorer", href: "explorer.html", deva: "solutions" },
    { id: "generer", label: "Générer", href: "generer.html", deva: "modelisation" },
    { id: "entreprendre", label: "Entreprendre", href: "entreprendre.html", deva: "plan" },
    { id: "nourrir", label: "Nourrir", href: "nourrir.html", deva: "verification" }
  ],

  statuts: {
    reve: { label: "Rêvé", couleur: "#CBC6B4" },
    encours: { label: "En cours", couleur: "#D9A03F" },
    prouve: { label: "Prouvé", couleur: "#5F7F52" }
  },

  /* Projet fil rouge : celui que le visiteur fait vivre */
  projet: {
    id: "friche",
    nom: "La Friche des Tanneurs",
    lieu: "Bords de l'Isle, Dordogne",
    surface: "ancienne tannerie de 1,2 ha",
    collectif: "Collectif de 8 personnes : maraîchère, menuisier, cuisinière, deux voisins retraités, une animatrice, un électricien, une étudiante",
    promesse: "Un tiers-lieu nourricier où l'on cultive, répare et partage, là où l'on tannait autrefois le cuir.",
    reveExemple: "des familles qui viennent chercher leurs légumes à pied, un atelier où l'on répare au lieu de jeter, et un café où tout le quartier se croise.",
    statutInitial: "encours",
    pos: { x: 585, y: 395 }, lat: 45.183, lng: 0.715
  },

  familles: [
    { id: "eau", label: "Eau" },
    { id: "sol", label: "Sol" },
    { id: "energie", label: "Énergie" },
    { id: "reemploi", label: "Réemploi" },
    { id: "alimentation", label: "Alimentation" },
    { id: "gouvernance", label: "Gouvernance" }
  ],

  /* ICI : indicateurs de changement d'impact */
  iciFamilles: [
    { id: "ecologie", label: "Écologie" },
    { id: "social", label: "Social" },
    { id: "economie", label: "Économie locale" }
  ],

  ici: [
    { id: "ici-sol", nom: "Vie du sol", famille: "ecologie", observe: "Le sol redevient grumeleux, les vers de terre reviennent, l'eau s'infiltre au lieu de ruisseler." },
    { id: "ici-bio", nom: "Biodiversité accueillie", famille: "ecologie", observe: "Oiseaux, insectes et plantes spontanées trouvent refuge sur le lieu, saison après saison." },
    { id: "ici-lien", nom: "Liens entre voisins", famille: "social", observe: "Des personnes qui ne se parlaient pas se retrouvent, s'entraident et reviennent." },
    { id: "ici-acces", nom: "Ouverture à toutes et tous", famille: "social", observe: "Le lieu accueille des publics variés, y compris celles et ceux qu'on n'attendait pas." },
    { id: "ici-local", nom: "Achats faits près d'ici", famille: "economie", observe: "Ce qui est mangé, réparé ou construit vient de plus en plus du territoire proche." },
    { id: "ici-emploi", nom: "Activités créées sur place", famille: "economie", observe: "De nouvelles activités naissent sur le lieu et font vivre des personnes du coin." }
  ],

  /* Le Commun : 12 solutions, 6 familles.
     difficulte : 1 accessible, 2 demande de l'organisation, 3 exigeante
     cout : 1 modeste, 2 moyen, 3 important
     effets : poids qualitatif par famille d'ICI, utilisé seulement pour faire bouger les jauges
     scene : forme dessinée sur la maquette 2.5D */
  solutions: [
    { id: "recup-eau", nom: "Récupération d'eau de pluie", famille: "eau", difficulte: 1, cout: 1, eprouve: 14, ici: ["ici-sol", "ici-bio"], effets: { ecologie: 2, social: 0, economie: 1 }, scene: "citerne",
      change: "Les toits remplissent des cuves : on arrose le jardin sans puiser dans le réseau, même en été.", mesureExemple: "Deux cuves raccordées à la gouttière de l'atelier" },
    { id: "mare", nom: "Mare pédagogique", famille: "eau", difficulte: 2, cout: 2, eprouve: 9, ici: ["ici-bio", "ici-lien"], effets: { ecologie: 2, social: 1, economie: 0 }, scene: "mare", emprise: [2, 1],
      change: "Un coin d'eau qui attire grenouilles et libellules, et où les écoles viennent observer.", mesureExemple: "Mare creusée, premières libellules observées" },
    { id: "haie", nom: "Haie fruitière", famille: "sol", difficulte: 1, cout: 1, eprouve: 21, ici: ["ici-bio", "ici-local"], effets: { ecologie: 2, social: 0, economie: 1 }, scene: "haie", lineaire: { min: 1, max: 5, defaut: 3 },
      change: "Une haie de petits fruits qui coupe le vent, abrite les oiseaux et nourrit les passants.", mesureExemple: "Haie plantée sur tout le bord nord avec l'école" },
    { id: "compost", nom: "Compost partagé", famille: "sol", difficulte: 1, cout: 1, eprouve: 26, ici: ["ici-sol", "ici-lien"], effets: { ecologie: 1, social: 2, economie: 0 }, scene: "compost",
      change: "Les voisins déposent leurs épluchures, le jardin récupère un sol vivant.", mesureExemple: "Trois bacs en service, deux référents formés" },
    { id: "solaire", nom: "Panneaux solaires citoyens", famille: "energie", difficulte: 3, cout: 3, eprouve: 7, ici: ["ici-local", "ici-emploi"], effets: { ecologie: 1, social: 1, economie: 2 }, scene: "solaire", emprise: [2, 1],
      change: "Les habitants financent ensemble une centrale sur le lieu et gardent l'énergie au pays.", mesureExemple: "Centrale posée et raccordée, collectif citoyen constitué" },
    { id: "four", nom: "Four à pain au bois de taille", famille: "energie", difficulte: 2, cout: 2, eprouve: 6, ici: ["ici-lien", "ici-local"], effets: { ecologie: 0, social: 2, economie: 1 }, scene: "four",
      change: "Le bois des tailles de haies chauffe un four où l'on cuit ensemble le pain du quartier.", mesureExemple: "Première fournée partagée avec le quartier" },
    { id: "ressourcerie", nom: "Ressourcerie de quartier", famille: "reemploi", difficulte: 2, cout: 2, eprouve: 11, ici: ["ici-emploi", "ici-acces"], effets: { ecologie: 1, social: 1, economie: 2 }, scene: "ressourcerie", emprise: [2, 2],
      change: "Ce qui allait à la benne trouve une deuxième vie et un petit emploi local se crée.", mesureExemple: "Permanence de collecte ouverte chaque mercredi" },
    { id: "repair", nom: "Repair café", famille: "reemploi", difficulte: 1, cout: 1, eprouve: 18, ici: ["ici-lien", "ici-acces"], effets: { ecologie: 1, social: 2, economie: 0 }, scene: "repair",
      change: "Un samedi par mois, on apprend à réparer ensemble grille-pain, vélos et vêtements.", mesureExemple: "Premier repair café tenu, trois bénévoles réparateurs" },
    { id: "planches", nom: "Planches de culture en lasagnes", famille: "alimentation", difficulte: 1, cout: 1, eprouve: 23, ici: ["ici-sol", "ici-local"], effets: { ecologie: 1, social: 0, economie: 2 }, scene: "planches", lineaire: { min: 1, max: 4, defaut: 2 },
      change: "On cultive sur une ancienne dalle en empilant carton, broyat et compost : pas besoin de bon sol au départ.", mesureExemple: "Planches montées, premières salades récoltées" },
    { id: "poulailler", nom: "Poulailler partagé", famille: "alimentation", difficulte: 2, cout: 1, eprouve: 8, ici: ["ici-sol", "ici-lien"], effets: { ecologie: 1, social: 1, economie: 1 }, scene: "poulailler",
      change: "Quelques poules mangent les restes, donnent des œufs et un prétexte pour passer tous les jours.", mesureExemple: "Poulailler habité, planning de soin partagé entre voisins" },
    { id: "conseil", nom: "Conseil de lieu ouvert", famille: "gouvernance", difficulte: 2, cout: 1, eprouve: 12, ici: ["ici-acces", "ici-lien"], effets: { ecologie: 0, social: 2, economie: 0 }, scene: "agora", emprise: [2, 2],
      change: "Chaque mois, toute personne qui fréquente le lieu peut proposer et décider avec le collectif.", mesureExemple: "Premier conseil tenu, compte rendu affiché" },
    { id: "budget", nom: "Budget participatif du lieu", famille: "gouvernance", difficulte: 2, cout: 1, eprouve: 5, ici: ["ici-acces", "ici-emploi"], effets: { ecologie: 0, social: 1, economie: 1 }, scene: "panneau",
      change: "Une part du budget est décidée par les usagers : ils choisissent les prochains chantiers.", mesureExemple: "Premier vote tenu, projet retenu affiché" }
  ],

  /* 10 quêtes types, reliées aux solutions */
  quetes: [
    { id: "q-recup", solution: "recup-eau", titre: "Raccorder la gouttière de l'atelier à une cuve", aide: "Un après-midi à deux, avec l'électricien pour la pompe." },
    { id: "q-mare", solution: "mare", titre: "Creuser la mare en chantier participatif", aide: "Prévoir bâche, pelles et un goûter pour les voisins." },
    { id: "q-haie", solution: "haie", titre: "Planter la haie avec l'école voisine", aide: "Plants à commander en pépinière locale avant novembre." },
    { id: "q-compost", solution: "compost", titre: "Installer les bacs et former deux référents", aide: "Le syndicat de collecte prête souvent les bacs." },
    { id: "q-solaire", solution: "solaire", titre: "Réunir le collectif citoyen pour le toit solaire", aide: "Une réunion publique au café pour ouvrir le projet." },
    { id: "q-four", solution: "four", titre: "Bâtir le four avec un artisan du coin", aide: "Deux week-ends de chantier ouvert." },
    { id: "q-ressourcerie", solution: "ressourcerie", titre: "Ouvrir la première permanence de collecte", aide: "Un créneau fixe, une affiche chez les commerçants." },
    { id: "q-repair", solution: "repair", titre: "Lancer le premier repair café du samedi", aide: "Trouver trois bénévoles bricoleurs et une caisse à outils." },
    { id: "q-planches", solution: "planches", titre: "Monter les planches de culture sur l'ancienne dalle", aide: "Collecter cartons et broyat auprès des voisins." },
    { id: "q-conseil", solution: "conseil", titre: "Tenir le premier conseil de lieu ouvert", aide: "Choisir un jour fixe et afficher l'ordre du jour au café." }
  ],

  /* Espaces pré-remplis de la carte mentale (étape Explorer) */
  espaces: [
    { id: "jardin", nom: "Jardin nourricier" },
    { id: "atelier", nom: "Atelier réemploi" },
    { id: "cafe", nom: "Café associatif" },
    { id: "gouvernance", nom: "Gouvernance partagée" }
  ],

  /* Suggestions de Deva par espace (l'humain valide en cliquant) */
  suggestionsParEspace: {
    jardin: ["haie", "planches", "recup-eau"],
    atelier: ["repair", "ressourcerie", "solaire"],
    cafe: ["four", "compost"],
    gouvernance: ["conseil", "budget"]
  },

  /* Maquette 2.5D du lieu fil rouge : grille 9 x 9, chemins en croix sur la ligne et la colonne 4.
     i va vers la droite-bas, j vers la gauche-bas. */
  scene: {
    grille: 9,
    chemin: 4,
    structures: [
      { type: "atelier", i: 0, j: 0, w: 3, d: 2 },
      { type: "serre", i: 6, j: 0, w: 3, d: 1 },
      { type: "planches", i: 6, j: 2 }, { type: "planches", i: 7, j: 2 }, { type: "planches", i: 8, j: 2 },
      { type: "planches", i: 7, j: 3 }, { type: "planches", i: 8, j: 3 },
      { type: "preau", i: 0, j: 6, w: 2, d: 2 },
      { type: "mare", i: 2, j: 7, w: 2, d: 2 },
      { type: "maison", i: 8, j: 6 }, { type: "maison", i: 6, j: 8 },
      { type: "fruitier", i: 5, j: 5 }, { type: "fruitier", i: 7, j: 5 }, { type: "fruitier", i: 5, j: 7 }, { type: "fruitier", i: 6, j: 6 },
      { type: "arbre", i: 3, j: 0 }, { type: "arbre", i: 0, j: 3 }, { type: "arbre", i: 8, j: 8 }, { type: "arbre", i: 0, j: 8 }
    ],
    personnages: [
      { i: 4, j: 1, c: "#C06848" }, { i: 2, j: 4, c: "#2C5234" }, { i: 4, j: 6, c: "#D9A03F" }, { i: 6, j: 4, c: "#5F7F52" }
    ]
  },

  /* 8 projets voisins fictifs en Nouvelle-Aquitaine.
     jauges : impact vérifié qualitatif de 0 à 4 (affiché en feuilles, jamais en chiffres) */
  projets: [
    { id: "darwin", nom: "Les Serres de Darwin", lieu: "Rive droite, Bordeaux", statut: "prouve", pos: { x: 330, y: 430 }, lat: 44.857, lng: -0.537,
      promesse: "Des serres abandonnées devenues pépinière urbaine et école du vivant.", collectif: "Association de 14 jardiniers et deux lycées agricoles",
      jauges: { ecologie: 4, social: 3, economie: 3 }, preset: "serres",
      solutions: [["planches", "prouve"], ["recup-eau", "prouve"], ["compost", "prouve"], ["mare", "encours"]] },
    { id: "moulin", nom: "Le Moulin des Possibles", lieu: "Vallée de la Charente", statut: "encours", pos: { x: 470, y: 300 }, lat: 45.696, lng: -0.329,
      promesse: "Un moulin qui refait tourner l'eau, le pain et les idées du village.", collectif: "Coopérative de 6 habitants et un meunier",
      jauges: { ecologie: 2, social: 2, economie: 1 }, preset: "moulin",
      solutions: [["four", "prouve"], ["solaire", "encours"], ["conseil", "encours"]] },
    { id: "boisjoli", nom: "La Ferme du Bois Joli", lieu: "Lisière des Landes", statut: "prouve", pos: { x: 290, y: 570 }, lat: 44.004, lng: -0.6,
      promesse: "Une ferme en agroforesterie qui nourrit trois villages et forme de jeunes paysans.", collectif: "Famille paysanne et 20 adhérents",
      jauges: { ecologie: 4, social: 2, economie: 4 }, preset: "ferme",
      solutions: [["haie", "prouve"], ["poulailler", "prouve"], ["planches", "prouve"], ["solaire", "prouve"]] },
    { id: "millemains", nom: "Le Jardin des Mille Mains", lieu: "Quartier des Aubiers, Limoges", statut: "encours", pos: { x: 730, y: 330 }, lat: 45.835, lng: 1.258,
      promesse: "Un jardin au pied des immeubles, cultivé par celles et ceux qui y habitent.", collectif: "Collectif d'habitants, centre social",
      jauges: { ecologie: 2, social: 3, economie: 1 }, preset: "jardin",
      solutions: [["planches", "prouve"], ["compost", "encours"], ["budget", "encours"]] },
    { id: "atelier-dordogne", nom: "L'Atelier de la Dordogne", lieu: "Bergerac", statut: "reve", pos: { x: 500, y: 490 }, lat: 44.851, lng: 0.482,
      promesse: "Un grand atelier partagé pour réparer, fabriquer et transmettre les gestes.", collectif: "Trois artisans et une association d'insertion",
      jauges: { ecologie: 0, social: 1, economie: 0 }, preset: "atelier",
      solutions: [["repair", "reve"], ["ressourcerie", "reve"]] },
    { id: "saintseve", nom: "Les Communs de Saint-Sève", lieu: "Entre-deux-Mers", statut: "reve", pos: { x: 420, y: 470 }, lat: 44.74, lng: -0.28,
      promesse: "Une ancienne école rendue aux habitants pour décider ensemble de l'avenir du bourg.", collectif: "Conseil citoyen de 11 personnes",
      jauges: { ecologie: 0, social: 1, economie: 0 }, preset: "ecole",
      solutions: [["conseil", "reve"], ["budget", "reve"], ["four", "reve"]] },
    { id: "semences", nom: "La Cour des Semences", lieu: "Marais poitevin", statut: "prouve", pos: { x: 290, y: 290 }, lat: 46.323, lng: -0.65,
      promesse: "Une grainothèque vivante qui garde les variétés du marais et les partage.", collectif: "Maison de quartier et réseau de 40 jardiniers",
      jauges: { ecologie: 3, social: 4, economie: 2 }, preset: "jardin",
      solutions: [["planches", "prouve"], ["mare", "prouve"], ["conseil", "prouve"]] },
    { id: "quai", nom: "Le Quai des Réparateurs", lieu: "Port de Pauillac", statut: "encours", pos: { x: 245, y: 370 }, lat: 45.198, lng: -0.746,
      promesse: "Un ancien hangar du port où l'on répare vélos, bateaux et objets du quotidien.", collectif: "Association de 9 bénévoles et un chantier d'insertion",
      jauges: { ecologie: 1, social: 2, economie: 2 }, preset: "atelier",
      solutions: [["repair", "prouve"], ["ressourcerie", "encours"], ["solaire", "reve"]] }
  ],

  /* Maquettes simplifiées des projets voisins */
  presets: {
    serres: [{ type: "serre", i: 0, j: 0, w: 3, d: 1 }, { type: "serre", i: 5, j: 0, w: 3, d: 1 }, { type: "planches", i: 1, j: 2 }, { type: "planches", i: 2, j: 2 }, { type: "planches", i: 6, j: 2 }, { type: "mare", i: 6, j: 6, w: 2, d: 2 }, { type: "arbre", i: 0, j: 7 }, { type: "arbre", i: 2, j: 6 }, { type: "fruitier", i: 7, j: 3 }],
    moulin: [{ type: "atelier", i: 0, j: 0, w: 2, d: 2 }, { type: "mare", i: 0, j: 5, w: 3, d: 2 }, { type: "maison", i: 6, j: 1 }, { type: "maison", i: 7, j: 2 }, { type: "arbre", i: 2, j: 2 }, { type: "arbre", i: 7, j: 7 }, { type: "fruitier", i: 6, j: 6 }],
    ferme: [{ type: "maison", i: 0, j: 0 }, { type: "maison", i: 1, j: 0 }, { type: "serre", i: 6, j: 0, w: 2, d: 1 }, { type: "fruitier", i: 0, j: 6 }, { type: "fruitier", i: 1, j: 7 }, { type: "fruitier", i: 2, j: 6 }, { type: "fruitier", i: 6, j: 6 }, { type: "fruitier", i: 7, j: 7 }, { type: "planches", i: 6, j: 2 }, { type: "planches", i: 7, j: 2 }, { type: "arbre", i: 3, j: 0 }],
    jardin: [{ type: "planches", i: 0, j: 0 }, { type: "planches", i: 1, j: 0 }, { type: "planches", i: 0, j: 1 }, { type: "planches", i: 5, j: 6 }, { type: "planches", i: 6, j: 6 }, { type: "maison", i: 7, j: 0 }, { type: "maison", i: 8, j: 1 }, { type: "arbre", i: 2, j: 7 }, { type: "fruitier", i: 6, j: 2 }],
    atelier: [{ type: "atelier", i: 0, j: 0, w: 3, d: 2 }, { type: "preau", i: 6, j: 0, w: 2, d: 2 }, { type: "arbre", i: 0, j: 6 }, { type: "arbre", i: 7, j: 7 }],
    ecole: [{ type: "maison", i: 0, j: 0 }, { type: "atelier", i: 5, j: 0, w: 3, d: 2 }, { type: "preau", i: 0, j: 6, w: 2, d: 2 }, { type: "arbre", i: 6, j: 6 }, { type: "arbre", i: 2, j: 2 }]
  },

  /* Retours d'expérience affichés à l'étape Nourrir */
  temoignage: {
    texte: "Au début on pensait qu'il fallait tout savoir avant de commencer. En fait, chaque preuve posée nous a donné envie d'aller plus loin, et les voisins sont venus d'eux-mêmes.",
    auteur: "Témoignage d'un collectif (exemple)"
  },

  /* Correspondances pour l'aperçu d'export (étape Nourrir) */
  exports: {
    odd: { titre: "Objectifs de développement durable (ODD)", intro: "Chaque preuve vérifiée est rattachée aux objectifs qu'elle sert.",
      parFamille: { eau: "ODD 6 Eau propre", sol: "ODD 15 Vie terrestre", energie: "ODD 7 Énergie propre", reemploi: "ODD 12 Consommation responsable", alimentation: "ODD 2 Faim zéro", gouvernance: "ODD 16 Institutions efficaces" } },
    csrd: { titre: "CSRD, normes ESRS", intro: "Pour les partenaires soumis au reporting de durabilité : preuves de terrain rattachées aux thèmes ESRS.",
      parFamille: { eau: "ESRS E3 Eau", sol: "ESRS E4 Biodiversité", energie: "ESRS E1 Climat", reemploi: "ESRS E5 Ressources", alimentation: "ESRS S3 Communautés", gouvernance: "ESRS G1 Conduite" } },
    pcaet: { titre: "Plan climat territorial (PCAET)", intro: "Contribution du lieu aux axes du plan climat de la collectivité.",
      parFamille: { eau: "Adaptation au changement climatique", sol: "Séquestration et biodiversité", energie: "Énergies renouvelables locales", reemploi: "Économie circulaire", alimentation: "Alimentation locale", gouvernance: "Mobilisation des habitants" } },
    rse: { titre: "Responsabilité sociétale (RSE)", intro: "Pour les entreprises partenaires qui soutiennent le lieu.",
      parFamille: { eau: "Environnement", sol: "Environnement", energie: "Environnement", reemploi: "Ancrage territorial", alimentation: "Ancrage territorial", gouvernance: "Dialogue avec les parties prenantes" } }
  },

  /* Deva : un seul visage, cinq modes. Réponses scriptées, jamais de chiffres d'impact. */
  deva: {
    modes: {
      accueil: {
        label: "Accueil",
        intro: "Bonjour, je suis Deva. Bienvenue sur EVAD. Ici, un monde régénératif désirable est déjà en train de pousser : chaque lieu sur la carte à droite a été rêvé, modélisé, puis prouvé sur le terrain. Du rêve à la preuve, et la preuve rouvre le rêve. Par quoi veux-tu commencer ?",
        actions: [
          { label: "Créer mon projet", href: "rever.html", primary: true },
          { label: "Visiter la carte", href: "#map" },
          { label: "Parcourir le Commun", href: "commun.html" }
        ],
        suggestions: [
          { q: "C'est quoi EVAD ?", a: "EVAD accompagne les collectifs qui font pousser des lieux régénératifs : rêver un lieu, le modéliser, agir, puis prouver ce qui a vraiment changé. Ce qui est vérifié nourrit le rêve des suivants." },
          { q: "Comment lire la carte ?", a: "Chaque marqueur est un lieu : gris s'il est rêvé, ambre s'il est en cours, vert s'il a fait ses preuves. Clique un lieu pour voir sa maquette et son impact vérifié." },
          { q: "C'est quoi le Commun ?", a: "Une bibliothèque libre de solutions éprouvées sur le terrain, reliées à leurs preuves. Vérifié bat généré, et tout le monde peut y puiser." },
          { q: "Faut-il un compte ?", a: "Non, tout est ouvert : explore la carte et le Commun, et lance ton propre lieu sans créer de compte. Ton projet est gardé sur cet appareil." }
        ]
      },
      commun: {
        label: "Le Commun",
        intro: "Voici le Commun : une bibliothèque libre de solutions éprouvées sur le terrain, reliées à leurs preuves. Cherche par mot ou par famille. Si tu as éprouvé quelque chose, propose-le.",
        actions: [
          { label: "Créer mon projet", href: "rever.html", primary: true },
          { label: "Retour à la carte", href: "index.html" }
        ],
        suggestions: [
          { q: "Comment choisir une solution ?", a: "Regarde sur combien de projets elle a déjà été éprouvée et quels ICI elle nourrit. Vérifié bat généré." },
          { q: "C'est quoi un ICI ?", a: "Un indicateur de changement d'impact : ce qu'on observe concrètement quand ça marche, comme le retour des vers de terre ou des voisins qui s'entraident." },
          { q: "Puis-je proposer une solution ?", a: "Oui, avec le bouton « Proposer une solution ». La communauté la reliera à ses preuves avant de l'ajouter au Commun." },
          { q: "Faut-il un compte ?", a: "Non, le Commun est libre d'accès. Tu peux tout consulter sans te connecter." }
        ]
      },
      monlieu: {
        label: "Mon lieu",
        intro: "Voici ton lieu au quotidien : ce qu'il y a à faire aujourd'hui, les preuves attendues, et ce qui a avancé cette semaine. Clique un espace de la maquette pour te concentrer dessus.",
        suggestions: [
          { q: "Que faire aujourd'hui ?", a: "Regarde le bloc Aujourd'hui : d'abord ce qui attend une preuve, puis les quêtes à lancer. Une seule à la fois, c'est déjà bien." },
          { q: "Comment lire l'élan de la semaine ?", a: "Par famille d'ICI, des repères qualitatifs : prévu, en cours, vérifié. Jamais un chiffre d'impact : ce sont tes preuves qui font avancer le lieu." },
          { q: "Pourquoi un espace est vide ?", a: "Aucune solution n'y est posée. Passe par Explorer pour en accrocher une, puis par Générer pour la poser sur la maquette." }
        ]
      },
      orientation: {
        label: "Orientation",
        intro: "Bonjour, je suis Deva. On commence par rêver ton lieu. Regarde les projets autour de toi, épingle ceux qui te parlent, puis donne un nom à ton projet.",
        suggestions: [
          { q: "Par où commencer ?", a: "Clique sur un projet vert de la carte : il a déjà fait ses preuves. Épingle-le s'il ressemble à ce que tu veux faire naître." },
          { q: "Comment écrire ma promesse ?", a: "Une phrase simple, qu'un voisin comprend du premier coup. Dis ce que le lieu change pour les gens, pas ce qu'il contient." },
          { q: "Et si je ne sais pas encore ?", a: "C'est normal. Le rêve se précise en chemin, tu pourras le reprendre à tout moment." },
          { q: "Qui peut voir mon projet ?", a: "Pour l'instant, toi seulement. Tu choisiras plus tard d'ouvrir l'accès au collectif ou au territoire." }
        ]
      },
      solutions: {
        label: "Solutions",
        intro: "Découpons ton lieu en espaces, comme tu les vois : nomme-les librement, donne-leur une nature, renomme ou supprime quand tu veux. Puis accroche à chacun des solutions du Commun : elles ont déjà été éprouvées ailleurs.",
        suggestions: [
          { q: "Que proposes-tu pour le jardin ?", a: "Pour un jardin sur une ancienne dalle, le Commun propose les planches en lasagnes, une haie fruitière et la récupération d'eau de pluie. À toi de choisir." },
          { q: "Comment choisir entre deux solutions ?", a: "Regarde sur combien de projets elles ont été éprouvées, et quels ICI elles nourrissent. Vérifié bat généré." },
          { q: "Je ne trouve pas ce que je cherche", a: "Alors le Commun ne l'a pas encore. Je préfère te le dire plutôt qu'inventer : tu peux proposer ta solution depuis la page Le Commun." },
          { q: "C'est quoi un ICI ?", a: "Un indicateur de changement d'impact : ce qu'on observe concrètement sur le lieu quand ça marche, comme le retour des vers de terre ou des voisins qui s'entraident." }
        ]
      },
      modelisation: {
        label: "Modélisation",
        intro: "Voici ton lieu en maquette, encore vierge. Dessine d'abord les blocs de chaque espace, case par case, puis glisse tes solutions dessus : elles apparaissent en gris, c'est ce qui est prévu. Certaines prennent plusieurs cases, les haies et les planches s'allongent à ta guise : la taille change le dessin, jamais l'impact. Le décor est libre et ne compte pas non plus.",
        suggestions: [
          { q: "Où poser les panneaux solaires ?", a: "Une case bien dégagée côté sud, loin des grands arbres, évite l'ombre de l'après-midi. Le bas de la maquette est le plus ensoleillé." },
          { q: "Pourquoi tout est gris ?", a: "Gris veut dire prévu. Ça passera en ambre quand le chantier démarre, et en vert seulement quand une preuve de terrain le confirme." },
          { q: "Les jauges bougent toutes seules ?", a: "Non. Elles ne bougent que quand tu poses une solution. Je ne calcule jamais d'impact à ta place." },
          { q: "Je peux changer d'avis ?", a: "Bien sûr. Clique un élément posé pour le retirer ou le marquer en cours." }
        ]
      },
      plan: {
        label: "Plan d'action",
        intro: "Chaque solution posée devient une quête. Je te propose un premier pas, tu décides si on y va.",
        suggestions: [
          { q: "Par quoi commencer ?", a: "Par la quête la plus simple et la plus visible : elle donne confiance au collectif et attire les voisins." },
          { q: "Comment passer une quête en vérifié ?", a: "Avec une preuve de terrain : une photo, une mesure, une date. C'est l'étape Nourrir." },
          { q: "Et si on bloque ?", a: "Regarde dans le Commun les projets qui ont déjà éprouvé cette solution : leurs retours sont souvent le meilleur déblocage." },
          { q: "Qui fait quoi ?", a: "Répartissez les quêtes en conseil de lieu. Je peux proposer, c'est le collectif qui décide." }
        ]
      },
      verification: {
        label: "Vérification",
        intro: "C'est le moment de prouver. Choisis un élément du lieu, ajoute une photo et une mesure : s'il est confirmé, il passe au vert.",
        suggestions: [
          { q: "Qu'est-ce qu'une bonne preuve ?", a: "Quelque chose qu'une autre personne peut vérifier : une photo datée, une mesure simple, un témoignage signé." },
          { q: "Pourquoi une date ?", a: "Pour suivre le changement dans le temps. Une preuve datée aide le territoire à reconnaître ce qui a vraiment bougé." },
          { q: "À quoi servent les exports ?", a: "À réutiliser tes preuves pour tes financeurs et partenaires, sans tout réécrire : ODD, CSRD, PCAET, RSE." },
          { q: "Que se passe-t-il ensuite ?", a: "Le projet prouvé passe au vert sur la carte et inspire d'autres collectifs. La preuve rouvre le rêve." }
        ]
      }
    },
    /* Empreinte carbone estimée d'une question posée à Deva (paramétrable).
       Deva répond localement, par règles, sans IA lourde ni serveur distant : empreinte volontairement faible.
       Repères publics : requête vers un grand modèle d'IA ~ 2 à 5 g CO₂e, mail court ~ 4 g. */
    carbone: {
      parQuestion: 0.05,
      unite: "g CO₂e",
      note: "Estimation. Deva répond localement, par règles, sans IA lourde : son empreinte reste minime. Une requête vers un grand modèle d'IA pèse environ 2 à 5 g CO₂e."
    },
    generiques: [
      "Merci, bonne question.",
      "Je t'entends, prenons ça pas à pas.",
      "Bien vu, c'est une vraie question de terrain.",
      "Merci de me le dire, je garde ça en tête pour ton projet."
    ],
    /* Règle prioritaire : Deva ne calcule jamais l'impact d'un lieu (CO₂, chiffres, résultats). */
    impactLieu: "Je ne calcule pas l'impact à ta place. Ce que ton lieu change se lit dans Vadance (prévu) et Vadité (vérifié), nourries par tes preuves à l'étape Nourrir.",
    /* Petit moteur conversationnel : Deva reconnaît des mots-clés et répond sans IA. */
    salutations: [
      "Bonjour ! Ravi de te voir. Tu veux explorer la carte, créer ton projet, ou que je t'explique EVAD ?",
      "Salut ! Je suis là pour t'aider. Dis-moi ce qui t'amène : découvrir un lieu, en créer un, ou comprendre comment ça marche ?"
    ],
    remerciements: [
      "Avec plaisir. Une autre question ?",
      "Quand tu veux. Je reste à côté pour la suite.",
      "De rien ! N'hésite pas si tu veux aller plus loin."
    ],
    adieux: [
      "À bientôt sur EVAD. Reviens quand tu veux faire pousser ton lieu.",
      "Prends soin de toi. La carte et le Commun restent ouverts à tous."
    ],
    acks: [
      "Très bien. Par quoi on continue : la carte, le Commun, ou ton projet ?",
      "D'accord. Dis-moi ce que tu cherches, je t'oriente."
    ],
    incompris: [
      "Je ne suis pas sûr d'avoir bien saisi. Je peux t'expliquer EVAD, t'aider à lire la carte, parcourir le Commun, ou lancer ton projet. Qu'est-ce qui t'intéresse ?",
      "Je suis un assistant encore jeune et je réponds par règles, pas toujours à tout. Essaie avec « c'est quoi EVAD ? », « comment lire la carte ? », « c'est quoi le Commun ? » ou « créer un projet ».",
      "Reformule-moi ça autrement ? Je connais surtout EVAD, la carte, le Commun, les preuves et le parcours Rêver → Nourrir."
    ],
    faq: [
      { q: "C'est quoi EVAD ?", k: ["c'est quoi evad", "quoi evad", "presente", "présente", "explique evad", "ca sert a quoi", "à quoi ça sert", "c'est quoi ce site", "principe"],
        a: "EVAD aide les collectifs à faire pousser des lieux régénératifs, du rêve à la preuve. On rêve un lieu sur la carte, on le modélise, on agit, puis on prouve sur le terrain ce qui a vraiment changé. Et ce qui est vérifié rouvre le rêve des suivants." },
      { q: "Comment lire la carte ?", k: ["lire la carte", "carte", "marqueur", "couleur", "gris", "ambre", "vert", "points sur la carte", "lieux"],
        a: "Chaque marqueur est un lieu : gris s'il est rêvé, ambre s'il est en cours, vert s'il a fait ses preuves. Clique un marqueur pour ouvrir sa fiche, sa maquette et son impact vérifié." },
      { q: "C'est quoi le Commun ?", k: ["commun", "bibliotheque", "bibliothèque", "solutions libres", "banque de solutions"],
        a: "Le Commun est une bibliothèque libre de solutions éprouvées sur le terrain, reliées à leurs preuves. C'est ouvert à tous, sans compte, et ici vérifié bat généré." },
      { q: "Qu'est-ce qu'une preuve ?", k: ["preuve", "prouver", "verifie", "vérifié", "vadite", "vadité", "terrain", "attester"],
        a: "Une preuve, c'est ce que tu apportes depuis le terrain à l'étape Nourrir : une photo, une mesure, une date. Quand c'est confirmé, l'élément passe au vert. C'est ça, la Vadité : l'impact vérifié, pas seulement prévu." },
      { q: "Vadance, Vadité, ICI : c'est quoi ?", k: ["vadance", "impact", "indicateur", "ici", "mesure impact", "jauge"],
        a: "La Vadance, c'est l'impact prévu ; la Vadité, l'impact vérifié. Les ICI (indicateurs de changement d'impact) décrivent ce qu'on observe concrètement : vie du sol, liens entre voisins, achats locaux… Je ne calcule jamais ces chiffres à ta place : ils viennent de tes actes validés." },
      { q: "Comment créer mon projet ?", k: ["creer", "créer", "lancer", "demarrer", "démarrer", "mon projet", "nouveau projet", "commencer", "se lancer"],
        a: "Pour lancer ton projet, clique « Créer mon projet » : tu entres dans le parcours à l'étape Rêver, où tu nommes ton lieu et t'inspires des projets voisins. Prêt ?" },
      { q: "Que fait-on à Rêver ?", k: ["rever", "rêver", "vision", "inspiration", "epingler", "épingler"],
        a: "Rêver, c'est la 1re étape : tu t'inspires des lieux sur la carte, tu situes ton lieu et tu poses les premiers mots de ta vision." },
      { q: "Que fait-on à Explorer ?", k: ["explorer", "espace", "espaces", "decouper", "découper"],
        a: "Explorer, c'est la 2e étape : tu découpes ton lieu en espaces (jardin, atelier, café…) et tu y accroches des solutions du Commun." },
      { q: "Que fait-on à Générer ?", k: ["generer", "générer", "maquette", "poser", "modeliser", "modéliser", "plan du lieu"],
        a: "Générer, c'est la 3e étape : tu poses tes solutions sur la maquette 2.5D du lieu. Tout ce que tu poses est d'abord prévu, en gris." },
      { q: "Que fait-on à Entreprendre ?", k: ["entreprendre", "quete", "quête", "action", "kanban", "a faire", "à faire"],
        a: "Entreprendre, c'est la 4e étape : chaque solution posée devient une quête, que vous faites avancer ensemble, de « à faire » à « vérifié »." },
      { q: "Que fait-on à Nourrir ?", k: ["nourrir", "photo", "journal", "export", "rapport"],
        a: "Nourrir, c'est la 5e étape : tu apportes les preuves de terrain. Chaque preuve fait verdir le lieu, et tu peux en tirer des aperçus pour tes partenaires (ODD, CSRD, PCAET, RSE)." },
      { q: "Faut-il un compte ?", k: ["compte", "connecter", "connexion", "inscription", "s'inscrire", "login", "identifiant"],
        a: "Pas besoin de compte en bêta : tout est ouvert. Clique « Créer mon projet » pour lancer ton lieu tout de suite ; il est gardé sur cet appareil." },
      { q: "Qui es-tu, Deva ?", k: ["qui es-tu", "qui es tu", "tu es quoi", "c'est quoi deva", "qui est deva", "robot", "ia", "intelligence artificielle", "ecologique", "ia ecologique", "ecolo", "verte", "sobre"],
        a: "Je suis Deva, ton assistant sur EVAD, et une IA écologique : je réponds en local, par règles, sans grand modèle d'IA, donc mon empreinte reste minime (~0,05 g CO₂e par question, contre 2 à 5 g pour un gros modèle). Je te guide, je propose, c'est toujours toi qui décides, et je ne m'invente jamais de chiffres d'impact." },
      { id: "empreinte", q: "Quelle est ton empreinte, Deva ?",
        k: ["ton empreinte", "empreinte de deva", "empreinte de la conversation", "empreinte de nos echanges", "nos echanges", "tu pollues", "tu consommes", "ton co2", "deva pollue", "sobriete de deva"],
        a: "Bonne question : nos échanges ont une empreinte, affichée en bas de ce panneau. Comme je réponds localement, par règles, elle reste minime, loin d'une requête vers un gros modèle d'IA." },
      { q: "C'est quoi le parcours REGEN ?", k: ["regen", "etapes", "étapes", "parcours", "comment ca marche", "comment ça marche"],
        a: "Le parcours REGEN a 5 étapes : Rêver, Explorer, Générer, Entreprendre, Nourrir. On part du rêve, on modélise, on agit, puis on prouve. Et la preuve rouvre le rêve." },
      { q: "C'est gratuit ?", k: ["gratuit", "prix", "cout", "coût", "payant", "tarif"],
        a: "La carte et le Commun sont en accès libre. EVAD est un commun : l'idée n'est pas de vendre, mais de relier des lieux et des preuves." },
      { q: "Comment participer ?", k: ["participer", "contribuer", "contributeur", "financer", "financeur", "aider un lieu", "rejoindre", "benevole", "bénévole", "porteur de projet"],
        a: "Trois façons d'être dans EVAD : porteur de projet (tu fais naître un lieu), contributeur (tu donnes du temps ou des preuves à un lieu existant), financeur (tu soutiens un lieu prouvé). La bêta couvre surtout le porteur : visite la carte, repère un lieu qui te parle, et contacte son collectif." },
      { q: "Y a-t-il des lieux près de chez moi ?", k: ["pres de chez moi", "près de chez moi", "autour de moi", "a cote de chez", "dans ma ville", "ma region", "ma région", "proche de moi", "pas loin"],
        a: "Sur la carte, « Autour de moi » te géolocalise avec ton accord (rien n'est enregistré) et garde les lieux à moins de 80 km ; sans géolocalisation, il prend la position de ton lieu si tu l'as situé à l'étape Rêver. Sur Rêver, « Des lieux à visiter » te propose aussi les plus proches." },
      { q: "Comment publier mon lieu sur la carte ?", k: ["publier", "publication", "carte publique", "visible par", "afficher mon lieu", "apparaitre sur la carte", "apparaître sur la carte", "rendre public"],
        a: "Ton lieu apparaît sur la carte publique quand tu coches « Afficher mon lieu » à l'étape Rêver, qu'il est nommé et situé. Tant que la carte publique n'est pas active, un bandeau te le dit : rien n'est publié à ton insu." },
      { q: "Que deviennent mes données ?", k: ["donnees", "données", "vie privee", "vie privée", "rgpd", "confidentiel", "qui voit", "stocke", "stockage", "cookies", "traceur"],
        a: "En bêta, ton projet est gardé sur ton appareil, et en ligne si tu as un compte, protégé par ce compte. La carte publique ne montre que le nom, la commune, la promesse et l'avancement, jamais tes preuves détaillées. Pas de traceur publicitaire." },
      { q: "Puis-je modifier ou recommencer ?", k: ["modifier", "changer", "supprimer", "effacer", "recommencer", "repartir", "remettre a zero", "remettre à zéro", "renommer", "corriger"],
        a: "Tout se modifie à tout moment : le nom et la promesse à Rêver, les espaces à Explorer, la maquette à Générer. Pour repartir de zéro, vide les données du site dans ton navigateur : ton projet vit sur cet appareil." },
      { q: "Combien de temps ça prend ?", k: ["combien de temps", "duree", "durée", "longtemps", "rapide", "en combien de temps", "ca prend"],
        a: "Rêver et Explorer se font en quelques minutes. Générer, le temps de poser tes solutions. Entreprendre et Nourrir suivent le rythme du terrain : des semaines ou des mois, au fil des preuves." },
      { q: "Avez-vous des exemples ?", k: ["exemple", "exemples", "lieux prouves", "lieux prouvés", "qui a reussi", "qui a réussi", "cas concret", "temoignage", "témoignage"],
        a: "Les huit lieux marqués « Exemple » sur la carte sont fictifs mais réalistes : clique-en un pour voir sa fiche, sa maquette et les solutions posées. Les lieux verts ont fait leurs preuves." },
      { q: "C'est quoi la visite 3D ?", k: ["luanti", "3d", "visite virtuelle", "se promener", "minetest", "jeu video", "jeu vidéo"],
        a: "Visiter ta maquette en 3D dans Luanti arrive bientôt : un monde libre où te promener dans ton lieu avant le premier coup de pioche, pour le montrer aux voisins et aux partenaires." },
      { q: "Ça marche sur téléphone ?", k: ["mobile", "telephone", "téléphone", "smartphone", "hors ligne", "sans reseau", "sans réseau", "tablette", "application", "appli"],
        a: "EVAD marche sur téléphone et tablette, dans le navigateur, sans installation. Sans réseau, la carte retombe sur une version simplifiée et ton projet reste consultable : il est gardé sur l'appareil." },
      { q: "Quelque chose ne marche pas", k: ["bug", "beug", "marche pas", "fonctionne pas", "probleme", "problème", "erreur", "bloque", "bloqué", "plante", "page blanche", "page vide"],
        a: "Désolé pour l'accroc. Recharge la page d'abord. Si la carte est vide, regarde le bandeau en haut : la base en ligne est peut-être indisponible. Et dis-nous ce qui coince avec « Donner un retour », en bas du panneau." },
      { q: "Qui fait EVAD ?", k: ["qui fait evad", "equipe", "équipe", "contact", "contacter", "association", "qui est derriere", "qui est derrière", "ecrire a", "écrire à"],
        a: "EVAD est porté par l'association EVAD Connect. Pour nous écrire : « Donner un retour », en bas du panneau, ou contact@evad.org." },
      { q: "Carte, Commun, Mon lieu : quelle différence ?", k: ["difference", "différence", "a quoi sert mon lieu", "tableau de bord", "mon lieu c est quoi", "page mon lieu"],
        a: "La carte montre tous les lieux. Le Commun rassemble les solutions éprouvées. Mon lieu est ton tableau de bord quotidien : ce qu'il y a à faire, les preuves attendues, l'élan de la semaine." },
      { q: "Tu peux m'aider ?", k: ["aide", "help", "comment faire", "perdu", "sais pas"],
        a: "Je peux t'expliquer EVAD, t'aider à lire la carte, à parcourir le Commun, ou te lancer dans la création de ton projet. Par quoi veux-tu commencer ?" }
    ],
    reactions: {
      "nom": "Joli nom. Ton projet existe déjà un peu plus. Quand tu es prêt, passe à Explorer.",
      "pin": "Épinglé. Tu pourras t'appuyer sur ses preuves quand tu choisiras tes solutions.",
      "unpin": "Retiré de tes inspirations.",
      "espace": "Nouvel espace ajouté. Clique-le pour y accrocher des solutions.",
      "add": "Ajouté à ton projet. Tu la retrouveras dans la barre de l'étape Générer.",
      "add:haie": "Bon choix, la haie fruitière est l'une des solutions les plus éprouvées du Commun.",
      "add:solaire": "Les panneaux citoyens demandent du temps et un collectif. Ils se prévoient tôt, c'est bien de les poser dès maintenant.",
      "place": "Posé en gris : c'est prévu. Clique dessus quand le chantier démarre.",
      "place:haie": "Ta haie protégerait le jardin du vent d'ouest, essaie le bord nord.",
      "place:solaire": "Côté sud et bien dégagé, les panneaux seront à l'aise. Évite l'ombre des grands arbres.",
      "place:recup-eau": "Près d'un toit, c'est idéal : la gouttière de l'atelier ou de la serre peut la remplir.",
      "place:mare": "Une mare près du verger attirera les insectes pollinisateurs.",
      "place:compost": "Près du jardin et du café, le compost sera sur le chemin de tout le monde.",
      "place:four": "Près du préau, le four pourra accueillir les fournées partagées même quand il pleut.",
      "encours": "En ambre : le chantier a démarré. Il passera au vert avec une preuve de terrain.",
      "retire": "Retiré de la maquette. Tu peux le reposer quand tu veux.",
      "quest-start": "C'est parti. Quand ce sera fait, apporte une preuve à l'étape Nourrir.",
      "quest-proof": "Pour passer en vérifié, il me faut une preuve de terrain. Je t'emmène à l'étape Nourrir ?",
      "proof": "Preuve reçue et reliée à ton lieu. Regarde : il passe au vert.",
      "proof3": "Trois preuves posées : ton lieu passe au vert sur la carte. Il peut maintenant inspirer d'autres collectifs.",
      "export": "Voici un aperçu construit uniquement à partir de tes preuves vérifiées. Rien n'est inventé."
    }
  }
};
