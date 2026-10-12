/**
 * En måne i bane om en planet, sett fra systemet som roterer med månen. Der
 * ligger månen i ro. Steiner som ligger løst på månens nærside og bakside,
 * kjenner to akselerasjoner: forskjellen mellom planetens tyngde og
 * sentrifugalkraften, 3GMR_m/r³ bort fra månens sentrum, og månens egen
 * tyngde Gm_m/R_m² inn mot det. Innenfor Roche-grensen er den første størst,
 * og steinene løfter seg.
 *
 * Enheter: planetens radius 1, og planeten og månen har samme massetetthet,
 * så forholdet mellom de to akselerasjonene er 3/r³ og grensen ligger ved
 * r = 3^(1/3) ≈ 1,44. Kontrakt: default-eksportert init(api), api = { stage,
 * controls, getSize, onResize, signal }.
 */
import { nb, slider, animate, svg, txt, line, circle, arrow, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

const RM = 0.3; // månens radius, i planetradier
const LIMIT = Math.cbrt(3);
const RMAX = 2.5; // største avstand på glideren
const ROCKS = [-0.35, 0, 0.35]; // vinkler fra linja mot planeten

export default function init({ stage, controls, getSize, onResize, signal }) {
  let r = 2.2;
  let lift = 0; // hvor langt steinene har løftet seg, i månradier
  let vel = 0;

  controls.append(
    slider({
      text: "Avstand r",
      aria: "Avstanden fra planetens sentrum til månens sentrum, i planetradier",
      min: 1.35,
      max: RMAX,
      step: 0.05,
      value: r,
      format: (v) => `${nb(v, 2)} R_p`,
      signal,
      onInput: (v) => {
        r = v;
        lift = 0;
        vel = 0;
      },
    }),
  );

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    // Hele scenen sentreres; er den for smal, skjæres planeten av ved venstre kant.
    let U = 0.36 * h; // piksler per planetradius
    let px;
    const need = (1 + RMAX + RM) * U + 70;
    if (need <= w) {
      px = (w - need) / 2 + U;
    } else {
      U = Math.min(U, (w - 70) / (0.55 + RMAX + RM));
      px = 14 - 0.45 * U;
    }
    const cy = h / 2 + 6;
    const mx = px + r * U;
    const m = RM * U;
    let g = "";

    // Banen og Roche-grensen.
    g += circle(px, cy, r * U, { stroke: HINT, dash: "2 5" });
    g += circle(px, cy, LIMIT * U, { stroke: DERIVED, dash: "5 4", opacity: 0.8 });
    g += txt(px + LIMIT * U * Math.cos(-0.9), cy + LIMIT * U * Math.sin(-0.9) - 6, "Roche-grensen", {
      fill: DERIVED,
    });

    // Planeten og månen.
    g += circle(px, cy, U, { fill: "var(--bg-elevated)", stroke: FIXED, width: 2.5 });
    g += txt(Math.max(px, (px + U) / 2), cy + 4, "planet", { anchor: "middle" });
    g += line(px, cy, mx, cy, { color: HINT, dash: "4 4" });
    g += circle(mx, cy, m, { fill: "var(--card-nested)", stroke: FIXED, width: 2 });

    // Løse steiner på nærsiden og baksiden.
    const ratio = 3 / r ** 3;
    for (const side of [-1, 1]) {
      for (const a of ROCKS) {
        const nx = side * Math.cos(a);
        const ny = Math.sin(a);
        const s = m + 5 + lift * m * Math.abs(nx);
        g += circle(mx + nx * s, cy - ny * s, 4, { fill: MOVING, stroke: "none" });
      }
      // Pilene på steinen midt på linja.
      const sx = mx + side * (m + 5 + lift * m);
      const L = Math.max(14, 0.8 * m);
      g += arrow(sx, cy, sx - side * L, cy, MOVING, 2);
      if (L * ratio > 9) g += arrow(sx, cy, sx + side * L * ratio, cy, DERIVED, 2);
    }
    const lx = Math.min(Math.max(mx, 72), w - 72); // etikettene holdes innenfor scenen
    g += txt(lx, cy - m - 22, "månens tyngde", { fill: MOVING, anchor: "middle", size: 11 });
    g += txt(lx, cy + m + 30, "tyngde − sentrifugal", { fill: DERIVED, anchor: "middle", size: 11 });

    stage.innerHTML = svg(w, h, g);
  }

  onResize(render);
  render();
  animate({
    stage,
    signal,
    onFrame: (dt) => {
      const ratio = 3 / r ** 3;
      if (ratio > 1) {
        vel += (ratio - 1) * 4 * dt;
        lift += vel * dt;
        if (lift > 2.2) {
          lift = 0;
          vel = 0;
        }
      }
      render();
    },
  });
}
