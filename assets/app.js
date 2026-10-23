/* EVAD bêta : état du projet (synchronisé avec Supabase), navigation et logique des écrans. */
(function () {
  "use strict";
  var D = window.EVAD_DATA;
  var KEY_PREFIX = "evad-beta-v2-";
  var SOL = {}; D.solutions.forEach(function (s) { SOL[s.id] = s; });
  var ICI = {}; D.ici.forEach(function (x) { ICI[x.id] = x; });
  var FAM = {}; D.familles.forEach(function (f) { FAM[f.id] = f; });
  var STATUS_LABEL = { prevu: "prévu", encours: "en cours", verifie: "vérifié" };
  var DATA_KEYS = ["pinned", "spaces", "selectedSpace", "chosen", "icis", "placed", "proofs"];

  var user = null;          // compte Supabase connecté
  var publicPlaces = [];    // lieux publics des autres testeurs
  var syncStatus = "idle";  // idle | saving | saved | error

  /* ================= État ================= */
  function defaultState() {
    return {
      v: 2,
      projectId: null,
      localUpdatedAt: 0,
      prenom: "",
      interestFam: "",
      project: { name: "", promesse: "", reve: "", collectif: "", lieu: "", loc: null, public: true },
      pinned: [],
      spaces: [],          // le porteur crée ses espaces à l'étape Explorer ; Deva en propose, il décide
      selectedSpace: null,
      chosen: [],
      icis: [],
      placed: [],
      decor: [],           // décor libre posé sur la maquette (sans impact)
      proofs: [],
      proposals: []
    };
  }
  var state = defaultState();
  function cacheKey() { return KEY_PREFIX + (user ? user.id : "invite"); }
  function loadCache() {
    try {
      var raw = localStorage.getItem(cacheKey());
      if (raw) { var s = JSON.parse(raw); if (s && s.v === 2) return Object.assign(defaultState(), s); }
    } catch (e) { /* stockage indisponible */ }
    return null;
  }
  function writeCache() { try { localStorage.setItem(cacheKey(), JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function save() { state.localUpdatedAt = Date.now(); writeCache(); scheduleSync(); }
  function uid(p) { return (p || "x") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // Projet <-> ligne Supabase
  function toRow() {
    var p = state.project, data = {};
    DATA_KEYS.forEach(function (k) { data[k] = state[k]; });
    return { nom: p.name.trim(), promesse: p.promesse.trim(), reve: p.reve.trim(), collectif: p.collectif.trim(), lieu: p.lieu.trim(),
      lat: p.loc ? p.loc.lat : null, lng: p.loc ? p.loc.lng : null, public: p.public !== false, statut: projectStatut(), data: data };
  }
  function fromRow(r) {
    var s = defaultState(), d = r.data || {};
    s.projectId = r.id;
    s.localUpdatedAt = Date.parse(r.updated_at) || 0;
    s.project = { name: r.nom || "", promesse: r.promesse || "", reve: r.reve || "", collectif: r.collectif || "", lieu: r.lieu || "",
      loc: (r.lat != null && r.lng != null) ? { lat: r.lat, lng: r.lng } : null, public: r.public !== false };
    DATA_KEYS.forEach(function (k) { if (d[k] !== undefined) s[k] = d[k]; });
    return s;
  }

  // Sauvegarde en ligne, différée pour regrouper les frappes.
  var syncTimer = null;
  function scheduleSync() {
    if (!user || !window.EvadDB) return;
    clearTimeout(syncTimer); setSync("saving");
    syncTimer = setTimeout(syncNow, 600);
  }
  function syncNow() {
    syncTimer = null;
    return EvadDB.saveProject(state.projectId, toRow()).then(function (id) {
      if (!state.projectId) { state.projectId = id; writeCache(); }
      setSync("saved");
    }).catch(function (e) { console.warn("[EVAD] sauvegarde :", e.message); setSync("error"); });
  }
  function setSync(s) {
    syncStatus = s;
    var el = $(".snav-sync"); if (!el) return;
    el.dataset.state = s;
    el.textContent = { saving: "Enregistrement…", saved: "Enregistré en ligne", error: "Hors ligne : gardé sur cet appareil", idle: "" }[s] || "";
  }

  // Repli explicite : si la vue regen_carte est absente (ou sans connexion), la carte n'affiche
  // que les lieux d'exemple. On le dit, pour ne jamais laisser croire qu'un lieu est publié.
  function carteEnModeExemple() {
    return !(window.EvadDB && EvadDB.ready() && EvadDB.carteStatus && EvadDB.carteStatus() === "ok");
  }
  function renderMapNotice() {
    var host = $(".map-stage") || $(".map-card"); if (!host) return;
    var old = host.querySelector(".map-notice");
    if (!carteEnModeExemple()) { if (old) old.remove(); return; }
    if (old) return;
    var n = document.createElement("p");
    n.className = "map-notice"; n.setAttribute("role", "status");
    n.textContent = "Carte en mode exemple : les lieux publics ne sont pas encore chargés.";
    host.appendChild(n);
  }

  function projectName() { return state.project.name.trim() || "Mon lieu"; }
  function verifiedCount() { return state.proofs.length; }
  function projectStatut() {
    if (verifiedCount() >= 3) return "prouve";
    if (verifiedCount() > 0 || state.placed.some(function (p) { return p.status !== "prevu"; })) return "encours";
    return "reve";
  }
  var fricheStatut = projectStatut;
  function spaceName(id) { if (!id) return "aucun espace"; var s = state.spaces.find(function (x) { return x.id === id; }); return s ? s.nom : "Lieu"; }
  function stepDone(id) {
    if (id === "rever") return !!state.project.name.trim();
    if (id === "explorer") return state.chosen.length > 0;
    if (id === "generer") return state.placed.length > 0;
    if (id === "entreprendre") return state.placed.some(function (p) { return p.status !== "prevu"; });
    if (id === "nourrir") return verifiedCount() >= 3;
    return false;
  }

  /* ================= Utilitaires ================= */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function param(name) { var m = new RegExp("[?&]" + name + "=([^&]+)").exec(location.search); return m ? decodeURIComponent(m[1]) : null; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function frDate(iso) { try { return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return iso; } }

  var LEAF_PATH = '<path d="M3 17C3 8.5 8.5 3 17 3c0 8.5-5.5 14-14 14z"/><path class="vein" d="M4.5 15.5C7.5 12 10.5 9 14 6.5"/>';
  function leafSvg(cls) { return '<svg class="leaf ' + (cls || "") + '" viewBox="0 0 20 20" aria-hidden="true" focusable="false">' + LEAF_PATH + "</svg>"; }
  var ICON = {
    close: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M16 10H5M9 6l-4 4 4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pin: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 18s-5.5-5.2-5.5-9.2a5.5 5.5 0 0 1 11 0C15.5 12.8 10 18 10 18z" fill="currentColor"/><circle cx="10" cy="8.6" r="2" fill="#FFFDF7"/></svg>',
    photo: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="12.5" r="3.4" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M8.5 6l1.5-2h4l1.5 2" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
    search: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M13 13l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    commun: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 5.5C8.5 4 6.5 3.7 4 4v10c2.5-.3 4.5 0 6 1.5 1.5-1.5 3.5-1.8 6-1.5V4c-2.5-.3-4.5 0-6 1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 5.5v10" stroke="currentColor" stroke-width="1.6"/></svg>'
  };
  var BRAND_LEAF = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M5 27C5 13 13 5 27 5c0 14-8 22-22 22z" fill="#5F7F52"/><path d="M7 25C12 19 17 14 23 9.5" stroke="#FAF6EA" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M13 19.5l-1-5M17.5 15l-.5-4.5M13 19.5l5 .5M17.5 15l4.5.2" stroke="#FAF6EA" stroke-width="1.4" stroke-linecap="round"/></svg>';

  var LEVEL_WORDS = ["à semer", "qui germe", "qui pousse", "qui s'étoffe", "foisonnante", "foisonnante"];
  function levelFrom(sum) { return Math.min(5, Math.ceil(sum / 2)); }
  function familySums(filter) {
    var r = { ecologie: 0, social: 0, economie: 0 };
    state.placed.forEach(function (p) {
      if (filter && !filter(p)) return;
      var e = SOL[p.solId].effets; for (var k in r) r[k] += e[k] || 0;
    });
    return r;
  }

  function toast(msg) {
    var t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  function openModal(title, body, actions) {
    var dlg = $("#modal");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "modal"; dlg.className = "modal"; dlg.setAttribute("aria-labelledby", "modal-title"); document.body.appendChild(dlg); }
    dlg.innerHTML = '<div class="modal-inner"><div class="modal-head"><h2 id="modal-title">' + esc(title) + '</h2>' +
      '<button type="button" class="icon-btn" data-close aria-label="Fermer">' + ICON.close + '</button></div>' +
      '<div class="modal-body">' + body + '</div>' +
      (actions ? '<div class="modal-actions">' + actions + '</div>' : "") + "</div>";
    $all("[data-close]", dlg).forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    return dlg;
  }

  /* ================= Barre du haut et pied de page ================= */
  var BRAND = '<a class="brand" href="index.html?intro=1" aria-label="EVAD, revenir à l\'accueil de Deva"><img class="brand-logo" src="assets/logo-evad.svg" alt="EVAD" width="92" height="30"></a>';

  // Icônes du menu (traits, couleur courante) : lisibles seules quand la place manque.
  var NAV_ICON = {
    carte: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3 5.5l4.5-2 5 2 4.5-2v11l-4.5 2-5-2-4.5 2zM7.5 3.5v11M12.5 5.5v11" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/></svg>',
    commun: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 6c-1.4-1.6-3.6-2-6.5-2v11c2.9 0 5.1.4 6.5 2 1.4-1.6 3.6-2 6.5-2V4c-2.9 0-5.1.4-6.5 2zM10 6v11" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/></svg>',
    projet: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 16C4 8.5 8.5 4 16 4c0 7.5-4.5 12-12 12z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M5.5 14.5C8 11.5 10.5 9 13.5 6.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>'
  };
  var devaUnread = false; // Deva a parlé pendant que son panneau était replié

  // Parcours REGEN en version compacte pour la pilule : cinq points reliés + l'étape courante nommée.
  function miniStepper(page) {
    var cur = D.steps.find(function (s) { return s.id === page; });
    var dots = D.steps.map(function (s, n) {
      var active = s.id === page, done = stepDone(s.id);
      var cls = active ? "is-active" : done ? "is-done" : "is-todo";
      var etat = active ? "étape en cours" : done ? "faite" : "à venir";
      return '<a class="mstep ' + cls + '" href="' + s.href + '"' + (active ? ' aria-current="step"' : "") + ' title="' + s.label + '" aria-label="Étape ' + (n + 1) + ", " + s.label + ", " + etat + '"></a>';
    }).join("");
    var label = cur ? (D.steps.indexOf(cur) + 1) + ' · ' + cur.label : "Parcours";
    return '<nav class="top-stepper" aria-label="Parcours REGEN"><span class="mstep-track">' + dots + '</span>' +
      '<a class="mstep-label" href="' + (cur ? cur.href : "rever.html") + '">' + label + "</a></nav>";
  }

  function renderTopbar(page) {
    var top = $("#topbar"); if (!top) return;
    var isStep = D.steps.some(function (s) { return s.id === page; });
    var isWorkspace = isStep || page === "monlieu";
    var link = function (href, key, label, cur, extra) {
      return '<a class="toplink' + (cur ? " is-current" : "") + (extra ? " " + extra : "") + '" href="' + href + '"' + (cur ? ' aria-current="page"' : "") + ' aria-label="' + label + '">' +
        NAV_ICON[key] + '<span class="toplink-lbl">' + label + "</span></a>";
    };
    // Menu centré : Carte, Commun, puis le projet (bouton pour commencer, stepper compact une fois dedans).
    var projet = isWorkspace ? miniStepper(page) :
      '<a class="btn btn-primary btn-sm toplink-cta" href="rever.html" aria-label="Créer un projet">' + NAV_ICON.projet + '<span class="lbl-long">Créer un projet</span><span class="lbl-short">Projet</span></a>';
    var nav = '<nav class="topnav" aria-label="Aller à">' +
      link("index.html", "carte", "Carte", page === "index") +
      link("commun.html", "commun", "Commun", page === "commun") +
      projet + "</nav>";
    // Mon lieu (dès qu'il a un nom) à droite, le raccourci vers Deva à côté du logo.
    var st = fricheStatut(), hasLieu = !!state.project.name.trim();
    var lieu = hasLieu ? '<a class="project-pill' + (page === "monlieu" ? " is-current" : "") + '" href="mon-lieu.html" title="Ouvrir mon lieu"' + (page === "monlieu" ? ' aria-current="page"' : "") + '>' +
      '<span class="pill-dot st-' + st + '" aria-hidden="true"></span><span class="pill-name">' + esc(projectName()) + '</span><span class="sr-only">, ' + D.statuts[st].label + "</span></a>" : "";
    var open = !!(window.Deva && Deva.isOpen && Deva.isOpen());
    var deva = document.getElementById("deva") ?
      '<button type="button" class="top-deva' + (devaUnread && !open ? " has-new" : "") + '" aria-pressed="' + open + '" aria-label="' + (open ? "Replier le panneau de Deva" : "Ouvrir le panneau de Deva") + '">' +
      '<img class="deva-face" src="assets/deva-avatar.png" alt="" aria-hidden="true"><span class="top-deva-badge" aria-hidden="true"></span></button>' : "";
    top.className = "topbar topbar-slim";
    // À gauche le logo EVAD (retour à l'accueil) puis Deva ; à droite, mon lieu.
    top.innerHTML = '<div class="top-left">' + BRAND + deva + "</div>" + nav + '<div class="top-right">' + lieu + "</div>";
    var tb = top.querySelector(".top-deva");
    if (tb) tb.addEventListener("click", function () { if (window.Deva && Deva.toggle) Deva.toggle(); });
  }
  // Le bouton Deva de la pilule suit l'état du panneau (ouvert, replié, message en attente).
  document.addEventListener("deva:state", function (e) {
    var open = !!(e.detail && e.detail.open);
    if (open) devaUnread = false;
    var b = document.querySelector(".top-deva"); if (!b) return;
    b.setAttribute("aria-pressed", String(open));
    b.setAttribute("aria-label", open ? "Replier le panneau de Deva" : "Ouvrir le panneau de Deva");
    b.classList.toggle("has-new", devaUnread && !open);
  });
  document.addEventListener("deva:unread", function () {
    devaUnread = true;
    var b = document.querySelector(".top-deva"); if (b) b.classList.add("has-new");
  });

  function renderFooter() {
    var page = document.body.dataset.page;
    var hasTour = page === "index" || page === "commun" || page === "rever";
    var html = "<p>EVAD bêta" + (window.EvadDB && EvadDB.env !== "prod" ? " (base de test)" : "") +
      ". Ton projet est gardé sur cet appareil ; la carte et le Commun sont ouverts à tous.</p>" +
      '<span class="footer-actions">' +
      (hasTour ? '<button type="button" class="link-btn" id="replay-tour">Revoir la visite</button>' : "") +
      '<a class="link-btn" href="mailto:contact@evad.org?subject=Retour%20b%C3%AAta%20EVAD">Donner un retour</a>' +
      "</span>";
    // Le bandeau se loge sous le panneau de Deva (sidebar) ; sinon, barre du bas classique.
    var target, inner = document.querySelector("#deva .deva-inner");
    if (inner) {
      var box = inner.querySelector(".deva-footer");
      if (!box) { box = document.createElement("div"); box.className = "footer deva-footer"; inner.appendChild(box); }
      box.innerHTML = html; target = box;
      var bottom = $("#footer"); if (bottom) { bottom.innerHTML = ""; bottom.className = ""; }
    } else {
      target = $("#footer"); if (!target) return; target.className = "footer"; target.innerHTML = html;
    }
    var rt = target.querySelector("#replay-tour");
    if (rt) rt.addEventListener("click", function () { var t = pageTour || TOURS[page]; if (t) startTour(t); });
  }
  function refreshChrome() { renderTopbar(document.body.dataset.page); }

  /* ================= Projets et maquettes ================= */
  // Terrain vierge : le lieu de chaque testeur part d'une parcelle vide à aménager.
  var BLANK_SCENE = { grille: 9, chemin: null, structures: [], personnages: [] };
  function jaugesFromPlaced(placed) {
    var r = { ecologie: 0, social: 0, economie: 0 };
    (placed || []).forEach(function (p) {
      var e = p.status === "verifie" && SOL[p.solId] && SOL[p.solId].effets; if (!e) return;
      for (var k in r) r[k] += e[k] || 0;
    });
    return { ecologie: Math.min(4, Math.round(r.ecologie / 1.5)), social: Math.min(4, Math.round(r.social / 1.5)), economie: Math.min(4, Math.round(r.economie / 1.5)) };
  }
  function myProject() {
    var p = state.project;
    return { id: "mine", isMine: true, nom: projectName(), lieu: p.lieu.trim() || "Lieu à préciser", statut: projectStatut(),
      promesse: p.promesse.trim() || "Promesse à écrire à l'étape Rêver.", collectif: p.collectif.trim() || "Collectif à présenter à l'étape Rêver.",
      jauges: jaugesFromPlaced(state.placed) };
  }
  function allProjects() {
    var list = [];
    if (state.project.loc) list.push(myProject());
    publicPlaces.forEach(function (r) {
      if (r.id === state.projectId) return;
      list.push({ id: "p:" + r.id, isPublic: true, nom: r.nom, lieu: r.lieu || "", statut: r.statut || "reve", lat: r.lat, lng: r.lng,
        promesse: r.promesse || "", collectif: r.collectif || "", placedRemote: r.placed || [], jauges: jaugesFromPlaced(r.placed) });
    });
    D.projets.forEach(function (p) { list.push(Object.assign({ isExample: true }, p)); });
    return list;
  }
  function freeCells(structures, n, path) {
    var occ = {};
    structures.forEach(function (s) { for (var a = 0; a < (s.w || 1); a++) for (var b = 0; b < (s.d || 1); b++) occ[(s.i + a) + "," + (s.j + b)] = 1; });
    var out = [];
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) if (!occ[i + "," + j] && i !== path && j !== path) out.push({ i: i, j: j });
    out.sort(function (a, b) { return (Math.abs(a.i - 4.5) + Math.abs(a.j - 4.5)) - (Math.abs(b.i - 4.5) + Math.abs(b.j - 4.5)); });
    return out;
  }
  // Un « lieu » pour renderScene : données pures (espaces, solutions posées, vitalité, décor).
  function myLieu() {
    return Object.assign({}, BLANK_SCENE, { nom: projectName(), spaces: state.spaces, placed: state.placed, decor: state.decor || [], solutions: SOL, vitalite: verifiedCount() / 3 });
  }
  function lieuFor(project) {
    if (project.isMine) return myLieu();
    if (project.isPublic) {
      return Object.assign({}, BLANK_SCENE, { nom: project.nom, spaces: [], placed: project.placedRemote, solutions: SOL, vitalite: { reve: 0, encours: 0.4, prouve: 1 }[project.statut] });
    }
    var structures = D.presets[project.preset] || [];
    var cells = freeCells(structures, 9, 4);
    var map = { reve: "prevu", encours: "encours", prouve: "verifie" };
    var placedEx = (project.solutions || []).map(function (s, k) { var c = cells[k * 3 % cells.length]; return { uid: project.id + k, solId: s[0], status: map[s[1]], i: c.i, j: c.j }; });
    return { nom: project.nom, grille: 9, chemin: 4, structures: structures, placed: placedEx, solutions: SOL, personnages: [{ i: 4, j: 2, c: "#C06848" }, { i: 6, j: 4, c: "#2C5234" }],
      vitalite: { reve: 0, encours: 0.4, prouve: 1 }[project.statut] };
  }

  function jaugesHtml(j) {
    return '<div class="jauges">' + D.iciFamilles.map(function (f) {
      var lv = j[f.id] || 0, leaves = "";
      for (var k = 0; k < 4; k++) leaves += leafSvg(k < lv ? "on-green" : "off");
      var words = ["pas encore vérifié", "premiers signes", "vérifié", "bien vérifié", "largement vérifié"];
      return '<div class="jauge"><span class="jauge-lbl">' + f.label + '</span><span class="leaves" role="img" aria-label="' + f.label + " : " + words[lv] + '">' + leaves + '</span><span class="jauge-word">' + words[lv] + "</span></div>";
    }).join("") + "</div>";
  }
  function statutBadge(st) { return '<span class="badge st-' + st + '">' + D.statuts[st].label + "</span>"; }

  /* ================= Carte vivante ================= */
  var MAP_DECOR =
    '<rect width="1000" height="700" fill="#FAF6EA"/>' +
    '<path d="M0 0H190C172 110 196 220 180 330 166 440 160 540 150 700H0Z" fill="#DCEAE2"/>' +
    '<g stroke="#C4DBD0" stroke-width="2" fill="none" stroke-linecap="round"><path d="M40 140q14-8 28 0t28 0"/><path d="M70 300q14-8 28 0t28 0"/><path d="M30 470q14-8 28 0t28 0"/><path d="M80 610q14-8 28 0t28 0"/></g>' +
    '<text x="70" y="400" transform="rotate(-80 70 400)" class="map-label map-sea">Océan Atlantique</text>' +
    '<path d="M190 40C330 12 560 30 720 58 860 86 955 180 945 320 935 460 880 600 740 662 580 700 380 690 220 672 172 600 160 480 175 360 188 240 168 120 190 40Z" fill="#EEF0D8"/>' +
    '<g fill="#E3E7C6"><ellipse cx="820" cy="250" rx="110" ry="70"/><ellipse cx="860" cy="430" rx="80" ry="95"/><ellipse cx="700" cy="160" rx="90" ry="45"/></g>' +
    '<g fill="#D3E2B8"><ellipse cx="290" cy="560" rx="95" ry="85"/><ellipse cx="360" cy="630" rx="70" ry="40"/><ellipse cx="240" cy="470" rx="45" ry="60"/><ellipse cx="640" cy="560" rx="70" ry="45"/><ellipse cx="520" cy="130" rx="60" ry="35"/></g>' +
    '<g fill="#BFD6A0">' + (function () { var s = ""; for (var k = 0; k < 46; k++) { var a = Math.sin(k * 12.9) * 43758.5; a -= Math.floor(a); var b = Math.sin(k * 78.2) * 12345.6; b -= Math.floor(b); s += '<circle cx="' + (215 + a * 170).toFixed(0) + '" cy="' + (485 + b * 150).toFixed(0) + '" r="' + (6 + (k % 4) * 2) + '"/>'; } return s; })() + "</g>" +
    '<g fill="none" stroke="#A9CCCB" stroke-linecap="round"><path d="M735 690C650 620 560 560 470 522 400 492 330 462 282 422 245 392 214 370 186 342" stroke-width="7"/>' +
    '<path d="M905 360C820 382 742 400 650 406 560 412 470 440 330 440" stroke-width="5"/><path d="M650 406C640 380 620 350 600 330" stroke-width="3"/>' +
    '<path d="M640 168C560 196 470 230 400 242 330 252 260 262 188 250" stroke-width="4"/></g>' +
    '<g fill="none" stroke="#D8C9A2" stroke-width="2.4" stroke-dasharray="2 7" stroke-linecap="round"><path d="M330 430C380 460 460 480 500 490"/><path d="M500 490C540 450 560 420 585 395"/><path d="M585 395C640 370 690 350 730 330"/><path d="M470 300C400 330 330 350 245 370"/><path d="M290 290C360 290 420 295 470 300"/><path d="M290 570C300 520 310 480 330 430"/></g>' +
    '<text x="560" y="548" class="map-label" transform="rotate(20 560 548)">Garonne</text><text x="760" y="392" class="map-label">Dordogne</text><text x="330" y="236" class="map-label" transform="rotate(-6 330 236)">Charente</text><text x="250" y="660" class="map-label">Landes</text>';

  /* Coordonnées réelles d'un projet. Le lieu créé par le visiteur est géolocalisable
     (state.project.loc) ; tant qu'il n'est pas situé, il n'apparaît pas. */
  function projectLoc(p) {
    if (p.isMine) return state.project.loc;
    return (p.lat != null) ? { lat: p.lat, lng: p.lng } : null;
  }
  function distKm(a, b) {
    var R = 6371, t = Math.PI / 180, dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* Carte open source (Leaflet + OpenStreetMap). Repli sur la carte SVG stylisée si Leaflet
     n'est pas chargé (hors-ligne). */
  // Plateau isométrique miniature pour la carte (SVG inline, couleurs via CSS).
  function isoMarkerSvg(statut) {
    return '<svg class="lmark-iso" viewBox="0 0 48 52" aria-hidden="true" focusable="false">' +
      '<ellipse class="mi-shadow" cx="25" cy="43" rx="15" ry="5"/>' +
      '<polygon class="mi-left" points="6,28 24,37 24,43 6,34"/>' +
      '<polygon class="mi-right" points="24,37 42,28 42,34 24,43"/>' +
      '<polygon class="mi-top" points="24,19 42,28 24,37 6,28"/>' +
      '<rect class="mi-trunk" x="23" y="18" width="2.4" height="9" rx="1"/>' +
      '<circle class="mi-leaf" cx="24.2" cy="13" r="7"/>' +
      '<circle class="mi-light" cx="21.5" cy="10.5" r="3.2"/>' +
      (statut === "prouve" ? '<circle class="mi-fruit" cx="27.5" cy="15" r="1.4"/><circle class="mi-fruit" cx="21" cy="16" r="1.4"/><circle class="mi-fruit" cx="26" cy="9.5" r="1.4"/>' : "") +
      (statut === "reve" ? '<polygon class="mi-dash" points="24,19 42,28 24,37 6,28"/>' : "") +
      "</svg>";
  }

  function renderMap(host, opts) {
    opts = opts || {};
    if (!window.L) return renderMapSvg(host, opts);
    var projects = allProjects();
    var map = host._lmap;
    if (!map) {
      // Un conteneur sans hauteur au moment de l'init laisse Leaflet sans tuiles (marqueurs sur fond uni) :
      // on garantit une hauteur, puis on recalcule la taille une fois le rendu posé et à chaque redimensionnement.
      if (!host.clientHeight) host.style.minHeight = "280px";
      map = L.map(host, { zoomControl: false, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);
      map.setView([45.5, -0.2], 7);
      host._lmap = map;
      host._lmarkers = L.layerGroup().addTo(map);
      map.on("click", function (e) { if (host._locateMove) host._locateMove(e.latlng.lat, e.latlng.lng); });
      var refit = function () { if (host._lmap) host._lmap.invalidateSize(); };
      map.whenReady(function () { requestAnimationFrame(refit); setTimeout(refit, 350); });
      window.addEventListener("load", refit);
      if (window.ResizeObserver) new ResizeObserver(refit).observe(host);
      else window.addEventListener("resize", refit);
    }
    host._locateMove = opts.locate ? opts.locate.onMove : null;
    var layer = host._lmarkers; layer.clearLayers();
    var bounds = [], selLatLng = null;
    projects.forEach(function (p) {
      if (opts.filter && !opts.filter(p)) return;
      var loc = projectLoc(p); if (!loc) return;
      bounds.push([loc.lat, loc.lng]);
      if (opts.selected === p.id) selLatLng = [loc.lat, loc.lng];
      var sel = opts.selected === p.id, hl = opts.highlight && opts.highlight(p);
      // Marqueur 2,5D : un petit plateau isométrique coloré par l'avancement, un arbre dessus (fruits quand c'est prouvé).
      var icon = L.divIcon({ className: "lmark-ico", iconSize: [48, 52], iconAnchor: [24, 40], html:
        '<span class="lmark st-' + p.statut + (p.isMine ? " is-mine" : "") + (p.isExample ? " is-example" : "") + (sel ? " is-selected" : "") + (hl ? " is-highlight" : "") + '">' +
        (p.isMine ? '<i class="lmark-pulse"></i>' : "") + isoMarkerSvg(p.statut) + "</span>" });
      var m = L.marker([loc.lat, loc.lng], { icon: icon, title: p.nom, riseOnHover: true, draggable: !!(opts.locate && p.isMine), keyboard: true, alt: p.nom });
      m.bindTooltip(p.nom, { direction: "top", offset: [0, -34], permanent: !!p.isMine, className: "lmark-tip" });
      if (opts.onSelect) m.on("click", function () { opts.onSelect(p.id); });
      if (opts.locate && p.isMine) m.on("dragend", function (e) { var ll = e.target.getLatLng(); if (host._locateMove) host._locateMove(ll.lat, ll.lng); });
      m.addTo(layer);
    });
    if (!host._lfit && bounds.length) {
      var padL = (document.body.dataset.page === "index" && window.matchMedia("(min-width: 901px)").matches) ? 440 : 48;
      map.fitBounds(bounds, { paddingTopLeft: [padL, 60], paddingBottomRight: [48, 48], maxZoom: 9 }); host._lfit = true;
    }
    if (selLatLng && host._lastSel !== opts.selected) { map.panTo(selLatLng, { animate: true }); }
    host._lastSel = opts.selected;
    setTimeout(function () { map.invalidateSize(); }, 60);
  }

  function renderMapSvg(host, opts) {
    opts = opts || {};
    var projects = allProjects();
    var svg = '<svg class="map-svg" viewBox="' + (opts.viewBox || "0 0 1000 700") + '" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Carte vivante des projets régénératifs en Nouvelle-Aquitaine">' + MAP_DECOR + '<g class="markers">';
    projects.forEach(function (p) {
      if (!p.pos) return; // repli hors-ligne : seuls les exemples ont une position stylisée
      var hidden = opts.filter && !opts.filter(p);
      var cls = "marker st-" + p.statut + (p.isMine ? " is-mine" : "") + (opts.selected === p.id ? " is-selected" : "") + (hidden ? " is-hidden" : "") + (opts.highlight && opts.highlight(p) ? " is-highlight" : "");
      var sc = p.isMine ? 1.25 : 1;
      svg += '<g class="' + cls + '" data-id="' + p.id + '" transform="translate(' + p.pos.x + " " + p.pos.y + ')"' + (hidden ? ' aria-hidden="true"' : ' role="button" tabindex="0" aria-label="' + esc(p.nom) + ", " + D.statuts[p.statut].label + (p.isMine ? ", ton projet" : "") + '"') + ">" +
        (p.isMine ? '<circle class="pulse" r="18" cy="-4"/>' : "") +
        '<ellipse class="m-shadow" rx="9" ry="3.5" cy="1"/>' +
        '<g transform="scale(' + sc + ')"><path class="m-pin" d="M0 0C-9-11-14-17-14-24A14 14 0 1 1 14-24C14-17 9-11 0 0Z"/>' +
        '<path class="m-leaf" d="M-6-19C-6-26-1-31 7-31 7-23 2-18-6-18Z"/></g>' +
        '<text class="m-label" y="' + (p.isMine ? 20 : 17) + '">' + esc(p.nom) + "</text></g>";
    });
    svg += "</g></svg>";
    host.innerHTML = svg;
    $all(".marker[role=button]", host).forEach(function (m) {
      function go() { if (opts.onSelect) opts.onSelect(m.getAttribute("data-id")); }
      m.addEventListener("click", go);
      m.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  }
  function projectById(id) { return allProjects().find(function (p) { return p.id === id; }); }

  /* ================= Visite guidée (coachmarks Deva) =================
     Après chaque porte de l'accueil, Deva met en lumière les éléments clés
     de la destination : spotlight sur une cible + bulle + Suivant / Passer. */
  var bootedEarly = false; // l'interface a démarré sans attendre Supabase
  var redrawMap = null;    // redessine la carte de la page courante (arrivée tardive des lieux publics)
  /* ================= Passage : la fenêtre se construit sous les yeux du visiteur ================= */
  function titreDe(kind) { return { carte: "Carte vivante", regen: "Parcours REGEN", commun: "Le Commun" }[kind] || "EVAD"; }
  // Cadre lumineux qui se trace autour d'une zone, avec son étiquette, puis s'efface.
  function buildFrame(host, titre) {
    if (!host) return null;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    var f = document.createElement("div"); f.className = "build-frame"; f.setAttribute("aria-hidden", "true");
    f.innerHTML = '<svg><defs><linearGradient id="bf-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9BC7AC"/><stop offset="1" stop-color="#D59154"/></linearGradient></defs>' +
      '<rect x="1" y="1" width="99.6%" height="99.6%" rx="18" pathLength="1000"/></svg>' +
      '<span class="build-chip"><i></i>' + esc(titre) + ' se construit pour toi</span>';
    host.appendChild(f);
    setTimeout(function () { f.classList.add("is-done"); }, 60);
    setTimeout(function () { if (f.parentNode) f.remove(); }, 3000);
    return f;
  }
  // Montage des blocs d'une zone (les enfants apparaissent un à un).
  function buildIn(el, ms) { if (!el) return; el.classList.add("is-building"); setTimeout(function () { el.classList.remove("is-building"); }, ms || 1800); }
  var pageTour = null; // visite guidée de la page courante, rejouable via « Revoir la visite »
  var TOURS = {
    commun: [
      { sel: ".doctrine", text: "Le Commun est une bibliothèque libre de solutions régénératives." },
      { sel: ".commun-tools .search", text: "Cherche une solution par mot-clé : haie, compost, réparer…" },
      { sel: "#commun-fams", text: "Ou filtre par famille pour cibler ce qui t'intéresse." },
      { sel: "#commun-grid .card", text: "Chaque fiche montre la difficulté, le coût, et sur combien de lieux la solution a déjà été éprouvée." },
      { sel: "#ici-grid", text: "Les ICI sont les indicateurs concrets qu'on observe sur un lieu quand ça marche." },
      { sel: "#open-propose", text: "Tu as éprouvé quelque chose ? Propose-le : la communauté le reliera à ses preuves." }
    ],
    rever: [
      { sel: ".top-stepper", text: "Créer un lieu, c'est le parcours REGEN en 5 étapes, ici dans la barre du haut : Rêver, Explorer, Générer, Entreprendre, Nourrir. On démarre par Rêver." },
      { sel: ".map-card", text: "Inspire-toi des projets qui poussent déjà autour de toi : clique un marqueur. Clique la carte pour situer ton futur lieu." },
      { sel: "#v-nom", text: "Donne un nom à ton lieu." },
      { sel: "#v-geo", text: "Situe-le : tape une commune ou une adresse, puis choisis dans la liste." },
      { sel: "#v-promesse", text: "Écris ta promesse : en une phrase, ce que le lieu change pour les gens." },
      { sel: "#v-public", text: "Tu choisis s'il apparaît sur la carte publique. Deva propose, tu décides." },
      { sel: "#to-explorer", text: "Dès que ton lieu a un nom, tu passes à l'étape Explorer. À toi de jouer !" }
    ]
  };
  function startTour(steps) {
    steps = (steps || []).filter(function (s) { return !s.sel || document.querySelector(s.sel); });
    if (!steps.length) return;
    // Deva guide depuis le chat quand son panneau est visible ; sur écran étroit (tiroir), bulle près de l'élément.
    var chat = !!(window.Deva && Deva.say && document.querySelector("#deva .deva-log")) && !window.matchMedia("(max-width: 900px)").matches;
    var i = 0, raf = null, entered = -1;
    var ov = document.createElement("div");
    ov.className = "tour" + (chat ? " tour-is-chat" : ""); ov.setAttribute("role", chat ? "presentation" : "dialog");
    if (!chat) { ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Visite guidée avec Deva"); }
    ov.innerHTML = '<div class="tour-hole" aria-hidden="true"></div>' + (chat ? "" :
      '<div class="tour-pop">' +
      '<div class="tour-pop-head"><img class="deva-face" src="assets/deva-avatar.png" alt="" aria-hidden="true"><strong>Deva</strong><span class="tour-count"></span></div>' +
      '<p class="tour-text"></p>' +
      '<div class="tour-nav"><button type="button" class="tour-skip">Passer</button>' +
      '<button type="button" class="btn btn-primary btn-sm tour-next"></button></div>' +
      '</div>');
    document.body.appendChild(ov);
    if (chat) document.body.classList.add("tour-chat");
    var hole = ov.querySelector(".tour-hole"), pop = ov.querySelector(".tour-pop"),
        txt = ov.querySelector(".tour-text"), cnt = ov.querySelector(".tour-count"),
        next = ov.querySelector(".tour-next"), skip = ov.querySelector(".tour-skip");
    function measure() {
      var s = steps[i], t = s.sel ? document.querySelector(s.sel) : null;
      if (!t) {
        hole.style.opacity = "0";
        if (pop) { pop.style.left = "50%"; pop.style.top = "50%"; pop.style.transform = "translate(-50%,-50%)"; }
        return;
      }
      var r = t.getBoundingClientRect(), pad = 8;
      hole.style.opacity = "1";
      hole.style.left = (r.left - pad) + "px"; hole.style.top = (r.top - pad) + "px";
      hole.style.width = (r.width + pad * 2) + "px"; hole.style.height = (r.height + pad * 2) + "px";
      if (!pop) return;
      pop.style.transform = "none";
      var popW = Math.min(320, window.innerWidth - 32); pop.style.width = popW + "px";
      var ph = pop.offsetHeight || 150;
      var left = Math.min(Math.max(16, r.left), window.innerWidth - popW - 16);
      var top = (r.bottom + ph + 16 <= window.innerHeight) ? (r.bottom + 14)
              : (r.top - ph - 14 >= 16 ? r.top - ph - 14 : Math.max(16, (window.innerHeight - ph) / 2));
      pop.style.left = left + "px"; pop.style.top = top + "px";
    }
    function onScroll() { if (raf) return; raf = requestAnimationFrame(function () { raf = null; measure(); }); }
    function leaveCurrent() {
      if (entered >= 0 && steps[entered] && steps[entered].onLeave) { try { steps[entered].onLeave(); } catch (e) { /* ignore */ } }
      entered = -1;
    }
    function goTo(n) {
      leaveCurrent();
      i = n; var s = steps[i], last = i === steps.length - 1;
      if (s.onEnter) { try { s.onEnter(); } catch (e) { /* ignore */ } }
      entered = i;
      if (chat) {
        Deva.say((i + 1) + "/" + steps.length + " · " + s.text, { instant: true, actions: [
          { label: last ? "Terminer la visite" : "Suivant", primary: true, onClick: function () { if (!last) goTo(i + 1); else end(); } },
          { label: "Passer la visite", onClick: end }
        ] });
      } else {
        txt.textContent = s.text;
        cnt.textContent = (i + 1) + " / " + steps.length;
        next.textContent = last ? "Terminer" : "Suivant";
      }
      var t = s.sel ? document.querySelector(s.sel) : null;
      if (t) t.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      setTimeout(measure, 60); setTimeout(measure, 340);
    }
    function end() {
      if (ov._ended) return; ov._ended = true;
      leaveCurrent();
      window.removeEventListener("resize", onScroll, true);
      window.removeEventListener("scroll", onScroll, true);
      ov.classList.add("is-leaving");
      setTimeout(function () { ov.remove(); document.body.classList.remove("tour-chat"); }, 240);
      if (chat) Deva.say("Fin de la visite. Je reste à côté si tu as une question.", { instant: true });
    }
    if (next) next.addEventListener("click", function () { if (i < steps.length - 1) goTo(i + 1); else end(); });
    if (skip) skip.addEventListener("click", end);
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { end(); document.removeEventListener("keydown", esc); } });
    window.addEventListener("resize", onScroll, true);
    window.addEventListener("scroll", onScroll, true);
    goTo(0);
  }

  /* ================= Écran 1 : accueil ================= */
  function pageIndex() {
    var selected = null, fStat = { reve: true, encours: true, prouve: true }, fFam = state.interestFam || "", nearMe = false;
    var host = $("#map");
    var meLoc = null, meMarker = null; // position du visiteur (mémoire de la page seulement, jamais enregistrée)
    function refPoint() { return meLoc || state.project.loc; }
    function filter(p) {
      if (!fStat[p.statut]) return false;
      if (fFam && !p.isMine && !(p.solutions || []).some(function (s) { return SOL[s[0]].famille === fFam; })) return false;
      if (nearMe && !p.isMine) { var me = refPoint(), at = projectLoc(p); if (me && at && distKm(me, at) > 80) return false; }
      return true;
    }
    // Deux vues : la carte illustrée isométrique (par défaut, sans tuile à télécharger) et la carte OpenStreetMap.
    var stageEl = $(".map-stage"), isoHost = $("#isomap"), vue = "iso";
    try { vue = localStorage.getItem("evad-vue-carte") || "iso"; } catch (e) { /* ignore */ }
    if (!window.renderIsoMap || !isoHost) vue = "osm";
    function setVue(v) {
      vue = v; try { localStorage.setItem("evad-vue-carte", v); } catch (e) { /* ignore */ }
      stageEl.classList.toggle("view-iso", v === "iso");
      $all(".map-view [data-view]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.view === v)); });
      draw();
      if (v === "osm" && host._lmap) setTimeout(function () { host._lmap.invalidateSize(); }, 60);
    }
    function draw() {
      if (vue === "iso") {
        var list = allProjects().filter(filter).map(function (p) { var loc = projectLoc(p); return loc ? Object.assign({}, p, { loc: loc }) : null; }).filter(Boolean);
        var selP = selected ? projectById(selected) : null;
        var wide = window.matchMedia("(min-width: 901px)").matches, devaW = (wide && !document.body.classList.contains("deva-closed")) ? (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--deva-w"), 10) || 380) + 48 : 0;
        renderIsoMap(isoHost, { projects: list, selected: selected, lieu: selP ? lieuFor(selP) : null, onSelect: openFiche, me: meLoc, padLeft: devaW, padRight: (wide && selected) ? 460 : 0 });
        return;
      }
      renderMap(host, { onSelect: openFiche, selected: selected, filter: filter });
    }
    $all(".map-view [data-view]").forEach(function (b) { b.addEventListener("click", function () { if (b.dataset.view !== vue) setVue(b.dataset.view); }); });
    stageEl.classList.toggle("view-iso", vue === "iso");
    $all(".map-view [data-view]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.view === vue)); });
    draw(); redrawMap = draw;

    $all("[data-fstat]").forEach(function (b) {
      b.addEventListener("click", function () { var k = b.dataset.fstat; fStat[k] = !fStat[k]; b.setAttribute("aria-pressed", String(fStat[k])); draw(); });
    });
    var famSel = $("#f-famille");
    famSel.innerHTML = '<option value="">Toutes les familles</option>' + D.familles.map(function (f) { return '<option value="' + f.id + '">' + f.label + "</option>"; }).join("");
    if (fFam) famSel.value = fFam;
    famSel.addEventListener("change", function () { fFam = famSel.value; draw(); });
    // Pré-filtrage de la carte par famille d'intérêt (choisie dans l'onboarding).
    function applyFamily(fam) { fFam = fam || ""; if (famSel) famSel.value = fFam; draw(); }
    // « Autour de moi » : géolocalisation du navigateur (avec accord), sinon la position du lieu rêvé.
    var nearBtn = $("#f-near");
    function showMe() {
      if (vue === "iso") { draw(); return; }
      if (!window.L || !host._lmap || !meLoc) return;
      if (meMarker) meMarker.remove();
      meMarker = L.circleMarker([meLoc.lat, meLoc.lng], { radius: 7, color: "#0B6049", weight: 2, fillColor: "#9BC7AC", fillOpacity: .95 })
        .addTo(host._lmap).bindTooltip("Toi", { direction: "top", offset: [0, -8] });
      host._lmap.setView([meLoc.lat, meLoc.lng], 9);
    }
    function setNear(on) {
      nearMe = on; nearBtn.setAttribute("aria-pressed", String(on)); nearBtn.textContent = on ? "Autour de moi (80 km)" : "Autour de moi";
      if (!on && meMarker) { meMarker.remove(); meMarker = null; }
      draw();
    }
    nearBtn.addEventListener("click", function () {
      if (nearMe) { setNear(false); return; }
      if (meLoc) { setNear(true); showMe(); return; }
      if (!navigator.geolocation) {
        if (state.project.loc) { setNear(true); return; }
        toast("Ton navigateur ne permet pas la géolocalisation. Situe ton lieu à l'étape Rêver pour utiliser ce filtre."); return;
      }
      nearBtn.setAttribute("aria-busy", "true"); nearBtn.textContent = "Localisation…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        meLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        nearBtn.removeAttribute("aria-busy");
        setNear(true); showMe();
        if (window.Deva && Deva.say) Deva.say("Je te situe : voici les lieux à moins de 80 km. Ta position reste dans cette page, rien n'est enregistré.", { instant: true });
      }, function () {
        nearBtn.removeAttribute("aria-busy"); nearBtn.textContent = "Autour de moi";
        if (state.project.loc) { setNear(true); toast("Géolocalisation indisponible : je prends la position de ton lieu."); return; }
        toast("Géolocalisation refusée ou indisponible. Situe ton lieu à l'étape Rêver pour utiliser ce filtre.");
      }, { timeout: 8000, maximumAge: 300000 });
    });

    var filters = $(".map-filters"), ftoggle = $("#filters-toggle");
    ftoggle.addEventListener("click", function () {
      var collapsed = filters.classList.toggle("is-collapsed");
      ftoggle.setAttribute("aria-expanded", String(!collapsed));
      ftoggle.setAttribute("aria-label", collapsed ? "Afficher les filtres" : "Réduire les filtres");
    });

    var fiche = $("#fiche");
    function closeFiche() { $(".map-stage").classList.remove("has-fiche"); fiche.classList.remove("open"); fiche.setAttribute("aria-hidden", "true"); selected = null; draw(); }
    function openFiche(id) {
      var p = projectById(id); if (!p) return; selected = id; draw();
      var nextStep = D.steps.find(function (s) { return !stepDone(s.id); }) || D.steps[4];
      var toSol = function (x) { return [x.solId, { prevu: "reve", encours: "encours", verifie: "prouve" }[x.status]]; };
      var sols = p.isMine ? state.placed.map(toSol) : p.isPublic ? (p.placedRemote || []).filter(function (x) { return SOL[x.solId]; }).map(toSol) : (p.solutions || []);
      var detail = sols.length
        ? "<ul class='sol-list'>" + sols.map(function (s) { return "<li><a class='sol-link' href='commun.html?sol=" + s[0] + "'><span class='dot st-" + s[1] + "' aria-hidden='true'></span><span>" + esc(SOL[s[0]].nom) + " <span class='muted'>(" + D.statuts[s[1]].label.toLowerCase() + ")</span></span><span class='sol-link-go' aria-hidden='true'>" + ICON.arrow + "</span></a></li>"; }).join("") + "</ul>"
        : "<p class='muted'>Aucune solution posée pour l'instant. Commence le parcours pour faire pousser ce lieu.</p>";
      fiche.innerHTML =
        '<div class="fiche-head"><span>' + statutBadge(p.statut) + (p.isExample ? ' <span class="badge badge-exemple" title="Projet fictif, pour illustrer">Exemple</span>' : "") + '</span><button type="button" class="icon-btn" id="fiche-close" aria-label="Fermer la fiche">' + ICON.close + "</button></div>" +
        '<div class="fiche-scene" id="fiche-scene"></div>' +
        '<h2 class="fiche-title" id="fiche-title">' + esc(p.nom) + "</h2>" +
        '<p class="fiche-lieu">' + esc(p.lieu) + (p.isMine ? " · ton projet" : p.isPublic ? " · lieu d'un collectif bêta" : "") + "</p>" +
        '<p class="fiche-promesse">' + esc(p.promesse) + "</p>" +
        '<p class="fiche-collectif"><strong>Collectif</strong> ' + esc(p.collectif) + "</p>" +
        "<h3 class='mini-title'>Impact vérifié</h3>" + jaugesHtml(p.jauges) +
        '<div class="fiche-actions">' +
        '<button type="button" class="btn btn-ghost" id="fiche-explore" aria-expanded="false" aria-controls="fiche-detail">Explorer ce projet</button>' +
        (p.isMine
          ? '<a class="btn btn-primary" href="' + nextStep.href + '">Reprendre mon parcours</a>'
          : '<button type="button" class="btn btn-primary" id="fiche-inspire">M\'en inspirer pour créer le mien</button>') +
        "</div>" +
        '<div class="fiche-detail" id="fiche-detail" hidden><h3 class="mini-title">Solutions du Commun sur ce lieu</h3>' + detail + "</div>";
      renderScene($("#fiche-scene"), lieuFor(p));
      fiche.classList.add("open"); fiche.setAttribute("aria-hidden", "false"); $(".map-stage").classList.add("has-fiche");
      $("#fiche-close").addEventListener("click", closeFiche);
      $("#fiche-explore").addEventListener("click", function () {
        var d = $("#fiche-detail"); d.hidden = !d.hidden; this.setAttribute("aria-expanded", String(!d.hidden));
        this.textContent = d.hidden ? "Explorer ce projet" : "Replier le détail";
      });
      var insp = $("#fiche-inspire");
      if (insp) insp.addEventListener("click", function () {
        if (state.pinned.indexOf(p.id) < 0) state.pinned.push(p.id);
        save(); location.href = "rever.html";
      });
      $("#fiche-title").setAttribute("tabindex", "-1"); $("#fiche-title").focus({ preventScroll: true });
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && fiche.classList.contains("open")) closeFiche(); });

    if (param("focus")) openFiche(param("focus"));

    /* Onboarding : Deva demande le prénom, présente la vision, puis propose trois portes d'entrée. */
    var VISION = "EVAD, c'est un monde régénératif désirable, déjà en train de pousser : chaque lieu sur la carte a été rêvé, modélisé, puis prouvé sur le terrain. Du rêve à la preuve, et la preuve rouvre le rêve.";
    // « je m'appelle Romain », « moi c'est Léa » : on prend le mot qui suit.
    function extraitPrenom(txt) {
      if (/[?]/.test(txt || "")) return null;
      var m = /(?:m['’]?appelle|je suis|moi c['’]?est)\s+([\p{L}\-']{2,24})/iu.exec(txt || "");
      if (!m) return null;
      if (/^(quoi|moi|qui|que|ou|pour|le|la|un|une|ca|bien|vrai|toi|pas|un|une|ici|la)$/i.test(m[1])) return null;
      return m[1];
    }
    // Une question ou une phrase n'est pas un prénom : Deva y répond, puis redemande.
    function pasUnPrenom(txt) {
      if (/[?]/.test(txt || "")) return true;
      if (extraitPrenom(txt)) return false;
      var w = (txt || "").trim().split(/\s+/).filter(Boolean);
      return /[?]/.test(txt || "") || w.length >= 3;
    }
    function cleanPrenom(txt) {
      var w = extraitPrenom(txt) || (txt || "").trim().split(/\s+/)[0] || "";
      w = w.replace(/[^\p{L}\-']/gu, "").slice(0, 24);
      return w ? w.charAt(0).toUpperCase() + w.slice(1) : "";
    }
    function reponseTexte(txt) { var r = (window.Deva && Deva.answer) ? Deva.answer(txt) : null; return r && r.text ? r.text : (r || ""); }
    function visitMap() {
      if (host) host.scrollIntoView({ behavior: "smooth", block: "center" });
      if (window.Deva && Deva.say) Deva.say("Clique un lieu sur la carte pour découvrir son histoire.", { instant: true });
    }
    function choices() {
      return [
        { label: "Visiter les lieux régénératifs", once: false, onClick: visitMap },
        { label: "Découvrir les solutions du Commun", once: false, onClick: function () { location.href = "commun.html"; } },
        { label: "Créer mon lieu", primary: true, once: false, onClick: function () { location.href = "rever.html"; } }
      ];
    }
    // Deva dans la sidebar, une fois la carte révélée (ou si l'intro est passée).
    function startHomeDeva(firstTime) {
      if (!(window.Deva && Deva.prompt)) return;
      if (firstTime) {
        Deva.say((state.prenom ? "Et voilà la carte vivante, " + state.prenom + ". " : "Et voilà la carte vivante. ") +
          "Chaque marqueur est un lieu réel. Par quoi veux-tu commencer ?", { instant: true, actions: choices() });
      } else if (state.prenom) {
        Deva.say("Ravi de te revoir, " + state.prenom + ". " + VISION + " Par quoi veux-tu commencer ?", { instant: true, actions: choices() });
      } else {
        var demande = function (txt) {
          if (pasUnPrenom(txt)) {
            setTimeout(function () { Deva.prompt("Et toi, comment t'appelles-tu ?", demande); }, 900);
            return reponseTexte(txt) || "On y reviendra.";
          }
          var p = cleanPrenom(txt);
          if (p) { state.prenom = p; save(); refreshChrome(); }
          return { text: (p ? "Enchanté, " + p + " ! " : "Enchanté ! ") + VISION + " Par quoi veux-tu commencer ?", actions: choices() };
        };
        Deva.prompt("Bonjour, je suis Deva, l'assistant IA d'EVAD. Bienvenue dans l'univers d'EVAD. Comment t'appelles-tu ?", demande);
      }
      // Personnalisation : si une famille d'intérêt a été captée, Deva le signale.
      if (state.interestFam && FAM[state.interestFam]) {
        Deva.say("J'ai filtré la carte sur la famille « " + FAM[state.interestFam].label + " ». Tu peux l'élargir dans les filtres.", { instant: true });
      }
    }

    // Visite de la carte : définie au niveau de la page (hors intro) pour que « Revoir la visite » marche toujours, et pour ouvrir/fermer une fiche.
    var SAMPLE_ID = (D.projets && D.projets[0] && D.projets[0].id) || null;
    var carteTour = [
      { text: "Bienvenue sur la carte vivante ! Je te montre l'essentiel en quelques secondes." },
      { sel: ".imark, .leaflet-marker-icon", text: "Chaque plateau est un lieu réel. Clique-le pour ouvrir sa fiche." },
      { sel: ".map-view", text: "Vue illustrée pour l'ambiance du territoire, vue carte pour la précision : tu passes de l'une à l'autre ici." },
      { sel: ".map-filters", text: "Filtre par avancement (Rêvé en gris, En cours en ambre, Prouvé en vert) et par famille (Eau, Sol, Énergie…), ou n'affiche que ce qui pousse autour de toi." },
      { sel: "#fiche", text: "Voici la fiche d'un lieu : sa promesse, le collectif qui le porte, les solutions posées et son impact vérifié. « Explorer ce projet » déplie le détail.",
        onEnter: function () { if (SAMPLE_ID) openFiche(SAMPLE_ID); },
        onLeave: function () { closeFiche(); } },
      { sel: ".toplink-cta", text: "Et quand tu veux passer à l'action, tu rêves ton propre lieu ici. Bonne exploration !" }
    ];
    pageTour = carteTour; // « Revoir la visite » (footer) rejoue la visite de la carte

    /* Onboarding prototype : à l'ouverture, Deva apparaît SEULE en plein écran pour
       présenter la vision EVAD et demander le prénom, puis s'efface sur la carte.
       S'affiche à la première visite (pas de prénom) ; rejouable via ?intro=1, désactivable via ?intro=0. */
    function shouldIntro() {
      if (param("intro") === "0") return false;
      if (param("intro") === "1") return true;
      return !state.prenom;
    }
    function runIntro(done) {
      document.body.classList.add("has-intro");
      var ov = document.createElement("div");
      ov.id = "intro"; ov.className = "intro"; ov.setAttribute("role", "dialog");
      ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Bienvenue sur EVAD, présentation par Deva");
      ov.innerHTML =
        '<div class="intro-card">' +
        '<div class="intro-hero"><img class="deva-face" src="assets/deva-avatar.png" alt="">' +
        '<div><strong>Deva</strong><span>ton assistant sur EVAD</span></div></div>' +
        '<div class="intro-log" role="log" aria-live="polite" aria-label="Présentation de Deva"></div>' +
        '<div class="intro-foot"></div>' +
        '<button type="button" class="intro-skip">Passer l\'intro</button>' +
        '</div>';
      document.body.appendChild(ov);
      var log = ov.querySelector(".intro-log"), foot = ov.querySelector(".intro-foot");

      function leave() {
        if (ov._gone) return; ov._gone = true;
        ov.classList.add("is-leaving");
        setTimeout(function () { ov.remove(); document.body.classList.remove("has-intro"); if (done) done(); }, 460);
      }
      // Passage vers la suite : la carte de Deva glisse et se fond à la place de la sidebar,
      // pendant que la fenêtre de destination se trace et se monte.
      function dock(kind, next) {
        if (ov._gone) return; ov._gone = true;
        var card = ov.querySelector(".intro-card"), target = document.getElementById("deva");
        var narrow = window.matchMedia("(max-width: 900px)").matches;
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        ov.classList.add("is-docking");
        if (card && target && !narrow && !reduce) {
          var a = card.getBoundingClientRect(), b = target.getBoundingClientRect();
          card.style.transform = "translate(" + (b.left - a.left) + "px," + (b.top - a.top) + "px)"; // même taille, simple glissement
        } else if (card) { card.style.opacity = "0"; }
        var zone = document.querySelector(".map-stage") || document.getElementById("main");
        buildFrame(zone, titreDe(kind));
        if (kind === "carte") buildIn(zone, 2000); // la carte se monte pendant que Deva glisse
        setTimeout(function () { ov.classList.add("is-gone"); }, reduce ? 0 : 650);
        setTimeout(function () { ov.remove(); document.body.classList.remove("has-intro"); if (done) done(); if (next) next(); }, reduce ? 150 : 950);
      }
      ov.querySelector(".intro-skip").addEventListener("click", leave);

      // Une réplique de Deva : points de saisie animés, puis le texte (comme dans la sidebar).
      function line(text) {
        return new Promise(function (res) {
          var t = document.createElement("div");
          t.className = "deva-msg from-deva is-typing"; t.setAttribute("aria-hidden", "true");
          t.innerHTML = "<span></span><span></span><span></span>";
          log.appendChild(t); log.scrollTop = log.scrollHeight;
          setTimeout(function () {
            t.remove();
            var m = document.createElement("div"); m.className = "deva-msg from-deva"; m.textContent = text;
            log.appendChild(m); log.scrollTop = log.scrollHeight; res();
          }, 650);
        });
      }
      function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

      function askName() {
        foot.innerHTML =
          '<form class="intro-form"><label class="sr-only" for="intro-name">Ton prénom</label>' +
          '<input id="intro-name" class="intro-input" type="text" autocomplete="given-name" placeholder="Ton prénom…" maxlength="24">' +
          '<button type="submit" class="btn btn-primary">C\'est parti</button></form>';
        var form = foot.querySelector(".intro-form"), input = foot.querySelector("#intro-name");
        requestAnimationFrame(function () { log.scrollTop = log.scrollHeight; });
        input.focus({ preventScroll: true });
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var v = input.value;
          if (pasUnPrenom(v)) {
            var uq = document.createElement("div"); uq.className = "deva-msg from-user"; uq.textContent = v.trim();
            log.appendChild(uq); log.scrollTop = log.scrollHeight; input.value = "";
            line((reponseTexte(v) ? reponseTexte(v) + " " : "") + "Et toi, comment t'appelles-tu ?");
            return;
          }
          var p = cleanPrenom(v);
          if (p) { state.prenom = p; save(); refreshChrome(); }
          foot.innerHTML = "";
          var u = document.createElement("div"); u.className = "deva-msg from-user"; u.textContent = p || "Plus tard";
          log.appendChild(u); log.scrollTop = log.scrollHeight;
          line((p ? "Enchanté, " + p + " ! " : "Comme tu veux. ") + "Qu'est-ce qui t'amène sur EVAD ?").then(askIntent);
        });
      }

      // Deva demande l'intention : texte libre + trois portes vers les parcours.
      function nrm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
      function detectIntent(txt) {
        var t = " " + nrm(txt) + " ";
        if (/(projet|creer|cree|monter|lancer|porter|entreprendre|mon lieu|me lancer|demarrer|rever|reve)/.test(t)) return "regen";
        if (/(solution|commun|inspir|exemple|idee|methode|outil|ressource|comment faire)/.test(t)) return "commun";
        if (/(visiter|voir|explorer|carte|lieu|autour|pres|balade|regarder|decouvrir)/.test(t)) return "carte";
        return null;
      }
      // Vraie question (vs simple intention) : « ? » ou tournure interrogative en tête.
      function isQuestion(txt) {
        if (/[?]/.test(txt)) return true;
        var t = nrm(txt).replace(/['’]/g, " ").replace(/\s+/g, " ").trim();
        return /^(comment|pourquoi|quoi|que |qu |qui |quel|quelle|quels|quelles|combien|ou |c est|cest|a quoi|est ce|peux|peut|dois|faut|a t|y a)/.test(t + " ");
      }
      // Famille d'intérêt détectée dans la phrase → personnalise la carte.
      function detectFamily(txt) {
        var t = " " + nrm(txt) + " ";
        if (/(eau|pluie|riviere|mare|zone humide|aquatique|nappe)/.test(t)) return "eau";
        if (/(sol|terre|compost|jardin|potager|permaculture|haie|biodiversite)/.test(t)) return "sol";
        if (/(energie|solaire|panneau|photovolta|chaleur|electricite|eolien|bois energie)/.test(t)) return "energie";
        if (/(reemploi|reparer|reparation|recyclage|palette|dechet|ressourcerie|seconde main)/.test(t)) return "reemploi";
        if (/(alimentation|manger|nourriture|cantine|maraich|legume|aliment|epicerie|cuisine)/.test(t)) return "alimentation";
        if (/(gouvernance|decision|assemblee|democratie|collectif|conseil|cooperative)/.test(t)) return "gouvernance";
        return null;
      }
      function routeTo(kind) {
        // REGEN et Commun : la construction commence ici et se poursuit sur l'autre page (drapeau de session).
        if (kind === "regen" || kind === "commun") {
          try { sessionStorage.setItem("evad-arrive", kind); } catch (e) { /* ignore */ }
          dock(kind, function () { location.href = (kind === "regen" ? "rever.html" : "commun.html") + "?tour=1"; });
          return;
        }
        // Carte : page courante, la carte se monte puis Deva en fait le tour.
        dock("carte", function () { setTimeout(function () { startTour(carteTour); }, 900); });
      }
      function askIntent() {
        // Les trois portes d'abord, le champ libre dessous (pour une question ou une demande en mots).
        foot.innerHTML =
          '<div class="intro-doors" role="group" aria-label="Portes d\'entrée">' +
          '<button type="button" class="deva-door is-primary" data-go="regen">Créer un projet</button>' +
          '<button type="button" class="deva-door" data-go="carte">Visiter des lieux</button>' +
          '<button type="button" class="deva-door" data-go="commun">Découvrir des solutions</button>' +
          '</div>' +
          '<form class="intro-form intro-form-after"><label class="sr-only" for="intro-quete">Une question ou ce que tu cherches</label>' +
          '<input id="intro-quete" class="intro-input" type="text" autocomplete="off" placeholder="Une question ?">' +
          '<button type="submit" class="btn btn-primary intro-send" aria-label="Envoyer à Deva">' + ICON.arrow + '</button></form>';
        var form = foot.querySelector(".intro-form"), input = foot.querySelector("#intro-quete");
        requestAnimationFrame(function () { log.scrollTop = log.scrollHeight; });
        input.focus({ preventScroll: true });
        foot.querySelectorAll("[data-go]").forEach(function (b) {
          b.addEventListener("click", function () { routeTo(b.getAttribute("data-go")); });
        });
        var ACK = {
          regen: "Parfait, je t'emmène créer ton lieu, étape par étape.",
          carte: "Allons explorer la carte vivante.",
          commun: "Je t'emmène découvrir les solutions du Commun."
        };
        function userBubble(txt) { var u = document.createElement("div"); u.className = "deva-msg from-user"; u.textContent = txt; log.appendChild(u); log.scrollTop = log.scrollHeight; }
        // Deva répond à une question via son moteur scripté, et laisse les portes ouvertes.
        function answerInline(txt) {
          var rep = (window.Deva && Deva.answer) ? Deva.answer(txt) : null;
          var text = rep && rep.text ? rep.text : rep;
          line(text || "Choisis une porte pour commencer : tu pourras tout explorer ensuite.").then(function () {
            if (!rep || !rep.actions || !rep.actions.length) return;
            var box = document.createElement("div"); box.className = "deva-chips";
            rep.actions.forEach(function (a) {
              var b = document.createElement("button"); b.type = "button"; b.className = "deva-chip"; b.textContent = a.label;
              b.addEventListener("click", function () { userBubble(a.label); answerInline(a.label); });
              box.appendChild(b);
            });
            log.appendChild(box); log.scrollTop = log.scrollHeight;
          });
          input.focus({ preventScroll: true });
        }
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var txt = input.value.trim(); if (!txt) { input.focus(); return; }
          userBubble(txt); input.value = "";
          // Centre d'intérêt (famille) détecté → on personnalise et pré-filtre la carte.
          var fam = detectFamily(txt);
          if (fam && FAM[fam]) { state.interestFam = fam; save(); if (typeof applyFamily === "function") applyFamily(fam); }
          // 1) Une vraie question → Deva y répond (FAQ), sans quitter l'onboarding.
          if (isQuestion(txt)) { answerInline(txt); return; }
          // 2) Une intention de navigation → on emmène vers la bonne porte.
          var kind = detectIntent(txt);
          if (kind) { foot.innerHTML = ""; line(ACK[kind]).then(function () { routeTo(kind); }); return; }
          // 3) Ni l'un ni l'autre → on tente quand même une réponse, sinon on oriente.
          answerInline(txt);
        });
      }

      // Enchaînement : Deva seule présente la vision EVAD.
      line("Bonjour, je suis Deva, l'assistant IA d'EVAD.")
        .then(function () { return wait(240); })
        .then(function () { return line("Bienvenue dans l'univers d'EVAD, la plateforme numérique qui connecte les solutions régénératives avec des projets pour construire un futur désirable."); })
        .then(function () { return wait(240); })
        .then(function () {
          if (state.prenom) return line("Ravi de te revoir, " + state.prenom + " ! Qu'est-ce qui t'amène aujourd'hui ?").then(askIntent);
          return line("Comment t'appelles-tu ?").then(askName);
        });
    }

    if (shouldIntro()) runIntro(function () { startHomeDeva(true); });
    else startHomeDeva(false);
  }

  /* ================= Écran 2 : le Commun ================= */
  // Carte d'une solution, recto / verso : devant le nom, l'illustration et la famille ; derrière le détail.
  function solutionCard(s, extra) {
    var diff = ""; for (var k = 1; k <= 3; k++) diff += '<span class="pip' + (k <= s.difficulte ? " on" : "") + '"></span>';
    var diffWord = ["", "accessible", "demande de l'organisation", "exigeante"][s.difficulte];
    var coutWord = ["", "modeste", "moyen", "important"][s.cout];
    var actions = extra && extra.actions ? '<div class="card-actions">' + extra.actions + "</div>" : "";
    var flipIcon = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 9a6 6 0 0 1 10.5-3.5M16 11a6 6 0 0 1-10.5 3.5M14 2v4h-4M6 18v-4h4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<article class="card sol-card flip fam-' + s.famille + '" data-sol="' + s.id + '" tabindex="0" aria-label="' + esc(s.nom) + ', ' + FAM[s.famille].label + '. Entrée pour retourner la carte.">' +
      '<div class="flip-inner">' +
      '<div class="flip-face flip-front">' +
      '<div class="card-top"><span class="fam-tag fam-' + s.famille + '">' + FAM[s.famille].label + "</span>" + (extra && extra.badge ? extra.badge : "") + "</div>" +
      '<div class="sol-illu" data-scene="' + esc(s.scene || "compost") + '" data-famille="' + s.famille + '" data-label="' + esc(s.nom) + '"></div>' +
      "<h3>" + esc(s.nom) + "</h3>" +
      '<button type="button" class="flip-btn link-btn" aria-expanded="false">' + flipIcon + "Voir le détail</button>" +
      actions +
      "</div>" +
      '<div class="flip-face flip-back" aria-hidden="true">' +
      '<div class="card-top"><span class="fam-tag fam-' + s.famille + '">' + FAM[s.famille].label + '</span><button type="button" class="flip-btn icon-btn icon-sm" aria-label="Retourner la carte">' + flipIcon + "</button></div>" +
      "<h3>" + esc(s.nom) + "</h3><p>" + esc(s.change) + "</p>" +
      '<dl class="meta"><div><dt>Difficulté</dt><dd><span class="pips" aria-hidden="true">' + diff + '</span> ' + diffWord + "</dd></div>" +
      "<div><dt>Coût</dt><dd>" + coutWord + "</dd></div>" +
      "<div><dt>Éprouvé</dt><dd>sur " + s.eprouve + " projets</dd></div></dl>" +
      '<p class="ici-lbl">ICI nourris</p><ul class="ici-chips" aria-label="ICI nourris">' + s.ici.map(function (i) { return '<li class="ici-chip">' + esc(ICI[i].nom) + "</li>"; }).join("") + "</ul>" +
      actions +
      "</div></div></article>";
  }
  // Après insertion des cartes : dessine les illustrations (SVG, aucune image) et branche le retournement.
  function hydrateCards(host) {
    if (!host) return;
    $all(".sol-illu[data-scene]", host).forEach(function (box) {
      if (box.dataset.done || !window.EvadScene || !EvadScene.renderSolutionIcon) return;
      EvadScene.renderSolutionIcon(box, box.dataset.scene, { label: "Illustration : " + box.dataset.label, famille: box.dataset.famille });
      box.dataset.done = "1";
    });
  }
  function flipCard(card, on) {
    var flipped = on === undefined ? !card.classList.contains("is-flipped") : on;
    card.classList.toggle("is-flipped", flipped);
    var front = card.querySelector(".flip-front"), back = card.querySelector(".flip-back");
    if (front) front.setAttribute("aria-hidden", String(flipped));
    if (back) back.setAttribute("aria-hidden", String(!flipped));
    var b = card.querySelector(".flip-front .flip-btn"); if (b) b.setAttribute("aria-expanded", String(flipped));
  }
  document.addEventListener("click", function (e) {
    var card = e.target.closest(".sol-card.flip"); if (!card) return;
    if (e.target.closest(".flip-btn")) { flipCard(card); return; }
    if (e.target.closest("a, button, input, select, label")) return;
    flipCard(card);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var card = e.target.closest && e.target.closest(".sol-card.flip");
    if (!card || e.target !== card) return;
    e.preventDefault(); flipCard(card);
  });
  function iciCard(x, actions) {
    var nourri = D.solutions.filter(function (s) { return s.ici.indexOf(x.id) >= 0; }).map(function (s) { return s.nom; });
    var fam = D.iciFamilles.find(function (f) { return f.id === x.famille; });
    return '<article class="card ici-card"><div class="card-top"><span class="ici-tag">ICI · ' + fam.label + "</span></div>" +
      "<h3>" + esc(x.nom) + '</h3><p>' + esc(x.observe) + '</p><p class="muted small">Nourri par : ' + esc(nourri.join(", ")) + "</p>" +
      (actions ? '<div class="card-actions">' + actions + "</div>" : "") + "</article>";
  }
  function familyChips(host, current, onChange, withAll) {
    host.innerHTML = (withAll !== false ? '<button type="button" class="chip" data-fam="" aria-pressed="' + (!current) + '">Toutes</button>' : "") +
      D.familles.map(function (f) { return '<button type="button" class="chip fam-chip fam-' + f.id + '" data-fam="' + f.id + '" aria-pressed="' + (current === f.id) + '">' + f.label + "</button>"; }).join("");
    $all("[data-fam]", host).forEach(function (b) { b.addEventListener("click", function () { onChange(b.dataset.fam); }); });
  }

  function pageCommun() {
    var fam = "", q = "";
    function draw() {
      familyChips($("#commun-fams"), fam, function (f) { fam = f; draw(); });
      var list = D.solutions.filter(function (s) {
        if (fam && s.famille !== fam) return false;
        if (q) { var t = (s.nom + " " + s.change + " " + FAM[s.famille].label + " " + s.ici.map(function (i) { return ICI[i].nom; }).join(" ")).toLowerCase(); if (t.indexOf(q) < 0) return false; }
        return true;
      });
      $("#commun-grid").innerHTML = list.length ? list.map(function (s) { return solutionCard(s); }).join("") : '<p class="empty">Rien ne correspond encore dans le Commun. C\'est peut-être à toi de le proposer.</p>';
      hydrateCards($("#commun-grid"));
      var icis = D.ici.filter(function (x) { return !q || (x.nom + " " + x.observe).toLowerCase().indexOf(q) >= 0; });
      $("#ici-grid").innerHTML = icis.map(function (x) { return iciCard(x); }).join("");
      $("#commun-count").textContent = list.length ? "" : "";
    }
    $("#commun-search").addEventListener("input", function () { q = this.value.trim().toLowerCase(); draw(); });
    draw();

    // volet « Proposer une solution »
    var drawer = $("#propose");
    $("#p-famille").innerHTML = D.familles.map(function (f) { return '<option value="' + f.id + '">' + f.label + "</option>"; }).join("");
    $("#p-ici").innerHTML = D.ici.map(function (x) { return '<label class="check"><input type="checkbox" name="ici" value="' + x.id + '"> ' + esc(x.nom) + "</label>"; }).join("");
    function openDrawer() { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); $("#propose-form").hidden = false; $("#propose-ok").hidden = true; $("#p-nom").focus(); }
    function closeDrawer() { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); $("#open-propose").focus(); }
    $("#open-propose").addEventListener("click", openDrawer);
    $all("[data-close-propose]").forEach(function (b) { b.addEventListener("click", closeDrawer); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer(); });
    $("#propose-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var nom = $("#p-nom").value.trim();
      if (!nom) { $("#p-nom").focus(); $("#p-nom").setAttribute("aria-invalid", "true"); return; }
      state.proposals.push({ id: uid("pr"), nom: nom, famille: $("#p-famille").value, change: $("#p-change").value.trim(), ici: $all("input[name=ici]:checked").map(function (c) { return c.value; }), ou: $("#p-ou").value.trim() });
      save();
      this.reset(); $("#p-nom").removeAttribute("aria-invalid");
      this.hidden = true; $("#propose-ok").hidden = false; $("#propose-ok").focus();
      drawProposals();
    });
    function drawProposals() {
      var box = $("#my-proposals");
      box.hidden = !state.proposals.length;
      box.innerHTML = '<h3 class="mini-title">Tes propositions en relecture</h3><ul>' + state.proposals.map(function (p) { return '<li><span class="badge st-reve">En relecture</span> ' + esc(p.nom) + ' <span class="muted">(' + FAM[p.famille].label + ")</span></li>"; }).join("") + "</ul>";
    }
    drawProposals();

    // Arrivée depuis « Explorer ce projet » : mettre en avant la solution ciblée.
    var target = param("sol");
    if (target && SOL[target]) {
      var card = $('#commun-grid [data-sol="' + target + '"]');
      if (card) {
        card.classList.add("is-highlight");
        card.setAttribute("tabindex", "-1");
        setTimeout(function () { card.scrollIntoView({ behavior: "smooth", block: "center" }); card.focus({ preventScroll: true }); }, 120);
        setTimeout(function () { card.classList.remove("is-highlight"); }, 3200);
      }
    }
  }

  /* ================= Écran 3 : Rêver ================= */
  function pageRever() {
    var sel = null;
    var host = $("#map");
    var locateMove = function (lat, lng) { state.project.loc = { lat: lat, lng: lng }; save(); draw(); };
    function draw() {
      renderMap(host, { viewBox: "185 190 610 440", onSelect: select, selected: sel, locate: { onMove: function (la, ln) { locateMove(la, ln); } }, highlight: function (p) { return p.statut === "prouve" || state.pinned.indexOf(p.id) >= 0; } });
    }
    function select(id) {
      sel = id; draw();
      var p = projectById(id), card = $("#mini-fiche");
      var pinned = state.pinned.indexOf(id) >= 0;
      card.innerHTML = '<button type="button" class="icon-btn mini-close" aria-label="Fermer la mini-fiche">' + ICON.close + "</button>" +
        '<div class="mini-scene" id="mini-scene"></div><div class="mini-body">' + statutBadge(p.statut) +
        '<h3 id="mini-title" tabindex="-1">' + esc(p.nom) + '</h3><p class="muted small">' + esc(p.lieu) + "</p><p>" + esc(p.promesse) + "</p>" +
        (p.isMine ? '<p class="muted small">C\'est ton projet.</p>' : '<button type="button" class="btn ' + (pinned ? "btn-ghost" : "btn-primary") + ' btn-sm" id="pin-btn" aria-pressed="' + pinned + '">' + ICON.pin + (pinned ? " Épinglé" : " Épingler") + "</button>") + "</div>";
      card.hidden = false;
      renderScene($("#mini-scene"), lieuFor(p));
      $(".mini-close", card).addEventListener("click", function () { card.hidden = true; sel = null; draw(); });
      var pb = $("#pin-btn");
      if (pb) pb.addEventListener("click", function () {
        var k = state.pinned.indexOf(id);
        if (k >= 0) { state.pinned.splice(k, 1); Deva.react("unpin"); } else { state.pinned.push(id); Deva.react("pin"); }
        save(); select(id); drawPins(); drawVisits();
      });
      $("#mini-title").focus({ preventScroll: true });
    }
    draw(); redrawMap = draw;

    var name = $("#v-nom"), prom = $("#v-promesse"), reve = $("#v-reve"), coll = $("#v-collectif"), pub = $("#v-public"), next = $("#to-explorer");
    name.value = state.project.name; prom.value = state.project.promesse; reve.value = state.project.reve;
    coll.value = state.project.collectif; pub.checked = state.project.public !== false;
    // Tant que la carte publique n'est pas active, on ne laisse pas croire à une publication.
    if (carteEnModeExemple() && pub.closest(".check-line")) {
      var pubNote = document.createElement("p");
      pubNote.className = "muted small"; pubNote.id = "v-public-note";
      pubNote.textContent = "La carte publique n'est pas encore active : pour l'instant, ton lieu n'est visible que par toi, sur cet appareil.";
      pub.closest(".check-line").insertAdjacentElement("afterend", pubNote);
    }
    function sync() {
      state.project.name = name.value; state.project.promesse = prom.value; state.project.reve = reve.value;
      state.project.collectif = coll.value; state.project.public = pub.checked; save();
      var ok = !!name.value.trim();
      next.disabled = !ok;
      $("#next-hint").hidden = ok && !!state.project.loc;
      $("#next-hint").textContent = !ok ? "Donne un nom à ton lieu pour continuer." : "Pense à situer ton lieu pour qu'il apparaisse sur la carte.";
      refreshChrome();
    }
    [name, prom, reve, coll].forEach(function (f) { f.addEventListener("input", sync); });
    pub.addEventListener("change", sync);
    var named = !!state.project.name.trim();
    name.addEventListener("change", function () { if (name.value.trim() && !named) { named = true; Deva.react("nom"); } });
    next.addEventListener("click", function () { if (!next.disabled) location.href = "explorer.html"; });

    // Géolocalisation du lieu : recherche d'adresse (Nominatim, OpenStreetMap) ou clic sur la carte.
    var geo = $("#v-geo"), geoRes = $("#v-geo-results"), geoStatus = $("#v-geo-status");
    geo.value = state.project.lieu;
    function shortLabel(r) {
      var a = r.address || {}, town = a.city || a.town || a.village || a.municipality || a.hamlet || "";
      var road = a.road ? (a.house_number ? a.house_number + " " : "") + a.road : "";
      return [road, town].filter(Boolean).join(", ") + (a.postcode ? " (" + a.postcode + ")" : "") || r.display_name;
    }
    function setLieu(lat, lng, label, recenter) {
      state.project.loc = { lat: +lat, lng: +lng };
      if (label) { state.project.lieu = label; geo.value = label; }
      geoStatus.textContent = "Lieu situé" + (label ? " : " + label : "") + ".";
      save(); sync(); draw(); drawVisits();
      if (recenter && host._lmap) host._lmap.setView([+lat, +lng], 13);
    }
    function search() {
      var q = geo.value.trim(); if (q.length < 3) { geoStatus.textContent = "Tape au moins 3 caractères."; return; }
      geoStatus.textContent = "Recherche…"; geoRes.innerHTML = "";
      fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=fr&accept-language=fr&q=" + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (list) {
          if (!list.length) { geoStatus.textContent = "Aucun résultat. Essaie avec la commune seule, ou clique directement la carte."; return; }
          geoStatus.textContent = list.length + " résultat" + (list.length > 1 ? "s" : "") + " : choisis le bon.";
          geoRes.innerHTML = list.map(function (r, k) { return '<li><button type="button" data-k="' + k + '">' + esc(r.display_name) + "</button></li>"; }).join("");
          $all("button", geoRes).forEach(function (b) { b.addEventListener("click", function () {
            var r = list[+b.dataset.k]; geoRes.innerHTML = ""; setLieu(r.lat, r.lon, shortLabel(r), true);
          }); });
          var first = $("button", geoRes); if (first) first.focus();
        })
        .catch(function () { geoStatus.textContent = "Recherche indisponible pour l'instant. Clique directement la carte pour situer ton lieu."; });
    }
    $("#v-geo-btn").addEventListener("click", search);
    geo.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); search(); } });
    // Clic ou glisser sur la carte : on situe, puis on retrouve la commune.
    locateMove = function (lat, lng) {
      setLieu(lat, lng, null, false);
      fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=16&accept-language=fr&lat=" + lat + "&lon=" + lng)
        .then(function (r) { return r.json(); })
        .then(function (r) { if (r && r.address) { state.project.lieu = shortLabel(r); geo.value = state.project.lieu; geoStatus.textContent = "Lieu situé : " + state.project.lieu + "."; save(); } })
        .catch(function () { /* la position suffit */ });
    };
    if (state.project.loc && host._lmap) host._lmap.setView([state.project.loc.lat, state.project.loc.lng], 11);
    sync();

    // Des lieux à visiter : trois lieux qui ont fait leurs preuves (ou en chemin),
    // les plus proches quand le lieu est situé. Deva propose, le porteur choisit.
    function visitsPick() {
      var me = state.project.loc, rank = { prouve: 0, encours: 1, reve: 2 };
      return allProjects().filter(function (p) { return !p.isMine; }).map(function (p) {
        var at = projectLoc(p), d = (me && at) ? distKm(me, at) : 400;
        return { p: p, s: rank[p.statut] * 1000 + d };
      }).sort(function (a, b) { return a.s - b.s; }).slice(0, 3).map(function (x) { return x.p; });
    }
    function showVisit(p) { select(p.id); var at = projectLoc(p); if (host._lmap && at) host._lmap.setView([at.lat, at.lng], 10); }
    function drawVisits() {
      var ul = $("#visit-list"); if (!ul) return;
      var me = state.project.loc, list = visitsPick();
      $("#visits-sub").textContent = me ? "Les plus proches de ton lieu, les prouvés d'abord." : "Situe ton lieu pour voir les plus proches. En attendant, des lieux qui ont fait leurs preuves.";
      ul.innerHTML = list.map(function (p) {
        var at = projectLoc(p), km = (me && at) ? Math.round(distKm(me, at)) : null, pinned = state.pinned.indexOf(p.id) >= 0;
        return '<li class="visit-item"><span class="dot st-' + p.statut + '" aria-hidden="true"></span>' +
          '<div class="visit-txt"><strong>' + esc(p.nom) + "</strong><span class=\"muted\">" + esc(p.lieu) + (km != null ? ", à " + km + " km" : "") + (p.isExample ? ", exemple" : "") + "</span></div>" +
          '<button type="button" class="btn btn-ghost btn-sm" data-visit="' + p.id + '">Visiter</button>' +
          '<button type="button" class="icon-btn icon-sm' + (pinned ? " is-on" : "") + '" data-visit-pin="' + p.id + '" aria-pressed="' + pinned + '" aria-label="' + (pinned ? "Retirer " + esc(p.nom) + " de mes inspirations" : "Épingler " + esc(p.nom)) + '">' + ICON.pin + "</button></li>";
      }).join("");
      $all("[data-visit]", ul).forEach(function (b) { b.addEventListener("click", function () { var p = projectById(b.dataset.visit); if (p) showVisit(p); }); });
      $all("[data-visit-pin]", ul).forEach(function (b) { b.addEventListener("click", function () {
        var id = b.dataset.visitPin, k = state.pinned.indexOf(id);
        if (k >= 0) { state.pinned.splice(k, 1); Deva.react("unpin"); } else { state.pinned.push(id); Deva.react("pin"); }
        save(); drawPins(); drawVisits(); if (sel) select(sel);
      }); });
    }

    function drawPins() {
      var ul = $("#pins");
      if (!state.pinned.length) { ul.innerHTML = '<li class="empty">Aucun projet épinglé. Clique un projet sur la carte pour t\'en inspirer.</li>'; return; }
      ul.innerHTML = state.pinned.map(function (id) {
        var p = projectById(id); if (!p) return "";
        return '<li class="pin-item"><span class="dot st-' + p.statut + '" aria-hidden="true"></span><button type="button" class="link-btn" data-show="' + id + '">' + esc(p.nom) + '</button><button type="button" class="icon-btn icon-sm" data-unpin="' + id + '" aria-label="Retirer ' + esc(p.nom) + ' de mes inspirations">' + ICON.close + "</button></li>";
      }).join("");
      $all("[data-unpin]", ul).forEach(function (b) { b.addEventListener("click", function () { state.pinned.splice(state.pinned.indexOf(b.dataset.unpin), 1); save(); drawPins(); drawVisits(); if (sel) select(sel); }); });
      $all("[data-show]", ul).forEach(function (b) { b.addEventListener("click", function () { select(b.dataset.show); }); });
    }
    drawPins();
    drawVisits();
    var visites = visitsPick();
    if (visites.length && window.Deva) {
      Deva.say("Trois lieux à visiter pour t'inspirer" + (state.project.loc ? ", les plus proches de chez toi" : "") + ". Clique pour les voir sur la carte.",
        { instant: true, actions: visites.map(function (p) { return { label: p.nom, once: false, onClick: function () { showVisit(p); } }; }) });
    }

    /* Deva t'accueille : raconte ton lieu idéal, il propose des projets voisins dont t'inspirer. */
    var STOP = " le la les un une des de du d et a au aux en dans pour par sur avec sans vers chez que qui quoi ou mon ma mes ton ta tes son sa ses notre nos leur leurs ce cet cette ces on nous vous ils elles il elle je tu se est sont etre avoir plus moins tres bien plutot aussi comme lieu projet envie reve rever ".split(" ");
    function nrm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
    function toks(s) { return nrm(s).split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3 && STOP.indexOf(w) < 0; }); }
    // Corpus par projet : promesse, collectif, lieu, familles et noms des solutions.
    function corpus(p) {
      var sols = (p.solutions || []).map(function (s) { var so = SOL[s[0]]; return so ? so.nom + " " + (FAM[so.famille] ? FAM[so.famille].label : "") : ""; }).join(" ");
      return nrm([p.nom, p.promesse, p.collectif, p.lieu, sols].join(" "));
    }
    function matchProjects(txt) {
      var words = toks(txt);
      if (!words.length) return [];
      var scored = D.projets.map(function (p) {
        var c = corpus(p), s = 0;
        words.forEach(function (w) { if (c.indexOf(w) >= 0) s += 1; });
        if (p.statut === "prouve") s += 0.3; // à mots égaux, on met en avant ce qui est prouvé
        return { p: p, s: s };
      }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
      return scored.slice(0, 3).map(function (x) { return x.p; });
    }
    function proven() { return D.projets.filter(function (p) { return p.statut === "prouve"; }).slice(0, 3); }
    function onDream(txt) {
      state.project.reveBrief = txt; save();
      var found = matchProjects(txt), fallback = !found.length;
      var list = fallback ? proven() : found;
      var actions = list.map(function (p) { return { label: p.nom, once: false, onClick: function () { select(p.id); if (host._lmap && p.lat != null) host._lmap.setView([p.lat, p.lng], 9); } }; });
      actions.push({ label: "Reprendre mes mots dans ma vision", primary: true, onClick: function () {
        reve.value = reve.value.trim() ? reve.value + "\n" + txt : txt;
        state.project.reve = reve.value; save(); reve.focus();
      } });
      var intro = fallback
        ? "Joli rêve. Je n'ai pas trouvé de jumeau évident, alors inspire-toi de ces lieux déjà prouvés. Clique pour les voir, épingle ceux qui te parlent :"
        : "Ton lieu idéal me fait penser à " + (list.length > 1 ? "ces projets" : "ce projet") + ". Clique pour les voir sur la carte et épingle ceux qui t'inspirent :";
      return { text: intro, actions: actions };
    }
    if (!state.project.name.trim() && !state.project.reveBrief && window.Deva && Deva.prompt) {
      setTimeout(function () {
        Deva.prompt("Avant de nommer ton lieu, raconte-moi ton lieu idéal en quelques mots : ce qu'on y fait, pour qui, ce que ça change autour.", onDream);
      }, 700);
    }
  }

  /* ================= Écran 4 : Explorer ================= */
  function wrapWords(text, max) {
    var words = text.split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
    if (cur) lines.push(cur);
    return lines;
  }
  function pageExplorer() {
    var fam = "", pulse = null;
    if (!state.spaces.some(function (s) { return s.id === state.selectedSpace; })) state.selectedSpace = state.spaces[0] ? state.spaces[0].id : null;

    // Ajout d'un espace (saisi, ou proposé par Deva parmi les quatre classiques).
    function addSpace(id, nom) {
      if (state.spaces.length >= 9) { toast("Neuf espaces, c'est déjà un beau lieu. Regroupe avant d'en ajouter."); return; }
      var s = { id: id || uid("s"), nom: nom, cells: [] }; state.spaces.push(s); state.selectedSpace = s.id; save();
      pulse = s.id; drawAll(); Deva.react("espace");
    }
    function drawSpaceSugg() {
      var box = $("#space-sugg"); if (!box) return;
      var rest = D.espaces.filter(function (e) { return !state.spaces.some(function (s) { return s.id === e.id; }); });
      if (!rest.length || state.spaces.length >= 9) { box.innerHTML = ""; return; }
      box.innerHTML = '<span class="sugg-lbl">' + leafSvg("") + "Deva propose, tu décides :</span>" +
        rest.map(function (e) { return '<button type="button" class="deva-chip" data-space-add="' + e.id + '">+ ' + esc(e.nom) + "</button>"; }).join("");
      $all("[data-space-add]", box).forEach(function (b) { b.addEventListener("click", function () {
        var e = D.espaces.find(function (x) { return x.id === b.dataset.spaceAdd; }); if (e) addSpace(e.id, e.nom);
      }); });
    }
    function chosenIn(spaceId) { return state.chosen.filter(function (c) { return c.spaceId === spaceId; }); }
    function selSpace() { return state.spaces.find(function (s) { return s.id === state.selectedSpace; }) || null; }
    // Outils de l'espace sélectionné : le renommer, lui donner une nature (texture du sol), le supprimer.
    function drawTools() {
      var f = $("#space-tools"), sp = selSpace(); if (!f) return;
      f.hidden = !sp; if (!sp) return;
      $("#space-rename").value = sp.nom; $("#space-kind").value = sp.kind || "";
    }
    function removeSpace(sp) {
      var ids = chosenIn(sp.id).map(function (c) { return c.id; });
      state.chosen = state.chosen.filter(function (c) { return c.spaceId !== sp.id; });
      state.placed = state.placed.filter(function (p) { return ids.indexOf(p.chosenId) < 0 && p.spaceId !== sp.id; });
      state.spaces = state.spaces.filter(function (x) { return x.id !== sp.id; });
      state.selectedSpace = state.spaces[0] ? state.spaces[0].id : null;
      save(); drawAll(); toast("Espace retiré : " + sp.nom + ".");
    }

    function drawMind() {
      drawSpaceSugg();
      if (!state.spaces.length) {
        $("#mind").innerHTML = '<div class="mind-empty"><p>Ton lieu n\'a pas encore d\'espace. Commence par en créer un : un jardin, un atelier, un café, un coin pour décider ensemble. Deva en propose ci-dessous, tu décides.</p></div>';
        $("#sel-space").textContent = "aucun pour l'instant";
        return;
      }
      var W = 620, H = 450, cx = 310, cy = 222, n = state.spaces.length;
      var svg = '<svg viewBox="0 0 ' + W + " " + H + '" class="mind-svg" role="group" aria-label="Carte mentale des espaces du projet">';
      var nodes = state.spaces.map(function (s, k) {
        var a = -Math.PI / 2 + k * 2 * Math.PI / n;
        return { s: s, x: cx + Math.cos(a) * 205, y: cy + Math.sin(a) * 158 };
      });
      nodes.forEach(function (nd) { svg += '<path class="mind-line' + (nd.s.id === state.selectedSpace ? " is-sel" : "") + '" d="M' + cx + " " + cy + " Q" + ((cx + nd.x) / 2) + " " + ((cy + nd.y) / 2 + 18) + " " + nd.x + " " + nd.y + '"/>'; });
      var lines = wrapWords(projectName(), 13);
      svg += '<g class="mind-center"><circle cx="' + cx + '" cy="' + cy + '" r="62"/>' + lines.map(function (l, k) { return '<text x="' + cx + '" y="' + (cy + (k - (lines.length - 1) / 2) * 18 + 6) + '">' + esc(l) + "</text>"; }).join("") + "</g>";
      nodes.forEach(function (nd) {
        var sols = chosenIn(nd.s.id), shown = sols.slice(0, 3), h = 44 + (sols.length ? shown.length * 17 + (sols.length > 3 ? 17 : 0) + 4 : 0), w = 180;
        var sel = nd.s.id === state.selectedSpace;
        svg += '<g class="mind-node' + (sel ? " is-sel" : "") + (pulse === nd.s.id ? " pulse-once" : "") + '" role="button" tabindex="0" data-space="' + nd.s.id + '" aria-pressed="' + sel + '" aria-label="Espace ' + esc(nd.s.nom) + (sols.length ? ", solutions : " + esc(sols.map(function (c) { return SOL[c.solId].nom; }).join(", ")) : ", aucune solution") + '">' +
          '<rect x="' + (nd.x - w / 2) + '" y="' + (nd.y - 23) + '" width="' + w + '" height="' + h + '" rx="16"/>' +
          '<text class="mind-name" x="' + nd.x + '" y="' + (nd.y + 5) + '">' + esc(nd.s.nom) + "</text>" +
          shown.map(function (c, k) { return '<text class="mind-sol" x="' + (nd.x - w / 2 + 16) + '" y="' + (nd.y + 32 + k * 17) + '">+ ' + esc(SOL[c.solId].nom.length > 21 ? SOL[c.solId].nom.slice(0, 20) + "…" : SOL[c.solId].nom) + "</text>"; }).join("") +
          (sols.length > 3 ? '<text class="mind-sol" x="' + (nd.x - w / 2 + 16) + '" y="' + (nd.y + 32 + 3 * 17) + '">et ' + (sols.length - 3 === 1 ? "une autre" : "d'autres") + "</text>" : "") +
          "</g>";
      });
      svg += "</svg>";
      $("#mind").innerHTML = svg;
      pulse = null;
      $all(".mind-node").forEach(function (g) {
        function pick() { state.selectedSpace = g.dataset.space; save(); drawAll(); var el = $('.mind-node[data-space="' + g.dataset.space + '"]'); if (el) el.focus(); }
        g.addEventListener("click", pick);
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      });
      $("#sel-space").textContent = spaceName(state.selectedSpace);
    }

    function drawCommun() {
      familyChips($("#ex-fams"), fam, function (f) { fam = f; drawCommun(); });
      var sugg = D.suggestionsParEspace[state.selectedSpace] || [];
      var list = D.solutions.filter(function (s) { return !fam || s.famille === fam; });
      list.sort(function (a, b) { return (sugg.indexOf(a.id) < 0) - (sugg.indexOf(b.id) < 0); });
      $("#ex-list").innerHTML = list.map(function (s) {
        var c = state.chosen.find(function (x) { return x.solId === s.id; });
        var actions = c
          ? '<span class="added">' + ICON.check + " Dans " + esc(spaceName(c.spaceId)) + '</span><button type="button" class="link-btn" data-remove="' + s.id + '">Retirer</button>'
          : '<button type="button" class="btn btn-primary btn-sm" data-add="' + s.id + '">Ajouter à mon projet</button>';
        return solutionCard(s, { badge: sugg.indexOf(s.id) >= 0 ? '<span class="deva-badge">' + leafSvg("") + "Deva propose</span>" : "", actions: actions });
      }).join("") + '<h3 class="col-sub">Indicateurs ICI</h3>' + D.ici.map(function (x) {
        var on = state.icis.indexOf(x.id) >= 0;
        return iciCard(x, on ? '<span class="added">' + ICON.check + ' Suivi dans mon projet</span><button type="button" class="link-btn" data-ici-off="' + x.id + '">Retirer</button>' : '<button type="button" class="btn btn-amber btn-sm" data-ici="' + x.id + '">Ajouter à mon projet</button>');
      }).join("");
      hydrateCards($("#ex-list"));
      $all("[data-add]").forEach(function (b) { b.addEventListener("click", function () {
        if (!state.selectedSpace) { toast("Crée d'abord un espace, ou prends-en un proposé par Deva, puis accroche-lui cette solution."); $("#space-name").focus(); return; }
        state.chosen.push({ id: uid("c"), solId: b.dataset.add, spaceId: state.selectedSpace }); save();
        pulse = state.selectedSpace; drawAll(); Deva.react("add:" + b.dataset.add, "add");
        var again = $('[data-remove="' + b.dataset.add + '"]'); if (again) again.focus();
      }); });
      $all("[data-remove]").forEach(function (b) { b.addEventListener("click", function () {
        var c = state.chosen.find(function (x) { return x.solId === b.dataset.remove; });
        state.chosen = state.chosen.filter(function (x) { return x !== c; });
        state.placed = state.placed.filter(function (p) { return p.chosenId !== c.id; });
        save(); drawAll();
      }); });
      $all("[data-ici]").forEach(function (b) { b.addEventListener("click", function () { state.icis.push(b.dataset.ici); save(); drawCommun(); toast("ICI ajouté : tu pourras le nourrir avec tes preuves."); }); });
      $all("[data-ici-off]").forEach(function (b) { b.addEventListener("click", function () { state.icis = state.icis.filter(function (x) { return x !== b.dataset.iciOff; }); save(); drawCommun(); }); });
    }

    function drawChosen() {
      var ul = $("#chosen");
      if (!state.chosen.length) { ul.innerHTML = '<li class="empty">Aucune solution choisie. Crée ou sélectionne un espace, puis ajoute des solutions du Commun à droite.</li>'; return; }
      ul.innerHTML = state.chosen.map(function (c) {
        return '<li class="chosen-item fam-' + SOL[c.solId].famille + '"><span class="fam-dot" aria-hidden="true"></span><span><strong>' + esc(SOL[c.solId].nom) + '</strong> <span class="muted">dans ' + esc(spaceName(c.spaceId)) + '</span></span><button type="button" class="icon-btn icon-sm" data-unchoose="' + c.id + '" aria-label="Retirer ' + esc(SOL[c.solId].nom) + '">' + ICON.close + "</button></li>";
      }).join("");
      $all("[data-unchoose]", ul).forEach(function (b) { b.addEventListener("click", function () {
        state.chosen = state.chosen.filter(function (x) { return x.id !== b.dataset.unchoose; });
        state.placed = state.placed.filter(function (p) { return p.chosenId !== b.dataset.unchoose; });
        save(); drawAll();
      }); });
    }
    function drawAll() { drawMind(); drawTools(); drawCommun(); drawChosen(); refreshChrome(); }

    $("#space-tools").addEventListener("submit", function (e) {
      e.preventDefault(); var sp = selSpace(); if (!sp) return;
      var nom = $("#space-rename").value.trim(); if (nom) sp.nom = nom;
      sp.kind = $("#space-kind").value || undefined;
      save(); drawAll(); toast("Espace mis à jour : " + sp.nom + ".");
    });
    $("#space-kind").addEventListener("change", function () { var sp = selSpace(); if (!sp) return; sp.kind = this.value || undefined; save(); });
    $("#space-delete").addEventListener("click", function () {
      var sp = selSpace(); if (!sp) return;
      var n = chosenIn(sp.id).length;
      if (!n) { removeSpace(sp); return; }
      var dlg = openModal("Supprimer " + sp.nom + " ?", "<p>" + (n > 1 ? n + " solutions y sont accrochées : elles seront retirées" : "Une solution y est accrochée : elle sera retirée") + " de ton projet avec l'espace.</p>",
        '<button type="button" class="btn btn-ghost" data-close>Garder</button><button type="button" class="btn btn-primary" id="confirm-del">Supprimer</button>');
      $("#confirm-del", dlg).addEventListener("click", function () { dlg.close(); removeSpace(sp); });
    });
    $("#add-space").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("#space-name"), nom = input.value.trim() || "Nouvel espace";
      input.value = ""; addSpace(null, nom);
    });
    drawAll();
  }

  /* ================= Vadance (jauges en feuilles) ================= */
  function vadanceHtml() {
    var all = familySums(), enc = familySums(function (p) { return p.status !== "prevu"; }), ver = familySums(function (p) { return p.status === "verifie"; });
    return D.iciFamilles.map(function (f) {
      var la = levelFrom(all[f.id]), le = levelFrom(enc[f.id]), lv = levelFrom(ver[f.id]), leaves = "";
      for (var k = 0; k < 5; k++) leaves += leafSvg(k < lv ? "on-green" : k < le ? "on-amber" : k < la ? "on-grey" : "off");
      return '<div class="vad-row"><div class="vad-head"><span class="vad-lbl">' + f.label + '</span><span class="vad-word">' + LEVEL_WORDS[la] + '</span></div><span class="leaves leaves-lg" role="img" aria-label="' + f.label + " : impact prévu " + LEVEL_WORDS[la] + '">' + leaves + "</span></div>";
    }).join("");
  }

  /* ================= Écran 5 : Générer ================= */
  // Emprise d'une solution sur la grille : fixe (emprise [w, d]) ou linéaire (haie, planches : longueur au choix).
  // La taille ne change que le dessin, jamais l'impact.
  function dimsDe(solId, pref) {
    var s = SOL[solId] || {}; pref = pref || {};
    if (s.lineaire) {
      var n = Math.max(s.lineaire.min, Math.min(s.lineaire.max, pref.len || s.lineaire.defaut || s.lineaire.min));
      return pref.vertical ? { w: 1, d: n } : { w: n, d: 1 };
    }
    var e = s.emprise || [1, 1];
    return pref.vertical ? { w: e[1], d: e[0] } : { w: e[0], d: e[1] };
  }
  function dansEmprise(p, i, j) { return i >= p.i && i < p.i + (p.w || 1) && j >= p.j && j < p.j + (p.d || 1); }
  function pageGenerer() {
    var armed = null, api = null, armPref = {};
    var wrap = $("#scene-wrap"), stage = $("#scene"), menu = $("#item-menu");
    function toPlace() { return state.chosen.filter(function (c) { return !state.placed.some(function (p) { return p.chosenId === c.id; }); }); }

    function drawBar() {
      var bar = $("#to-place"), list = toPlace();
      if (!state.chosen.length) {
        bar.innerHTML = '<p class="empty">Tu n\'as pas encore choisi de solutions. <a href="explorer.html">Retourner à Explorer</a> ou <button type="button" class="link-btn" id="take-sugg">reprendre les suggestions de Deva</button>.</p>';
        $("#take-sugg").addEventListener("click", function () {
          // les suggestions s'accrochent à trois espaces classiques : on les crée s'ils manquent
          ["jardin", "atelier", "cafe"].forEach(function (sid) {
            if (!state.spaces.some(function (s) { return s.id === sid; })) { var e = D.espaces.find(function (x) { return x.id === sid; }); if (e) state.spaces.push({ id: e.id, nom: e.nom }); }
          });
          if (!state.selectedSpace) state.selectedSpace = state.spaces[0].id;
          ["haie", "recup-eau", "solaire", "four"].forEach(function (id, k) { if (!state.chosen.some(function (c) { return c.solId === id; })) state.chosen.push({ id: uid("c"), solId: id, spaceId: ["jardin", "jardin", "atelier", "cafe"][k] }); });
          save(); drawScene(); drawBar(); refreshChrome(); Deva.say("Voici quatre solutions éprouvées du Commun. Tu restes libre de les poser ou non.");
        });
        return;
      }
      if (!list.length) { bar.innerHTML = '<p class="empty">Toutes tes solutions sont posées. Tu peux <a href="explorer.html">en ajouter</a> ou passer à Entreprendre.</p>'; return; }
      bar.innerHTML = list.map(function (c) {
        var s = SOL[c.solId];
        return '<button type="button" class="sol-chip fam-' + s.famille + (armed === c.id ? " is-armed" : "") + '" draggable="true" data-chosen="' + c.id + '" aria-pressed="' + (armed === c.id) + '"><span class="fam-dot" aria-hidden="true"></span>' + esc(s.nom) + "</button>";
      }).join("");
      $all(".sol-chip", bar).forEach(function (b) {
        b.addEventListener("dragstart", function (e) { if (armed !== b.dataset.chosen) armPref = {}; armed = b.dataset.chosen; e.dataTransfer.setData("text/plain", b.dataset.chosen); e.dataTransfer.effectAllowed = "copy"; wrap.classList.add("is-dropping"); setTimeout(drawScene, 0); });
        b.addEventListener("dragend", function () { wrap.classList.remove("is-dropping"); if (api) api.showHover(null); });
        b.addEventListener("click", function () { if (drawing) endDraw(); armedDecor = null; drawDecorChips(); drawDecorHint(); armed = armed === b.dataset.chosen ? null : b.dataset.chosen; armPref = {}; drawBar(); drawHint(); drawScene(); var again = $('[data-chosen="' + b.dataset.chosen + '"]'); if (again) again.focus(); });
      });
    }
    function drawHint() {
      var h = $("#place-hint");
      if (!armed) { h.hidden = true; wrap.classList.remove("is-armed"); return; }
      var c = state.chosen.find(function (x) { return x.id === armed; });
      h.hidden = false; wrap.classList.add("is-armed");
      var sd = SOL[c.solId], dm = dimsDe(c.solId, armPref), n = Math.max(dm.w, dm.d);
      var taille = sd.lineaire
        ? '<span class="dim-ctl"><button type="button" class="icon-btn icon-sm" id="len-less" aria-label="Raccourcir">\u2212</button><strong>' + n + (n > 1 ? " cases" : " case") + '</strong><button type="button" class="icon-btn icon-sm" id="len-more" aria-label="Allonger">+</button> <button type="button" class="link-btn" id="arm-rotate">Tourner</button></span>'
        : (dm.w !== dm.d ? '<span class="dim-ctl"><strong>' + dm.w + " x " + dm.d + ' cases</strong> <button type="button" class="link-btn" id="arm-rotate">Tourner</button></span>' : (dm.w > 1 ? '<span class="dim-ctl"><strong>' + dm.w + " x " + dm.d + " cases</strong></span>" : ""));
      h.innerHTML = "Clique une case dans <strong>" + esc(spaceName(c.spaceId)) + "</strong> pour poser <strong>" + esc(SOL[c.solId].nom) + "</strong>. " + taille +
        ' <button type="button" class="link-btn" id="auto-place">Poser dans son espace</button> <button type="button" class="link-btn" id="cancel-arm">Annuler</button>';
      $("#auto-place").addEventListener("click", function () { var spot = trouverPlace(c.spaceId, c.solId, dm, function (x) { return Math.abs(x.i - 4) + Math.abs(x.j - 4); }); if (spot) place(armed, spot.i, spot.j, spot.dm); else toast("Plus de place dans " + spaceName(c.spaceId) + ". Agrandis-le ou retire un élément."); });
      $("#cancel-arm").addEventListener("click", function () { armed = null; drawBar(); drawHint(); drawScene(); });
      var rot = $("#arm-rotate"); if (rot) rot.addEventListener("click", function () { armPref.vertical = !armPref.vertical; drawHint(); });
      var less = $("#len-less"), more = $("#len-more");
      if (less) less.addEventListener("click", function () { armPref.len = Math.max(sd.lineaire.min, n - 1); drawHint(); });
      if (more) more.addEventListener("click", function () { armPref.len = Math.min(sd.lineaire.max, n + 1); drawHint(); });
    }
    // Une place pour l'emprise demandée dans l'espace ; une solution linéaire se raccourcit si besoin.
    function trouverPlace(zoneId, solId, dm, prefer, except) {
      var sd = SOL[solId] || {}, cands = [dm];
      if (sd.lineaire) for (var k = Math.max(dm.w, dm.d) - 1; k >= sd.lineaire.min; k--) cands.push(dm.w >= dm.d ? { w: k, d: 1 } : { w: 1, d: k });
      for (var q = 0; q < cands.length; q++) { var cell = api.firstFreeRectIn(zoneId, cands[q].w, cands[q].d, prefer, except); if (cell) return { i: cell.i, j: cell.j, dm: cands[q] }; }
      return null;
    }
    // Quand la grille change (taille d'un espace), chaque solution posée reste dans son espace,
    // sur sa case si elle est encore libre, sinon sur la case libre la plus proche.
    function resnapPlaced() {
      var zones = EvadScene.layoutZones(state.spaces, 9), walk = zones.walk || {}, occ = {};
      (state.decor || []).forEach(function (d) { occ[d.i + "," + d.j] = 1; });
      function zoneOf(id) { return zones.filter(function (z) { return z.id === id; })[0]; }
      var perdus = [];
      function fits(z, i, j, w, d) { for (var a = 0; a < w; a++) for (var b = 0; b < d; b++) { var k = (i + a) + "," + (j + b); if (!z.map[k] || walk[k] || occ[k]) return false; } return true; }
      function take(i, j, w, d) { for (var a = 0; a < w; a++) for (var b = 0; b < d; b++) occ[(i + a) + "," + (j + b)] = 1; }
      state.placed.forEach(function (p) {
        var z = zoneOf(p.spaceId); if (!z) return;
        var pw = p.w || 1, pd = p.d || 1, sd = SOL[p.solId] || {};
        if (fits(z, p.i, p.j, pw, pd)) { take(p.i, p.j, pw, pd); return; }
        var cands = [{ w: pw, d: pd }];
        if (sd.lineaire) for (var k = Math.max(pw, pd) - 1; k >= sd.lineaire.min; k--) cands.push(pw >= pd ? { w: k, d: 1 } : { w: 1, d: k });
        var best = null;
        cands.some(function (dm) {
          var bd = 1e9;
          z.list.forEach(function (c) { if (!fits(z, c.i, c.j, dm.w, dm.d)) return; var dist = Math.abs(c.i - p.i) + Math.abs(c.j - p.j); if (dist < bd) { bd = dist; best = { i: c.i, j: c.j, w: dm.w, d: dm.d }; } });
          return !!best;
        });
        if (best) { p.i = best.i; p.j = best.j; p.w = best.w; p.d = best.d; take(best.i, best.j, best.w, best.d); } else perdus.push(z.nom);
      });
      if (perdus.length) toast("Plus assez de place dans " + perdus[0] + " : agrandis-le ou retire une solution.");
    }
    function openZoneMenu(zoneId) {
      var sp = state.spaces.find(function (x) { return x.id === zoneId; }); if (!sp) return;
      var g = $('.iso-zone[data-zone="' + zoneId + '"]', stage); if (!g) return;
      var r = g.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      menu.dataset.uid = "zone:" + zoneId;
      var autres = state.spaces.filter(function (x) { return x.id !== sp.id; });
      menu.innerHTML = '<p class="menu-title">' + esc(sp.nom) + ' <span class="muted small">' + (sp.cells || []).length + (sp.cells && sp.cells.length > 1 ? " cases" : " case") + "</span></p>" +
        '<button type="button" role="menuitem" data-draw="' + sp.id + '">' + ICON.arrow + "Redessiner ses blocs</button>" +
        (autres.length ? '<p class="menu-sub">Échanger les blocs avec</p>' + autres.map(function (x) { return '<button type="button" role="menuitem" data-swap="' + x.id + '">' + ICON.arrow + esc(x.nom) + "</button>"; }).join("") : "");
      $all("[data-draw]", menu).forEach(function (b) { b.addEventListener("click", function () { menu.hidden = true; startDraw(b.dataset.draw); }); });
      menu.hidden = false;
      var x = Math.min(Math.max(8, r.left - wr.left + r.width / 2 - 110), wr.width - 228), y = r.top - wr.top + r.height / 2;
      if (y + menu.offsetHeight > wr.height) y = Math.max(8, wr.height - menu.offsetHeight - 8);
      menu.style.left = x + "px"; menu.style.top = y + "px";
      // échanger la place de deux espaces sur la grille : leurs solutions suivent chacune leur espace
      $all("[data-swap]", menu).forEach(function (b) { b.addEventListener("click", function () {
        var a = state.spaces.indexOf(sp), k = state.spaces.findIndex(function (x) { return x.id === b.dataset.swap; });
        if (a < 0 || k < 0) return;
        var autre = state.spaces[k];
        var cs = sp.cells || []; sp.cells = autre.cells || []; autre.cells = cs;
        resnapPlaced(); save(); menu.hidden = true;
        drawScene(); drawVadance(); refreshChrome();
        Deva.say(sp.nom + " et " + autre.nom + " ont échangé leurs blocs. Leurs solutions ont suivi.", { instant: true });
      }); });
      var first = $("[role^=menuitem]", menu); if (first) first.focus();
    }
    /* ---- Décor libre : arbres, bancs, fleurs, allées. Sans impact ni preuve. ---- */
    var DECOR = [
      { id: "arbre", nom: "Arbre", type: "arbre" }, { id: "fruitier", nom: "Arbre fruitier", type: "fruitier" },
      { id: "haie", nom: "Haie", type: "haieI" }, { id: "fleurs", nom: "Massif de fleurs", type: "fleurs" },
      { id: "banc", nom: "Banc", type: "banc" }, { id: "rocher", nom: "Rocher", type: "rocher" }, { id: "allee", nom: "Allée", type: "allee" }
    ];
    var armedDecor = null;
    if (!Array.isArray(state.decor)) state.decor = [];
    function drawDecorChips() {
      var box = $("#decor-chips"); if (!box) return;
      box.innerHTML = DECOR.map(function (d) { return '<button type="button" class="sol-chip decor-chip' + (armedDecor === d.id ? " is-armed" : "") + '" data-decor-add="' + d.id + '" aria-pressed="' + (armedDecor === d.id) + '"><span class="fam-dot" aria-hidden="true"></span>' + d.nom + "</button>"; }).join("");
      $all("[data-decor-add]", box).forEach(function (b) { b.addEventListener("click", function () {
        if (drawing) endDraw();
        armed = null; armedDecor = armedDecor === b.dataset.decorAdd ? null : b.dataset.decorAdd;
        drawBar(); drawHint(); drawDecorChips(); drawDecorHint(); drawScene();
        var again = $('[data-decor-add="' + b.dataset.decorAdd + '"]'); if (again) again.focus();
      }); });
    }
    function drawDecorHint() {
      var h = $("#decor-hint"); if (!h) return;
      var d = DECOR.find(function (x) { return x.id === armedDecor; });
      if (!d) { h.hidden = true; wrap.classList.remove("is-armed"); return; }
      h.hidden = false; wrap.classList.add("is-armed");
      h.innerHTML = "Clique une case libre pour poser <strong>" + d.nom.toLowerCase() + "</strong>, autant de fois que tu veux. " + '<button type="button" class="link-btn" id="decor-stop">Arrêter</button>';
      $("#decor-stop").addEventListener("click", function () { armedDecor = null; drawDecorChips(); drawDecorHint(); });
    }
    function placeDecor(i, j) {
      var d = DECOR.find(function (x) { return x.id === armedDecor; }); if (!d) return;
      var key = i + "," + j;
      if (d.type === "allee") {
        if ((state.decor || []).some(function (x) { return x.i === i && x.j === j; }) || state.placed.some(function (p) { return p.i === i && p.j === j; })) { toast("Cette case est déjà prise."); return; }
      } else if (!api.isFree(i, j)) { toast("Cette case est occupée. Choisis une case libre."); return; }
      state.decor.push({ uid: uid("d"), type: d.type, nom: d.nom, i: i, j: j });
      save(); drawScene();
    }
    function openDecorMenu(u, g) {
      var d = state.decor.find(function (x) { return x.uid === u; }); if (!d) return;
      var r = g.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      menu.dataset.uid = "decor:" + u;
      menu.innerHTML = '<p class="menu-title">' + esc(d.nom || "Décor") + ' <span class="muted small">décor, sans impact</span></p>' +
        (/^haie/.test(d.type) ? '<button type="button" role="menuitem" data-dact="tourner">' + ICON.arrow + "Tourner</button>" : "") +
        '<button type="button" role="menuitem" data-dact="retirer" class="danger">Retirer</button>';
      menu.hidden = false;
      var x = Math.min(Math.max(8, r.left - wr.left + r.width / 2 - 110), wr.width - 228), y = r.top - wr.top + r.height + 6;
      if (y + menu.offsetHeight > wr.height) y = Math.max(8, r.top - wr.top - menu.offsetHeight - 6);
      menu.style.left = x + "px"; menu.style.top = y + "px";
      $all("[data-dact]", menu).forEach(function (b) { b.addEventListener("click", function () {
        if (b.dataset.dact === "retirer") state.decor = state.decor.filter(function (x) { return x.uid !== u; });
        else d.type = d.type === "haieI" ? "haieJ" : "haieI";
        save(); menu.hidden = true; drawScene();
      }); });
      var first = $("[role=menuitem]", menu); if (first) first.focus();
    }
    // Allées posées : visibles mais sans objet, on les retire en reposant une allée dessus
    function toggleAllee(i, j) {
      var k = state.decor.findIndex(function (x) { return x.type === "allee" && x.i === i && x.j === j; });
      if (k < 0) return false;
      state.decor.splice(k, 1); save(); drawScene(); return true;
    }

    /* ---- Dessiner les blocs : le porteur clique un espace puis choisit ses cases sur la maquette ---- */
    var drawing = null, painting = null, lastKey = null, prevenu = false;
    function cellsOf(sp) { return sp.cells || (sp.cells = []); }
    // Au premier dessin, la grille automatique devient le point de départ de chaque espace.
    function figerBlocs() { state.spaces.forEach(function (x) { if (!Array.isArray(x.cells)) x.cells = []; }); }
    function startDraw(id) {
      armed = null; armedDecor = null; drawDecorHint(); figerBlocs(); drawing = id || (state.spaces[0] && state.spaces[0].id); prevenu = false;
      wrap.classList.add("is-drawing"); save(); drawBar(); drawHint(); drawDrawBar(); drawScene();
      var sp = state.spaces.find(function (x) { return x.id === drawing; });
      Deva.say("Dessine " + (sp ? sp.nom : "l'espace") + " : clique ou glisse sur les cases pour les lui donner, reclique pour les retirer. Change d'espace dans la barre au-dessus de la maquette.", { instant: true });
    }
    function endDraw() {
      drawing = null; painting = null; wrap.classList.remove("is-drawing");
      resnapPlaced(); save(); drawDrawBar(); drawScene(); drawVadance(); refreshChrome();
      var vides = state.spaces.filter(function (x) { return !(x.cells || []).length; }).map(function (x) { return x.nom; });
      if (vides.length) Deva.say((vides.length > 1 ? vides.join(", ") + " n'ont pas encore de bloc" : vides[0] + " n'a pas encore de bloc") + " sur la maquette. Reviens dessiner quand tu veux.", { instant: true });
      else Deva.say("Ta maquette suit ton dessin. Tu peux poser tes solutions.", { instant: true });
    }
    function drawDrawBar() {
      var bar = $("#draw-bar"); if (!bar) return;
      bar.hidden = !drawing; if (!drawing) return;
      bar.innerHTML = '<span class="draw-lbl">Espace à dessiner :</span>' +
        state.spaces.map(function (x) { return '<button type="button" class="sol-chip' + (x.id === drawing ? " is-armed" : "") + '" data-draw-space="' + x.id + '" aria-pressed="' + (x.id === drawing) + '"><span class="fam-dot" style="background:' + (EvadScene.layoutZones(state.spaces, 9).filter(function (q) { return q.id === x.id; })[0] || {}).color + '" aria-hidden="true"></span>' + esc(x.nom) + ' <span class="muted small">(' + (x.cells || []).length + ")</span></button>"; }).join("") +
        '<button type="button" class="btn btn-primary btn-sm" id="draw-done">Terminer</button>';
      $all("[data-draw-space]", bar).forEach(function (b) { b.addEventListener("click", function () { drawing = b.dataset.drawSpace; drawDrawBar(); drawScene(); }); });
      $("#draw-done").addEventListener("click", endDraw);
    }
    // Donne (ou retire) une case à l'espace en cours. Une case qui porte une solution ne bouge pas.
    function paintCell(cell, mode) {
      if (!cell || !drawing) return false;
      var key = cell.i + "," + cell.j, sp = state.spaces.find(function (x) { return x.id === drawing; }); if (!sp) return false;
      var occupe = state.placed.find(function (p) { return dansEmprise(p, cell.i, cell.j); });
      var mienne = cellsOf(sp).some(function (c) { return c[0] === cell.i && c[1] === cell.j; });
      if (mode === "add" && mienne) return false;
      if (mode === "remove" && !mienne) return false;
      if (occupe && occupe.spaceId !== (mode === "add" ? drawing : null)) {
        if (!prevenu) { toast("Une solution est posée sur cette case : déplace-la d'abord."); prevenu = true; }
        return false;
      }
      if (mode === "add") {
        state.spaces.forEach(function (x) { if (x !== sp) x.cells = cellsOf(x).filter(function (c) { return !(c[0] === cell.i && c[1] === cell.j); }); });
        cellsOf(sp).push([cell.i, cell.j]);
      } else {
        sp.cells = cellsOf(sp).filter(function (c) { return !(c[0] === cell.i && c[1] === cell.j); });
      }
      save(); drawScene(); drawDrawBar();
      return true;
    }
    stage.addEventListener("pointerdown", function (e) {
      if (!drawing || e.button !== 0) return;
      var cell = api.cellFromPoint(e.clientX, e.clientY); if (!cell) return;
      var sp = state.spaces.find(function (x) { return x.id === drawing; });
      var mienne = sp && cellsOf(sp).some(function (c) { return c[0] === cell.i && c[1] === cell.j; });
      painting = mienne ? "remove" : "add"; lastKey = cell.i + "," + cell.j; prevenu = false;
      paintCell(cell, painting); e.preventDefault();
    });
    stage.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      var cell = api.cellFromPoint(e.clientX, e.clientY);
      api.showHover(cell);
      if (!painting || !cell) return;
      var key = cell.i + "," + cell.j; if (key === lastKey) return; lastKey = key;
      paintCell(cell, painting);
    });
    document.addEventListener("pointerup", function () { painting = null; lastKey = null; });
    stage.addEventListener("pointerleave", function () { if (drawing) api.showHover(null); });

    function drawScene(focusUid) {
      // l'espace de la solution armée s'allume : on voit où elle va se poser ; en mode dessin, l'espace dessiné
      var arm = armed ? state.chosen.find(function (x) { return x.id === armed; }) : null;
      api = renderScene(stage, myLieu(), { interactive: !drawing, activeZone: drawing || (arm ? arm.spaceId : null), label: "Maquette 2.5D de " + projectName() + ". Glisse une solution sur une case d'herbe libre. Clique un espace pour choisir sa taille ou ses blocs.",
        onZone: drawing ? null : function (id) { if (armed) return; openZoneMenu(id); } });
      $all(".iso-decor", stage).forEach(function (g) {
        if (drawing) return;
        g.addEventListener("click", function (e) { if (armedDecor || armed) return; e.stopPropagation(); openDecorMenu(g.dataset.decor, g); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDecorMenu(g.dataset.decor, g); } });
      });
      $all(".iso-item", stage).forEach(function (g) {
        if (drawing) return;
        g.addEventListener("click", function (e) { e.stopPropagation(); openMenu(g.dataset.uid, g); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openMenu(g.dataset.uid, g); } });
      });
      if (focusUid) { var f = $('.iso-item[data-uid="' + focusUid + '"]', stage); if (f) f.focus({ preventScroll: true }); }
    }
    function drawVadance() { $("#vadance").innerHTML = vadanceHtml(); }
    function place(chosenId, i, j, dims) {
      var c = state.chosen.find(function (x) { return x.id === chosenId; }); if (!c) return;
      var dm = dims || dimsDe(c.solId, armPref);
      // Une solution se pose dans l'espace auquel elle est rattachée : lâchée ailleurs
      // (ou sur des cases prises), elle rejoint son espace, à la place libre la plus proche.
      var zone = (api.zones || []).filter(function (z) { return z.id === c.spaceId; })[0];
      if (zone && !zone.list.length) { toast(zone.nom + " n'a pas encore de bloc sur la maquette : dessine-les d'abord."); startDraw(zone.id); return; }
      var ok = (!zone || api.rectInZone(zone.id, i, j, dm.w, dm.d)) && api.isFreeRect(i, j, dm.w, dm.d);
      if (!ok) {
        var spot = trouverPlace(zone ? zone.id : null, c.solId, dm, function (x) { return Math.abs(x.i - i) + Math.abs(x.j - j); });
        if (!spot) { toast(zone ? "Plus de place dans " + zone.nom + " pour cette taille. Retire un élément ou agrandis l'espace." : "Pas de place libre pour cette taille."); return; }
        if (zone && api.zoneAt(i, j) !== zone.id) Deva.say("Je l'ai posée dans " + zone.nom + ", son espace.", { instant: true });
        else if (Math.max(spot.dm.w, spot.dm.d) < Math.max(dm.w, dm.d)) Deva.say("Je l'ai raccourcie pour qu'elle tienne. Tu pourras l'allonger plus tard.", { instant: true });
        i = spot.i; j = spot.j; dm = spot.dm;
      }
      var p = { uid: uid("p"), chosenId: c.id, solId: c.solId, spaceId: c.spaceId, i: i, j: j, w: dm.w, d: dm.d, status: "prevu" };
      state.placed.push(p); save(); armed = null;
      drawScene(p.uid); drawBar(); drawHint(); drawVadance(); refreshChrome();
      Deva.react("place:" + c.solId, "place");
    }
    // glisser-déposer
    function hoverDims() { if (armed) { var c = state.chosen.find(function (x) { return x.id === armed; }); return c ? dimsDe(c.solId, armPref) : { w: 1, d: 1 }; } return { w: 1, d: 1 }; }
    wrap.addEventListener("dragover", function (e) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; var hd = hoverDims(); api.showHover(api.cellFromPoint(e.clientX, e.clientY), hd.w, hd.d); });
    wrap.addEventListener("dragleave", function (e) { if (!wrap.contains(e.relatedTarget)) api.showHover(null); });
    wrap.addEventListener("drop", function (e) {
      e.preventDefault(); wrap.classList.remove("is-dropping"); api.showHover(null);
      var id = e.dataTransfer.getData("text/plain") || armed, cell = api.cellFromPoint(e.clientX, e.clientY);
      if (!cell) { toast("Dépose la solution sur le terrain."); return; }
      place(id, cell.i, cell.j);
    });
    // poser au clic (tactile et souris)
    stage.addEventListener("mousemove", function (e) { if (armed || armedDecor) { var hd = hoverDims(); api.showHover(api.cellFromPoint(e.clientX, e.clientY), hd.w, hd.d); } });
    stage.addEventListener("mouseleave", function () { if (armed || armedDecor) api.showHover(null); });
    stage.addEventListener("click", function (e) {
      if (!armed && !armedDecor) return;
      var cell = api.cellFromPoint(e.clientX, e.clientY); if (!cell) return;
      if (armed) place(armed, cell.i, cell.j);
      else if (armedDecor === "allee" && toggleAllee(cell.i, cell.j)) return;
      else placeDecor(cell.i, cell.j);
    });

    // mini-menu d'un élément posé (ou d'un espace, pour sa taille)
    function closeMenu(refocus) { if (menu.hidden) return; var u = menu.dataset.uid; menu.hidden = true; if (refocus) { var g = /^zone:/.test(u) ? $('.iso-zone[data-zone="' + u.slice(5) + '"]') : $('.iso-item[data-uid="' + u + '"]'); if (g) g.focus(); } }
    function openMenu(u, g) {
      var p = state.placed.find(function (x) { return x.uid === u; }); if (!p) return;
      var r = g.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      menu.dataset.uid = u;
      menu.innerHTML = '<p class="menu-title">' + esc(SOL[p.solId].nom) + ' <span class="badge st-' + ({ prevu: "reve", encours: "encours", verifie: "prouve" })[p.status] + '">' + STATUS_LABEL[p.status] + "</span></p>" +
        (p.status === "prevu" ? '<button type="button" role="menuitem" data-act="encours"><span class="dot st-encours"></span>Marquer en cours</button>' : "") +
        (p.status === "encours" ? '<button type="button" role="menuitem" data-act="prevu"><span class="dot st-reve"></span>Remettre en prévu</button>' : "") +
        (p.status === "verifie" ? '<a role="menuitem" href="nourrir.html"><span class="dot st-prouve"></span>Voir la preuve</a>' : '<a role="menuitem" href="nourrir.html?pour=' + u + '"><span class="dot st-prouve"></span>Apporter une preuve</a>') +
        (function () {
          var sd = SOL[p.solId] || {}, pw = p.w || 1, pd = p.d || 1, out = "";
          if (sd.lineaire || pw !== pd || pw > 1) out += '<p class="menu-sub">Taille : ' + pw + " x " + pd + (sd.lineaire ? " (" + Math.max(pw, pd) + (Math.max(pw, pd) > 1 ? " cases)" : " case)") : "") + "</p>";
          if (sd.lineaire) out += '<button type="button" role="menuitem" data-act="plus">' + ICON.arrow + "Allonger</button>" + '<button type="button" role="menuitem" data-act="moins">' + ICON.arrow + "Raccourcir</button>";
          if (pw !== pd) out += '<button type="button" role="menuitem" data-act="tourner">' + ICON.arrow + "Tourner</button>";
          return out;
        })() +
        (state.spaces.length > 1 ? '<p class="menu-sub">Déplacer vers</p>' + state.spaces.filter(function (x) { return x.id !== p.spaceId; }).map(function (x) { return '<button type="button" role="menuitem" data-vers="' + x.id + '">' + ICON.arrow + esc(x.nom) + "</button>"; }).join("") : "") +
        '<button type="button" role="menuitem" data-act="retirer" class="danger">Retirer</button>';
      menu.hidden = false;
      var x = Math.min(Math.max(8, r.left - wr.left + r.width / 2 - 110), wr.width - 228), y = r.top - wr.top + r.height + 6;
      if (y + menu.offsetHeight > wr.height) y = Math.max(8, r.top - wr.top - menu.offsetHeight - 6);
      menu.style.left = x + "px"; menu.style.top = y + "px";
      $all("[data-act]", menu).forEach(function (b) { b.addEventListener("click", function () {
        var act = b.dataset.act;
        if (act === "tourner" || act === "plus" || act === "moins") {
          var sd = SOL[p.solId] || {}, pw = p.w || 1, pd = p.d || 1, nw = pw, nd = pd;
          if (act === "tourner") { nw = pd; nd = pw; }
          else {
            var n = Math.max(pw, pd) + (act === "plus" ? 1 : -1);
            if (!sd.lineaire || n < sd.lineaire.min || n > sd.lineaire.max) { toast(act === "plus" ? "C'est déjà la longueur maximale." : "C'est déjà la longueur minimale."); return; }
            if (pw >= pd) { nw = n; nd = 1; } else { nw = 1; nd = n; }
          }
          if (!(api.rectInZone(p.spaceId, p.i, p.j, nw, nd) && api.isFreeRect(p.i, p.j, nw, nd, p.uid))) {
            // on essaie en reculant l'ancre, sinon on cherche ailleurs dans l'espace
            var spot = null, alt = [];
            for (var back = 1; back < Math.max(nw, nd); back++) alt.push(nw >= nd ? { i: p.i - back, j: p.j } : { i: p.i, j: p.j - back });
            alt.some(function (a) { if (a.i >= 0 && a.j >= 0 && api.rectInZone(p.spaceId, a.i, a.j, nw, nd) && api.isFreeRect(a.i, a.j, nw, nd, p.uid)) { spot = a; return true; } return false; });
            if (!spot) { var cell = api.firstFreeRectIn(p.spaceId, nw, nd, function (x) { return Math.abs(x.i - p.i) + Math.abs(x.j - p.j); }, p.uid); if (cell) spot = cell; }
            if (!spot) { toast("Pas la place pour cette taille ici. Libère des cases ou agrandis l'espace."); return; }
            p.i = spot.i; p.j = spot.j;
          }
          p.w = nw; p.d = nd;
        }
        else if (act === "retirer") { state.placed = state.placed.filter(function (x) { return x.uid !== u; }); Deva.react("retire"); closeMenu(); }
        else { p.status = act; if (act === "encours") Deva.react("encours"); }
        save(); menu.hidden = true; drawScene(act === "retirer" ? null : u); drawBar(); drawVadance(); refreshChrome();
      }); });
      $all("[data-vers]", menu).forEach(function (b) { b.addEventListener("click", function () {
        var z = state.spaces.find(function (x) { return x.id === b.dataset.vers; }); if (!z) return;
        var spot = trouverPlace(z.id, p.solId, { w: p.w || 1, d: p.d || 1 }, function (x) { return Math.abs(x.i - p.i) + Math.abs(x.j - p.j); }, p.uid);
        if (!spot) { toast("Plus de place dans " + z.nom + ". Agrandis-le ou retire un élément."); return; }
        p.spaceId = z.id; p.i = spot.i; p.j = spot.j; p.w = spot.dm.w; p.d = spot.dm.d;
        var c = state.chosen.find(function (x) { return x.id === p.chosenId; }); if (c) c.spaceId = z.id;
        save(); menu.hidden = true; drawScene(u); drawBar(); drawVadance(); refreshChrome();
        Deva.say(SOL[p.solId].nom + " rejoint " + z.nom + ".", { instant: true });
      }); });
      var first = $("[role=menuitem]", menu); if (first) first.focus();
    }
    menu.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu(true);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        var items = $all("[role^=menuitem]", menu), k = items.indexOf(document.activeElement);
        e.preventDefault(); items[(k + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
      }
    });
    document.addEventListener("click", function (e) { if (!menu.contains(e.target) && !e.target.closest(".iso-item") && !e.target.closest(".iso-zone") && !e.target.closest(".iso-decor")) closeMenu(); });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "r" || e.key === "R") && armed && !drawing && !/input|textarea|select/i.test((e.target && e.target.tagName) || "")) { armPref.vertical = !armPref.vertical; drawHint(); return; }
      if (e.key !== "Escape") return;
      if (armed) { armed = null; drawBar(); drawHint(); drawScene(); }
      if (armedDecor) { armedDecor = null; drawDecorChips(); drawDecorHint(); if (api) api.showHover(null); }
    });

    var db = $("#draw-blocks"); if (db) db.addEventListener("click", function () { if (!state.spaces.length) { toast("Crée d'abord un espace à l'étape Explorer."); return; } if (drawing) endDraw(); else startDraw(null); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawing) endDraw(); });
    $("#luanti").addEventListener("click", function () {
      openModal("Visiter en 3D dans Luanti", "<p><strong>Bientôt disponible.</strong></p><p>Tu pourras te promener dans ta maquette en 3D, dans Luanti, un monde libre et ouvert, avant même le premier coup de pioche. Idéal pour la montrer aux voisins et aux partenaires.</p>", '<button type="button" class="btn btn-primary" data-close>J\'ai compris</button>');
    });

    drawBar(); drawDecorChips(); drawScene(); drawVadance();
    // Maquette vierge : on commence par dessiner les blocs du premier espace sans bloc.
    var sansBloc = state.spaces.find(function (x) { return !(x.cells || []).length; });
    if (sansBloc) setTimeout(function () { startDraw(sansBloc.id); }, 600);
  }

  /* ================= Écran 6 : Entreprendre ================= */
  function questFor(p) {
    var q = D.quetes.find(function (x) { return x.solution === p.solId; });
    return { titre: q ? q.titre : "Mettre en place : " + SOL[p.solId].nom.toLowerCase(), aide: q ? q.aide : "Un premier chantier simple, à caler en conseil de lieu." };
  }
  function pageEntreprendre() {
    var skip = 0;
    var COLS = [{ id: "prevu", label: "À faire" }, { id: "encours", label: "En cours" }, { id: "verifie", label: "Vérifié" }];
    function move(u, to) {
      var p = state.placed.find(function (x) { return x.uid === u; }); if (!p || p.status === to) return;
      if (to === "verifie") {
        Deva.react("quest-proof");
        openModal("Une preuve pour passer en vérifié", "<p>Une quête passe en <strong>vérifié</strong> seulement avec une preuve de terrain : une photo, une mesure, une date.</p><p class='muted'>Quête : " + esc(questFor(p).titre) + "</p>",
          '<button type="button" class="btn btn-ghost" data-close>Plus tard</button><a class="btn btn-primary" href="nourrir.html?pour=' + u + '">Apporter la preuve</a>');
        return;
      }
      if (p.status === "verifie") { toast("Cette quête est vérifiée par une preuve, elle reste au vert."); return; }
      p.status = to; save();
      if (to === "encours") Deva.react("quest-start");
      draw(); refreshChrome();
      var c = $('.q-card[data-uid="' + u + '"]'); if (c) c.focus();
    }
    function drawNext() {
      var box = $("#next-step");
      var todo = state.placed.filter(function (p) { return p.status === "prevu"; });
      var doing = state.placed.filter(function (p) { return p.status === "encours"; });
      var html;
      if (!state.placed.length) {
        html = '<p class="kicker">Le prochain pas, proposé par Deva</p><h2>Pose d\'abord tes solutions sur la maquette</h2><p>Chaque solution posée à l\'étape Générer devient ici une quête.</p><div class="next-actions"><a class="btn btn-amber" href="generer.html">C\'est parti</a></div>';
      } else if (todo.length) {
        var p = todo[skip % todo.length], q = questFor(p);
        html = '<p class="kicker">Le prochain pas, proposé par Deva</p><h2>' + esc(q.titre) + "</h2><p>" + esc(q.aide) + ' C\'est un pas simple et visible pour lancer le collectif.</p><div class="next-actions"><button type="button" class="btn btn-amber" id="go-next" data-uid="' + p.uid + '">C\'est parti</button>' + (todo.length > 1 ? '<button type="button" class="btn btn-on-dark" id="other-next">Proposer un autre pas</button>' : "") + "</div>";
      } else if (doing.length) {
        var d = doing[0];
        html = '<p class="kicker">Le prochain pas, proposé par Deva</p><h2>Apporter la preuve : ' + esc(questFor(d).titre.toLowerCase()) + '</h2><p>Une photo et une mesure suffisent pour que ton lieu passe au vert.</p><div class="next-actions"><a class="btn btn-amber" href="nourrir.html?pour=' + d.uid + '">C\'est parti</a></div>';
      } else {
        html = '<p class="kicker">Le prochain pas, proposé par Deva</p><h2>Tout est vérifié. La preuve rouvre le rêve.</h2><p>Ajoute un nouvel espace ou une nouvelle solution pour continuer à faire pousser le lieu.</p><div class="next-actions"><a class="btn btn-amber" href="explorer.html">C\'est parti</a></div>';
      }
      box.innerHTML = html;
      var go = $("#go-next"); if (go) go.addEventListener("click", function () { move(go.dataset.uid, "encours"); });
      var other = $("#other-next"); if (other) other.addEventListener("click", function () { skip++; drawNext(); $("#other-next").focus(); });
    }
    function draw() {
      drawNext();
      var board = $("#kanban");
      board.innerHTML = COLS.map(function (col) {
        var items = state.placed.filter(function (p) { return p.status === col.id; });
        return '<section class="k-col k-' + col.id + '" data-col="' + col.id + '" aria-labelledby="kh-' + col.id + '"><h2 class="k-head" id="kh-' + col.id + '"><span class="dot st-' + ({ prevu: "reve", encours: "encours", verifie: "prouve" })[col.id] + '" aria-hidden="true"></span>' + col.label + "</h2>" +
          '<ul class="k-list">' + (items.length ? items.map(function (p) {
            var q = questFor(p), s = SOL[p.solId];
            var btns = col.id === "prevu" ? '<button type="button" class="btn btn-sm btn-ghost" data-move="encours" data-uid="' + p.uid + '">Démarrer ' + ICON.arrow + "</button>"
              : col.id === "encours" ? '<button type="button" class="btn btn-sm btn-ghost icon-left" data-move="prevu" data-uid="' + p.uid + '" aria-label="Remettre à faire">' + ICON.back + '</button><button type="button" class="btn btn-sm btn-primary" data-move="verifie" data-uid="' + p.uid + '">Vérifier ' + ICON.arrow + "</button>"
              : '<span class="added">' + ICON.check + " Preuve reçue</span>";
            return '<li class="q-card" draggable="' + (col.id !== "verifie") + '" tabindex="-1" data-uid="' + p.uid + '"><p class="q-title">' + esc(q.titre) + '</p><p class="q-meta"><span class="fam-tag fam-' + s.famille + '">' + esc(s.nom) + '</span><span class="muted">' + esc(spaceName(p.spaceId)) + '</span></p><div class="q-actions">' + btns + "</div></li>";
          }).join("") : '<li class="k-empty">' + (col.id === "prevu" && !state.placed.length ? 'Rien pour l\'instant. <a href="generer.html">Poser des solutions</a>' : "Glisse une quête ici") + "</li>") + "</ul></section>";
      }).join("");
      $all("[data-move]", board).forEach(function (b) { b.addEventListener("click", function () { move(b.dataset.uid, b.dataset.move); }); });
      $all(".q-card[draggable=true]", board).forEach(function (c) {
        c.addEventListener("dragstart", function (e) { e.dataTransfer.setData("text/plain", c.dataset.uid); c.classList.add("is-dragging"); });
        c.addEventListener("dragend", function () { c.classList.remove("is-dragging"); });
      });
      $all(".k-col", board).forEach(function (col) {
        col.addEventListener("dragover", function (e) { e.preventDefault(); col.classList.add("is-over"); });
        col.addEventListener("dragleave", function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove("is-over"); });
        col.addEventListener("drop", function (e) { e.preventDefault(); col.classList.remove("is-over"); move(e.dataTransfer.getData("text/plain"), col.dataset.col); });
      });
      drawProgress();
    }
    function drawProgress() {
      var box = $("#progress");
      var spaces = state.spaces.filter(function (s) { return state.placed.some(function (p) { return p.spaceId === s.id; }); });
      if (!spaces.length) { box.innerHTML = '<p class="empty">L\'avancement par espace apparaîtra quand tu auras posé des solutions.</p>'; return; }
      box.innerHTML = spaces.map(function (s) {
        var ps = state.placed.filter(function (p) { return p.spaceId === s.id; });
        var order = { verifie: 0, encours: 1, prevu: 2 }; ps.sort(function (a, b) { return order[a.status] - order[b.status]; });
        var all = ps.every(function (p) { return p.status === "verifie"; }), some = ps.some(function (p) { return p.status !== "prevu"; });
        var word = all ? "tout est vérifié" : some ? "ça avance" : "tout reste à faire";
        return '<div class="prog-row"><span class="prog-lbl">' + esc(s.nom) + '</span><div class="prog-bar" role="img" aria-label="' + esc(s.nom) + " : " + word + '">' + ps.map(function (p) { return '<span class="seg seg-' + p.status + '" title="' + esc(SOL[p.solId].nom) + " : " + STATUS_LABEL[p.status] + '"></span>'; }).join("") + '</div><span class="prog-word">' + word + "</span></div>";
      }).join("");
    }
    draw();
  }

  /* ================= Écran 7 : Nourrir ================= */
  function pageNourrir() {
    var photo = false, justVerified = null;
    var sel = $("#pr-item"), iciSel = $("#pr-ici"), mesure = $("#pr-mesure"), date = $("#pr-date");
    date.value = today();
    iciSel.innerHTML = D.iciFamilles.map(function (f) {
      return '<optgroup label="' + f.label + '">' + D.ici.filter(function (x) { return x.famille === f.id; }).map(function (x) { return '<option value="' + x.id + '">' + esc(x.nom) + (state.icis.indexOf(x.id) >= 0 ? " (suivi)" : "") + "</option>"; }).join("") + "</optgroup>";
    }).join("");

    function drawSelect(pref) {
      var form = $("#proof-form"), none = $("#proof-none");
      if (!state.placed.length) { form.hidden = true; none.hidden = false; return; }
      form.hidden = false; none.hidden = true;
      var order = { encours: 0, prevu: 1, verifie: 2 };
      var list = state.placed.slice().sort(function (a, b) { return order[a.status] - order[b.status]; });
      sel.innerHTML = list.map(function (p) { return '<option value="' + p.uid + '">' + esc(SOL[p.solId].nom) + " (" + STATUS_LABEL[p.status] + ")</option>"; }).join("");
      if (pref && list.some(function (p) { return p.uid === pref; })) sel.value = pref;
      syncIci();
    }
    function current() { return state.placed.find(function (p) { return p.uid === sel.value; }); }
    function syncIci() {
      var p = current(); if (!p) return;
      var s = SOL[p.solId]; iciSel.value = s.ici[0];
      mesure.placeholder = "Ex. " + s.mesureExemple.toLowerCase();
    }
    sel.addEventListener("change", syncIci);
    $("#pr-example").addEventListener("click", function () { var p = current(); if (p) { mesure.value = SOL[p.solId].mesureExemple; mesure.removeAttribute("aria-invalid"); $("#pr-err").hidden = true; } });
    $("#pr-photo").addEventListener("click", function () {
      photo = !photo; this.classList.toggle("has-photo", photo); this.setAttribute("aria-pressed", String(photo));
      $("#pr-photo-txt").textContent = photo ? "Photo ajoutée (factice). Toucher pour retirer" : "Ajouter une photo";
    });

    function drawScene() {
      renderScene($("#nr-scene"), myLieu(), { justVerified: justVerified });
      var ver = state.placed.filter(function (p) { return p.status === "verifie"; }).length;
      $("#scene-state").textContent = !state.placed.length ? "Aucun élément posé." : ver === 0 ? "Rien n'est encore vérifié : le lieu attend ses premières preuves." : ver === state.placed.length ? "Tout le lieu est vérifié." : "Le lieu commence à verdir.";
    }
    function drawJournal() {
      var ul = $("#journal");
      if (!state.proofs.length) { ul.innerHTML = '<li class="empty">Le journal est vide. Ta première preuve apparaîtra ici.</li>'; return; }
      ul.innerHTML = state.proofs.map(function (pr) {
        return '<li class="proof-item"><div class="proof-thumb' + (pr.photo ? " has-photo" : "") + '" aria-hidden="true">' + (pr.photo ? leafSvg("on-green") : ICON.photo) + '</div><div><p class="proof-head"><strong>' + esc(SOL[pr.solId].nom) + '</strong><span class="badge st-prouve">vérifié</span></p><p>' + esc(pr.mesure) + '</p><p class="muted small">' + frDate(pr.date) + " · " + esc(ICI[pr.ici].nom) + (pr.photo ? " · photo jointe" : "") + "</p></div></li>";
      }).join("");
    }
    function drawBars() {
      var all = familySums(), ver = familySums(function (p) { return p.status === "verifie"; });
      var MAX = 9;
      $("#vad-vs").innerHTML = D.iciFamilles.map(function (f) {
        var a = Math.min(100, all[f.id] / MAX * 100), v = Math.min(100, ver[f.id] / MAX * 100);
        var word = !all[f.id] ? "rien de prévu" : !ver[f.id] ? "prévu, pas encore vérifié" : ver[f.id] >= all[f.id] ? "tout le prévu est vérifié" : "en partie vérifié";
        return '<div class="vv-row"><span class="vv-lbl">' + f.label + '</span><div class="vv-bar" role="img" aria-label="' + f.label + " : " + word + '"><span class="vv-planned" style="width:' + a + '%"></span><span class="vv-verified" style="width:' + v + '%"></span></div><span class="vv-word">' + word + "</span></div>";
      }).join("");
    }
    function drawLoop() {
      var green = fricheStatut() === "prouve";
      $("#loop").classList.toggle("is-green", green);
      $("#loop-state").textContent = green ? "Ton projet est passé au vert sur la carte : il peut inspirer d'autres collectifs." : "Encore quelques preuves et le projet passera au vert sur la carte.";
    }
    function drawAll() { drawScene(); drawJournal(); drawBars(); drawLoop(); refreshChrome(); }

    $("#proof-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var p = current(); if (!p) return;
      if (!mesure.value.trim()) { mesure.setAttribute("aria-invalid", "true"); $("#pr-err").hidden = false; mesure.focus(); return; }
      var before = verifiedCount();
      state.proofs.unshift({ id: uid("pv"), uid: p.uid, solId: p.solId, mesure: mesure.value.trim(), date: date.value || today(), ici: iciSel.value, photo: photo });
      p.status = "verifie"; save();
      justVerified = p.uid;
      mesure.value = ""; photo = false; $("#pr-photo").classList.remove("has-photo"); $("#pr-photo").setAttribute("aria-pressed", "false"); $("#pr-photo-txt").textContent = "Ajouter une photo";
      drawSelect(); drawAll();
      Deva.react(before < 3 && verifiedCount() >= 3 ? "proof3" : "proof");
      toast("Preuve reçue : " + SOL[p.solId].nom + " passe au vert.");
      if (window.matchMedia("(max-width: 900px)").matches) $("#nr-scene-card").scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(function () { justVerified = null; }, 100);
    });

    // exports
    $all("[data-export]").forEach(function (b) { b.addEventListener("click", function () { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); }); });
    $("#do-export").addEventListener("click", function () {
      var on = $all("[data-export]").filter(function (b) { return b.getAttribute("aria-pressed") === "true"; }).map(function (b) { return b.dataset.export; });
      if (!on.length) { toast("Choisis au moins un cadre de rapport."); return; }
      var proofs = state.proofs;
      var body = '<div class="report"><p class="report-meta">' + esc(projectName()) + (state.project.lieu.trim() ? " · " + esc(state.project.lieu.trim()) : "") + " · aperçu du " + frDate(today()) + "</p>";
      on.forEach(function (k) {
        var fw = D.exports[k];
        body += '<section class="report-sec"><h3>' + fw.titre + '</h3><p class="muted small">' + fw.intro + "</p>";
        if (!proofs.length) body += '<p class="empty">Aucune preuve vérifiée pour l\'instant : cette section se remplira avec tes preuves.</p>';
        else body += "<ul>" + proofs.map(function (pr) { var s = SOL[pr.solId]; return "<li><strong>" + esc(fw.parFamille[s.famille]) + "</strong> : " + esc(s.nom) + ", " + esc(pr.mesure.charAt(0).toLowerCase() + pr.mesure.slice(1)) + " <span class='muted'>(" + frDate(pr.date) + ")</span></li>"; }).join("") + "</ul>";
        body += "</section>";
      });
      body += '<p class="muted small">Construit uniquement à partir des preuves vérifiées du projet. Aperçu de démonstration, aucun fichier n\'est créé.</p></div>';
      openModal("Aperçu des rapports", body, '<button type="button" class="btn btn-primary" data-close>Fermer l\'aperçu</button>');
      Deva.react("export");
    });

    $("#quote").innerHTML = "<p>« " + esc(D.temoignage.texte) + " »</p><footer>" + esc(D.temoignage.auteur) + "</footer>";
    drawSelect(param("pour"));
    drawAll();
  }

  /* ================= Mon lieu : tableau de bord quotidien du porteur ================= */
  function pageMonLieu() {
    var filter = null;
    var hasLieu = !!state.project.name.trim() || state.placed.length || state.chosen.length;
    $("#ml-title").textContent = projectName();
    $("#ml-promesse").textContent = state.project.promesse.trim() || "Ta promesse s'écrit à l'étape Rêver.";
    if (!hasLieu) { $("#ml-empty").hidden = false; $("#ml-grid").hidden = true; return; }

    function drawScene() {
      renderScene($("#ml-scene"), myLieu(), {
        label: "Maquette vivante de " + projectName(),
        activeZone: filter,
        onZone: function (id) { filter = filter === id ? null : id; drawAll(); }
      });
      $("#ml-scene-state").textContent = filter
        ? "Espace " + spaceName(filter) + ". Clique-le à nouveau pour revoir tout le lieu."
        : "Clique un espace de la maquette pour te concentrer sur ses quêtes.";
    }
    // Aujourd'hui : d'abord ce qui attend une preuve, puis les quêtes à lancer.
    function drawToday() {
      var ul = $("#ml-today"), list = state.placed.filter(function (p) { return !filter || p.spaceId === filter; });
      $("#ml-filter").textContent = filter ? "Quêtes de l'espace " + spaceName(filter) : "Toutes les quêtes du lieu";
      $("#ml-all").hidden = !filter;
      if (!list.length) {
        ul.innerHTML = '<li class="empty">' + (filter ? "Rien n'est posé dans cet espace pour l'instant." : "Aucune solution posée. Passe par Générer pour poser tes premières solutions.") + "</li>";
        return;
      }
      var html = "";
      list.filter(function (p) { return p.status === "encours"; }).forEach(function (p) {
        var q = questFor(p);
        html += '<li class="ml-item"><span class="dot st-encours" aria-hidden="true"></span><div><strong>À vérifier : ' + esc(q.titre) + '</strong>' +
          '<p class="muted small">Preuve attendue : une photo, une mesure, une date. Espace ' + esc(spaceName(p.spaceId)) + ".</p></div>" +
          '<a class="btn btn-primary btn-sm" href="nourrir.html?pour=' + p.uid + '">Apporter la preuve</a></li>';
      });
      list.filter(function (p) { return p.status === "prevu"; }).forEach(function (p) {
        var q = questFor(p);
        html += '<li class="ml-item"><span class="dot st-reve" aria-hidden="true"></span><div><strong>À faire : ' + esc(q.titre) + '</strong>' +
          '<p class="muted small">' + esc(q.aide) + " Espace " + esc(spaceName(p.spaceId)) + ".</p></div>" +
          '<a class="btn btn-ghost btn-sm" href="entreprendre.html">Ouvrir la quête</a></li>';
      });
      var done = list.filter(function (p) { return p.status === "verifie"; });
      if (done.length) html += '<li class="ml-done">' + ICON.check + " " + done.map(function (p) { return esc(SOL[p.solId].nom); }).join(", ") + (done.length > 1 ? " sont vérifiés" : " est vérifié") + ".</li>";
      if (!html) html = '<li class="empty">Tout est vérifié ici. Beau travail de terrain.</li>';
      ul.innerHTML = html;
    }
    // Élan de la semaine : repères qualitatifs par famille d'ICI (feuilles), jamais un chiffre.
    function drawElan() { $("#ml-elan").innerHTML = vadanceHtml(); }
    function drawAll() { drawScene(); drawToday(); drawElan(); }
    $("#ml-all").addEventListener("click", function () { filter = null; drawAll(); });
    drawAll();
  }

  /* ================= Deva : réponses contextuelles ================= */
  // Fournies au moteur de Deva : elles dépendent de l'état du lieu sur cet appareil.
  function devaContext(t) {
    var nom = projectName(), hasLieu = !!state.project.name.trim() || state.placed.length || state.chosen.length || state.spaces.length;
    if (/(ou j en suis|ou en suis|ou en est|prochaine etape|etape suivante|je fais quoi|quoi faire maintenant|par ou commencer|par quoi commencer|que faire maintenant|la suite|et apres|et après|on continue)/.test(t)) {
      if (!hasLieu) return "Tu n'as pas encore de lieu sur cet appareil. Commence par Rêver : un nom, une promesse, et des lieux à visiter pour t'inspirer.";
      var next = D.steps.find(function (s) { return !stepDone(s.id); });
      if (!next) return "Les cinq étapes sont faites pour " + nom + " : il est prouvé. La suite, c'est le quotidien dans Mon lieu : les quêtes, de nouvelles preuves, et la carte qui inspire les autres.";
      var conseils = { rever: "donne un nom à ton lieu et situe-le.", explorer: "crée un premier espace, puis accroche-lui des solutions du Commun.", generer: "pose tes solutions sur la maquette.", entreprendre: "passe une première quête en cours.", nourrir: "apporte trois preuves de terrain pour que le lieu passe au vert." };
      return "Pour " + nom + ", la prochaine étape est " + next.label + " : " + conseils[next.id];
    }
    if (/(mon lieu|mon projet|resume de mon|résumé|recap|récap|ou est mon)/.test(t) && !/(creer|lancer|demarrer|publier|afficher|modifier|supprimer)/.test(t)) {
      if (!hasLieu) return "Pas encore de lieu sur cet appareil. Rêver est la première étape ; ensuite la page Mon lieu devient ton tableau de bord.";
      var nbE = state.spaces.length, nbS = state.placed.length, nbV = state.placed.filter(function (p) { return p.status === "verifie"; }).length, nbP = state.proofs.length;
      return nom + " : " + nbE + (nbE > 1 ? " espaces, " : " espace, ") + nbS + (nbS > 1 ? " solutions posées" : " solution posée") +
        (nbV ? ", dont " + nbV + " vérifiée" + (nbV > 1 ? "s" : "") : "") + (nbP ? ", " + nbP + " preuve" + (nbP > 1 ? "s" : "") + " au journal" : "") +
        ". Tout est rassemblé dans la page Mon lieu.";
    }
    return null;
  }

  /* ================= Démarrage ================= */
  var PAGES = { index: pageIndex, commun: pageCommun, rever: pageRever, explorer: pageExplorer, generer: pageGenerer, entreprendre: pageEntreprendre, nourrir: pageNourrir, monlieu: pageMonLieu };
  // Charge le compte, son projet (en ligne, ou le cache local s'il est plus récent) et les lieux publics.
  function boot(page) {
    var hasMap = page === "index" || page === "rever";
    var db = window.EvadDB && EvadDB.ready() ? EvadDB : null;
    var places = (db && hasMap) ? db.loadPublicPlaces().catch(function () { return []; }) : Promise.resolve([]);
    if (!db) return places.then(function (pl) { publicPlaces = pl; });
    return db.getUser().then(function (u) {
      user = u;
      if (bootedEarly) return; // l'interface est déjà rendue depuis le cache : on garde l'état local
      // Sans compte : le projet vit sur l'appareil (localStorage).
      if (!user) { var local = loadCache(); if (local) state = local; return; }
      var cache = loadCache();
      return db.loadMyProject(user.id).then(function (row) {
        var remote = row ? fromRow(row) : null;
        if (cache && (!remote || cache.localUpdatedAt > remote.localUpdatedAt + 1000)) {
          state = cache; if (remote && !state.projectId) state.projectId = remote.projectId;
          if (cache.localUpdatedAt) scheduleSync(); // des changements locaux n'avaient pas été envoyés
        } else if (remote) { state = remote; state.proposals = (cache && cache.proposals) || []; writeCache(); }
        else if (cache) state = cache;
      }).catch(function (e) {
        console.warn("[EVAD] projet en ligne indisponible :", e.message);
        if (cache) state = cache;
        setSync("error");
      });
    }).then(function () { return places; }).then(function (pl) { publicPlaces = pl || []; });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.dataset.page, started = false;
    document.body.classList.add("is-booting");
    function start() {
      if (started) return; started = true;
      document.body.classList.remove("is-booting");
      renderTopbar(page);
      var step = D.steps.find(function (s) { return s.id === page; });
      // Parcours ouvert à tous : pas de compte requis, les données restent sur l'appareil.
      if (window.Deva) {
        if (page === "index") { Deva.init("accueil", { silent: true }); }
        else if (page === "commun") { Deva.init("commun"); }
        else if (page === "monlieu") { Deva.init("monlieu"); }
        else if (step) { Deva.init(step.deva); }
      }
      if (window.Deva && Deva.setContext) Deva.setContext(devaContext);
      renderFooter(); // après Deva.init : le bandeau se loge sous le panneau de Deva
      renderTopbar(page); // et le bouton Deva de la pilule connaît l'état du panneau
      // Arrivée depuis l'onboarding : la fenêtre finit de se construire ici.
      var arrive = null;
      try { arrive = sessionStorage.getItem("evad-arrive"); sessionStorage.removeItem("evad-arrive"); } catch (e) { /* ignore */ }
      if (arrive) {
        document.body.classList.add("is-arriving");
        buildFrame(document.getElementById("main"), titreDe(arrive));
        setTimeout(function () { document.body.classList.remove("is-arriving"); }, 2200);
      }
      if (PAGES[page]) PAGES[page]();
      if (page === "index" || page === "rever") renderMapNotice();
      if (TOURS[page]) pageTour = TOURS[page];
      // Arrivée depuis une porte de l'accueil : Deva fait la visite guidée de la page.
      if (param("tour") === "1" && TOURS[page]) {
        try { history.replaceState({}, "", location.pathname); } catch (e) { /* ignore */ }
        setTimeout(function () { startTour(TOURS[page]); }, arrive ? 1500 : 500);
      }
    }
    // L'interface ne doit jamais attendre le réseau : passé 3 secondes, on démarre avec l'état
    // local (Supabase lent, en pause ou injoignable) ; la carte publique se rafraîchira si elle arrive.
    var limite = setTimeout(function () {
      if (started) return;
      bootedEarly = true;
      var local = loadCache(); if (local) state = local;
      console.warn("[EVAD] démarrage sans attendre Supabase (lent ou indisponible)");
      start();
    }, 3000);
    boot(page).then(function () {
      clearTimeout(limite);
      if (!started) { start(); return; }
      if (redrawMap) redrawMap();
      if (page === "index" || page === "rever") renderMapNotice();
    }).catch(function (e) {
      console.warn("[EVAD] démarrage dégradé :", e && e.message);
      clearTimeout(limite);
      if (!started) { var local = loadCache(); if (local) state = local; start(); }
    });
    // Avant de quitter la page, on tente d'envoyer une sauvegarde en attente.
    window.addEventListener("pagehide", function () { if (syncTimer) { clearTimeout(syncTimer); syncNow(); } });
  });
})();
