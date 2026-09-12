/**
 * Foucaults pendel sett ovenfra. Kula svinger fram og tilbake gjennom
 * sentrum, og svingeplanet dreier med vinkelfarten ω sin φ: med klokka på den
 * nordlige halvkula, mot klokka på den sørlige, ikke i det hele tatt ved
 * ekvator. De gamle svingelinjene blir stående som en vifte, og buen fra
 * startlinja til den gjeldende linja er vinkelen planet har dreid.
 *
 * Tida er skrudd opp: ett døgn tar ett minutt, og pendelen svinger én gang
 * per 2 s. Kontrakt: default-eksportert init(api), api = { stage, controls,
 * getSize, onResize, signal }.
 */
import {
  slider, button, animate, svg, txt, line, circle, arc, arrow,
  FIXED, MOVING, DERIVED, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const DAY = 60; // sekunder per døgn i simuleringen
  const OMEGA = (2 * Math.PI) / DAY; // jordas vinkelfart
  const T0 = 2; // svingeperiode
  const W0 = (2 * Math.PI) / T0;
  const PSI0 = Math.PI / 2; // startplanet: nord–sør
  const KEEP = 28; // antall gamle svingelinjer som vises
  let lat = 63; // breddegrad i grader
  let t = 0;
  let psi = PSI0; // svingeplanets retning, fra øst mot nord
  let lines = []; // gamle svingeretninger
  let nextMark = T0 / 2;

  const reset = () => {
    t = 0;
    psi = PSI0;
    lines = [];
    nextMark = T0 / 2;
  };
  const rate = () => -OMEGA * Math.sin((lat * Math.PI) / 180); // dψ/dt

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
    button("Nullstill", "Start pendelen på nytt i nord–sør-planet", reset, signal),
  );

  function step(dt) {
    t += dt;
    psi += rate() * dt;
    if (t >= nextMark) {
      lines.push(psi);
      if (lines.length > KEEP) lines.shift();
      nextMark += T0 / 2;
    }
  }

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

    // Gamle svingelinjer, eldst svakest.
    lines.forEach((a, i) => {
      const op = 0.06 + (0.32 * (i + 1)) / lines.length;
      const [x1, y1] = P(A, a);
      const [x2, y2] = P(-A, a);
      g += line(x1, y1, x2, y2, { color: MOVING, width: 1, opacity: op });
    });

    // Startplanet og buen planet har dreid, med retning.
    const [sx1, sy1] = P(A + 10, PSI0);
    const [sx2, sy2] = P(-A - 10, PSI0);
    g += line(sx1, sy1, sx2, sy2, { color: HINT, width: 1, dash: "3 4" });
    const turned = psi - PSI0; // negativ = med klokka
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
    const s = A * Math.cos(W0 * t);
    const [bx, by] = P(s, psi);
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
