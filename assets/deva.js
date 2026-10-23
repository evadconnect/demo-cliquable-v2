/* EVAD, Deva simulée : un seul visage, cinq modes, réponses scriptées.
   Règle absolue : Deva ne produit jamais de chiffre d'impact. Il propose, l'humain valide. */
(function () {
  var D = window.EVAD_DATA.deva;
  var UI_KEY = "evad-demo-ui";
  var mode = null, log = null, root = null, rot = 0;
  var pending = null; // question ouverte : la prochaine saisie lui est transmise

  function uiGet() { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { return {}; } }
  function uiSet(v) { try { localStorage.setItem(UI_KEY, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }

  var LEAF = '<img class="deva-face" src="assets/deva-avatar.png" alt="" aria-hidden="true">';

  function init(modeId, opts) {
    opts = opts || {};
    root = document.getElementById("deva");
    if (!root) return;
    mode = D.modes[modeId];
    var ui = uiGet();
    var narrow = window.matchMedia("(max-width: 900px)").matches;
    // Desktop : sidebar toujours ouverte (pas de rétraction). Mobile : tiroir ouvrable.
    var open = narrow ? false : true;

    root.innerHTML =
      '<div class="deva-inner">' +
      '<div class="deva-head">' +
      '<span class="deva-avatar">' + LEAF + '</span>' +
      '<div class="deva-id"><strong>Deva</strong><span class="deva-mode">' + mode.label + '</span></div>' +
      '<button type="button" class="icon-btn deva-toggle" aria-controls="deva-body" aria-label="Replier le panneau de Deva"></button>' +
      '</div>' +
      '<div class="deva-body" id="deva-body">' +
      '<div class="deva-log" role="log" aria-live="polite" aria-label="Conversation avec Deva"></div>' +
      '<div class="deva-doors" aria-label="Que veux-tu faire"></div>' +
      '<form class="deva-form"><label for="deva-input" class="sr-only">Écrire à Deva</label>' +
      '<input id="deva-input" type="text" autocomplete="off" placeholder="Écrire à Deva…">' +
      '<button type="submit" class="icon-btn deva-send" aria-label="Envoyer à Deva"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</form>' +
      '<button type="button" class="deva-carbone" aria-label="Empreinte carbone estimée de tes échanges avec Deva"></button>' +
      '<div class="deva-foot"><span class="deva-avatar">' + LEAF + '</span><p class="deva-rule">Deva propose, tu décides. Il ne calcule jamais d\'impact à ta place.</p></div>' +
      '</div></div>' +
      '<button type="button" class="deva-fab" aria-label="Ouvrir le panneau de Deva">' + LEAF + '<span>Deva</span></button>';

    log = root.querySelector(".deva-log");
    setOpen(open, true);

    root.querySelector(".deva-toggle").addEventListener("click", function () { setOpen(false); });
    root.querySelector(".deva-fab").addEventListener("click", function () { setOpen(true); });
    root.querySelector(".deva-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = root.querySelector("#deva-input");
      var txt = input.value.trim();
      if (!txt) return;
      input.value = "";
      user(txt);
      countQuestion();
      if (pending) { var h = pending; pending = null; var res = h(txt); if (res) say(res.text || res, res); }
      else respond(txt);
    });
    root.querySelector(".deva-carbone").addEventListener("click", function () {
      var c = D.carbone || {};
      Deva.say("Empreinte de nos échanges : tu as posé " + carbonCount() + " question(s), soit environ " + fmtCarbon() + ". " + (c.note || ""), { instant: true });
      if (root.classList.contains("is-closed")) setOpen(true);
    });

    renderCarbone();
    // Mode piloté (onboarding) : on laisse la page mener la conversation, sans intro ni portes auto.
    if (!opts.silent) { renderDoors(); say(mode.intro, { instant: true }); }
  }
  function close() { if (root) setOpen(false); }
  function isOpen() { return !!root && !root.classList.contains("is-closed"); }
  function toggle() { if (root) setOpen(!isOpen()); }

  function renderDoors() {
    var box = root.querySelector(".deva-doors");
    if (!box) return;
    if (!mode.actions || !mode.actions.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = "";
    mode.actions.forEach(function (a) {
      var b = document.createElement(a.href && a.href.charAt(0) === "#" ? "button" : "a");
      b.className = "deva-door" + (a.primary ? " is-primary" : "");
      if (b.tagName === "A") b.href = a.href; else b.type = "button";
      b.textContent = a.label;
      b.addEventListener("click", function (e) {
        if (a.href === "#map") { e.preventDefault(); setOpen(false); }
      });
      box.appendChild(b);
    });
  }

  /* Calculateur d'empreinte carbone des questions posées à Deva (estimation, cf. D.carbone). */
  function carbonCount() { var ui = uiGet(); return ui.devaQuestions || 0; }
  function fmtCarbon() {
    var c = D.carbone || { parQuestion: 0, unite: "g CO₂e" };
    var total = carbonCount() * (c.parQuestion || 0);
    var s = (Math.round(total * 100) / 100).toString().replace(".", ",");
    return "~" + s + " " + (c.unite || "g CO₂e");
  }
  function countQuestion() { var ui = uiGet(); ui.devaQuestions = (ui.devaQuestions || 0) + 1; uiSet(ui); renderCarbone(); }
  function renderCarbone() {
    var el = root.querySelector(".deva-carbone");
    if (!el || !D.carbone) return;
    var n = carbonCount();
    el.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 14a3.5 3.5 0 0 1-.4-7A4.5 4.5 0 0 1 14 7.3 3.2 3.2 0 0 1 14.5 14H6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
      "<span>Empreinte : <strong>" + fmtCarbon() + "</strong>" + (n ? " · " + n + " question" + (n > 1 ? "s" : "") : " · échanges sobres") + "</span>";
    el.title = D.carbone.note || "";
  }

  /* Moteur conversationnel par règles (sans modèle de langage) : salutations, remerciements,
     réponses contextuelles fournies par la page, règles de doctrine (impact), réponses construites
     depuis les données (solutions par famille, fiche d'une solution ou d'un ICI), FAQ à mots-clés
     avec tolérance aux fautes de frappe, et repli avec trois questions proposées. */
  var ALL = window.EVAD_DATA || {};
  var ctx = null; // fonction fournie par la page : (texte normalisé) -> réponse ou null
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, " ").replace(/\s+/g, " "); }
  function pick(a) { return (a && a.length) ? a[Math.floor(Math.random() * a.length)] : ""; }
  function toks(t) { return t.split(/[^a-z0-9]+/).filter(Boolean); }
  function hasWord(t, w) { return (" " + t + " ").indexOf(" " + w + " ") >= 0; }
  // distance d'édition ≤ 1 (une lettre en plus, en moins ou différente)
  function lev1(a, b) {
    if (a === b) return true;
    var la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, d = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++d > 1) return false;
      if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
    }
    return d + (la - i) + (lb - j) <= 1;
  }
  function matchKw(t, tokens, kw) {
    var k = norm(kw);
    if (t.indexOf(k) >= 0) return k.indexOf(" ") >= 0 ? 2 : 1; // une expression exacte pèse double
    if (k.length >= 5 && k.indexOf(" ") < 0) for (var n = 0; n < tokens.length; n++) if (tokens[n].length >= 5 && lev1(tokens[n], k)) return 0.8;
    return 0;
  }
  function faqBest(t, tokens) {
    var best = null, score = 0;
    (D.faq || []).forEach(function (e) {
      var s = 0; e.k.forEach(function (kw) { s += matchKw(t, tokens, kw); });
      if (s > score) { score = s; best = e; }
    });
    return score > 0 ? best : null;
  }
  var GREET = /(^| )(bonjour|salut|coucou|bonsoir|hello|hey|yo|bonne journee)( |$)/;
  var GREET_WORDS = ["bonjour", "salut", "coucou", "bonsoir", "hello", "hey", "yo", "bonne", "journee", "deva"];
  var FAM_RX = {
    eau: /(\beau\b|pluie|riviere|mare|humide|aquatique|nappe|arros)/,
    sol: /(\bsol\b|terre|compost|jardin|potager|permaculture|haie|biodiversite|plante)/,
    energie: /(energie|solaire|panneau|photovolta|chaleur|electricite|eolien|chauff)/,
    reemploi: /(reemploi|reparer|reparation|recyclage|palette|dechet|ressourcerie|seconde main|recup)/,
    alimentation: /(alimentation|manger|nourriture|cantine|maraich|legume|aliment|epicerie|cuisine|poule|oeuf)/,
    gouvernance: /(gouvernance|decision|assemblee|democratie|collectif|conseil|cooperative|budget participatif)/
  };
  function famille(t) { for (var f in FAM_RX) if (FAM_RX[f].test(t)) return f; return null; }
  function famLabel(id) { var f = (ALL.familles || []).filter(function (x) { return x.id === id; })[0]; return f ? f.label : id; }
  var STOP_NOM = ["lieu", "pain", "culture", "ouvert", "partage", "citoyens", "cafe", "quartier", "toutes", "tous", "entre", "local", "locale", "bois", "taille"];
  function nameTokens(nom) { return toks(norm(nom)).filter(function (w) { return w.length >= 4 && STOP_NOM.indexOf(w) < 0; }); }
  function findByName(list, t, tokens) {
    for (var n = 0; n < (list || []).length; n++) {
      var it = list[n], full = norm(it.nom);
      if (t.indexOf(full) >= 0) return it;
      var nt = nameTokens(it.nom);
      for (var k = 0; k < nt.length; k++) if (hasWord(t, nt[k]) || tokens.some(function (w) { return w.length >= 6 && lev1(w, nt[k]); })) return it;
    }
    return null;
  }
  function askAction(q) { return { label: q, once: false, onClick: function () { user(q); respond(q); } }; }
  function solutionsPour(f) {
    var list = (ALL.solutions || []).filter(function (s) { return s.famille === f; });
    if (!list.length) return null;
    return { text: "Pour la famille " + famLabel(f) + ", le Commun propose : " + list.map(function (s) { return s.nom; }).join(", ") + ". Chacune a déjà été éprouvée ailleurs. Demande-moi « c'est quoi … » pour une solution, ou ouvre le Commun.",
      actions: list.slice(0, 3).map(function (s) { return askAction("C'est quoi " + s.nom.toLowerCase() + " ?"); }) };
  }
  function suggestions(tokens) {
    var scored = (D.faq || []).map(function (e) {
      var corpus = norm(e.k.join(" ") + " " + e.a), s = 0;
      tokens.forEach(function (w) { if (w.length >= 4 && corpus.indexOf(w) >= 0) s++; });
      return { e: e, s: s };
    }).filter(function (x) { return x.s > 0 && x.e.q; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3);
    var qs = scored.map(function (x) { return x.e.q; });
    if (!qs.length) qs = ["C'est quoi EVAD ?", "Comment lire la carte ?", "C'est quoi le Commun ?"];
    return qs.map(askAction);
  }
  function answer(txt) {
    var full = norm(txt).replace(/[.,;:!()«»"]/g, " ");
    // plusieurs questions dans le même message : on répond à la première
    var parts = full.split("?").filter(function (p) { return p.trim().length >= 3; });
    if (parts.length > 1) full = parts[0];
    var t = " " + full.trim() + " ", tokens = toks(t);
    var greet = GREET.test(t);
    var reste = tokens.filter(function (w) { return GREET_WORDS.indexOf(w) < 0 && w.length > 2; });
    if (greet && reste.length <= 1) return pick(D.salutations);
    var prefix = greet ? "Bonjour ! " : "";
    if (/(^| )(merci|mercii|super|genial|parfait|nickel|top|cool|bravo|ok merci)( |$)/.test(t) && reste.length <= 2) return pick(D.remerciements);
    if (/(^| )(au revoir|aurevoir|bye|a bientot|ciao|a plus)( |$)/.test(t)) return pick(D.adieux);
    if (/^ (ok|d accord|oui|non|ca marche|entendu|compris|bien|daccord) $/.test(t)) return pick(D.acks || D.remerciements);
    // Règle prioritaire : toute question sur l'impact, le CO₂, les chiffres ou les résultats du lieu.
    // Deva ne produit aucun quantitatif : elle renvoie vers Vadance, Vadité et les preuves.
    var surDeva = /(deva|conversation|nos echanges|cet echange|tes reponses|discussion|ton empreinte|tu pollues|tu consommes|ton co2)/.test(t);
    var surImpact = /(impact|co2|carbone|chiffre|resultat|combien|economis|tonne|kilo| kg |mesur|gain|bilan|emission)/.test(t);
    if (surImpact && !surDeva && D.impactLieu) return prefix + D.impactLieu;
    if (surDeva && /(carbone|empreinte|co2|pollu|consomm|sobri|ecolog)/.test(t)) {
      var emp = (D.faq || []).filter(function (e) { return e.id === "empreinte"; })[0];
      if (emp) return prefix + emp.a;
    }
    // réponses contextuelles fournies par la page (où j'en suis, prochaine étape, mon lieu)
    if (ctx) { var c = null; try { c = ctx(t, tokens); } catch (e) { c = null; } if (c) return prefix + c; }
    // réponses construites depuis les données : une solution, un ICI, les solutions d'une famille
    var sol = findByName(ALL.solutions, t, tokens);
    if (sol && /(quoi|que |qu est|comment|explique|parle|c est|dis|montre|ca marche|fonctionne|\?)/.test(t + "?")) {
      return { text: prefix + sol.nom + " : " + sol.change + " C'est une solution de la famille " + famLabel(sol.famille) + ", déjà éprouvée sur d'autres lieux ; tu la trouves dans le Commun.",
        actions: [askAction("Quelles solutions pour " + famLabel(sol.famille).toLowerCase() + " ?"), askAction("Comment créer mon projet ?")] };
    }
    var ici = findByName(ALL.ici, t, tokens);
    if (ici) return prefix + ici.nom + " : " + ici.observe + " C'est un ICI, un indicateur de changement d'impact : il se nourrit de preuves de terrain, jamais d'un calcul.";
    var f = famille(t);
    if (f && /(solution|idee|quoi faire|propose|conseil|quelle|quelles|quoi|que faire|comment)/.test(t)) { var sp = solutionsPour(f); if (sp) { sp.text = prefix + sp.text; return sp; } }
    // FAQ à mots-clés (expressions exactes prioritaires, fautes de frappe tolérées)
    var best = faqBest(t, tokens);
    if (best) return prefix + best.a;
    // repli : on le dit, et on propose trois questions proches
    return { text: pick(D.incompris), actions: suggestions(tokens) };
  }
  // Répond dans le panneau : une chaîne, ou { text, actions }.
  function respond(txt) {
    var r = answer(txt);
    if (typeof r === "string") say(r); else say(r.text, { actions: r.actions });
  }

  function setOpen(open, silent) {
    // Le panneau flottant se replie en pastille (bureau comme mobile).
    root.classList.toggle("is-open", open);
    root.classList.toggle("is-closed", !open);
    document.body.classList.toggle("deva-closed", !open);
    root.querySelector(".deva-toggle").setAttribute("aria-expanded", String(open));
    root.querySelector(".deva-fab").setAttribute("aria-expanded", String(open));
    document.dispatchEvent(new CustomEvent("deva:state", { detail: { open: open } }));
    root.querySelector(".deva-toggle").innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
    if (!silent) {
      if (open) root.querySelector("#deva-input").focus({ preventScroll: true });
      else root.querySelector(".deva-fab").focus({ preventScroll: true });
    }
  }

  function bubble(cls, text) {
    var d = document.createElement("div");
    d.className = "deva-msg " + cls;
    d.textContent = text;
    if (/from-deva/.test(cls) && !/is-typing/.test(cls) && root && root.classList.contains("is-closed")) document.dispatchEvent(new CustomEvent("deva:unread"));
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  function user(text) { bubble("from-user", text); }
  // Puces d'action affichées sous une bulle de Deva (projets à explorer, reprise des mots…).
  function renderActions(actions) {
    if (!actions || !actions.length) return;
    var box = document.createElement("div");
    box.className = "deva-chips";
    actions.forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "deva-chip" + (a.primary ? " is-primary" : "");
      b.textContent = a.label;
      b.addEventListener("click", function () {
        if (a.once !== false) { b.disabled = true; b.classList.add("is-used"); }
        a.onClick && a.onClick();
      });
      box.appendChild(b);
    });
    log.appendChild(box);
    log.scrollTop = log.scrollHeight;
  }
  function say(text, opt) {
    if (!log) return;
    opt = opt || {};
    if (opt.instant) { bubble("from-deva", text); renderActions(opt.actions); return; }
    var t = bubble("from-deva is-typing", "");
    t.setAttribute("aria-hidden", "true");
    t.innerHTML = "<span></span><span></span><span></span>";
    setTimeout(function () {
      t.remove();
      var m = bubble("from-deva", text);
      renderActions(opt.actions);
      if (opt.nudge) { root.classList.add("nudge"); setTimeout(function () { root.classList.remove("nudge"); }, 900); }
      return m;
    }, 550);
  }
  // Deva pose une question ouverte : la prochaine saisie est transmise à `handler`,
  // qui peut renvoyer une chaîne ou { text, actions:[{label, onClick, primary}] }.
  function prompt(text, handler, opt) {
    opt = opt || {};
    pending = handler;
    if (root && root.classList.contains("is-closed")) setOpen(true);
    say(text, opt);
  }
  function react(key, fallback) {
    var t = D.reactions[key] || (fallback && D.reactions[fallback]);
    if (t) say(t, { nudge: true });
  }

  window.Deva = { init: init, say: say, react: react, prompt: prompt, close: close, isOpen: isOpen, toggle: toggle, answer: answer, setContext: function (fn) { ctx = fn; } };
})();
