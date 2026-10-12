/**
 * Foucaults pendel sett ovenfra, i gulvets system. Kula slippes fra ro ute ved
 * kanten i nord og følger bevegelsesligningene for små utslag,
 *   ẍ = −ω₀² x + 2Ω ẏ,   ÿ = −ω₀² y − 2Ω ẋ,   Ω = ω sin φ,
 * der leddene med Ω er den horisontale Corioliskraften. Corioliskraften bøyer
 * banen mot høyre under hver sving (nordlige halvkule), så kula tegner en
 * rosett: spisse vendepunkter ute ved kanten, og banen bommer så vidt på
 * sentrum. Sporet blekner bakover. Buen fra startlinja viser vinkelen Ωt
 * svingeplanet i snitt har dreid.
 *
 * Tida er skrudd opp: ett døgn tar 60 s, og pendelen svinger én gang per 5 s.
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import {
  slider, button, animate, svg, txt, line, circle, arc, arrow, rk4,
  FIXED, MOVING, DERIVED, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const DAY = 60; // sekunder per døgn i simuleringen
  const OMEGA = (2 * Math.PI) / DAY; // jordas vinkelfart
  const T0 = 5; // svingeperiode
  const W0 = (2 * Math.PI) / T0;
  const PSI0 = Math.PI / 2; // startplanet: nord–sør
  const TRAIL = 30; // sekunder spor som vises
  const MARK = 0.04; // tid mellom sporpunktene
  let lat = 63; // breddegrad i grader
  let t = 0;
  let y = [0, 1, 0, 0]; // x, y, ẋ, ẏ i amplituder, x mot øst og y mot nord
  let trail = [];

  const reset = () => {
    t = 0;
    y = [Math.cos(PSI0), Math.sin(PSI0), 0, 0];
    trail = [[y[0], y[1]]];
  };
  const big = () => OMEGA * Math.sin((lat * Math.PI) / 180); // Ω = ω sin φ

  controls.append(
    slider({
      text: "Breddegrad φ",
      aria: "Breddegrad i grader, negativ på den sørlige halvkula",
      min: -90,
      max: 90,
      step: 1,
      value: lat,
      format: (v) => `${Math.abs(v)}° ${v < 0 ? "S" : "N"}`,
      signal,
      onInput: (v) => {
        lat = v;
        reset();
      },
    }),
    button("Nullstill", "Slipp pendelen på nytt fra nord", reset, signal),
  );

  const f = (_, [x, yy, vx, vy]) => {
    const om = big();
    return [vx, vy, -W0 * W0 * x + 2 * om * vy, -W0 * W0 * yy - 2 * om * vx];
  };
  let since = 0;
  function step(dt) {
    const n = 8;
    for (let i = 0; i < n; i++) y = rk4(y, f, t, dt / n);
    t += dt;
    since += dt;
    if (since >= MARK) {
      since = 0;
      trail.push([y[0], y[1]]);
      if (trail.length > TRAIL / MARK) trail.shift();
    }
  }
  reset();

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const R = Math.min(0.4 * h, 0.36 * w);
    const A = 0.82 * R; // svingeamplituden på gulvet
    const cx = w / 2;
    const cy = h / 2 + 6;
    const P = (r, a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    let g = "";

    // Gulvet med himmelretningene.
    g += circle(cx, cy, R, { stroke: FIXED, width: 2 });
    const dirs = [
      ["Ø", 0],
      ["N", Math.PI / 2],
      ["V", Math.PI],
      ["S", -Math.PI / 2],
    ];
    for (const [s, a] of dirs) {
      const [x, y] = P(R + 15, a);
      g += txt(x, y + 4, s, { anchor: "middle" });
    }

    // Sporet etter kula, i fem bolker som blekner bakover.
    const K = 5;
    const per = Math.ceil(trail.length / K);
    for (let k = 0; k < K; k++) {
      const part = trail.slice(k * per, (k + 1) * per + 1);
      if (part.length < 2) continue;
      let d = "";
      part.forEach(([x, yy], i) => {
        d += `${i ? "L" : "M"} ${(cx + A * x).toFixed(1)} ${(cy - A * yy).toFixed(1)} `;
      });
      g += `<path d="${d}" fill="none" stroke="${MOVING}" stroke-width="1.2" opacity="${(0.1 + (0.5 * (k + 1)) / K).toFixed(2)}"/>`;
    }

    // Startplanet og buen planet har dreid, med retning.
    const [sx1, sy1] = P(A + 10, PSI0);
    const [sx2, sy2] = P(-A - 10, PSI0);
    g += line(sx1, sy1, sx2, sy2, { color: HINT, width: 1, dash: "3 4" });
    const turned = -big() * t; // svingeplanets midlere dreining, negativ = med klokka
    if (Math.abs(turned) > 0.03) {
      const ra = 0.5 * R;
      const lim = Math.min(Math.abs(turned), 1.9 * Math.PI) * Math.sign(turned);
      // arc() bruker skjermvinkler (y ned), så fortegnet snus.
      g += arc(cx, cy, ra, -PSI0, -(PSI0 + lim), { color: DERIVED, width: 1.5 });
      const [ex, ey] = P(ra, PSI0 + lim);
      const tx = -Math.sin(PSI0 + lim) * Math.sign(lim);
      const ty = Math.cos(PSI0 + lim) * Math.sign(lim);
      g += arrow(ex - tx * 6, ey + ty * 6, ex + tx * 6, ey - ty * 6, DERIVED, 1.5);
      const [lx, ly] = P(ra + 16, PSI0 + lim / 2);
      g += txt(lx, ly + 4, "ω sin φ · t", { fill: DERIVED, anchor: "middle" });
    }

    // Snora sett ovenfra og kula.
    const bx = cx + A * y[0];
    const by = cy - A * y[1];
    g += line(cx, cy, bx, by, { color: LABEL, width: 1 });
    g += circle(cx, cy, 2.5, { fill: FIXED, stroke: FIXED });
    g += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="8" style="fill:${MOVING}"/>`;

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
