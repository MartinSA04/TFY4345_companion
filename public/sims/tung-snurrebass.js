/**
 * Tung symmetrisk snurrebass i skråprojeksjon: spissen P står fast på bordet,
 * og ei skive sitter på aksen i avstanden l fra spissen. θ er vinkelen mellom
 * loddlinja og symmetriaksen, φ dreiningen av aksen rundt loddlinja og ψ
 * dreiningen av skiva om aksen (radien som er tegnet på skiva).
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
  nb, rk4, slider, button, animate, svg, txt, line, circle, poly, arrow, rod,
  projector, FIXED, HINT, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const I1 = 1;
  const I3 = 0.5;
  const MGL = 1;
  const TH0 = (40 * Math.PI) / 180;
  const TS = 2; // simulert tid per sekund
  const DT = 0.002;
  const TIP = 1.35; // enden av aksen, i enheten l
  const RD = 0.36; // radien til skiva
  const TRAIL = 620;
  const ALPHA = 0.38;
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
    // Skalaen settes så den ytre vendesirkelen får plass i bredden, og så
    // tegningen fra fronten av bordet til toppen av aksen får plass i høyden.
    const rmax = Math.max(0.8, TIP * Math.sin(lim[1]));
    const s = Math.min((h - 30) / 1.75, (0.5 * w - 16) / rmax);
    const cx = w / 2;
    const cy = h / 2 + 0.5 * s;
    const P = projector(cx, cy, s, ALPHA);
    const ring = (r, z) => {
      const pts = [];
      for (let i = 0; i <= 72; i++) {
        const u = (2 * Math.PI * i) / 72;
        pts.push(P(r * Math.cos(u), r * Math.sin(u), z));
      }
      return pts;
    };
    let g = "";

    // Bordet og loddlinja gjennom spissen.
    g += poly(ring(0.85, 0), `stroke="${FIXED}" stroke-width="1.2"`);
    const [vx, vy] = P(0, 0, TIP + 0.12);
    g += line(cx, cy, vx, vy, { color: HINT, width: 1, dash: "3 4" });

    // Vendesirklene og banen til enden av aksen.
    for (const t of lim[0] === lim[1] ? [lim[0]] : lim) {
      g += poly(ring(TIP * Math.sin(t), TIP * Math.cos(t)), `stroke="${LABEL}" stroke-width="1.2" stroke-dasharray="5 4"`);
    }
    g += poly(trail.map((p) => P(...p)), `stroke="${MOVING}" stroke-width="1.6" opacity="0.55"`);

    // φ: fra x-aksen til aksens retning, i bordplanet.
    const [rx, ry] = P(0.62, 0, 0);
    g += line(cx, cy, rx, ry, { color: HINT, width: 1 });
    const n = axis(th, ph);
    const [fx, fy] = P(0.62 * Math.cos(ph), 0.62 * Math.sin(ph), 0);
    g += line(cx, cy, fx, fy, { color: HINT, width: 1, dash: "3 4" });
    const phm = ((ph % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (phm > 0.2) {
      const pts = [];
      const m = Math.max(4, Math.ceil(phm * 12));
      for (let i = 0; i <= m; i++) {
        const u = (phm * i) / m;
        pts.push(P(0.34 * Math.cos(u), 0.34 * Math.sin(u), 0));
      }
      g += poly(pts, `stroke="${LABEL}" stroke-width="1.2"`);
      const [lx, ly] = P(0.46 * Math.cos(phm / 2), 0.46 * Math.sin(phm / 2), 0);
      g += txt(lx, ly + 4, "φ", { anchor: "middle" });
    }

    // Aksen, skiva og spinnmerket.
    const [tx, ty] = P(...n.map((c) => TIP * c));
    const [mx, my] = P(...n);
    g += rod(cx, cy, tx, ty, MOVING);
    // To enhetsvektorer i skiveplanet: knutelinja og n × knutelinja.
    const eN = [Math.sin(ph), -Math.cos(ph), 0];
    const eP = [n[1] * eN[2] - n[2] * eN[1], n[2] * eN[0] - n[0] * eN[2], n[0] * eN[1] - n[1] * eN[0]];
    const rim = (u) => P(...n.map((c, i) => c + RD * (Math.cos(u) * eN[i] + Math.sin(u) * eP[i])));
    const disc = [];
    for (let i = 0; i <= 48; i++) disc.push(rim((2 * Math.PI * i) / 48));
    let d = "";
    disc.forEach(([x, yy], i) => {
      d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${yy.toFixed(1)} `;
    });
    g += `<path d="${d}Z" style="fill:${MOVING}" fill-opacity="0.22" stroke="${MOVING}" stroke-width="2" stroke-linejoin="round"/>`;
    const [kx, ky] = rim(ps);
    g += line(mx, my, kx, ky, { color: MOVING, width: 2.2 });
    g += circle(kx, ky, 3, { fill: MOVING, stroke: MOVING, width: 1 });
    g += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="3" style="fill:${FIXED}"/>`;
    // l på motsatt side av stanga fra loddlinja, så den ikke treffer θ.
    const side = mx >= cx ? 1 : -1;
    g += txt(cx + 0.62 * (mx - cx) + side * 11, cy + 0.62 * (my - cy) + 4, "l", { anchor: "middle" });

    // θ: fra loddlinja til aksen, ved spissen.
    if (th > 0.12) {
      const pts = [];
      const m = Math.max(4, Math.ceil(th * 10));
      for (let i = 0; i <= m; i++) pts.push(P(...axis((th * i) / m, ph).map((c) => 0.36 * c)));
      g += poly(pts, `stroke="${LABEL}" stroke-width="1.2"`);
      const [lx, ly] = P(...axis(th / 2, ph).map((c) => 0.5 * c));
      g += txt(lx, ly + 4, "θ", { anchor: "middle" });
    }

    // Tyngden i massesenteret og spissen.
    g += arrow(mx, my, mx, my + 0.3 * s, LABEL, 1.5);
    g += txt(mx + 7, my + 0.3 * s - 2, "Mg");
    g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" style="fill:${FIXED}"/>`;
    g += txt(cx - 9, cy + 15, "P", { anchor: "middle" });

    stage.innerHTML = svg(w, h, g);
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
