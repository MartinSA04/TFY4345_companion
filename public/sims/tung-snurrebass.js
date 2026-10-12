/**
 * Tung symmetrisk snurrebass i skråprojeksjon: spissen P står fast på bordet,
 * og massesenteret ligger på symmetriaksen i avstanden l fra spissen. θ er
 * vinkelen mellom loddlinja og symmetriaksen, φ dreiningen av aksen rundt
 * loddlinja og ψ dreiningen av snurrebassen om aksen (de malte feltene).
 *
 * Snurrebassen er et massivt dreid legeme (_solid.js), og alle linjer deles
 * og sorteres mot det (_painter.js): sirklene og banen går foran og bak den
 * der de faktisk ligger, og det som er bak, vises som svake stiplede linjer.
 *
 * Bevegelsen regnes fra Lagrangefunksjonen med de to bevarte impulsene
 * p_ψ = I₃ω₃ og p_φ = I₁φ̇ sin²θ + p_ψ cos θ: φ̇ = (p_φ − p_ψ cos θ)/(I₁ sin²θ),
 * ψ̇ = ω₃ − φ̇ cos θ og I₁θ̈ = I₁φ̇² sin θ cos θ − p_ψ φ̇ sin θ + Mgl sin θ.
 * Snurrebassen starter i θ₀ = 40° med θ̇ = 0, og knappene velger φ̇ i start:
 * null (spisser), halve farten for jevn presesjon (bølger), minus den
 * (løkker) eller nøyaktig den (jevn presesjon). De stiplede sirklene er
 * vendepunktene der V_eff(θ) er lik startverdien.
 *
 * Enheter: I₁ = Mgl = 1, I₃ = 0,5 I₁. Glidebryteren setter p_ψ/I₁, og
 * snurrebassen står stabilt rett opp når den er over 2. Kontrakt:
 * default-eksportert init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt,
  projector, FIXED, HINT, LABEL, MOVING,
} from "./_mekanikk.js";
import { PAPER, face, lathe, lightFor, shade, viewFor } from "./_solid.js";
import { latheHit, painter } from "./_painter.js";

const LIGHT = lightFor();
const STEEL = "var(--muted)";
const LIGHTPAINT = `color-mix(in oklab, ${MOVING} 40%, ${PAPER})`;

// Profilen [s, r] langs aksen i enheten l, som en klassisk snurrebass: en
// kort stålspiss, en kropp som vider seg ut fra spissen og er bredest like
// under toppen, en lav rund krone og et skaft opp til enden TIP.
const PROFILE = (() => {
  const R = 0.45;
  const pts = [[0, 0], [0.08, 0.05]];
  for (let i = 1; i <= 10; i++) {
    const sk = 0.08 + (0.82 * i) / 10;
    pts.push([sk, R * (sk / 0.9) ** 0.6]);
  }
  for (let i = 1; i <= 6; i++) {
    const sk = 0.9 + (0.18 * i) / 6;
    pts.push([sk, Math.max(0.045, R * Math.sqrt(Math.max(0, 1 - ((sk - 0.9) / 0.18) ** 2)))]);
  }
  pts.push([1.31, 0.045], [1.34, 0.03], [1.35, 0]);
  return pts;
})();
// Båndene: 0 er stålspissen, så kroppen fram til skaftet.
const STEM = PROFILE.findIndex(([sk]) => sk >= 1.079);

/** Konvekst skall av punkter [x, y] (monoton kjede). */
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (const q of p.reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

export default function init({ stage, controls, getSize, onResize, signal }) {
  const I1 = 1;
  const I3 = 0.5;
  const MGL = 1;
  const TH0 = (40 * Math.PI) / 180;
  const TS = 2; // simulert tid per sekund
  const DT = 0.002;
  const TIP = 1.35; // enden av aksen, i enheten l
  const TRAIL = 620;
  const ALPHA = 0.38;
  const VIEW = viewFor(ALPHA);
  const MODES = [
    { k: 0, text: "Slipp i ro", aria: "Slipp snurrebassen i ro" },
    { k: 0.5, text: "Dytt framover", aria: "Gi aksen et dytt i samme retning som presesjonen" },
    { k: -1, text: "Dytt bakover", aria: "Gi aksen et dytt mot presesjonen" },
    { k: 1, text: "Jevn presesjon", aria: "Gi aksen akkurat farten for jevn presesjon" },
  ];

  let spin = 3; // p_ψ/I₁
  let mode = 0;
  let pps = 0;
  let pph = 0;
  let y = [TH0, 0, 0, 0]; // [θ, θ̇, φ, ψ]
  let trail = [];
  let lim = [TH0, TH0];

  const Veff = (t) => {
    const s = Math.sin(t);
    const d = pph - pps * Math.cos(t);
    return (d * d) / (2 * I1 * s * s) + MGL * Math.cos(t);
  };

  // Det andre vendepunktet ligger på motsatt side av minimumet i V_eff.
  function turning() {
    const E = Veff(TH0);
    let tmin = TH0;
    let vmin = Infinity;
    for (let t = 0.01; t < Math.PI - 0.01; t += 0.002) {
      const v = Veff(t);
      if (v < vmin) {
        vmin = v;
        tmin = t;
      }
    }
    if (Math.abs(tmin - TH0) < 0.004) return [TH0, TH0];
    const g = (t) => Veff(t) - E;
    let a = TH0 > tmin ? 0.005 : tmin;
    let b = TH0 > tmin ? tmin : Math.PI - 0.005;
    const sa = g(a) > 0;
    for (let i = 0; i < 60; i++) {
      const m = (a + b) / 2;
      if (g(m) > 0 === sa) a = m;
      else b = m;
    }
    const other = (a + b) / 2;
    return TH0 > tmin ? [other, TH0] : [TH0, other];
  }

  function reset() {
    pps = spin * I1;
    const c0 = Math.cos(TH0);
    const slow = (pps - Math.sqrt(pps * pps - 4 * I1 * MGL * c0)) / (2 * I1 * c0);
    const pd0 = MODES[mode].k * slow;
    pph = I1 * pd0 * Math.sin(TH0) ** 2 + pps * c0;
    y = [TH0, 0, 0, 0];
    trail = [];
    lim = turning();
    buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === mode)));
  }

  const f = (t, s) => {
    const sn = Math.sin(s[0]);
    const cs = Math.cos(s[0]);
    const pd = (pph - pps * cs) / (I1 * sn * sn);
    const acc = (I1 * pd * pd * sn * cs - pps * pd * sn + MGL * sn) / I1;
    return [s[1], acc, pd, pps / I3 - pd * cs];
  };

  // Symmetriaksen: φ måles fra x-aksen til aksens retning i det vannrette planet.
  const axis = (th, ph) => [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];

  function step(dt) {
    let s = dt * TS;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      s -= h;
    }
    trail.push(axis(y[0], y[2]).map((c) => TIP * c));
    if (trail.length > TRAIL) trail.shift();
  }

  const buttons = MODES.map((m, i) =>
    button(
      m.text,
      m.aria,
      () => {
        mode = i;
        reset();
        anim?.start();
      },
      signal,
    ),
  );

  controls.append(
    slider({
      text: "Spinn",
      aria: "Spinnet om symmetriaksen",
      min: 2.6,
      max: 6,
      step: 0.1,
      value: spin,
      format: (v) => nb(v),
      signal,
      onInput: (v) => {
        spin = v;
        reset();
      },
    }),
    ...buttons,
  );
  reset();

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const [th, , ph, ps] = y;
    const rmax = Math.max(0.8, TIP * Math.sin(lim[1]));
    const s = Math.min((h - 30) / 1.75, (0.5 * w - 16) / rmax);
    const cx = w / 2;
    const cy = h / 2 + 0.5 * s;
    const Pp = projector(cx, cy, s, ALPHA);
    const P = (p) => Pp(...p);
    const circle3 = (r, z, m = 72) => {
      const pts = [];
      for (let i = 0; i <= m; i++) {
        const u = (2 * Math.PI * i) / m;
        pts.push([r * Math.cos(u), r * Math.sin(u), z]);
      }
      return pts;
    };
    const n = axis(th, ph);
    const eN = [Math.sin(ph), -Math.cos(ph), 0];
    const eP = [n[1] * eN[2] - n[2] * eN[1], n[2] * eN[0] - n[0] * eN[2], n[0] * eN[1] - n[1] * eN[0]];
    const pen = painter({ P, view: VIEW, hit: latheHit([0, 0, 0], n, PROFILE) });

    // Grunnen først: bordplata med forkant, så skyggen rett under aksen og skiva.
    let base = "";
    const SLAB = 0.07;
    const front = [];
    for (let i = 0; i <= 36; i++) {
      const u = Math.PI + (Math.PI * i) / 36;
      front.push(P([0.85 * Math.cos(u), 0.85 * Math.sin(u), 0]));
    }
    const edge = [...front, ...front.slice().reverse().map(([x, yy]) => [x, yy + SLAB * s])];
    base += face(edge, shade(FIXED, 1), shade(FIXED, 2), 0.8);
    base += face(circle3(0.85, 0).map(P), `color-mix(in oklab, ${FIXED} 40%, var(--canvas-bg))`, FIXED, 0.8);
    // Skyggen er det konvekse skallet av legemets ringer, rett ned på bordet.
    const floor = [];
    for (const [sk, rk] of PROFILE) {
      for (let i = 0; i < 24; i++) {
        const u = (2 * Math.PI * i) / 24;
        floor.push([sk * n[0] + rk * (Math.cos(u) * eN[0] + Math.sin(u) * eP[0]), sk * n[1] + rk * (Math.cos(u) * eN[1] + Math.sin(u) * eP[1])]);
      }
    }
    base += face(hull(floor).map(([x, yy]) => P([x, yy, 0])), "color-mix(in oklab, var(--solid-shade) 22%, transparent)", "none", 0);

    // Alt som er linjer, deles og sorteres mot skiva.
    pen.polyline([[0, 0, 0], [0, 0, TIP + 0.12]], { color: HINT, width: 1, dash: "3 4" });
    for (const t of lim[0] === lim[1] ? [lim[0]] : lim) {
      pen.polyline(circle3(TIP * Math.sin(t), TIP * Math.cos(t)), { color: LABEL, width: 1.2, dash: "5 4" });
    }
    pen.polyline(trail, { color: MOVING, width: 1.6, opacity: 0.55 });
    pen.polyline([[0, 0, 0], [0.62, 0, 0]], { color: HINT, width: 1 });
    pen.polyline([[0, 0, 0], [0.62 * Math.cos(ph), 0.62 * Math.sin(ph), 0]], { color: HINT, width: 1, dash: "3 4" });
    let labels = "";
    const phm = ((ph % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (phm > 0.2) {
      const pts = [];
      const m = Math.max(4, Math.ceil(phm * 12));
      for (let i = 0; i <= m; i++) {
        const u = (phm * i) / m;
        pts.push([0.34 * Math.cos(u), 0.34 * Math.sin(u), 0]);
      }
      pen.polyline(pts, { color: LABEL, width: 1.2 });
      const [lx, ly] = P([0.46 * Math.cos(phm / 2), 0.46 * Math.sin(phm / 2), 0]);
      labels += txt(lx, ly + 4, "φ", { anchor: "middle" });
    }
    // Symmetriaksen går gjennom hele snurrebassen og vises derfor som spøkelse.
    pen.polyline([[0, 0, 0], n.map((c) => TIP * c)], { color: LABEL, width: 1.2 });
    if (th > 0.12) {
      const pts = [];
      const m = Math.max(4, Math.ceil(th * 10));
      for (let i = 0; i <= m; i++) pts.push(axis((th * i) / m, ph).map((c) => 0.36 * c));
      pen.polyline(pts, { color: LABEL, width: 1.2 });
      const [lx, ly] = P(axis(th / 2, ph).map((c) => 0.5 * c));
      labels += txt(lx, ly + 4, "θ", { anchor: "middle" });
    }
    // Mg virker i massesenteret, inni legemet, og stikker ut under det.
    pen.arrow(n, [n[0], n[1], n[2] - 0.6], LABEL, 1.5);
    pen.dotAt([0, 0, 0], 3.5, FIXED);

    // Snurrebassen: stålspiss, malte felter på kroppen som dreier med ψ, og skaftet.
    const body = lathe({
      o: [0, 0, 0], n, eu: eN, ev: eP, profile: PROFILE, u0: ps, seg: 40, view: VIEW, light: LIGHT, P,
      mat: (k, i) => (k < 1 ? STEEL : k >= STEM ? MOVING : Math.floor(i / 5) % 2 ? MOVING : LIGHTPAINT),
    });

    const [mx, my] = P(n);
    const side = mx >= cx ? 1 : -1;
    labels += txt(cx + 0.45 * (mx - cx) + side * (0.4 * s + 8), cy + 0.45 * (my - cy) + 4, "l", { anchor: "middle" });
    labels += txt(mx + 7, my + 0.6 * s - 2, "Mg");
    labels += txt(cx - 9, cy + 15, "P", { anchor: "middle" });

    stage.innerHTML = svg(w, h, base + pen.svg(body) + labels);
  }

  onResize(render);
  render();
  const anim = animate({
    stage,
    signal,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
}
