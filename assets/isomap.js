/* EVAD : carte illustrée isométrique de la France (SVG, sans image ni tuile).
   Le territoire est dessiné par règles simples : un contour approché du pays et de la Corse,
   des régions de relief (Alpes, Pyrénées, Massif central, Jura, Vosges), de forêts, de vignes,
   les grands fleuves et une cinquantaine de villes repères. Les lieux réels sont posés dessus
   par projection de leur latitude et longitude. On zoome à la molette, au pincement ou avec
   les boutons, on se déplace en glissant. C'est une illustration : les positions sont
   approximatives, la vue carte (OpenStreetMap) reste là pour la précision. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var COLS = 100, ROWS = 80, TW = 24, TH = 12, SLAB = 22;
  // Cadre large (même finesse de case qu'avant : un quart de degré) : la mer qui entoure la France
  // permet de cadrer n'importe quelle vue sans jamais voir le bord du losange.
  var LAT0 = 38.2, LAT1 = 54.87, LNG0 = -10.3, LNG1 = 14.7;
  // losange de la carte : centre et demi-diagonales
  var GEO = { cx: (COLS - ROWS) * TW / 2, cy: (COLS + ROWS) * TH / 2, W: (COLS + ROWS) * TW / 2, H: (COLS + ROWS) * TH / 2 };

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function P(u, v, z) { return [(u - v) * TW, (u + v) * TH - (z || 0)]; }
  function pts(l) { return l.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function poly(g, l, fill, extra) { var a = { points: pts(l), fill: fill }; for (var k in extra || {}) a[k] = extra[k]; return el("polygon", a, g); }
  function hash(i, j) { var h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return h - Math.floor(h); }
  function mix(a, b, t) {
    function c(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    var x = c(a), y = c(b), o = x.map(function (v, k) { return Math.round(v + (y[k] - v) * t); });
    return "#" + o.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
  }

  /* ---------- géographie ---------- */
  function toUV(lat, lng) { return { u: (lng - LNG0) / (LNG1 - LNG0) * COLS, v: (LAT1 - lat) / (LAT1 - LAT0) * ROWS }; }
  function toLL(u, v) { return { lng: LNG0 + u / COLS * (LNG1 - LNG0), lat: LAT1 - v / ROWS * (LAT1 - LAT0) }; }
  // Contours approchés (latitude, longitude), dans le sens horaire.
  var FRANCE = [
    [51.05, 2.37], [50.95, 1.85], [50.73, 1.6], [50.5, 1.58], [50.2, 1.6], [49.92, 1.08], [49.5, 0.1], [49.35, -0.4], [49.65, -1.62], [49.72, -1.95],
    [48.84, -1.6], [48.64, -1.5], [48.65, -2.0], [48.68, -2.3], [48.52, -2.76], [48.78, -3.05], [48.72, -3.98], [48.4, -4.5], [48.03, -4.73], [47.8, -4.35],
    [47.74, -3.37], [47.48, -3.12], [47.6, -2.75], [47.27, -2.2], [47.1, -2.1], [46.98, -2.25], [46.5, -1.78], [46.16, -1.15], [45.62, -1.03], [45.0, -1.2],
    [44.66, -1.2], [44.2, -1.3], [43.48, -1.56], [43.37, -1.78], [43.05, -1.3], [42.9, -0.7], [42.8, 0.0], [42.7, 0.6], [42.6, 1.2], [42.5, 1.5],
    [42.45, 2.0], [42.45, 2.6], [42.44, 3.17], [42.7, 3.04], [43.15, 3.1], [43.4, 3.7], [43.5, 4.0], [43.4, 4.6], [43.3, 5.37], [43.1, 5.93],
    [43.05, 6.2], [43.27, 6.64], [43.55, 7.0], [43.7, 7.27], [43.78, 7.5], [44.1, 7.6], [44.4, 7.0], [45.1, 7.1], [45.8, 6.9], [46.2, 6.1],
    [46.45, 6.45], [46.8, 6.45], [47.0, 6.9], [47.58, 7.59], [48.58, 7.8], [48.97, 8.23], [49.2, 7.0], [49.5, 5.8], [49.55, 5.5], [49.7, 4.95],
    [50.13, 4.83], [50.3, 4.0], [50.75, 3.1]
  ];
  var CORSE = [[43.0, 9.43], [42.7, 9.45], [41.85, 9.4], [41.39, 9.16], [41.92, 8.74], [42.57, 8.76], [42.95, 9.3]];
  function inside(poly, lat, lng) {
    var c = false;
    for (var a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      var yi = poly[a][0], xi = poly[a][1], yj = poly[b][0], xj = poly[b][1];
      if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function box(lat, lng, la0, la1, lo0, lo1) { return lat >= la0 && lat <= la1 && lng >= lo0 && lng <= lo1; }
  // type de terrain au point géographique
  function terrain(lat, lng) {
    var corse = inside(CORSE, lat, lng);
    if (!corse && !inside(FRANCE, lat, lng)) return "sea";
    if (corse) { var dc = Math.min(Math.abs(lng - 8.75), Math.abs(9.42 - lng)); return dc > 0.28 && lat < 42.75 && lat > 41.6 ? "mont" : "hill"; }
    // Pyrénées
    if (lat < 42.95 && lng > -1.6 && lng < 3.0) return "mont";
    if (lat < 43.3 && lng > -1.4 && lng < 2.8) return "hill";
    // Alpes
    if (lat > 43.9 && lat < 46.4 && lng > 5.6 + (lat - 44) * 0.45 && lng > 5.9) return lng > 6.3 + (lat - 44) * 0.3 ? "mont" : "high";
    if (box(lat, lng, 43.6, 44.6, 5.3, 6.3)) return "hill";
    // Jura, Vosges, Ardennes, Morvan
    if (box(lat, lng, 46.3, 47.45, 5.6, 6.95)) return "high";
    if (box(lat, lng, 47.75, 48.65, 6.7, 7.3)) return "forest";
    if (box(lat, lng, 49.65, 50.15, 4.4, 5.3)) return "forest";
    if (box(lat, lng, 46.95, 47.4, 3.75, 4.25)) return "forest";
    // Massif central
    if (box(lat, lng, 44.3, 45.9, 2.3, 4.2)) return lat > 44.9 && lat < 45.7 && lng > 2.6 && lng < 3.9 ? "high" : "hill";
    if (box(lat, lng, 44.0, 46.4, 0.6, 2.3) && lat > 44.0 + (lng - 0.6) * 0.0) { if (lng > 1.3 || lat > 45.2) return "hill"; }
    // forêts : Landes, Sologne, Fontainebleau, Orléans
    if (lat > 43.6 && lat < 45.2 && lng < -0.35 - (lat - 44.4) * 0.6 && lng > -1.6) return "forest";
    if (box(lat, lng, 47.35, 47.75, 1.6, 2.5)) return "forest";
    if (box(lat, lng, 48.3, 48.5, 2.5, 2.85)) return "forest";
    // vignes
    if (box(lat, lng, 44.6, 45.4, -0.9, -0.1) || box(lat, lng, 45.5, 45.8, -0.6, 0.0) || box(lat, lng, 44.78, 44.95, 0.3, 0.6)) return "vine";
    if (box(lat, lng, 48.85, 49.3, 3.8, 4.35) || box(lat, lng, 46.8, 47.5, 4.55, 5.05) || box(lat, lng, 47.9, 48.6, 7.2, 7.5)) return "vine";
    if (box(lat, lng, 47.15, 47.5, -0.6, 1.2) || box(lat, lng, 43.2, 43.65, 2.6, 4.0) || box(lat, lng, 44.0, 45.0, 4.6, 5.0) || box(lat, lng, 43.4, 43.8, 5.5, 6.5)) return "vine";
    // marais : Camargue, Poitevin, baie de Somme
    if (box(lat, lng, 43.4, 43.62, 4.3, 4.8) || box(lat, lng, 46.2, 46.45, -1.1, -0.6) || box(lat, lng, 50.15, 50.3, 1.55, 1.75)) return "marsh";
    return "plain";
  }
  var RIVERS = [
    { w: 2.6, pts: [[49.49, 0.1], [49.44, 1.1], [49.02, 1.45], [48.85, 2.35], [48.5, 3.0], [48.3, 4.08]] },                    // Seine
    { w: 2.8, pts: [[47.27, -2.2], [47.22, -1.55], [47.47, -0.55], [47.39, 0.69], [47.9, 1.9], [47.6, 2.7], [46.99, 3.16], [46.03, 4.07], [45.04, 3.88]] }, // Loire
    { w: 2.4, pts: [[45.57, -1.03], [45.3, -0.75], [44.84, -0.58], [44.55, -0.25], [44.2, 0.62], [43.6, 1.44], [43.1, 0.7]] }, // Gironde + Garonne
    { w: 2.0, pts: [[45.03, -0.6], [44.92, -0.24], [44.85, 0.48], [44.9, 1.47], [45.4, 2.5]] },                               // Dordogne
    { w: 2.8, pts: [[43.4, 4.6], [43.68, 4.63], [43.95, 4.81], [44.93, 4.89], [45.76, 4.84], [46.2, 5.0], [46.78, 4.85], [47.45, 5.6]] }, // Rhône + Saône
    { w: 1.8, pts: [[49.16, 5.38], [49.7, 4.95], [50.13, 4.83]] },                                                             // Meuse
    { w: 1.8, pts: [[48.17, 6.45], [48.69, 6.18], [49.12, 6.18], [49.36, 6.17]] },                                             // Moselle
    { w: 2.4, pts: [[47.58, 7.59], [48.58, 7.8], [48.97, 8.23]] },                                                             // Rhin
    { w: 1.6, pts: [[45.94, -0.96], [45.75, -0.63], [45.7, -0.33], [45.65, 0.16]] },                                           // Charente
    { w: 1.6, pts: [[43.49, -1.47], [43.7, -1.05], [43.89, -0.5], [43.5, 0.05]] },                                             // Adour
    { w: 1.6, pts: [[45.83, 1.26], [46.0, 0.67], [46.58, 0.34], [47.2, 0.1]] },                                                // Vienne
    { w: 1.8, pts: [[48.85, 2.4], [48.96, 4.36], [48.6, 5.0]] },                                                               // Marne
    { w: 1.6, pts: [[46.99, 3.16], [46.3, 3.3], [45.77, 3.1]] }                                                                // Allier
  ];
  var VILLES = [
    ["Paris", 48.85, 2.35, 4], ["Lyon", 45.76, 4.84, 3], ["Marseille", 43.3, 5.37, 3], ["Toulouse", 43.6, 1.44, 3], ["Bordeaux", 44.84, -0.58, 3],
    ["Lille", 50.63, 3.06, 2], ["Nantes", 47.22, -1.55, 2], ["Strasbourg", 48.58, 7.75, 2], ["Nice", 43.7, 7.27, 2], ["Rennes", 48.11, -1.68, 2],
    ["Montpellier", 43.61, 3.88, 2], ["Grenoble", 45.19, 5.72, 1], ["Dijon", 47.32, 5.04, 1], ["Clermont-Ferrand", 45.78, 3.08, 1], ["Limoges", 45.83, 1.26, 1],
    ["Tours", 47.39, 0.69, 1], ["Orléans", 47.9, 1.9, 1], ["Rouen", 49.44, 1.1, 1], ["Le Havre", 49.49, 0.1, 1], ["Caen", 49.18, -0.37, 1],
    ["Brest", 48.39, -4.49, 1], ["Poitiers", 46.58, 0.34, 1], ["La Rochelle", 46.16, -1.15, 1], ["Pau", 43.3, -0.37, 1], ["Bayonne", 43.49, -1.47, 1],
    ["Perpignan", 42.7, 2.9, 1], ["Nancy", 48.69, 6.18, 1], ["Metz", 49.12, 6.18, 1], ["Reims", 49.26, 4.03, 1], ["Amiens", 49.89, 2.3, 1],
    ["Besançon", 47.24, 6.02, 1], ["Ajaccio", 41.92, 8.74, 1], ["Bastia", 42.7, 9.45, 1], ["Angers", 47.47, -0.55, 1], ["Le Mans", 48.0, 0.2, 1],
    ["Nîmes", 43.84, 4.36, 1], ["Avignon", 43.95, 4.81, 1], ["Toulon", 43.12, 5.93, 1], ["Saint-Étienne", 45.44, 4.39, 1], ["Périgueux", 45.18, 0.72, 1],
    ["Angoulême", 45.65, 0.16, 1], ["Agen", 44.2, 0.62, 1], ["Mont-de-Marsan", 43.89, -0.5, 1], ["Niort", 46.32, -0.46, 1], ["Brive", 45.16, 1.53, 1],
    ["Bergerac", 44.85, 0.48, 1], ["Mulhouse", 47.75, 7.34, 1], ["Troyes", 48.3, 4.08, 1], ["Quimper", 48.0, -4.1, 1], ["Valence", 44.93, 4.89, 1]
  ];
  var COL = {
    sea: ["#A9CBCF", "#9FC3C8"], plain: ["#CFD9A8", "#C6D19D"], vine: ["#C8CF95", "#BFC78A"], forest: ["#8FB58C", "#86AD83"],
    marsh: ["#B9CFB4", "#B0C8AC"], hill: ["#B9C98E", "#AFC085"], high: ["#A8B983", "#9EB07A"], mont: ["#A7A99A", "#9C9E90"]
  };
  function height(type, i, j) {
    if (type === "hill") return 6 + hash(i, j) * 4;
    if (type === "high") return 12 + hash(i, j) * 5;
    if (type === "mont") return 14 + hash(i, j) * 6;
    if (type === "sea") return -3;
    return 0;
  }

  /* ---------- terrain (dessiné une seule fois par conteneur) ---------- */
  function buildTerrain(host) {
    host.innerHTML = "";
    var minX = -ROWS * TW - 24, width = (COLS + ROWS) * TW + 48, minY = -70, height_ = (COLS + ROWS) * TH + SLAB + 120;
    var full = { x: minX, y: minY, w: width, h: height_ };
    var svg = el("svg", { viewBox: full.x + " " + full.y + " " + full.w + " " + full.h, class: "imap-svg", role: "img", preserveAspectRatio: "xMidYMid slice",
      "aria-label": "Carte illustrée de la France avec les lieux EVAD. Positions approximatives. Molette ou boutons pour zoomer, glisser pour se déplacer." }, host);
    var g0 = el("g", {}, svg);
    poly(g0, [P(0, ROWS, 0), P(COLS, ROWS, 0), P(COLS, ROWS, -SLAB), P(0, ROWS, -SLAB)], "#9C6B4A");
    poly(g0, [P(COLS, 0, 0), P(COLS, ROWS, 0), P(COLS, ROWS, -SLAB), P(COLS, 0, -SLAB)], "#80573C");

    // la mer : un seul losange, puis quelques vagues ; les cases de terre seulement sont dessinées une à une
    var sea = el("g", { class: "imap-sea" }, svg);
    poly(sea, [P(0, 0, -3), P(COLS, 0, -3), P(COLS, ROWS, -3), P(0, ROWS, -3)], "#A4C7CC");
    var tiles = [], zs = {};
    for (var i = 0; i < COLS; i++) for (var j = 0; j < ROWS; j++) {
      var ll = toLL(i + 0.5, j + 0.5), t = terrain(ll.lat, ll.lng), z = height(t, i, j);
      zs[i + "," + j] = z;
      if (t === "sea") {
        if (hash(i * 2, j) > 0.86) { var w0 = P(i + 0.2 + hash(i, j) * 0.5, j + 0.5, -3); el("path", { d: "M" + w0[0] + " " + w0[1] + " q4 -2 8 0 q4 2 8 0", stroke: "rgba(255,253,247,.55)", "stroke-width": 1, fill: "none" }, sea); }
        else if (hash(i, j * 3) > 0.5) poly(sea, [P(i, j, -3), P(i + 1, j, -3), P(i + 1, j + 1, -3), P(i, j + 1, -3)], "rgba(255,253,247,.06)");
        continue;
      }
      tiles.push({ i: i, j: j, t: t, z: z });
    }
    tiles.sort(function (a, b) { return (a.i + a.j) - (b.i + b.j) || a.i - b.i; });
    var gt = el("g", { class: "imap-tiles" }, svg);
    tiles.forEach(function (c) {
      var i = c.i, j = c.j, z = c.z, base = COL[c.t][hash(j, i) > 0.5 ? 1 : 0];
      // bord de mer : une petite tranche sous la case, pour marquer la côte
      if (!c.z && (!zs[i + "," + (j + 1)] || zs[i + "," + (j + 1)] < 0)) poly(gt, [P(i, j + 1, 0), P(i + 1, j + 1, 0), P(i + 1, j + 1, -3), P(i, j + 1, -3)], "#B9A98B");
      if (!c.z && (zs[(i + 1) + "," + j] === undefined || zs[(i + 1) + "," + j] < 0)) poly(gt, [P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i + 1, j + 1, -3), P(i + 1, j, -3)], "#A8987A");
      if (z > 0) {
        poly(gt, [P(i, j + 1, z), P(i + 1, j + 1, z), P(i + 1, j + 1, 0), P(i, j + 1, 0)], mix(base, "#1C2E26", 0.25));
        poly(gt, [P(i + 1, j, z), P(i + 1, j + 1, z), P(i + 1, j + 1, 0), P(i + 1, j, 0)], mix(base, "#1C2E26", 0.38));
      }
      poly(gt, [P(i, j, z), P(i + 1, j, z), P(i + 1, j + 1, z), P(i, j + 1, z)], base, { stroke: "rgba(255,253,247,.16)", "stroke-width": 0.5 });
      if (c.t === "forest") {
        [[0.3, 0.35], [0.7, 0.65], [0.35, 0.75]].forEach(function (o, k) {
          if (hash(i + k, j) < 0.3) return;
          var p = P(i + o[0], j + o[1], z);
          el("path", { d: "M" + p[0] + " " + p[1] + " l-3 0 l3 -7 l3 7 z", fill: k % 2 ? "#4E8C6C" : "#3F7A5C" }, gt);
        });
      } else if (c.t === "vine") {
        [0.3, 0.6].forEach(function (f) { var a = P(i + 0.1, j + f, z), b = P(i + 0.9, j + f, z); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#8E9A5A", "stroke-width": 0.9, opacity: 0.8 }, gt); });
      } else if (c.t === "mont") {
        var pk = P(i + 0.5, j + 0.5, z), hpk = 10 + hash(i, j) * 8;
        el("path", { d: "M" + (pk[0] - 9) + " " + (pk[1] + 2) + " L" + pk[0] + " " + (pk[1] - hpk) + " L" + (pk[0] + 9) + " " + (pk[1] + 2) + " Z", fill: "#8E9084" }, gt);
        el("path", { d: "M" + (pk[0] - 3) + " " + (pk[1] - hpk + 4.5) + " L" + pk[0] + " " + (pk[1] - hpk) + " L" + (pk[0] + 3) + " " + (pk[1] - hpk + 4.5) + " Z", fill: "#F4F1E8" }, gt);
      } else if ((c.t === "hill" || c.t === "high") && hash(j, i * 3) > 0.72) {
        var q = P(i + 0.5, j + 0.5, z);
        el("path", { d: "M" + q[0] + " " + q[1] + " l-3 0 l3 -6 l3 6 z", fill: "#5F7F52" }, gt);
      } else if (c.t === "marsh" && hash(i, j * 2) > 0.5) {
        var m = P(i + 0.5, j + 0.5, z);
        el("path", { d: "M" + m[0] + " " + m[1] + " l-2 -4 M" + m[0] + " " + m[1] + " l2 -5 M" + m[0] + " " + m[1] + " l0 -5", stroke: "#6E9A7B", "stroke-width": 1, fill: "none" }, gt);
      } else if (c.t === "plain" && hash(i * 5, j) > 0.88) {
        var r = P(i + 0.3 + hash(i, j) * 0.4, j + 0.5, z);
        el("path", { d: "M" + r[0] + " " + r[1] + " l-2 -3 M" + r[0] + " " + r[1] + " l2 -4", stroke: "#A6B37A", "stroke-width": 1, fill: "none" }, gt);
      }
    });
    function zAt(u, v) { var k = Math.floor(u) + "," + Math.floor(v); return Math.max(0, zs[k] || 0); }
    // fleuves
    var gw = el("g", { class: "imap-water" }, svg);
    RIVERS.forEach(function (r) {
      var d = r.pts.map(function (ll, k) { var uv = toUV(ll[0], ll[1]); var p = P(uv.u, uv.v, zAt(uv.u, uv.v)); return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
      el("path", { d: d, stroke: "#8FBFC4", "stroke-width": r.w, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, gw);
    });
    // villes (mises à l'échelle inverse du zoom pour rester lisibles)
    var gv = el("g", { class: "imap-towns" }, svg), towns = [];
    VILLES.forEach(function (vl) {
      var uv = toUV(vl[1], vl[2]), z = zAt(uv.u, uv.v), c = P(uv.u, uv.v, z);
      var g = el("g", { class: "imap-town imap-town-" + vl[3] }, gv), inner = el("g", {}, g);
      for (var k = 0; k < vl[3] + 1; k++) {
        var dx = (hash(k, vl[3]) - 0.5) * 14, dy = (hash(vl[3], k) - 0.5) * 7;
        el("rect", { x: dx - 3, y: dy - 5, width: 6, height: 5, fill: "#E9DCC8", stroke: "#B98E62", "stroke-width": 0.6 }, inner);
        el("path", { d: "M" + (dx - 3.5) + " " + (dy - 5) + " L" + dx + " " + (dy - 8.5) + " L" + (dx + 3.5) + " " + (dy - 5) + " Z", fill: "#B8674A" }, inner);
      }
      el("text", { x: 0, y: 12, class: "imap-town-lbl", "text-anchor": "middle" }, inner).textContent = vl[0];
      towns.push({ g: inner, x: c[0], y: c[1], g0: vl[3] });
    });
    // rose des vents
    var ruv = toUV(51.6, 8.2), rose = P(ruv.u, ruv.v, 0), gr = el("g", { class: "imap-rose" }, svg);
    el("path", { d: "M" + rose[0] + " " + (rose[1] - 20) + " l6 14 l-6 -4 l-6 4 z", fill: "#2C5234" }, gr);
    el("text", { x: rose[0], y: rose[1] - 24, class: "imap-rose-lbl", "text-anchor": "middle" }, gr).textContent = "N";
    var gm = el("g", { class: "imap-marks" }, svg), gme = el("g", { class: "imap-me" }, svg);

    // légende et commandes, en HTML par-dessus
    var cap = document.createElement("p"); cap.className = "imap-caption"; cap.textContent = "Carte illustrée : positions approximatives. La vue carte donne le détail."; host.appendChild(cap);
    var zc = document.createElement("div"); zc.className = "imap-zoom"; zc.setAttribute("role", "group"); zc.setAttribute("aria-label", "Zoom de la carte illustrée. Au clavier : plus, moins, zéro pour tout voir, flèches pour se déplacer.");
    zc.innerHTML = '<button type="button" data-z="in" aria-label="Zoomer">+</button><button type="button" data-z="out" aria-label="Dézoomer">−</button><button type="button" data-z="fit" class="imap-fit">Tout voir</button>';
    host.appendChild(zc);

    var st = { svg: svg, full: full, vb: Object.assign({}, full), gm: gm, gme: gme, towns: towns, zAt: zAt, marks: [], zoom: 1, host: host, ratio: 2 };
    setupNav(host, st, zc);
    if (window.ResizeObserver) new ResizeObserver(function () { applyView(st); }).observe(host);
    else window.addEventListener("resize", function () { applyView(st); });
    host._imap = st;
    return st;
  }

  /* ---------- zoom et déplacement ---------- */
  // Plus grande fenêtre possible (largeur) pour un rapport largeur/hauteur donné, inscrite dans le losange.
  function maxWidth(ratio) { return 2 / (1 / GEO.W + 1 / (ratio * GEO.H)); }
  function applyView(st) {
    var vb = st.vb, r = st.host.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) st.ratio = r.width / r.height;
    var ratio = st.ratio, wMax = maxWidth(ratio), wMin = wMax / 10;
    // taille : entre le zoom maximal et la vue « tout voir » ; la hauteur suit l'écran
    var cxv = vb.x + vb.w / 2, cyv = vb.y + vb.h / 2;
    vb.w = Math.min(wMax, Math.max(wMin, vb.w)); vb.h = vb.w / ratio;
    // position : les quatre coins de la fenêtre restent dans le losange
    var dx = cxv - GEO.cx, dy = cyv - GEO.cy;
    for (var k = 0; k < 3; k++) {
      var maxDy = Math.max(0, GEO.H * (1 - (Math.abs(dx) + vb.w / 2) / GEO.W) - vb.h / 2); dy = Math.max(-maxDy, Math.min(maxDy, dy));
      var maxDx = Math.max(0, GEO.W * (1 - (Math.abs(dy) + vb.h / 2) / GEO.H) - vb.w / 2); dx = Math.max(-maxDx, Math.min(maxDx, dx));
    }
    vb.x = GEO.cx + dx - vb.w / 2; vb.y = GEO.cy + dy - vb.h / 2;
    st.zoom = wMax / vb.w;
    st.svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h);
    // À l'échelle de la France, un plateau ou un nom de ville serait minuscule : on les grossit
    // en proportion inverse du zoom (en douceur), pour qu'ils restent lisibles de loin comme de près.
    var k = Math.max(0.2, 1 / Math.pow(st.zoom, 0.75));
    st.towns.forEach(function (t) {
      var s = Math.max(0.6, Math.min(2.6, k * (t.g0 >= 2 ? 2.4 : 1.7)));
      t.g.setAttribute("transform", "translate(" + t.x + " " + t.y + ") scale(" + s + ")");
      var pres = st.lieu && Math.hypot(t.x - st.lieu.x, (t.y - st.lieu.y) * 2) < 110; // une ville sous la maquette s'efface
      t.g.parentNode.style.opacity = ((st.zoom < 1.8 && t.g0 < 2) || pres) ? "0" : "1";
    });
    st.marks.forEach(function (m) { var s = m.base * k; m.g.setAttribute("transform", "translate(" + (m.x - 24 * s) + " " + (m.y - 40 * s) + ") scale(" + s + ")"); });
    if (st.me) { var s2 = 1.6 * k; st.me.setAttribute("transform", "translate(" + st.mex + " " + st.mey + ") scale(" + s2 + ")"); }
    // maquette 2,5D du lieu sélectionné : posée sur la grille de la carte, à taille fixe (elle grandit avec le zoom
    // comme le terrain), elle se révèle entre les zooms 3 et 6 pendant que le plateau s'efface
    if (st.lieu) {
      var t = Math.max(0, Math.min(1, (st.zoom - 3) / 3));
      st.lieu.g.style.opacity = t;
      if (st.lieu.mark) st.lieu.mark.style.opacity = 1 - t;
    }
    if (st.zc) { st.zc.querySelector("[data-z=in]").disabled = st.zoom >= 9.9; st.zc.querySelector("[data-z=out]").disabled = st.zoom <= 1.01; }
    // la hauteur du cadre dépend de l'écran : on garde la largeur voulue comme référence
    st.vb = vb;
  }
  // Glisse le cadre vers une cible (zoom et centre), en douceur ; toute action de l'utilisateur l'interrompt.
  function animateTo(st, target, ms) {
    if (st.anim) cancelAnimationFrame(st.anim);
    var from = Object.assign({}, st.vb), t0 = performance.now();
    function step(now) {
      var t = Math.min(1, (now - t0) / ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      st.vb = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e };
      applyView(st);
      st.anim = t < 1 ? requestAnimationFrame(step) : null;
    }
    st.anim = requestAnimationFrame(step);
  }
  function stopAnim(st) { if (st.anim) { cancelAnimationFrame(st.anim); st.anim = null; } }
  // La France entière : plus grande fenêtre sans bord, centrée sur le pays (décalée si un panneau couvre la gauche).
  function fitAll(st, anime) {
    var c = toUV(46.6, 2.4), cc = P(c.u, c.v, 0), w = maxWidth(st.ratio), h = w / st.ratio;
    var r = st.host.getBoundingClientRect(), shift = r.width ? (st.padLeft || 0) / r.width * w / 2 : 0;
    var target = { x: cc[0] - w / 2 - shift, y: cc[1] - h / 2, w: w, h: h };
    if (anime) animateTo(st, target, 700); else { st.vb = target; applyView(st); }
  }
  function zoomAt(st, factor, cx, cy) {
    var vb = st.vb, nw = vb.w / factor;
    if (cx === undefined) { cx = vb.x + vb.w / 2; cy = vb.y + vb.h / 2; }
    vb.x = cx - (cx - vb.x) / factor; vb.y = cy - (cy - vb.y) / factor; vb.w = nw; vb.h = nw / st.ratio;
    applyView(st);
  }
  function svgPoint(st, clientX, clientY) {
    var pt = st.svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    var m = st.svg.getScreenCTM(); if (!m) return null;
    var p = pt.matrixTransform(m.inverse()); return { x: p.x, y: p.y };
  }
  function setupNav(host, st, zc) {
    st.zc = zc;
    zc.addEventListener("click", function (e) {
      var b = e.target.closest("[data-z]"); if (!b) return; stopAnim(st);
      if (b.dataset.z === "in") zoomAt(st, 1.6); else if (b.dataset.z === "out") zoomAt(st, 1 / 1.6); else fitAll(st, true);
    });
    st.svg.addEventListener("wheel", function (e) {
      e.preventDefault(); stopAnim(st);
      var p = svgPoint(st, e.clientX, e.clientY); if (!p) return;
      zoomAt(st, Math.pow(1.0015, -e.deltaY), p.x, p.y);
    }, { passive: false });
    st.svg.addEventListener("dblclick", function (e) { var p = svgPoint(st, e.clientX, e.clientY); if (p) zoomAt(st, 1.8, p.x, p.y); });
    // glisser pour se déplacer, pincer pour zoomer ; un clic sans mouvement reste un clic (sur un lieu)
    var ptrs = {}, drag = null, pinch = null;
    st.svg.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      stopAnim(st);
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptrs);
      if (ids.length === 1) { drag = { x: e.clientX, y: e.clientY, vx: st.vb.x, vy: st.vb.y, moved: false }; }
      else if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: st.vb.w }; drag = null; }
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    });
    function move(e) {
      if (!ptrs[e.pointerId]) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptrs);
      if (pinch && ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
        var cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, p = svgPoint(st, cx, cy);
        var nw = pinch.w * pinch.d / Math.max(10, d), f = st.vb.w / nw;
        if (p) zoomAt(st, f, p.x, p.y);
        return;
      }
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      var r = st.svg.getBoundingClientRect(), k = st.vb.w / r.width;
      st.vb.x = drag.vx - dx * k; st.vb.y = drag.vy - dy * k; applyView(st);
      st.svg.classList.add("is-panning");
    }
    function up(e) {
      delete ptrs[e.pointerId];
      if (drag && drag.moved) { st.svg.classList.remove("is-panning"); st.svg._justDragged = true; setTimeout(function () { st.svg._justDragged = false; }, 80); }
      drag = null; if (Object.keys(ptrs).length < 2) pinch = null;
      if (!Object.keys(ptrs).length) { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); }
    }
    zc.addEventListener("keydown", function (e) {
      if (e.key === "+" || e.key === "=") { zoomAt(st, 1.6); e.preventDefault(); }
      else if (e.key === "-") { zoomAt(st, 1 / 1.6); e.preventDefault(); }
      else if (e.key === "0") fitAll(st, true);
      else if (/^Arrow/.test(e.key)) { var step = st.vb.w * 0.08; if (e.key === "ArrowLeft") st.vb.x -= step; if (e.key === "ArrowRight") st.vb.x += step; if (e.key === "ArrowUp") st.vb.y -= step; if (e.key === "ArrowDown") st.vb.y += step; applyView(st); e.preventDefault(); }
    });
  }

  /* ---------- lieux (redessinés à chaque appel, le terrain reste) ---------- */
  function render(host, opt) {
    opt = opt || {};
    var st = host._imap && host.contains(host._imap.svg) ? host._imap : buildTerrain(host);
    var first = !st.ready; st.ready = true;
    st.padLeft = opt.padLeft || 0; st.padRight = opt.padRight || 0;
    st.gm.innerHTML = ""; st.gme.innerHTML = ""; st.marks = []; st.me = null; st.lieu = null;
    var selMark = null, selUV = null;
    var projets = (opt.projects || []).map(function (p) { return { p: p, uv: toUV(p.loc.lat, p.loc.lng) }; })
      .filter(function (x) { return x.uv.u >= 0 && x.uv.u <= COLS && x.uv.v >= 0 && x.uv.v <= ROWS; })
      .sort(function (a, b) { return (a.uv.u + a.uv.v) - (b.uv.u + b.uv.v); });
    projets.forEach(function (x) {
      var p = x.p, c = P(x.uv.u, x.uv.v, st.zAt(x.uv.u, x.uv.v)), base = p.isMine ? 1.9 : 1.6;
      var sel = opt.selected === p.id, hl = opt.highlight && opt.highlight(p);
      var g = el("g", { class: "imark st-" + p.statut + (p.isMine ? " is-mine" : "") + (p.isExample ? " is-example" : "") + (sel ? " is-selected" : "") + (hl ? " is-highlight" : ""),
        "data-id": p.id, role: "button", tabindex: "0", "aria-label": p.nom + ", " + ({ reve: "rêvé", encours: "en cours", prouve: "prouvé" })[p.statut] + (p.isExample ? ", exemple" : "") }, st.gm);
      el("title", {}, g).textContent = p.nom;
      var body = el("g", { class: "imark-body" }, g);
      if (p.isMine) el("ellipse", { cx: 24, cy: 40, rx: 16, ry: 7, class: "imark-pulse" }, body);
      el("ellipse", { cx: 25, cy: 43, rx: 15, ry: 5, class: "mi-shadow" }, body);
      el("polygon", { points: "6,28 24,37 24,43 6,34", class: "mi-left" }, body);
      el("polygon", { points: "24,37 42,28 42,34 24,43", class: "mi-right" }, body);
      el("polygon", { points: "24,19 42,28 24,37 6,28", class: "mi-top" }, body);
      el("rect", { x: 23, y: 18, width: 2.4, height: 9, rx: 1, class: "mi-trunk" }, body);
      el("circle", { cx: 24.2, cy: 13, r: 7, class: "mi-leaf" }, body);
      el("circle", { cx: 21.5, cy: 10.5, r: 3.2, class: "mi-light" }, body);
      if (p.statut === "prouve") [[27.5, 15], [21, 16], [26, 9.5]].forEach(function (f) { el("circle", { cx: f[0], cy: f[1], r: 1.4, class: "mi-fruit" }, body); });
      if (p.statut === "reve") el("polygon", { points: "24,19 42,28 24,37 6,28", class: "mi-dash" }, body);
      var nom = p.nom.length > 26 ? p.nom.slice(0, 25) + "…" : p.nom;
      el("text", { x: 24, y: 55, class: "imark-lbl", "text-anchor": "middle" }, g).textContent = nom;
      if (opt.onSelect) {
        g.addEventListener("click", function (e) { if (st.svg._justDragged) return; e.stopPropagation(); opt.onSelect(p.id); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opt.onSelect(p.id); } });
      }
      st.marks.push({ g: g, x: c[0], y: c[1], base: base });
      if (sel) { selMark = { g: g, x: c[0], y: c[1], p: p }; selUV = x.uv; }
    });
    // Un lieu sélectionné : on s'en approche jusqu'à voir sa maquette 2,5D posée sur la carte.
    if (selMark && opt.lieu && window.renderScene) {
      var tmp = document.createElement("div");
      window.renderScene(tmp, opt.lieu, { life: false, socle: false, label: "Maquette de " + selMark.p.nom });
      var sc = tmp.querySelector("svg");
      if (sc) {
        // la maquette se cale au centre de la case de la carte qui porte le lieu, à la hauteur du terrain
        var ci = Math.floor(selUV.u), cj = Math.floor(selUV.v), cc = P(ci + 0.5, cj + 0.5, st.zAt(ci + 0.5, cj + 0.5));
        var vbv = (sc.getAttribute("viewBox") || "0 0 600 420").split(/\s+/).map(Number);
        var w = 2.4 * 2 * TW, h = w * vbv[3] / vbv[2];           // un peu plus de deux cases de large
        var cyFrac = (144 - vbv[1]) / vbv[3];                      // position du centre de la grille dans la vue de la maquette
        var gl = el("g", { class: "imap-lieu" }, st.gm);
        // tapis d'herbe fondu sous la maquette, pour l'asseoir dans le paysage
        var rx = w * 0.56, ry = rx * 0.5;
        poly(gl, [[cc[0], cc[1] - ry], [cc[0] + rx, cc[1]], [cc[0], cc[1] + ry], [cc[0] - rx, cc[1]]], "#C4D6A4", { class: "imap-lieu-ground" });
        el("ellipse", { cx: cc[0], cy: cc[1] + ry * 0.9, rx: rx * 0.9, ry: ry * 0.35, fill: "rgba(28,46,38,.18)", class: "imap-lieu-shadow" }, gl);
        sc.setAttribute("class", "imap-lieu-svg"); sc.setAttribute("preserveAspectRatio", "xMidYMid meet"); sc.style.pointerEvents = "none";
        sc.setAttribute("width", w); sc.setAttribute("height", h); sc.setAttribute("x", cc[0] - w / 2); sc.setAttribute("y", cc[1] - h * cyFrac);
        gl.appendChild(sc);
        st.lieu = { g: gl, x: cc[0], y: cc[1], mark: selMark.g };
      }
    }
    if (selMark && opt.selected !== st.lastSel) {
      // zoom maximal, le lieu au centre de la zone réellement visible (entre le panneau de Deva et la fiche)
      var w = maxWidth(st.ratio) / 10, h = w / st.ratio, rr = st.host.getBoundingClientRect();
      var fx = rr.width ? (st.padLeft + (rr.width - st.padLeft - st.padRight) / 2) / rr.width : 0.5;
      animateTo(st, { x: selMark.x - w * fx, y: selMark.y - h * 0.55, w: w, h: h }, 1100);
    }
    st.lastSel = opt.selected || null;
    if (opt.me) {
      var mu = toUV(opt.me.lat, opt.me.lng);
      if (mu.u >= 0 && mu.u <= COLS && mu.v >= 0 && mu.v <= ROWS) {
        var mc = P(mu.u, mu.v, st.zAt(mu.u, mu.v)), g2 = el("g", {}, st.gme);
        el("ellipse", { cx: 0, cy: 0, rx: 9, ry: 4.5, class: "imap-me-ring" }, g2);
        el("circle", { cx: 0, cy: -1, r: 4, fill: "#9BC7AC", stroke: "#0B6049", "stroke-width": 1.6 }, g2);
        el("text", { x: 0, y: -9, class: "imap-me-lbl", "text-anchor": "middle" }, g2).textContent = "Toi";
        st.me = g2; st.mex = mc[0]; st.mey = mc[1];
      }
    }
    // premier affichage : on cadre les lieux (avec de l'air), jamais plus serré que la moitié de la France
    if (first) {
      applyView(st); // mesure l'écran
      if (st.marks.length) {
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        st.marks.forEach(function (m) { x0 = Math.min(x0, m.x); y0 = Math.min(y0, m.y); x1 = Math.max(x1, m.x); y1 = Math.max(y1, m.y); });
        var rr0 = st.host.getBoundingClientRect(), visible = rr0.width ? (rr0.width - st.padLeft) / rr0.width : 1;
        var w0 = Math.max((x1 - x0) * 1.9, maxWidth(st.ratio) / 2.2) / visible, h0 = w0 / st.ratio;
        var fx0 = rr0.width ? (st.padLeft + (rr0.width - st.padLeft) / 2) / rr0.width : 0.5;
        st.vb = { x: (x0 + x1) / 2 - w0 * fx0, y: (y0 + y1) / 2 - 20 - h0 / 2, w: w0, h: h0 };
      } else fitAll(st, false);
    }
    applyView(st);
    return st.svg;
  }

  window.renderIsoMap = render;
  window.EvadIsoMap = { render: render, toUV: toUV, bounds: { lat0: LAT0, lat1: LAT1, lng0: LNG0, lng1: LNG1 } };
})();
