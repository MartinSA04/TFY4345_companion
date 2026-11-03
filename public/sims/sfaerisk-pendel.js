/**
 * Den sfæriske pendelen i skråprojeksjon: kule på ei stiv, lett stang med
 * lengde l = 1,0 m fra et kuleledd, fri til å svinge i alle retninger. θ er
 * vinkelen fra loddlinja. Kula slippes fra θ₀ = 60° med en sidefart
 * vinkelrett på planet gjennom stanga og loddlinja. De to stiplede
 * breddesirklene er vendepunktene for θ, d er avstanden fra loddlinja, og den
 * oransje pila er farten rundt loddlinja, d·φ̇. Dreieimpulsen om loddlinja,
 * m·d·(d·φ̇), er bevart, så pila er lengst der d er minst.
 *
 * Enheter: m, s, g = 9,81 m/s². Sanntid. Kontrakt: default-eksportert
 * init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, line, poly, arrow, support, rod, bob, rodLabel,
  gravity, projector, DERIVED, HINT, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const G = 9.81;
  const DT = 0.002;
  const TH0 = Math.PI / 3;
  const TRAIL = 4; // sekunder med spor
  const PH0 = -Math.PI / 4; // startpunktet: foran til høyre, så et plant sving synes på skrå
  const ALPHA = 0.72; // kameraets hevning over vannrett; høyt nok til at vannrette piler ikke blir for korte
  const VSCALE = 0.12; // pillengde per m/s, i stanglengder
  let v0 = 1.4;
  let pphi = 0; // dreieimpuls per masse om loddlinja, l = 1
  let y = [TH0, 0, PH0]; // [θ, θ̇, φ]
  let trail = [];
  let lim = [TH0, TH0]; // [θ_min, θ_max]

  const Veff = (t) => (pphi ? (pphi * pphi) / (2 * Math.sin(t) ** 2) : 0) - G * Math.cos(t);

  // Vendepunktene: θ₀ er det ene (θ̇₀ = 0). Det andre er den andre roten av
  // V_eff(θ) = E, på motsatt side av minimumet i V_eff.
  function turning() {
    if (!pphi) return [0, TH0];
    const E = Veff(TH0);
    let tmin = TH0;
    let vmin = Infinity;
    for (let t = 0.005; t < Math.PI - 0.005; t += 0.001) {
      const v = Veff(t);
      if (v < vmin) {
        vmin = v;
        tmin = t;
      }
    }
    if (Math.abs(tmin - TH0) < 0.004) return [TH0, TH0];
    const gfn = (t) => Veff(t) - E;
    let a = TH0 > tmin ? 0.001 : tmin;
    let b = TH0 > tmin ? tmin : Math.PI - 0.001;
    const sa = gfn(a) > 0;
    for (let i = 0; i < 60; i++) {
      const m = (a + b) / 2;
      if (gfn(m) > 0 === sa) a = m;
      else b = m;
    }
    const other = (a + b) / 2;
    return TH0 > tmin ? [other, TH0] : [TH0, other];
  }

  function reset() {
    pphi = Math.sin(TH0) * v0;
    y = [TH0, 0, PH0];
    trail = [];
    lim = turning();
  }
  reset();

  const f = (t, s) => {
    const sn = Math.sin(s[0]);
    const pd = pphi ? pphi / (sn * sn) : 0;
    return [s[1], pd * pd * sn * Math.cos(s[0]) - G * sn, pd];
  };

  controls.append(
    slider({
      text: "Sidefart",
      aria: "Kulas sidefart i startpunktet",
      min: 0,
      max: 5,
      step: 0.1,
      value: v0,
      format: (v) => `${nb(v)} m/s`,
      signal,
      onInput: (v) => {
        v0 = v;
        reset();
      },
    }),
    button("Slipp på nytt", "Slipp kula på nytt fra startpunktet", reset, signal),
  );

  const pos = (th, ph) => [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), -Math.cos(th)];

  let t = 0;
  function step(dt) {
    let s = dt;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      s -= h;
    }
    t += dt;
    trail.push([t, pos(y[0], y[2])]);
    while (trail.length && trail[0][0] < t - TRAIL) trail.shift();
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const [th, , ph] = y;
    const ca = Math.cos(ALPHA);
    const sa = Math.sin(ALPHA);
    const rOut = Math.max(0.6, Math.sin(lim[1]), Math.sin(lim[0]));
    // Høyeste punkt over opphenget (baksida av den øverste breddesirkelen) og
    // laveste under det (forsida av den nederste, eller bunnpunktet).
    const above = Math.max(0, ...lim.map((tl) => Math.sin(tl) * sa - Math.cos(tl) * ca));
    const below = Math.max(ca, ...lim.map((tl) => Math.cos(tl) * ca + Math.sin(tl) * sa));
    // Skalaen settes så sirklene med vinkeletikettene til høyre får plass.
    const L = Math.min((h - 30) / (above + below), (0.5 * w - 36) / rOut);
    const cx = w / 2;
    const cy = 14 + L * above; // opphenget
    const P = projector(cx, cy, L, ALPHA);
    const ring = (r, z) => {
      const pts = [];
      for (let i = 0; i <= 72; i++) {
        const u = (2 * Math.PI * i) / 72;
        pts.push(P(r * Math.cos(u), r * Math.sin(u), z));
      }
      return pts;
    };
    let g = "";

    // Loddlinja.
    const [x0, y0] = P(0, 0, -1);
    g += line(cx, cy, x0, y0 + 8, { color: HINT, width: 1, dash: "3 4" });

    // Breddesirklene kula vender ved, med vinkelen i hele grader ved høyre ende.
    // To sirkler mindre enn 1° fra hverandre får én etikett.
    const lims = Math.abs(lim[1] - lim[0]) < Math.PI / 180 ? [lim[1]] : lim;
    for (const tl of lims) {
      if (Math.sin(tl) > 0.02) {
        g += poly(ring(Math.sin(tl), -Math.cos(tl)), `stroke="${LABEL}" stroke-width="1.2" stroke-dasharray="5 4"`);
        // En liten sirkel ved bunnen har ikke plass til etiketten.
        if (Math.sin(tl) > 0.12) {
          const [lx, ly] = P(Math.sin(tl), 0, -Math.cos(tl));
          g += txt(lx + 5, ly + 4, `${Math.round((tl * 180) / Math.PI)}°`);
        }
      }
    }
    g += poly(trail.map((p) => P(...p[1])), `stroke="${MOVING}" stroke-width="1.5" opacity="0.4"`);

    // Avstanden d fra loddlinja, i kulas eget vannrette plan.
    const b3 = pos(th, ph);
    const [bx, by] = P(...b3);
    const [ax, ay] = P(0, 0, b3[2]);
    // Bak på sirkelen ligger kula nær opphenget på skjermen; da tegnes ingen etiketter for l, θ og d.
    const roomy = Math.hypot(bx - cx, by - cy) > 0.45 * L;
    g += line(ax, ay, bx, by, { color: LABEL, width: 1, dash: "3 3" });
    if (roomy && Math.sin(th) > 0.18) g += txt(ax + 0.4 * (bx - ax), ay + 0.4 * (by - ay) + 15, "d", { anchor: "middle" });

    // Stanga, kula og vinkelen θ.
    g += rod(cx, cy, bx, by);
    if (roomy) g += rodLabel(cx, cy, bx, by, "l");
    if (roomy && th > 0.12) {
      const pts = [];
      const n = Math.max(4, Math.ceil(th * 10));
      for (let i = 0; i <= n; i++) {
        const u = (th * i) / n;
        pts.push(P(...pos(u, ph).map((c) => 0.28 * c)));
      }
      g += poly(pts, `stroke="${LABEL}" stroke-width="1.2"`);
      const [lx, ly] = P(...pos(th / 2, ph).map((c) => 0.38 * c));
      g += txt(lx, ly + 4, "θ", { anchor: "middle" });
    }
    g += support(cx, cy);

    // Farten rundt loddlinja, d·φ̇, som en vannrett pil langs φ̂ i rommet, projisert som resten.
    const vphi = pphi / Math.max(1e-6, Math.sin(th));
    if (Math.abs(vphi) > 0.05) {
      const k = VSCALE * vphi;
      const [ex, ey] = P(b3[0] - k * Math.sin(ph), b3[1] + k * Math.cos(ph), b3[2]);
      const dx = ex - bx;
      const dy = ey - by;
      const dl = Math.hypot(dx, dy) || 1;
      let len = dl;
      // Pila kortes bare hvis den ellers ville gått ut av scenen (største sidefart).
      const ux = dx / dl;
      const uy = dy / dl;
      for (const [u, b, lo, hi] of [[ux, bx, 4, w - 4], [uy, by, 4, h - 4]]) {
        if (u * len > hi - b) len = (hi - b) / u;
        if (u * len < lo - b) len = (lo - b) / u;
      }
      g += arrow(bx, by, bx + len * ux, by + len * uy, DERIVED, 2.4);
    }
    g += bob(bx, by, 8, undefined, "");
    g += gravity(22, 18);

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
