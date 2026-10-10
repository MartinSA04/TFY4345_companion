/**
 * Eulervinklene. Rommets akser ê₁, ê₂, ê₃ står fast (grå), og legemet er ei
 * skive med aksene ê₁′, ê₂′, ê₃′ (aksentfargen). Tre glidebrytere setter φ, θ og ψ:
 * φ dreier ê₁ om ê₃ over til knutelinja ê_N, θ dreier ê₃ om knutelinja over
 * til ê₃′, og ψ dreier knutelinja om ê₃′ over til ê₁′. De tre vinklene er
 * tegnet som oransje buer. Knappen spiller av dreiningene i rekkefølge fra
 * null.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import {
  slider, button, animate, svg, txt, line, poly, arrow,
  FIXED, HINT, DERIVED, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const ALPHA = 0.32; // kameraets hevning over vannrett
  const BETA = -2.25; // dreining av rommet om ê₃ for kameraet
  const PLAY = 1.3; // sekunder per dreining
  const deg = Math.PI / 180;

  const set = { phi: 50 * deg, theta: 40 * deg, psi: 60 * deg };
  let shown = { ...set };
  let playing = false;
  let tPlay = 0;

  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const comb = (a, u, b, v) => [0, 1, 2].map((i) => a * u[i] + b * v[i]);

  const mk = (key, text, aria, max) => {
    const el = slider({
      text,
      aria,
      min: 0,
      max,
      step: 1,
      value: Math.round(set[key] / deg),
      format: (v) => `${v}°`,
      signal,
      onInput: (v) => {
        set[key] = v * deg;
        playing = false;
        shown = { ...set };
        render();
      },
    });
    return el;
  };

  controls.append(
    mk("phi", "φ", "Vinkelen φ om ê₃", 360),
    mk("theta", "θ", "Vinkelen θ om knutelinja", 150),
    mk("psi", "ψ", "Vinkelen ψ om ê₃′", 360),
    button(
      "Vis dreiningene",
      "Spill av de tre dreiningene etter hverandre",
      () => {
        playing = true;
        tPlay = 0;
        anim.start();
      },
      signal,
    ),
  );

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const s = Math.min((w - 24) / 2.7, (h - 30) / 2.55);
    const cx = w / 2 + 0.05 * s;
    const cy = h / 2 + 0.38 * s;
    const ca = Math.cos(ALPHA);
    const sa = Math.sin(ALPHA);
    const cb = Math.cos(BETA);
    const sb = Math.sin(BETA);
    const P = ([x, y, z]) => {
      const xr = x * cb - y * sb;
      const yr = x * sb + y * cb;
      return [cx + s * xr, cy - s * (z * ca + yr * sa)];
    };
    const { phi, theta, psi } = shown;
    const E1 = [1, 0, 0];
    const E2 = [0, 1, 0];
    const E3 = [0, 0, 1];
    const eN = [Math.cos(phi), Math.sin(phi), 0];
    const e3p = comb(Math.cos(theta), E3, Math.sin(theta), cross(eN, E3));
    const q = cross(e3p, eN);
    const e1p = comb(Math.cos(psi), eN, Math.sin(psi), q);
    const e2p = cross(e3p, e1p);
    const at = (r, v) => v.map((c) => r * c);
    const sub = (s0, s1) => `${s0}<tspan baseline-shift="sub" style="font-size:9px">${s1}</tspan>`;
    let g = "";

    // Det vannrette planet og knutelinja.
    const ringH = [];
    for (let i = 0; i <= 72; i++) {
      const u = (2 * Math.PI * i) / 72;
      ringH.push(P([Math.cos(u), Math.sin(u), 0]));
    }
    g += poly(ringH, `stroke="${HINT}" stroke-width="1" stroke-dasharray="4 4"`);
    const [n0x, n0y] = P(at(-1.15, eN));
    const [n1x, n1y] = P(at(1.15, eN));
    g += line(n0x, n0y, n1x, n1y, { color: LABEL, width: 1.3, dash: "6 4" });
    g += txt(n1x + 4, n1y + 14, sub("ê", "N"), { anchor: "middle" });

    // Skiva.
    const disc = [];
    for (let i = 0; i <= 60; i++) {
      const u = (2 * Math.PI * i) / 60;
      disc.push(P(comb(0.85 * Math.cos(u), eN, 0.85 * Math.sin(u), q)));
    }
    let d = "";
    disc.forEach(([x, y], i) => {
      d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    });
    g += `<path d="${d}Z" style="fill:${MOVING}" fill-opacity="0.14" stroke="${MOVING}" stroke-width="1.6" stroke-linejoin="round"/>`;

    // Rommets akser.
    const [ox, oy] = P([0, 0, 0]);
    const spaceAxes = [
      [E1, 1.3, sub("ê", "1")],
      [E2, 1.3, sub("ê", "2")],
      [E3, 1.3, sub("ê", "3")],
    ];
    for (const [v, r, lab] of spaceAxes) {
      const [x, y] = P(at(r, v));
      g += arrow(ox, oy, x, y, FIXED, 1.6);
      const [lx, ly] = P(at(r + 0.14, v));
      g += txt(lx, ly + 4, lab, { anchor: "middle" });
    }

    // Vinklene: φ i det vannrette planet, θ fra ê₃ til ê₃′, ψ i skiveplanet.
    const arcPts = (n, fn) => {
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(P(fn(i / n)));
      return pts;
    };
    const angle = (val, r, fn, lab, lr) => {
      if (val < 0.06) return "";
      const n = Math.max(6, Math.ceil(val * 14));
      let out = poly(arcPts(n, (t) => at(r, fn(t * val))), `stroke="${DERIVED}" stroke-width="2"`);
      const [lx, ly] = P(at(lr, fn(val / 2)));
      out += txt(lx, ly + 4, lab, { anchor: "middle", fill: DERIVED });
      return out;
    };
    const nodeCross = cross(eN, E3);
    g += angle(phi, 0.42, (u) => [Math.cos(u), Math.sin(u), 0], "φ", 0.58);
    g += angle(theta, 0.5, (u) => comb(Math.cos(u), E3, Math.sin(u), nodeCross), "θ", 0.66);
    g += angle(psi, 0.62, (u) => comb(Math.cos(u), eN, Math.sin(u), q), "ψ", 0.77);

    // Legemets akser.
    const bodyAxes = [
      [e1p, 1.05, sub("ê′", "1")],
      [e2p, 1.05, sub("ê′", "2")],
      [e3p, 1.25, sub("ê′", "3")],
    ];
    for (const [v, r, lab] of bodyAxes) {
      const [x, y] = P(at(r, v));
      g += arrow(ox, oy, x, y, MOVING, 2.2);
      const [lx, ly] = P(at(r + 0.16, v));
      g += txt(lx, ly + 4, lab, { anchor: "middle", fill: MOVING });
    }
    g += `<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="3" style="fill:${FIXED}"/>`;

    stage.innerHTML = svg(w, h, g);
  }

  onResize(render);
  render();
  const anim = animate({
    stage,
    signal,
    running: () => playing,
    onFrame: (dt) => {
      tPlay += dt;
      const u = (t) => Math.min(1, Math.max(0, t / PLAY));
      const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
      shown = {
        phi: set.phi * ease(u(tPlay)),
        theta: set.theta * ease(u(tPlay - PLAY - 0.25)),
        psi: set.psi * ease(u(tPlay - 2 * PLAY - 0.5)),
      };
      if (tPlay > 3 * PLAY + 0.5) {
        playing = false;
        shown = { ...set };
      }
      render();
    },
  });
}
