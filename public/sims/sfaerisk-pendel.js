/**
 * Den sfæriske pendelen i skråprojeksjon: kule i stiv stang fra et fast
 * oppheng, fri til å svinge i alle retninger. θ er vinkelen fra loddlinja og
 * φ vinkelen rundt den, tegnet i det vannrette planet gjennom bunnpunktet.
 * Glidebryteren gir kula en sidefart i startpunktet θ₀ = 45°. Dreieimpulsen
 * om loddlinja er bevart, så kula holder seg mellom de to stiplede
 * breddesirklene.
 *
 * Enheter: m = l = g = 1. Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, line, poly, support, rod, bob, rodLabel, gravity,
  projector, HINT, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TS = 1.5;
  const DT = 0.004;
  const TH0 = Math.PI / 4;
  const TRAIL = 360;
  const ALPHA = 0.42; // kameraets hevning over vannrett
  let v0 = 0.45;
  let pphi = 0;
  let y = [TH0, 0, 0]; // [θ, θ̇, φ]
  let trail = [];
  let lim = [0, TH0]; // [θ_min, θ_max]

  const Veff = (t) => (pphi ? (pphi * pphi) / (2 * Math.sin(t) ** 2) : 0) - Math.cos(t);

  // Vendepunktene: θ₀ er det ene (θ̇₀ = 0), det andre ligger på motsatt side
  // av minimumet i V_eff.
  function turning() {
    if (!pphi) return [0, TH0];
    const E = Veff(TH0);
    let tmin = TH0;
    let vmin = Infinity;
    for (let t = 0.005; t < Math.PI / 2; t += 0.002) {
      const v = Veff(t);
      if (v < vmin) {
        vmin = v;
        tmin = t;
      }
    }
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
    y = [TH0, 0, 0];
    trail = [];
    lim = turning();
  }
  reset();

  const f = (t, s) => {
    const sn = Math.sin(s[0]);
    const pd = pphi ? pphi / (sn * sn) : 0;
    return [s[1], pd * pd * sn * Math.cos(s[0]) - sn, pd];
  };

  controls.append(
    slider({
      text: "Sidefart i startpunktet",
      aria: "Kulas sidefart i startpunktet",
      min: 0,
      max: 1.6,
      step: 0.05,
      value: v0,
      format: (v) => `${nb(v, 2)} √(gl)`,
      signal,
      onInput: (v) => {
        v0 = v;
        reset();
      },
    }),
    button("Start på nytt", "Slipp kula på nytt fra startpunktet", reset, signal),
  );

  const pos = (th, ph) => [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), -Math.cos(th)];

  function step(dt) {
    let s = dt * TS;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      s -= h;
    }
    trail.push(pos(y[0], y[2]));
    if (trail.length > TRAIL) trail.shift();
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const [th, , ph] = y;
    // Skalaen settes så den ytre breddesirkelen får plass i bredden.
    const L = Math.min(0.78 * (h - 40), (0.5 * w - 18) / Math.max(0.6, Math.sin(lim[1])));
    const cx = w / 2;
    const cy = (h - L) / 2 + 6; // opphenget
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

    // Breddesirklene kula vender ved.
    for (const t of lim) {
      if (Math.sin(t) > 0.02) {
        g += poly(ring(Math.sin(t), -Math.cos(t)), `stroke="${LABEL}" stroke-width="1.2" stroke-dasharray="5 4"`);
      }
    }
    g += poly(trail.map((p) => P(...p)), `stroke="${MOVING}" stroke-width="1.5" opacity="0.4"`);

    // Loddlinja, det vannrette planet gjennom bunnpunktet og vinkelen φ.
    const [bx, by] = P(...pos(th, ph));
    const [x0, y0] = P(0, 0, -1);
    g += line(cx, cy, x0, y0, { color: HINT, width: 1, dash: "3 4" });
    const [xr, yr] = P(0.55, 0, -1);
    g += line(x0, y0, xr, yr, { color: HINT, width: 1 });
    const foot = P(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), -1);
    g += line(bx, by, foot[0], foot[1], { color: HINT, width: 1, dash: "3 4" });
    g += line(x0, y0, foot[0], foot[1], { color: HINT, width: 1 });
    const phm = ((ph % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (phm > 0.15 && Math.sin(th) > 0.15) {
      const pts = [];
      const n = Math.max(4, Math.ceil(phm * 12));
      for (let i = 0; i <= n; i++) {
        const u = (phm * i) / n;
        pts.push(P(0.3 * Math.cos(u), 0.3 * Math.sin(u), -1));
      }
      g += poly(pts, `stroke="${LABEL}" stroke-width="1.2"`);
      const [lx, ly] = P(0.42 * Math.cos(phm / 2), 0.42 * Math.sin(phm / 2), -1);
      g += txt(lx, ly + 4, "φ", { anchor: "middle" });
    }

    // Stanga, kula og vinkelen θ.
    g += rod(cx, cy, bx, by);
    g += rodLabel(cx, cy, bx, by, "l");
    if (th > 0.12) {
      const pts = [];
      const n = Math.max(4, Math.ceil(th * 10));
      for (let i = 0; i <= n; i++) {
        const u = (th * i) / n;
        pts.push(P(...pos(u, ph).map((c) => 0.36 * c)));
      }
      g += poly(pts, `stroke="${LABEL}" stroke-width="1.2"`);
      const [lx, ly] = P(...pos(th / 2, ph).map((c) => 0.47 * c));
      g += txt(lx, ly + 4, "θ", { anchor: "middle" });
    }
    g += support(cx, cy);
    g += bob(bx, by, 8, undefined, "m");
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
