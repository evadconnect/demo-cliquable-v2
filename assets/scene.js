/* EVAD, scène 2.5D isométrique du lieu (SVG pur, sans dépendance).
   EvadScene.render(conteneur, options) dessine le terrain, les bâtiments existants
   et les solutions posées avec leur état : prévu (gris), en cours (ambre), vérifié (vert). */
(function () {
  var NS = "http://www.w3.org/2000/svg";
  var TW = 32; // demi-largeur d'une case
  var TH = 16; // demi-hauteur d'une case
  var SLAB = 22; // épaisseur du socle de terre

  function P(x, y, z) { return [(x - y) * TW, (x + y) * TH - (z || 0)]; }
  function pts(list) { return list.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function el(tag, attrs, parent) { // les attributs null ou undefined sont ignorés
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function poly(parent, list, fill, extra) {
    var a = { points: pts(list), fill: fill };
    if (extra) for (var k in extra) a[k] = extra[k];
    return el("polygon", a, parent);
  }
  function mix(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); });
    var pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return "#" + pa.map(function (v, i) { var c = Math.round(v + (pb[i] - v) * t); return (c < 16 ? "0" : "") + c.toString(16); }).join("");
  }
  function hash(i, j) { var h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return h - Math.floor(h); }
  // interpolation bilinéaire dans un quadrilatère (pour fenêtres et panneaux)
  function sub(q, u0, v0, u1, v1) {
    function at(u, v) {
      var top = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u];
      var bot = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u];
      return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
    }
    return [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  }

  // boîte isométrique : renvoie les 3 faces visibles
  function box(g, x, y, w, d, h, c, z0, extra) {
    z0 = z0 || 0;
    var top = [P(x, y, z0 + h), P(x + w, y, z0 + h), P(x + w, y + d, z0 + h), P(x, y + d, z0 + h)];
    var left = [P(x, y + d, z0 + h), P(x + w, y + d, z0 + h), P(x + w, y + d, z0), P(x, y + d, z0)];
    var right = [P(x + w, y, z0 + h), P(x + w, y + d, z0 + h), P(x + w, y + d, z0), P(x + w, y, z0)];
    poly(g, left, c.left, extra);
    poly(g, right, c.right, extra);
    poly(g, top, c.top, extra);
    return { top: top, left: left, right: right };
  }
  // toit à deux pans, faîtage parallèle à l'axe x
  function roof(g, x, y, w, d, h, rh, c, over) {
    over = over || 0.08;
    var x0 = x - over, x1 = x + w + over, y0 = y - over, y1 = y + d + over, ym = y + d / 2;
    var back = [P(x0, y0, h), P(x1, y0, h), P(x1, ym, h + rh), P(x0, ym, h + rh)];
    var front = [P(x0, ym, h + rh), P(x1, ym, h + rh), P(x1, y1, h), P(x0, y1, h)];
    var gable = [P(x + w, y, h), P(x + w, y + d, h), P(x + w, ym, h + rh)];
    poly(g, back, c.back);
    poly(g, gable, c.gable);
    poly(g, front, c.front);
    return { front: front, back: back };
  }
  function shadow(g, cx, cy, rx) { el("ellipse", { cx: cx, cy: cy, rx: rx, ry: rx / 2, fill: "rgba(34,48,31,.16)" }, g); }
  function tree(g, x, y, s, c) {
    var b = P(x, y, 0);
    shadow(g, b[0] + 4, b[1] + 1, 13 * s);
    el("rect", { x: b[0] - 2, y: b[1] - 16 * s, width: 4, height: 16 * s, rx: 1.5, fill: c.trunk }, g);
    // le feuillage est groupé pour pouvoir osciller doucement (CSS, désactivé si prefers-reduced-motion)
    var can = el("g", { class: "iso-canopy" }, g);
    el("circle", { cx: b[0], cy: b[1] - 24 * s, r: 13 * s, fill: c.leaf }, can);
    el("circle", { cx: b[0] - 4 * s, cy: b[1] - 28 * s, r: 7 * s, fill: c.light }, can);
    if (c.fruit) {
      [[5, -20], [-6, -18], [2, -31], [8, -27]].forEach(function (f) {
        el("circle", { cx: b[0] + f[0] * s, cy: b[1] + f[1] * s, r: 1.8, fill: c.fruit }, can);
      });
    }
    if (c.face) { // petit visage, comme sur la maquette de référence
      var fy = b[1] - 23 * s;
      el("circle", { cx: b[0] - 4 * s, cy: fy, r: 1.3, fill: "#1C2E26" }, can);
      el("circle", { cx: b[0] + 4 * s, cy: fy, r: 1.3, fill: "#1C2E26" }, can);
      el("path", { d: "M" + (b[0] - 3.5 * s) + " " + (fy + 4 * s) + " Q" + b[0] + " " + (fy + 7.5 * s) + " " + (b[0] + 3.5 * s) + " " + (fy + 4 * s), stroke: "#1C2E26", "stroke-width": 1, fill: "none", "stroke-linecap": "round" }, can);
    }
  }
  function person(g, x, y, color) {
    var b = P(x, y, 0);
    el("ellipse", { cx: b[0], cy: b[1], rx: 5, ry: 2.5, fill: "rgba(34,48,31,.2)" }, g);
    el("rect", { x: b[0] - 3.5, y: b[1] - 15, width: 7, height: 12, rx: 3.5, fill: color }, g);
    el("circle", { cx: b[0], cy: b[1] - 18.5, r: 3.4, fill: "#E9C9A6" }, g);
  }

  /* ---------- palettes ---------- */
  var BASE = {
    wallL: "#F4EBD8", wallR: "#DCCDB0", wallT: "#EFE4CC",
    roofF: "#B8674A", roofB: "#9E553C", gable: "#E6D8BC",
    green: { front: "#6FA083", back: "#588A6C", gable: "#E6D8BC" },
    solar: "#34465A", solarLine: "#8FA6B8",
    bed: { top: "#6E4E37", left: "#8A6448", right: "#765439" },
    plant: "#4E8C6C", plantLight: "#9BC7AC",
    water: "#9CC3C4", waterDeep: "#7FB0B3", rim: "#86AE94",
    trunk: "#7A5A40"
  };
  var STATUS = {
    prevu: { a: "#C9C3B0", b: "#B3AD98", c: "#DEDACB", d: "#A29C87", stroke: "#8C8672", dash: "4 3", tile: "rgba(203,198,180,.55)" },
    encours: { a: "#D59154", b: "#B06E2E", c: "#EAC197", d: "#9A5F28", stroke: "#8A5422", dash: null, tile: "rgba(213,145,84,.35)" },
    verifie: { a: "#4E8C6C", b: "#0B6049", c: "#9BC7AC", d: "#2F6B52", stroke: "#0B6049", dash: null, tile: "rgba(78,140,108,.35)" }
  };

  /* ---------- bâtiments existants ---------- */
  var DRAW = {
    atelier: function (g, s) {
      var f = box(g, s.i + 0.1, s.j + 0.1, s.w - 0.2, s.d - 0.2, 40, { top: BASE.wallT, left: BASE.wallL, right: BASE.wallR });
      // grandes portes et fenêtres
      poly(g, sub(f.left, 0.1, 0.45, 0.32, 1), "#8A6448");
      [0.45, 0.62, 0.79].forEach(function (u) { poly(g, sub(f.left, u, 0.3, u + 0.11, 0.62), "#9FB8B8"); });
      poly(g, sub(f.right, 0.3, 0.3, 0.7, 0.62), "#9FB8B8");
      var r = roof(g, s.i + 0.1, s.j + 0.1, s.w - 0.2, s.d - 0.2, 40, 20, { front: BASE.roofF, back: BASE.roofB, gable: BASE.gable });
      // toit solaire
      for (var k = 0; k < 4; k++) {
        var u = 0.06 + k * 0.235;
        poly(g, sub(r.front, u, 0.12, u + 0.2, 0.88), BASE.solar, { stroke: BASE.solarLine, "stroke-width": 0.6 });
      }
    },
    serre: function (g, s) {
      var x = s.i + 0.1, y = s.j + 0.12, w = s.w - 0.2, d = s.d - 0.24;
      poly(g, [P(x, y, 0), P(x + w, y, 0), P(x + w, y + d, 0), P(x, y + d, 0)], "#6E8F58");
      for (var k = 0; k < 7; k++) {
        var p = P(x + 0.2 + k * (w - 0.4) / 6, y + d / 2, 0);
        el("circle", { cx: p[0], cy: p[1] - 5, r: 4.5, fill: k % 2 ? BASE.plant : BASE.plantLight }, g);
      }
      var f = box(g, x, y, w, d, 24, { top: "rgba(255,255,255,.35)", left: "rgba(255,255,255,.55)", right: "rgba(245,248,242,.7)" }, 0, { stroke: "#C9D6C6", "stroke-width": 0.8 });
      for (var u = 1; u < 6; u++) {
        var a = sub(f.left, u / 6, 0, u / 6, 1);
        el("line", { x1: a[0][0], y1: a[0][1], x2: a[3][0], y2: a[3][1], stroke: "#C9D6C6", "stroke-width": 0.8 }, g);
      }
      roof(g, x, y, w, d, 24, 12, { front: "rgba(255,255,255,.72)", back: "rgba(255,255,255,.5)", gable: "rgba(255,255,255,.6)" }, 0.02);
    },
    preau: function (g, s) {
      var x = s.i + 0.15, y = s.j + 0.15, w = s.w - 0.3, d = s.d - 0.3, h = 30;
      // bancs
      box(g, x + 0.4, y + 0.6, w - 0.8, 0.25, 6, { top: "#B98E62", left: "#A07650", right: "#8A6448" });
      [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].forEach(function (c) {
        var a = P(c[0], c[1], 0), b = P(c[0], c[1], h);
        el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#7A5A40", "stroke-width": 3, "stroke-linecap": "round" }, g);
      });
      var top = [P(x - 0.1, y - 0.1, h + 8), P(x + w + 0.1, y - 0.1, h + 8), P(x + w + 0.1, y + d + 0.1, h), P(x - 0.1, y + d + 0.1, h)];
      poly(g, [top[3], top[2], P(x + w + 0.1, y + d + 0.1, h - 3), P(x - 0.1, y + d + 0.1, h - 3)], "#8A6448");
      poly(g, top, "#A07650");
      for (var k = 0; k < 3; k++) poly(g, sub(top, 0.05 + k * 0.315, 0.1, 0.32 + k * 0.315, 0.9), BASE.solar, { stroke: BASE.solarLine, "stroke-width": 0.6 });
    },
    maison: function (g, s) {
      var f = box(g, s.i + 0.18, s.j + 0.18, 0.64, 0.64, 22, { top: BASE.wallT, left: BASE.wallL, right: BASE.wallR });
      poly(g, sub(f.left, 0.4, 0.4, 0.62, 1), "#8A6448");
      poly(g, sub(f.right, 0.35, 0.3, 0.65, 0.6), "#9FB8B8");
      var r = roof(g, s.i + 0.18, s.j + 0.18, 0.64, 0.64, 22, 13, BASE.green, 0.1);
      [0.2, 0.5, 0.8].forEach(function (u) { var p = sub(r.front, u, 0.5, u, 0.5)[0]; el("circle", { cx: p[0], cy: p[1], r: 2.2, fill: "#A9C48A" }, g); });
    },
    planches: function (g, s) {
      [0.12, 0.55].forEach(function (o) {
        box(g, s.i + 0.1, s.j + o, 0.8, 0.32, 6, BASE.bed);
        for (var k = 0; k < 4; k++) {
          var p = P(s.i + 0.2 + k * 0.2, s.j + o + 0.16, 6);
          el("circle", { cx: p[0], cy: p[1] - 2, r: 3.2, fill: k % 2 ? BASE.plant : BASE.plantLight }, g);
        }
      });
    },
    mare: function (g, s) {
      var c = P(s.i + s.w / 2, s.j + s.d / 2, 0);
      el("ellipse", { cx: c[0], cy: c[1], rx: 26 * s.w * 0.9, ry: 13 * s.d * 0.9, fill: BASE.rim }, g);
      el("ellipse", { cx: c[0], cy: c[1] + 1, rx: 22 * s.w * 0.9, ry: 11 * s.d * 0.9, fill: BASE.water }, g);
      el("ellipse", { cx: c[0] - 8, cy: c[1] - 2, rx: 10, ry: 3, fill: "#BFDADA" }, g);
      [[-30, 2], [-26, 6], [28, -2], [24, 4]].forEach(function (r) {
        el("line", { x1: c[0] + r[0], y1: c[1] + r[1], x2: c[0] + r[0] + 1, y2: c[1] + r[1] - 12, stroke: "#5F7F52", "stroke-width": 1.6, "stroke-linecap": "round" }, g);
      });
    },
    arbre: function (g, s) { tree(g, s.i + 0.5, s.j + 0.5, 1.25, { trunk: BASE.trunk, leaf: "#4E8C6C", light: "#79A98C" }); },
    arbreface: function (g, s) { tree(g, s.i + 0.5, s.j + 0.5, 1.2, { trunk: BASE.trunk, leaf: "#4E8C6C", light: "#79A98C", face: true }); },
    fruitierface: function (g, s) { tree(g, s.i + 0.5, s.j + 0.5, 1.0, { trunk: BASE.trunk, leaf: "#5E9B79", light: "#9BC7AC", fruit: "#C06848", face: true }); },
    haieI: function (g, s) { for (var k = 0; k < 3; k++) { var b = P(s.i + 0.2 + k * 0.3, s.j + 0.5, 0); el("circle", { cx: b[0], cy: b[1] - 7, r: 7.5, fill: k % 2 ? "#5E9B79" : "#4E8C6C" }, g); el("circle", { cx: b[0] - 2, cy: b[1] - 10, r: 3, fill: "#9BC7AC" }, g); } },
    haieJ: function (g, s) { for (var k = 0; k < 3; k++) { var b = P(s.i + 0.5, s.j + 0.2 + k * 0.3, 0); el("circle", { cx: b[0], cy: b[1] - 7, r: 7.5, fill: k % 2 ? "#5E9B79" : "#4E8C6C" }, g); el("circle", { cx: b[0] - 2, cy: b[1] - 10, r: 3, fill: "#9BC7AC" }, g); } },
    fruitier: function (g, s) { tree(g, s.i + 0.5, s.j + 0.5, 0.95, { trunk: BASE.trunk, leaf: "#5E9B79", light: "#9BC7AC", fruit: "#C06848" }); },
    // décor libre : sans impact ni preuve, juste pour se projeter
    banc: function (g, s) {
      var f = box(g, s.i + 0.2, s.j + 0.4, 0.6, 0.22, 7, { top: "#C9A273", left: "#B98E62", right: "#A07650" });
      poly(g, [P(s.i + 0.2, s.j + 0.4, 7), P(s.i + 0.8, s.j + 0.4, 7), P(s.i + 0.8, s.j + 0.4, 15), P(s.i + 0.2, s.j + 0.4, 15)], "#B98E62");
      [0.26, 0.74].forEach(function (u) { var a = P(s.i + u, s.j + 0.5, 0), b = P(s.i + u, s.j + 0.5, 7); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#7A5A40", "stroke-width": 2 }, g); });
      return f;
    },
    fleurs: function (g, s) {
      var cols = ["#E07A8B", "#F2C14E", "#F1F0EA", "#C48BC9", "#E8975E"];
      for (var k = 0; k < 7; k++) {
        var p = P(s.i + 0.2 + hash(k, s.i) * 0.6, s.j + 0.2 + hash(s.j, k) * 0.6, 0);
        el("line", { x1: p[0], y1: p[1], x2: p[0], y2: p[1] - 6, stroke: "#5F7F52", "stroke-width": 1.2 }, g);
        el("circle", { cx: p[0], cy: p[1] - 7, r: 2.4, fill: cols[k % cols.length] }, g);
        el("circle", { cx: p[0], cy: p[1] - 7, r: 0.9, fill: "#F6E7B2" }, g);
      }
    },
    rocher: function (g, s) {
      var b = P(s.i + 0.5, s.j + 0.55, 0);
      shadow(g, b[0] + 3, b[1] + 1, 12);
      el("path", { d: "M" + (b[0] - 13) + " " + b[1] + " Q" + (b[0] - 12) + " " + (b[1] - 12) + " " + (b[0] - 2) + " " + (b[1] - 13) + " Q" + (b[0] + 9) + " " + (b[1] - 14) + " " + (b[0] + 13) + " " + (b[1] - 3) + " Q" + (b[0] + 10) + " " + (b[1] + 5) + " " + (b[0] - 13) + " " + b[1] + " Z", fill: "#9A9A8C" }, g);
      el("path", { d: "M" + (b[0] - 10) + " " + (b[1] - 3) + " Q" + (b[0] - 7) + " " + (b[1] - 10) + " " + (b[0] - 1) + " " + (b[1] - 11) + " Q" + (b[0] + 3) + " " + (b[1] - 8) + " " + (b[0] - 2) + " " + (b[1] - 3) + " Z", fill: "#B5B5A6" }, g);
      el("circle", { cx: b[0] + 6, cy: b[1] - 2, r: 2.2, fill: "#7FA47B" }, g);
    }
  };

  /* ---------- solutions posées (dessinées selon leur état) ---------- */
  var SOL = {
    citerne: function (g, i, j, c) {
      // gouttière qui descend du toit vers la première cuve
      var g0 = P(i + 0.08, j + 0.12, 32), g1 = P(i + 0.35, j + 0.4, 21);
      el("line", { x1: g0[0] - 12, y1: g0[1] - 3, x2: g0[0], y2: g0[1], stroke: c.stroke, "stroke-width": 2.2, "stroke-linecap": "round" }, g);
      el("line", { x1: g0[0], y1: g0[1], x2: g1[0], y2: g1[1], stroke: c.stroke, "stroke-width": 2.2, "stroke-linecap": "round" }, g);
      [[0.35, 0.4], [0.65, 0.62]].forEach(function (o, n) {
        var b = P(i + o[0], j + o[1], 0), r = 9, h = 20;
        shadow(g, b[0] + 3, b[1] + 1, 11);
        el("path", { d: "M" + (b[0] - r) + " " + (b[1] - h) + " L" + (b[0] - r) + " " + b[1] + " A" + r + " " + r / 2 + " 0 0 0 " + (b[0] + r) + " " + b[1] + " L" + (b[0] + r) + " " + (b[1] - h) + " Z", fill: c.b, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
        el("ellipse", { cx: b[0], cy: b[1] - h, rx: r, ry: r / 2, fill: c.c, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
        el("rect", { x: b[0] + r - 1, y: b[1] - 7, width: 4, height: 2, rx: 1, fill: c.stroke }, g); // robinet
        if (n === 0 && c.verified) el("circle", { cx: g1[0], cy: g1[1] + 3, r: 1.7, fill: "#7FB0B3", class: "iso-drip" }, g); // goutte (cuve vérifiée)
      });
    },
    mare: function (g, i, j, c, w, d) {
      w = w || 1; d = d || 1;
      var b = P(i + w / 2, j + d / 2, 0), rx = (w + d) * TW * 0.38, ry = (w + d) * TH * 0.38;
      el("ellipse", { cx: b[0], cy: b[1], rx: rx, ry: ry, fill: c.a, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
      el("ellipse", { cx: b[0], cy: b[1] + 1, rx: rx * 0.8, ry: ry * 0.75, fill: c.c }, g);
      [[-0.85, 0.15], [0.75, -0.1], [-0.3, 0.7], [0.4, 0.6]].forEach(function (r, k) {
        if (k > 1 && w + d < 3) return;
        var x = b[0] + r[0] * rx, y = b[1] + r[1] * ry;
        el("line", { x1: x, y1: y, x2: x, y2: y - 11, stroke: c.b, "stroke-width": 1.6, "stroke-linecap": "round" }, g);
      });
    },
    haie: function (g, i, j, c, w, d) {
      w = w || 1; d = d || 1;
      var n = 4 * Math.max(w, d), alongI = w >= d;
      for (var k = 0; k < n; k++) {
        var t = (k + 0.5) / n;
        var b = alongI ? P(i + t * w, j + 0.5, 0) : P(i + 0.5, j + t * d, 0);
        el("circle", { cx: b[0], cy: b[1] - 8, r: 8, fill: c.a, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
        el("circle", { cx: b[0] - 2, cy: b[1] - 11, r: 3.5, fill: c.c }, g);
        if (c.fruit) el("circle", { cx: b[0] + 3, cy: b[1] - 6, r: 1.8, fill: c.fruit }, g);
      }
    },
    compost: function (g, i, j, c) {
      // deux bacs à compost côte à côte, lattes apparentes, épluchures sur le dessus
      [0.12, 0.54].forEach(function (o) {
        var f = box(g, i + o, j + 0.28, 0.34, 0.44, 13, { top: c.d, left: c.a, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
        [0.33, 0.66].forEach(function (v) { var a = sub(f.left, 0, v, 1, v); el("line", { x1: a[0][0], y1: a[0][1], x2: a[1][0], y2: a[1][1], stroke: c.stroke, "stroke-width": 0.8 }, g); });
        var t = P(i + o + 0.17, j + 0.5, 13);
        [[-3, -1], [2, -2], [0, 2]].forEach(function (d) { el("circle", { cx: t[0] + d[0], cy: t[1] + d[1], r: 1.5, fill: c.a }, g); });
      });
    },
    solaire: function (g, i, j, c, w, d) {
      w = w || 1; d = d || 1;
      [[i + 0.3, j + 0.25], [i + 0.3, j + d - 0.25]].forEach(function (lg) { var a = P(lg[0], lg[1], 0), b = P(lg[0], lg[1], 12); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: c.stroke, "stroke-width": 2 }, g); });
      var q = [P(i + 0.12, j + 0.12, 18), P(i + w - 0.12, j + 0.12, 7), P(i + w - 0.12, j + d - 0.12, 7), P(i + 0.12, j + d - 0.12, 18)];
      poly(g, q, c.b, { stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash });
      var cols = 3 * w, rows = 2 * d;
      for (var u = 1; u < cols; u++) { var a = sub(q, u / cols, 0, u / cols, 1); el("line", { x1: a[0][0], y1: a[0][1], x2: a[3][0], y2: a[3][1], stroke: c.c, "stroke-width": 0.8 }, g); }
      for (var v = 1; v < rows; v++) { var m = sub(q, 0, v / rows, 1, v / rows); el("line", { x1: m[0][0], y1: m[0][1], x2: m[1][0], y2: m[1][1], stroke: c.c, "stroke-width": 0.8 }, g); }
    },
    four: function (g, i, j, c) {
      box(g, i + 0.2, j + 0.2, 0.6, 0.6, 7, { top: c.d, left: c.b, right: c.d }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
      var b = P(i + 0.5, j + 0.5, 7);
      el("path", { d: "M" + (b[0] - 17) + " " + b[1] + " A17 16 0 0 1 " + (b[0] + 17) + " " + b[1] + " Z", fill: c.a, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
      el("path", { d: "M" + (b[0] - 5) + " " + (b[1] + 4) + " A5 6 0 0 1 " + (b[0] + 5) + " " + (b[1] + 4) + " Z", fill: "#22301F", opacity: 0.7 }, g);
      el("rect", { x: b[0] + 6, y: b[1] - 22, width: 4, height: 9, fill: c.b }, g);
    },
    ressourcerie: function (g, i, j, c, w, d) {
      w = w || 1; d = d || 1;
      var h = 20 + 6 * (Math.min(w, d) - 1);
      var f = box(g, i + 0.15, j + 0.15, w - 0.3, d - 0.3, h, { top: c.c, left: c.a, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
      poly(g, sub(f.left, 0.3 / w, 0.35, 0.3 / w + 0.4 / w, 1), c.d);
      if (w > 1) [0.55, 0.8].forEach(function (u) { poly(g, sub(f.left, u, 0.25, u + 0.12, 0.6), "#9FB8B8"); });
      roof(g, i + 0.15, j + 0.15, w - 0.3, d - 0.3, h, 10 + 3 * (Math.min(w, d) - 1), { front: c.b, back: c.d, gable: c.c }, 0.06);
    },
    repair: function (g, i, j, c) {
      box(g, i + 0.25, j + 0.35, 0.5, 0.3, 9, { top: c.c, left: c.a, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
      var b = P(i + 0.5, j + 0.5, 9), t = P(i + 0.5, j + 0.5, 34);
      el("line", { x1: b[0], y1: b[1], x2: t[0], y2: t[1], stroke: c.stroke, "stroke-width": 1.5 }, g);
      el("path", { d: "M" + (t[0] - 20) + " " + (t[1] + 7) + " Q" + t[0] + " " + (t[1] - 10) + " " + (t[0] + 20) + " " + (t[1] + 7) + " Z", fill: c.a, stroke: c.stroke, "stroke-width": 1, "stroke-dasharray": c.dash }, g);
    },
    planches: function (g, i, j, c, w, d) {
      w = w || 1; d = d || 1;
      if (d > w) { // planches dans le sens j
        [0.12, 0.55].forEach(function (o) {
          box(g, i + o, j + 0.1, 0.32, d - 0.2, 6, { top: c.d, left: c.b, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
          for (var k = 0; k < 4 * d; k++) { var p = P(i + o + 0.16, j + 0.2 + k * 0.2, 6); el("circle", { cx: p[0], cy: p[1] - 2, r: 3, fill: k % 2 ? c.a : c.c }, g); }
        });
        return;
      }
      [0.12, 0.55].forEach(function (o) {
        box(g, i + 0.1, j + o, w - 0.2, 0.32, 6, { top: c.d, left: c.b, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
        for (var k = 0; k < 4 * w; k++) { var p = P(i + 0.2 + k * 0.2, j + o + 0.16, 6); el("circle", { cx: p[0], cy: p[1] - 2, r: 3, fill: k % 2 ? c.a : c.c }, g); }
      });
    },
    poulailler: function (g, i, j, c) {
      [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]].forEach(function (o) { var a = P(i + o[0], j + o[1], 0), b = P(i + o[0], j + o[1], 8); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: c.stroke, "stroke-width": 1.5 }, g); });
      box(g, i + 0.25, j + 0.25, 0.5, 0.5, 12, { top: c.c, left: c.a, right: c.b }, 8, { stroke: c.stroke, "stroke-width": 0.8, "stroke-dasharray": c.dash });
      roof(g, i + 0.25, j + 0.25, 0.5, 0.5, 20, 8, { front: c.b, back: c.d, gable: c.c }, 0.05);
      [[0.15, 0.85], [0.85, 0.8]].forEach(function (o) { var p = P(i + o[0], j + o[1], 0); el("ellipse", { cx: p[0], cy: p[1] - 3, rx: 4, ry: 3, fill: "#FFFDF7", stroke: c.stroke, "stroke-width": 0.6 }, g); });
    },
    agora: function (g, i, j, c, w, d) {
      w = w || 1; d = d || 1;
      var m = Math.min(w, d), cx = i + w / 2, cy = j + d / 2, r = 0.32 * m, n = 6 + 2 * (m - 1), t = 0.24 * m;
      for (var k = 0; k < n; k++) {
        var a = k / n * Math.PI * 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        box(g, x - 0.07, y - 0.07, 0.14, 0.14, 5, { top: c.c, left: c.a, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.6, "stroke-dasharray": c.dash });
      }
      // table de conseil au centre du cercle
      box(g, cx - t / 2, cy - t / 2, t, t, 8, { top: c.c, left: c.a, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.6, "stroke-dasharray": c.dash });
    },
    panneau: function (g, i, j, c) {
      // urne du budget participatif : une boîte sur pied, sa fente, un bulletin glissé
      box(g, i + 0.44, j + 0.44, 0.12, 0.12, 10, { top: c.d, left: c.a, right: c.b }, 0, { stroke: c.stroke, "stroke-width": 0.6 });
      var f = box(g, i + 0.3, j + 0.3, 0.4, 0.4, 14, { top: c.c, left: c.a, right: c.b }, 10, { stroke: c.stroke, "stroke-width": 0.9, "stroke-dasharray": c.dash });
      poly(g, sub(f.top, 0.22, 0.44, 0.78, 0.56), c.stroke);
      var t = P(i + 0.5, j + 0.5, 24);
      el("rect", { x: t[0] - 4, y: t[1] - 12, width: 8, height: 10, rx: 1, fill: "#FFFDF7", stroke: c.stroke, "stroke-width": 0.8, transform: "rotate(-14 " + t[0] + " " + t[1] + ")" }, g);
    }
  };

  function statusPalette(status) {
    var s = STATUS[status] || STATUS.prevu;
    var c = {}; for (var k in s) c[k] = s[k];
    if (status === "verifie") { c.fruit = "#C06848"; c.verified = true; }
    return c;
  }

  /* ---------- espaces du lieu : zones nommées sur la grille ---------- */
  var ZONE_PAL = ["#CFE1CC", "#CBD5E3", "#EBD4D4", "#D9D3E9", "#E9E3D2", "#D3E4EC", "#E6D9C4", "#D7E2D9"];
  var KIND_COL = { jardin: "#CFE1CC", atelier: "#CBD5E3", cafe: "#E9DCC8", gouvernance: "#D9D3E9" };
  var LIFT = 4; // chaque espace est un plateau légèrement surélevé
  // Nature d'un espace, devinée d'après son identifiant ou son nom : elle choisit la texture du sol.
  function zoneKind(z) {
    var t = ((z.id || "") + " " + (z.nom || "")).toLowerCase();
    if (/jardin|potager|verger|culture|maraich|serre|prairie/.test(t)) return "jardin";
    if (/atelier|garage|hangar|fablab|repar|ressourcerie/.test(t)) return "atelier";
    if (/caf|cuisine|cantine|resto|accueil|salle|epicerie|épicerie|tiers/.test(t)) return "cafe";
    if (/gouvern|conseil|agora|assembl|commun|place/.test(t)) return "gouvernance";
    return "";
  }
  // Répartit les espaces en sols colorés séparés par des allées d'une case, avec une pelouse
  // autour quand la place le permet (jusqu'à 9 espaces). Le résultat porte aussi
  // zones.walk (cases d'allée) et zones.margin (largeur de la pelouse).
  // Donne à une zone sa liste de cases, sa table d'appartenance et sa boîte englobante.
  function finirZone(z, cells) {
    z.list = cells; z.map = {};
    var i0 = 1e9, j0 = 1e9, i1 = -1, j1 = -1;
    cells.forEach(function (c) { z.map[c.i + "," + c.j] = 1; i0 = Math.min(i0, c.i); j0 = Math.min(j0, c.j); i1 = Math.max(i1, c.i); j1 = Math.max(j1, c.j); });
    if (!cells.length) { i0 = j0 = 0; i1 = j1 = -1; }
    z.i0 = i0; z.j0 = j0; z.w = i1 - i0 + 1; z.d = j1 - j0 + 1;
    return z;
  }
  function layoutZones(spaces, N) {
    var n = (spaces || []).length; if (!n) return [];
    // Chaque espace n'a que les cases que le porteur lui a dessinées : la maquette part vierge.
    var pris = {}, bord = false;
    var zones = spaces.map(function (s, k) {
      var kind = s.kind || zoneKind(s), cells = [];
      (s.cells || []).forEach(function (c) {
        var i = c[0], j = c[1], key = i + "," + j;
        if (i < 0 || j < 0 || i >= N || j >= N || pris[key]) return;
        pris[key] = 1; cells.push({ i: i, j: j });
        if (i === 0 || j === 0 || i === N - 1 || j === N - 1) bord = true;
      });
      return finirZone({ id: s.id, nom: s.nom, kind: kind, color: KIND_COL[kind] || ZONE_PAL[k % ZONE_PAL.length] }, cells);
    });
    zones.walk = {}; zones.margin = bord ? 0 : 1; zones.custom = true;
    return zones;
  }
  function zoneAt(zones, i, j) {
    var key = i + "," + j;
    for (var k = 0; k < zones.length; k++) { var z = zones[k]; if (z.map && z.map[key]) return z; }
    return null;
  }

  /* ---------- rendu ---------- */
  function render(container, opt) {
    opt = opt || {};
    var N = opt.grille || 9;
    var pathLine = opt.chemin === undefined ? 4 : opt.chemin;
    var vitality = Math.max(0, Math.min(1, opt.vitalite || 0));
    var structures = opt.structures || [];
    var placed = opt.placed || [];
    var userDecor = opt.decor || [], paths = {};
    userDecor.forEach(function (d) { if (d.type === "allee") paths[d.i + "," + d.j] = true; });
    var solutions = opt.solutions || {};
    var zones = opt.zones || [], walk = zones.walk || {};

    container.innerHTML = "";
    var minX = -N * TW - 12, width = N * TW * 2 + 24;
    var minY = -84, height = N * TH * 2 + SLAB + 84 + 30;
    var svg = el("svg", { viewBox: minX + " " + minY + " " + width + " " + height, class: "iso-svg", role: "img", "aria-label": opt.label || "Maquette 2.5D du lieu" }, container);

    // occupation des cases
    var occ = {};
    structures.forEach(function (s) {
      for (var a = 0; a < (s.w || 1); a++) for (var b = 0; b < (s.d || 1); b++) occ[(s.i + a) + "," + (s.j + b)] = "structure";
    });
    placed.forEach(function (p) { for (var a = 0; a < (p.w || 1); a++) for (var b = 0; b < (p.d || 1); b++) occ[(p.i + a) + "," + (p.j + b)] = p.uid; });
    userDecor.forEach(function (d) { if (d.type !== "allee") occ[d.i + "," + d.j] = "decor:" + d.uid; });
    function isPath(i, j) { return !!walk[i + "," + j] || !!paths[i + "," + j] || (pathLine !== null && pathLine !== false && (i === pathLine || j === pathLine)); }

    // socle de terre (sauf si la maquette est posée sur une autre carte)
    var ground = el("g", {}, svg);
    if (opt.socle !== false) {
    poly(ground, [P(0, N, 0), P(N, N, 0), P(N, N, -SLAB), P(0, N, -SLAB)], "#9C6B4A");
    poly(ground, [P(N, 0, 0), P(N, N, 0), P(N, N, -SLAB), P(N, 0, -SLAB)], "#80573C");
    poly(ground, [P(0, N, 0), P(N, N, 0), P(N, N, -5), P(0, N, -5)], mix("#789A74", "#50895F", vitality));
    poly(ground, [P(N, 0, 0), P(N, N, 0), P(N, N, -5), P(N, 0, -5)], mix("#688A66", "#447A52", vitality));
    // petits cailloux dans la terre
    for (var s2 = 0; s2 < 10; s2++) {
      var u = hash(s2, 3), v = 0.35 + hash(3, s2) * 0.5;
      var q = s2 % 2 ? [P(u * N, N, -SLAB * v)] : [P(N, u * N, -SLAB * v)];
      el("ellipse", { cx: q[0][0], cy: q[0][1], rx: 2.4, ry: 1.3, fill: "rgba(255,253,247,.25)" }, ground);
    }
    }

    // cases
    var grassA = mix("#C4CBA0", "#90BE94", vitality), grassB = mix("#BBC395", "#85B588", vitality);
    var tiles = el("g", { class: "iso-tiles" }, svg);
    function liftAt(i, j) { return (zones.length && !isPath(i, j) && zoneAt(zones, i, j)) ? LIFT : 0; }
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      var zt = zones.length ? zoneAt(zones, i, j) : null, onPath = isPath(i, j);
      var zl = (zt && !onPath) ? LIFT : 0;
      var tp = [P(i, j, zl), P(i + 1, j, zl), P(i + 1, j + 1, zl), P(i, j + 1, zl)];
      var fill = onPath ? (hash(i, j) > 0.5 ? "#EFE9DA" : "#E9E2D0") : (hash(i, j) > 0.5 ? grassA : grassB);
      var kind = (zt && !onPath) ? zt.kind : "";
      if (zt && !onPath) fill = mix(zt.color, "#FFFFFF", kind === "atelier" ? ((i + j) % 2 ? 0.16 : 0) : (hash(i, j) > 0.5 ? 0.1 : 0));
      poly(tiles, tp, fill, { stroke: "rgba(255,253,247,.18)", "stroke-width": 0.6 });
      if (onPath) {
        // allée : quelques graviers clairs
        if (hash(i * 3, j) > 0.55) { var gp = P(i + 0.25 + hash(i, j) * 0.5, j + 0.25 + hash(j, i) * 0.5, 0); el("ellipse", { cx: gp[0], cy: gp[1], rx: 1.6, ry: 0.9, fill: "rgba(255,253,247,.7)" }, tiles); }
        continue;
      }
      var dark = zt ? mix(zt.color, "#1C2E26", 0.18) : null;
      if (kind === "jardin" && !occ[i + "," + j]) {
        // sillons de culture, dans le sens de la pente
        [0.33, 0.66].forEach(function (v) { var a = P(i + 0.12, j + v, zl), b = P(i + 0.88, j + v, zl); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: dark, "stroke-width": 0.8, opacity: 0.55 }, tiles); });
      } else if (kind === "cafe") {
        // terrasse en planches
        [0.25, 0.5, 0.75].forEach(function (u) { var a = P(i + u, j + 0.04, zl), b = P(i + u, j + 0.96, zl); el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: dark, "stroke-width": 0.6, opacity: 0.45 }, tiles); });
      } else if (kind === "atelier") {
        // dalles : un joint plus marqué
        poly(tiles, tp, "none", { stroke: "rgba(28,46,38,.14)", "stroke-width": 0.8 });
      } else if (!occ[i + "," + j] && hash(j, i) > 0.72) {
        var t = P(i + 0.3 + hash(i, j) * 0.4, j + 0.5, zl);
        el("path", { d: "M" + t[0] + " " + t[1] + " l-2 -4 M" + t[0] + " " + t[1] + " l2 -5 M" + t[0] + " " + t[1] + " l0 -5", stroke: mix("#8CA786", "#447A52", vitality), "stroke-width": 1, fill: "none" }, tiles);
      }
    }
    // faces avant des plateaux : chaque espace sort légèrement du sol
    zones.forEach(function (z) {
      var fs = mix(z.color, "#1C2E26", 0.22), fe = mix(z.color, "#1C2E26", 0.34);
      z.list.forEach(function (c) {
        var a = c.i, b = c.j;
        if (!z.map[a + "," + (b + 1)]) poly(tiles, [P(a, b + 1, LIFT), P(a + 1, b + 1, LIFT), P(a + 1, b + 1, 0), P(a, b + 1, 0)], fs);
        if (!z.map[(a + 1) + "," + b]) poly(tiles, [P(a + 1, b, LIFT), P(a + 1, b + 1, LIFT), P(a + 1, b + 1, 0), P(a + 1, b, 0)], fe);
      });
      if (z.kind === "gouvernance" && z.list.length) {
        // cercle de parole dessiné au sol, au centre des cases
        var cx = 0, cy = 0; z.list.forEach(function (c) { cx += c.i + 0.5; cy += c.j + 0.5; }); cx /= z.list.length; cy /= z.list.length;
        if (!z.map[Math.floor(cx) + "," + Math.floor(cy)]) return; // cases dispersées : pas de cercle au milieu des autres
        var c = P(cx, cy, LIFT), r = Math.min(z.w, z.d) * TW * 0.36;
        el("ellipse", { cx: c[0], cy: c[1], rx: r, ry: r / 2, fill: "none", stroke: "rgba(255,253,247,.8)", "stroke-width": 1.6, "stroke-dasharray": "5 4" }, tiles);
      }
    });

    // marquage d'état sous les solutions posées
    placed.forEach(function (p) {
      var c = STATUS[p.status] || STATUS.prevu;
      var ml = liftAt(p.i, p.j), pw = p.w || 1, pd = p.d || 1;
      poly(tiles, [P(p.i + 0.04, p.j + 0.04, ml), P(p.i + pw - 0.04, p.j + 0.04, ml), P(p.i + pw - 0.04, p.j + pd - 0.04, ml), P(p.i + 0.04, p.j + pd - 0.04, ml)], c.tile, { stroke: c.stroke, "stroke-width": 1.4, "stroke-dasharray": p.status === "prevu" ? "5 4" : null, class: "iso-mark" });
    });

    // contours des espaces, au sol ; cliquables si la page fournit onZone
    var zoneG = el("g", { class: "iso-zones" }, svg);
    zones.forEach(function (z) {
      var active = opt.activeZone === z.id;
      var g = el("g", { class: "iso-zone" + (active ? " is-active" : ""), "data-zone": z.id }, zoneG);
      var fillG = el("g", { class: active ? "iso-zone-active" : null }, g);
      z.list.forEach(function (c) {
        poly(fillG, [P(c.i, c.j, LIFT), P(c.i + 1, c.j, LIFT), P(c.i + 1, c.j + 1, LIFT), P(c.i, c.j + 1, LIFT)], active ? "rgba(217,160,63,.16)" : "rgba(255,253,247,0)", { stroke: "none" });
      });
      var sc = active ? "#D9A03F" : "rgba(255,253,247,.85)", sw = active ? 2.4 : 1.6;
      z.list.forEach(function (c) {
        var a = c.i, b = c.j, e = 0.04;
        function seg(p1, p2) { el("line", { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: sc, "stroke-width": sw, "stroke-linecap": "round" }, g); }
        if (!z.map[a + "," + (b - 1)]) seg(P(a + e, b + e, LIFT), P(a + 1 - e, b + e, LIFT));
        if (!z.map[a + "," + (b + 1)]) seg(P(a + e, b + 1 - e, LIFT), P(a + 1 - e, b + 1 - e, LIFT));
        if (!z.map[(a - 1) + "," + b]) seg(P(a + e, b + e, LIFT), P(a + e, b + 1 - e, LIFT));
        if (!z.map[(a + 1) + "," + b]) seg(P(a + 1 - e, b + e, LIFT), P(a + 1 - e, b + 1 - e, LIFT));
      });
      if (opt.onZone) {
        g.setAttribute("role", "button"); g.setAttribute("tabindex", "0");
        g.setAttribute("aria-label", "Espace " + z.nom + (active ? ", sélectionné" : ""));
        g.addEventListener("click", function () { opt.onZone(z.id); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opt.onZone(z.id); } });
      }
    });

    // pelouse autour des sols : haies sur les deux bords avant, quelques arbres à l'arrière
    var decor = [];
    if (zones.length && zones.margin === 1) {
      for (var e = 1; e < N - 1; e++) {
        if (!walk[(N - 2) + "," + e]) decor.push({ type: "haieJ", i: N - 1, j: e });
        if (!walk[e + "," + (N - 2)]) decor.push({ type: "haieI", i: e, j: N - 1 });
      }
      [[0, 0], [0, N - 3], [N - 3, 0]].forEach(function (c) { decor.push({ type: "arbreface", i: c[0], j: c[1] }); });
      decor.forEach(function (d) { occ[d.i + "," + d.j] = "decor"; });
    }

    var hover = poly(svg, [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)], "rgba(217,160,63,.35)", { stroke: "#D9A03F", "stroke-width": 2, class: "iso-hover", visibility: "hidden" });

    // un peu de vie : un arbre et une ou deux silhouettes dans chaque espace actif (positions stables)
    var life = { structures: [], personnages: [] };
    if (opt.life !== false && zones.length) {
      var PCOL = ["#C06848", "#2C5234", "#D9A03F", "#5F7F52", "#7B6A9A"];
      zones.forEach(function (z, k) {
        if (!placed.some(function (p) { return p.spaceId === z.id; })) return;
        var cands = z.list.slice().sort(function (p, q) { return (q.i + q.j) - (p.i + p.j) || Math.abs(p.i - p.j) - Math.abs(q.i - q.j); }).map(function (c) { return [c.i, c.j]; });
        var used = 0;
        cands.forEach(function (c, n) {
          if (used >= 3) return;
          var key = c[0] + "," + c[1];
          if (occ[key] || isPath(c[0], c[1])) return;
          if (used === 0) life.structures.push({ type: k % 2 ? "fruitierface" : "arbreface", i: c[0], j: c[1] });
          else life.personnages.push({ i: c[0], j: c[1], c: PCOL[(k + n) % PCOL.length] });
          occ[key] = "vie"; used++;
        });
      });
    }

    // objets triés par profondeur
    var items = [];
    structures.concat(decor, life.structures).forEach(function (s) { items.push({ k: s.i + (s.w || 1) + s.j + (s.d || 1), kind: "s", s: s }); });
    placed.forEach(function (p) { items.push({ k: p.i + (p.w || 1) + p.j + (p.d || 1), kind: "p", p: p }); });
    userDecor.forEach(function (d) { if (d.type !== "allee") items.push({ k: d.i + d.j + 2, kind: "d", d: d }); });
    (opt.personnages || []).concat(life.personnages).forEach(function (h) { items.push({ k: h.i + h.j + 1.2, kind: "h", h: h }); });
    items.sort(function (a, b) { return a.k - b.k; });

    var objects = el("g", { class: "iso-objects" }, svg);
    items.forEach(function (it) {
      if (it.kind === "s") {
        var s = { i: it.s.i, j: it.s.j, w: it.s.w || 1, d: it.s.d || 1 };
        var g = el("g", { class: "iso-structure", transform: liftAt(s.i, s.j) ? "translate(0,-" + LIFT + ")" : null }, objects);
        if (DRAW[it.s.type]) DRAW[it.s.type](g, s);
      } else if (it.kind === "h") {
        person(el("g", { transform: liftAt(it.h.i, it.h.j) ? "translate(0,-" + LIFT + ")" : null }, objects), it.h.i + 0.5, it.h.j + 0.5, it.h.c);
      } else if (it.kind === "d") {
        var d = it.d, gd = el("g", { class: "iso-decor", "data-decor": d.uid, transform: liftAt(d.i, d.j) ? "translate(0,-" + LIFT + ")" : null }, objects);
        if (opt.interactive) { gd.setAttribute("role", "button"); gd.setAttribute("tabindex", "0"); gd.setAttribute("aria-label", (d.nom || "Décor") + ", décor"); }
        el("title", {}, gd).textContent = (d.nom || "Décor") + " (décor, sans impact)";
        if (DRAW[d.type]) DRAW[d.type](gd, { i: d.i, j: d.j, w: 1, d: 1 });
      } else {
        var p = it.p, sol = solutions[p.solId] || {};
        var g2 = el("g", { class: "iso-item is-" + p.status + (opt.justVerified === p.uid ? " just-verified" : ""), "data-uid": p.uid, transform: liftAt(p.i, p.j) ? "translate(0,-" + LIFT + ")" : null }, objects);
        if (sol.scene !== "mare") { var sc = P(p.i + 0.5, p.j + 0.5, 0); shadow(g2, sc[0] + 2, sc[1] + 1, 13); }
        if (opt.interactive) {
          g2.setAttribute("role", "button");
          g2.setAttribute("tabindex", "0");
          g2.setAttribute("aria-label", (sol.nom || "Solution") + ", " + ({ prevu: "prévu", encours: "en cours", verifie: "vérifié" })[p.status]);
        }
        el("title", {}, g2).textContent = (sol.nom || "") + " (" + ({ prevu: "prévu", encours: "en cours", verifie: "vérifié" })[p.status] + ")";
        var draw = SOL[sol.scene] || SOL.compost;
        draw(g2, p.i, p.j, statusPalette(p.status), p.w || 1, p.d || 1);
        if (opt.justVerified === p.uid) {
          var c0 = P(p.i + 0.5, p.j + 0.5, 0);
          el("ellipse", { cx: c0[0], cy: c0[1], rx: 30, ry: 15, class: "verify-ring" }, g2);
          [[-18, -30], [16, -38], [0, -48]].forEach(function (o, n) {
            el("path", { d: "M0 0 C4 -4 10 -4 12 0 C10 4 4 4 0 0 Z", transform: "translate(" + (c0[0] + o[0]) + " " + (c0[1] + o[1]) + ")", class: "verify-leaf verify-leaf-" + n }, g2);
          });
        }
      }
    });

    // étiquettes des espaces : centrées, avec un surtitre (familles des solutions posées) et un repère au sol
    var FAMLBL = { eau: "Eau", sol: "Sol", energie: "Énergie", reemploi: "Réemploi", alimentation: "Alimentation", gouvernance: "Gouvernance" };
    var labels = el("g", { class: "iso-zone-labels" }, svg);
    zones.forEach(function (z) {
      // Les espaces du fond portent leur étiquette au-dessus de leur coin arrière ; ceux du premier rang
      // (qui ont un voisin derrière eux à gauche et à droite) la portent devant, sur le socle, pour ne rien couvrir.
      if (!z.list.length) return; // un espace sans bloc n'a pas d'étiquette sur la maquette
      var fond = z.list.reduce(function (m, c) { return (c.i + c.j < m.i + m.j) ? c : m; }, z.list[0]);
      var avant = z.list.reduce(function (m, c) { return (c.i + c.j > m.i + m.j) ? c : m; }, z.list[0]);
      var devant = zones.custom ? (fond.i + fond.j > N - 2) : (z.lastRow && z.col > 0 && z.row > 0);
      var c = devant ? P(avant.i + 0.5, avant.j + 0.5, LIFT) : P(fond.i + 0.5, fond.j + 0.5, LIFT), fams = [];
      placed.forEach(function (p) { if (p.spaceId !== z.id) return; var so = solutions[p.solId], f = so && FAMLBL[so.famille]; if (f && fams.indexOf(f) < 0) fams.push(f); });
      var kicker = fams.length ? fams.slice(0, 2).join(" · ") : "À aménager";
      var nom = z.nom.length > 22 ? z.nom.slice(0, 21) + "…" : z.nom;
      var w = Math.max(nom.length * 6.2, kicker.length * 5.4) + 20, h = 29, top = devant ? c[1] + 22 : c[1] - 20 - h;
      var g = el("g", { class: "iso-zone-label", "data-zone": z.id }, labels);
      el("line", { x1: c[0], y1: c[1], x2: c[0], y2: devant ? top : top + h, stroke: "rgba(28,46,38,.35)", "stroke-width": 1 }, g);
      el("circle", { cx: c[0], cy: c[1], r: 2.6, fill: "#FFFDF7", stroke: mix(z.color, "#1C2E26", 0.5), "stroke-width": 1.2 }, g);
      el("rect", { x: c[0] - w / 2, y: top, width: w, height: h, rx: 10, fill: "rgba(255,253,247,.94)", stroke: mix(z.color, "#1C2E26", 0.3), "stroke-width": 1 }, g);
      el("text", { x: c[0], y: top + 11, "text-anchor": "middle", class: "iso-zone-kicker" }, g).textContent = kicker;
      el("text", { x: c[0], y: top + 23, "text-anchor": "middle", class: "iso-zone-text" }, g).textContent = nom;
    });

    function cellFromPoint(clientX, clientY) {
      var pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
      var m = svg.getScreenCTM(); if (!m) return null;
      var sp = pt.matrixTransform(m.inverse());
      var a = sp.x / TW, b = sp.y / TH;
      var ci = Math.floor((a + b) / 2), cj = Math.floor((b - a) / 2);
      if (ci < 0 || cj < 0 || ci >= N || cj >= N) return null;
      return { i: ci, j: cj, free: !occ[ci + "," + cj] && !isPath(ci, cj) };
    }
    // emprise : toutes les cases d'un rectangle w x d posé en (i, j)
    function rectCells(i, j, w, d) { var out = []; for (var a = 0; a < (w || 1); a++) for (var b = 0; b < (d || 1); b++) out.push({ i: i + a, j: j + b }); return out; }
    function isFreeRect(i, j, w, d, except) {
      return rectCells(i, j, w, d).every(function (c) {
        if (c.i < 0 || c.j < 0 || c.i >= N || c.j >= N) return false;
        var o = occ[c.i + "," + c.j]; return (!o || (except && o === except)) && !isPath(c.i, c.j);
      });
    }
    function rectInZone(zoneId, i, j, w, d) {
      var z = zones.filter(function (x) { return x.id === zoneId; })[0]; if (!z) return true;
      return rectCells(i, j, w, d).every(function (c) { return !!z.map[c.i + "," + c.j]; });
    }
    function showHover(cell, w, d) {
      if (!cell) { hover.setAttribute("visibility", "hidden"); return; }
      w = w || 1; d = d || 1;
      var hl = liftAt(cell.i, cell.j), free = isFreeRect(cell.i, cell.j, w, d);
      hover.setAttribute("points", pts([P(cell.i, cell.j, hl), P(cell.i + w, cell.j, hl), P(cell.i + w, cell.j + d, hl), P(cell.i, cell.j + d, hl)]));
      hover.setAttribute("fill", free ? "rgba(217,160,63,.35)" : "rgba(192,104,72,.25)");
      hover.setAttribute("stroke", free ? "#D9A03F" : "#C06848");
      hover.setAttribute("visibility", "visible");
    }
    function firstFree(prefer) {
      var order = [];
      for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) order.push({ i: a, j: b });
      if (prefer) order.sort(function (x, y) { return prefer(x) - prefer(y); });
      for (var k = 0; k < order.length; k++) { var c = order[k]; if (!occ[c.i + "," + c.j] && !isPath(c.i, c.j)) return c; }
      return null;
    }
    // première place libre pour une emprise w x d à l'intérieur d'un espace (sinon n'importe où)
    function firstFreeRectIn(zoneId, w, d, prefer, except) {
      var z = null; zones.forEach(function (x) { if (x.id === zoneId) z = x; });
      var order;
      if (z) order = z.list.slice(); else { order = []; for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) order.push({ i: a, j: b }); }
      if (prefer) order.sort(function (x, y) { return prefer(x) - prefer(y); });
      for (var k = 0; k < order.length; k++) { var c = order[k]; if ((!z || rectInZone(zoneId, c.i, c.j, w, d)) && isFreeRect(c.i, c.j, w, d, except)) return c; }
      return null;
    }
    function firstFreeIn(zoneId, prefer) { return firstFreeRectIn(zoneId, 1, 1, prefer); }
    return { svg: svg, zones: zones, cellFromPoint: cellFromPoint, showHover: showHover, firstFree: firstFree, firstFreeIn: firstFreeIn,
      firstFreeRectIn: firstFreeRectIn, isFreeRect: isFreeRect, rectInZone: rectInZone,
      zoneAt: function (i, j) { var z = zoneAt(zones, i, j); return z ? z.id : null; },
      isFree: function (i, j) { return !occ[i + "," + j] && !isPath(i, j); } };
  }

  /* ---------- composant réutilisable ----------
     renderScene(container, lieu, options) : un lieu décrit par ses données
     (espaces, solutions posées, vitalité, éventuels bâtiments) et des options d'affichage.
     Utilisé par Générer, Nourrir, la fiche lieu de la carte et la page Mon lieu. */
  function renderScene(container, lieu, options) {
    lieu = lieu || {}; options = options || {};
    var opt = {
      grille: lieu.grille || 9,
      chemin: lieu.chemin === undefined ? null : lieu.chemin,
      structures: lieu.structures || [],
      personnages: lieu.personnages || [],
      placed: lieu.placed || [],
      decor: lieu.decor || [],
      solutions: lieu.solutions || {},
      vitalite: lieu.vitalite || 0,
      interactive: !!options.interactive,
      label: options.label || ("Maquette 2.5D de " + (lieu.nom || "mon lieu")),
      justVerified: options.justVerified || null,
      zones: layoutZones(lieu.spaces || [], lieu.grille || 9),
      onZone: options.onZone || null,
      activeZone: options.activeZone || null,
      socle: options.socle !== false,
      life: options.life !== false
    };
    return render(container, opt);
  }

  /* ---------- vignette d'une solution, façon solarpunk ----------
     Un petit monde : ciel teinté par la famille, soleil, un îlot de trois cases sur trois avec des arbres,
     des fleurs et la solution au centre. Tout en SVG, aucun fichier image, le même trait que la maquette. */
  var ILLU = { a: "#5E9B79", b: "#2F6B52", c: "#9BC7AC", d: "#4E8C6C", stroke: "#2C5234", dash: null, tile: "rgba(78,140,108,.2)", fruit: "#C06848", verified: false };
  var SKY = {
    eau: ["#E3F2F4", "#BFDDE0"], sol: ["#EAF1DA", "#CFE0B8"], energie: ["#FBF0D3", "#F1DCA2"], reemploi: ["#F6E6D8", "#E8CDB9"],
    alimentation: ["#F9E7E2", "#EFCBC3"], gouvernance: ["#EEE8F4", "#D9D1E8"], def: ["#EEF2E4", "#D8E3C8"]
  };
  var illuCount = 0;
  function renderSolutionIcon(container, sceneType, options) {
    options = options || {};
    container.innerHTML = "";
    var sky = SKY[options.famille] || SKY.def, gid = "evad-sky-" + (++illuCount);
    var svg = el("svg", { viewBox: "-112 -74 224 192", class: "sol-illu-svg", role: "img", "aria-label": options.label || "Illustration de la solution" }, container);
    var defs = el("defs", {}, svg), grad = el("linearGradient", { id: gid, x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
    el("stop", { offset: "0", "stop-color": sky[0] }, grad); el("stop", { offset: "1", "stop-color": sky[1] }, grad);
    el("rect", { x: -112, y: -74, width: 224, height: 192, rx: 18, fill: "url(#" + gid + ")" }, svg);
    // soleil et ses rayons, deux oiseaux
    var sun = el("g", { class: "illu-sun" }, svg);
    el("circle", { cx: 68, cy: -40, r: 30, fill: "rgba(255,241,196,.45)" }, sun);
    for (var r = 0; r < 8; r++) { var a = r * Math.PI / 4, x1 = 68 + Math.cos(a) * 20, y1 = -40 + Math.sin(a) * 20, x2 = 68 + Math.cos(a) * 27, y2 = -40 + Math.sin(a) * 27; el("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: "rgba(233,196,106,.7)", "stroke-width": 1.6, "stroke-linecap": "round" }, sun); }
    el("circle", { cx: 68, cy: -40, r: 14, fill: "#F6DC8C" }, sun);
    [[-60, -44], [-44, -52]].forEach(function (b) { el("path", { d: "M" + (b[0] - 5) + " " + b[1] + " q5 -4 10 0 q-5 -1 -10 0 M" + (b[0] + 5) + " " + b[1] + " q5 -4 10 0", stroke: "#5F7F52", "stroke-width": 1.1, fill: "none", "stroke-linecap": "round" }, svg); });
    // feuilles qui flottent
    [[-84, 10, -20], [92, 20, 25], [-20, -58, 10]].forEach(function (f) {
      el("path", { d: "M0 0 C4 -5 11 -5 13 0 C11 5 4 5 0 0 Z", transform: "translate(" + f[0] + " " + f[1] + ") rotate(" + f[2] + ")", fill: "rgba(94,155,121,.45)" }, svg);
    });
    // îlot : trois cases sur trois, tranche de terre, herbe
    var g = el("g", {}, svg), N = 3;
    poly(g, [P(0, N, 0), P(N, N, 0), P(N, N, -10), P(0, N, -10)], "#9C6B4A");
    poly(g, [P(N, 0, 0), P(N, N, 0), P(N, N, -10), P(N, 0, -10)], "#80573C");
    poly(g, [P(0, N, 0), P(N, N, 0), P(N, N, -3), P(0, N, -3)], "#6C9A68");
    poly(g, [P(N, 0, 0), P(N, N, 0), P(N, N, -3), P(N, 0, -3)], "#5A8A5C");
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      poly(g, [P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)], (i + j) % 2 ? "#A9CB92" : "#B4D39B", { stroke: "rgba(255,253,247,.35)", "stroke-width": 0.6 });
      if ((i + j) % 2 === 0 && !(i === 1 && j === 1)) { var t = P(i + 0.3, j + 0.6, 0); el("path", { d: "M" + t[0] + " " + t[1] + " l-2 -4 M" + t[0] + " " + t[1] + " l2 -5 M" + t[0] + " " + t[1] + " l0 -5", stroke: "#6E9A5B", "stroke-width": 1, fill: "none" }, g); }
    }
    // végétation derrière, la solution au centre, fleurs devant
    tree(g, 0.5, 0.45, 0.95, { trunk: BASE.trunk, leaf: "#4E8C6C", light: "#79A98C" });
    tree(g, 2.55, 0.4, 0.8, { trunk: BASE.trunk, leaf: "#5E9B79", light: "#9BC7AC", fruit: "#C06848" });
    var draw = SOL[sceneType] || SOL.compost;
    var c = {}; for (var k in ILLU) c[k] = ILLU[k];
    draw(el("g", { class: "iso-item is-illu" }, g), 1, 1, c);
    DRAW.fleurs(g, { i: 0, j: 2, w: 1, d: 1 });
    DRAW.fleurs(g, { i: 2, j: 1.4, w: 1, d: 1 });
    return svg;
  }

  window.EvadScene = { render: render, renderScene: renderScene, layoutZones: layoutZones, renderSolutionIcon: renderSolutionIcon };
  window.renderScene = renderScene;
})();
