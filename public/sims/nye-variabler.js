/**
 * Klossen på fjæra i nye variabler. Øverst klossen på ei skinne med fjæra
 * festet i veggen til venstre. Under planet av de nye variablene (Q, P), der
 * (Q, P) = M·(q, p) for en av fem lineære overganger. Den fylte prikken er
 * klossens virkelige bevegelse skrevet i de nye variablene. Ringen starter i
 * det samme punktet og følger Hamiltons ligninger med den samme H skrevet ved
 * Q og P, Q̇ = ∂H/∂P, Ṗ = −∂H/∂Q. Den stiplede klossen øverst er bevegelsen
 * ringen beskriver, regnet tilbake til q. Ruta ved origo er bildet av en
 * kvadratisk rute i (q, p), med pilene langs retningene der q og p øker, så
 * arealet og omløpsretningen synes.
 *
 * Enheter: m = 1, k = 0,36 (ω = 0,6), banen har H = 0,18 (utslag 1, største
 * impuls 0,6). Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import {
  rk4, button, animate, svg, txt, line, circle, arrow, poly, FIXED, MOVING, DERIVED, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const K = 0.36; // fjærstivheten, m = 1
  const W = Math.sqrt(K);
  const TS = 2.4; // simulerte tidsenheter per sekund; perioden er 2π/ω ≈ 10,5
  const DT = 0.01;
  const S0 = [0.7, 0.6 * Math.sqrt(1 - 0.49)]; // (q, p) ved start, på banen med utslag 1
  const QM = 2.25; // Q-aksen går fra −QM til QM
  const PMAX = 1.2; // P-aksen går fra −PMAX til PMAX
  const SQ = 0.4; // sida i ruta ved origo
  const MAPS = [
    { key: "id", text: "Q = q, P = p", aria: "De gamle variablene uendret", M: [1, 0, 0, 1] },
    { key: "strekk", text: "Q = 2q, P = p", aria: "Q er to ganger q, P er p", M: [2, 0, 0, 1] },
    { key: "strekk-klem", text: "Q = 2q, P = p/2", aria: "Q er to ganger q, P er p delt på to", M: [2, 0, 0, 0.5] },
    { key: "speil", text: "Q = p, P = q", aria: "Q er p, P er q", M: [0, 1, 1, 0] },
    { key: "bytt", text: "Q = p, P = −q", aria: "Q er p, P er minus q", M: [0, 1, -1, 0] },
  ];
  let map = MAPS[0];
  let t = 0;
  let ring = [0, 0];
  const buttons = [];

  const apply = (M, v) => [M[0] * v[0] + M[1] * v[1], M[2] * v[0] + M[3] * v[1]];
  const inverse = (M) => {
    const d = M[0] * M[3] - M[1] * M[2];
    return [M[3] / d, -M[1] / d, -M[2] / d, M[0] / d];
  };
  // Klossens virkelige bevegelse, (q, p) ved tida t.
  const real = (tt) => [
    S0[0] * Math.cos(W * tt) + (S0[1] / W) * Math.sin(W * tt),
    S0[1] * Math.cos(W * tt) - S0[0] * W * Math.sin(W * tt),
  ];
  // Hamiltons ligninger i de nye variablene med H(Q, P) = H(M⁻¹(Q, P)).
  const flow = (_, y) => {
    const Mi = inverse(map.M);
    const [q, p] = apply(Mi, y);
    const gq = K * q; // ∂H/∂q
    const gp = p; // ∂H/∂p
    // (∂H/∂Q, ∂H/∂P) = M⁻ᵀ (∂H/∂q, ∂H/∂p)
    const gQ = Mi[0] * gq + Mi[2] * gp;
    const gP = Mi[1] * gq + Mi[3] * gp;
    return [gP, -gQ];
  };
  const reset = () => {
    t = 0;
    ring = apply(map.M, S0);
    render();
  };
  const sync = () => buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(MAPS[i] === map)));

  for (const m of MAPS) {
    const b = button(m.text, m.aria, () => {
      map = m;
      sync();
      reset();
    }, signal);
    buttons.push(b);
    controls.append(b);
  }
  sync();
  ring = apply(map.M, S0);

  function step(dt) {
    let s = dt * TS;
    t += s;
    while (s > 0) {
      const h = Math.min(DT, s);
      ring = rk4(ring, flow, 0, h);
      s -= h;
    }
  }

  /** En ellipse H = E i (q, p), avbildet til (Q, P). */
  function level(E) {
    const a = Math.sqrt((2 * E) / K);
    const b = Math.sqrt(2 * E);
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const u = (2 * Math.PI * i) / 120;
      pts.push(apply(map.M, [a * Math.cos(u), b * Math.sin(u)]));
    }
    return pts;
  }

  /** Klossen som et kvadrat med midten i x; stiplet omriss når ghost er sann. */
  function block(x, y0, s, ghost) {
    if (ghost) {
      return `<rect x="${(x - s / 2).toFixed(1)}" y="${(y0 - s).toFixed(1)}" width="${s}" height="${s}" style="fill:none" stroke="${DERIVED}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
    }
    return `<rect x="${(x - s / 2).toFixed(1)}" y="${(y0 - s).toFixed(1)}" width="${s}" height="${s}" rx="2" style="fill:${MOVING}"/>`;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const [q, p] = real(t);
    const [qg] = apply(inverse(map.M), ring);
    let g = "";

    // Planet av de nye variablene: lik skala langs begge aksene, sentrert.
    const rail = 50;
    const top = rail + 34;
    const left = 12;
    const right = 12;
    const bottom = 10;
    const pw = w - left - right;
    const ph = h - top - bottom;
    const s = Math.min(pw / (2 * QM), ph / (2 * PMAX));
    const ox = left + pw / 2;
    const oy = top + s * PMAX;

    // ── Klossen på fjæra, over planet og like bred ──
    const bs = 22;
    const wall = ox - s * QM + 6;
    const XB = (x) => ox + s * 0.9 * x;
    g += line(wall, rail, ox + s * QM, rail, { width: 2 });
    g += line(wall, rail - 40, wall, rail, { width: 2 });
    for (let yy = rail - 36; yy <= rail; yy += 7) g += line(wall, yy, wall - 6, yy + 5, { width: 1 });
    // Fjæra som sikksakk fra veggen til venstre side av klossen.
    const xs = XB(q) - bs / 2;
    const ys = rail - bs / 2;
    const n = 12;
    const pts = [[wall, ys], [wall + 6, ys]];
    for (let i = 1; i < n; i++) {
      const xx = wall + 6 + ((xs - 6 - wall - 6) * i) / n;
      pts.push([xx, ys + (i % 2 ? -6 : 6)]);
    }
    pts.push([xs - 6, ys], [xs, ys]);
    g += poly(pts, `stroke="${FIXED}" stroke-width="1.3"`);
    g += line(XB(0), rail + 3, XB(0), rail + 9, { color: LABEL, width: 1.2 });
    g += txt(XB(0), rail + 21, "q = 0", { anchor: "middle", size: 11 });
    g += block(XB(q), rail, bs, false);
    g += block(XB(qg), rail, bs + 6, true);

    // ── Planet av de nye variablene ──
    const X = (Q) => ox + s * Q;
    const Y = (P) => oy - s * P;
    const toPx = (pp) => pp.map(([a, b]) => [X(a), Y(b)]);
    const x0 = X(-QM);
    const x1 = X(QM);
    const y0 = Y(PMAX);
    const y1 = Y(-PMAX);
    g += `<clipPath id="nv-clip"><rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}"/></clipPath>`;
    g += line(x0, oy, x1, oy, { color: HINT, width: 1 });
    g += line(ox, y0, ox, y1, { color: HINT, width: 1 });
    g += txt(x1 - 2, oy - 6, "Q", { anchor: "end" });
    g += txt(ox + 7, y0 + 12, "P", { anchor: "start" });
    g += txt(x0 + 2, y0 + 12, map.text, { anchor: "start", size: 12 });

    let inner = "";
    for (const f of [0.25, 2.25]) {
      inner += poly(toPx(level(0.18 * f)), `stroke="${HINT}" stroke-width="1.1" stroke-dasharray="4 4"`);
    }
    inner += poly(toPx(level(0.18)), `stroke="${MOVING}" stroke-width="1.8" opacity="0.5"`);

    // Ruta ved origo: bildet av [0, SQ] × [0, SQ] i (q, p).
    const M = map.M;
    const c = [[0, 0], [SQ, 0], [SQ, SQ], [0, SQ]].map((v) => apply(M, v));
    const cp = toPx(c);
    inner += `<path d="M ${cp.map((v) => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`).join(" L ")} Z" style="fill:${LABEL}" opacity="0.14"/>`;
    const [eq, ep] = [apply(M, [SQ, 0]), apply(M, [0, SQ])];
    inner += arrow(X(0), Y(0), X(eq[0]), Y(eq[1]), LABEL, 1.6);
    inner += arrow(X(0), Y(0), X(ep[0]), Y(ep[1]), LABEL, 1.6);
    const lab = (v, sLab) => {
      const len = Math.hypot(v[0], v[1]) || 1;
      return txt(X(v[0] + (0.17 * v[0]) / len), Y(v[1] + (0.17 * v[1]) / len) + 4, sLab, { fill: LABEL, anchor: "middle", size: 12 });
    };
    inner += lab(eq, "q") + lab(ep, "p");
    const det = M[0] * M[3] - M[1] * M[2];
    const lx = x0 + 2;
    const ly = Y(-PMAX) - (det < 0 ? 20 : 6);
    inner += txt(lx, ly, `ruta: areal ×${Math.abs(det)}`, { anchor: "start", size: 11 });
    if (det < 0) inner += txt(lx, ly + 14, "speilvendt", { anchor: "start", size: 11 });

    g += `<g clip-path="url(#nv-clip)">${inner}</g>`;

    // Ringen fra Hamiltons ligninger og den virkelige bevegelsen.
    const [Qr, Pr] = apply(M, [q, p]);
    g += circle(X(ring[0]), Y(ring[1]), 7.5, { stroke: DERIVED, width: 2.2 });
    g += circle(X(Qr), Y(Pr), 5.5, { fill: MOVING, stroke: MOVING });

    stage.innerHTML = svg(w, h, g);
  }

  onResize(render);
  render();
  animate({
    stage,
    signal,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
}
