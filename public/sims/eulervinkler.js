/**
 * Eulervinklene. Rommets akser ê₁, ê₂, ê₃ står fast (grå), og legemet er ei
 * skive med aksene ê₁′, ê₂′, ê₃′ (aksentfargen). Tre glidebrytere setter φ, θ og ψ:
 * φ dreier ê₁ om ê₃ over til knutelinja ê_N, θ dreier ê₃ om knutelinja over
 * til ê₃′, og ψ dreier knutelinja om ê₃′ over til ê₁′. De tre vinklene er
 * tegnet som oransje buer. Knappen spiller av dreiningene i rekkefølge fra
 * null.
 *
 * Skiva er massiv og skyggelagt fra ett lys (_solid.js). Aksene og buene
 * deles og sorteres mot den (_painter.js), og det som ligger bak skiva, vises
 * som svake stiplede linjer.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import {
  slider, button, animate, svg, txt,
  FIXED, HINT, DERIVED, LABEL, MOVING,
} from "./_mekanikk.js";
import { PAPER, add, disc, lightFor, viewFor } from "./_solid.js";
import { discHit, painter } from "./_painter.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const ALPHA = 0.32; // kameraets hevning over vannrett
  const BETA = -2.25; // dreining av rommet om ê₃ for kameraet
  const PLAY = 1.3; // sekunder per dreining
  const deg = Math.PI / 180;
  const VIEW = viewFor(ALPHA, BETA);
  const LIGHT = lightFor(BETA);
  const COIN = `color-mix(in oklab, ${MOVING} 30%, ${PAPER})`;

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
    const O = [0, 0, 0];
    const eN = [Math.cos(phi), Math.sin(phi), 0];
    const e3p = comb(Math.cos(theta), E3, Math.sin(theta), cross(eN, E3));
    const q = cross(e3p, eN);
    const e1p = comb(Math.cos(psi), eN, Math.sin(psi), q);
    const e2p = cross(e3p, e1p);
    const at = (r, v) => v.map((c) => r * c);
    const sub = (s0, s1) => `${s0}<tspan baseline-shift="sub" style="font-size:9px">${s1}</tspan>`;

    // Skiva er massiv, og alle linjer deles og sorteres mot den. Det som
    // ligger i skiveplanet (knutelinja, ê′₁, ê′₂ og ψ), er tegnet på den
    // synlige flata.
    const R = 0.85;
    const HT = 0.045;
    const coin = disc({
      c: O, n: e3p, eu: eN, ev: q, r: R, ht: HT, view: VIEW, light: LIGHT, P,
      base: COIN, seg: 60,
    });
    const nv = coin.capNormal;
    const lift = (p) => add(p, nv, HT + 0.004);
    const pen = painter({ P, view: VIEW, hit: discHit(O, e3p, R, HT) });
    let labels = "";

    // Det vannrette planet og knutelinja.
    const ringH = [];
    for (let i = 0; i <= 72; i++) {
      const u = (2 * Math.PI * i) / 72;
      ringH.push([Math.cos(u), Math.sin(u), 0]);
    }
    pen.polyline(ringH, { color: HINT, width: 1, dash: "4 4" });
    pen.polyline([lift(at(-1.15, eN)), lift(at(1.15, eN))], { color: LABEL, width: 1.3, dash: "6 4" });
    const [n1x, n1y] = P(at(1.15, eN));
    labels += txt(n1x + 4, n1y + 14, sub("ê", "N"), { anchor: "middle" });

    // Rommets akser går ut fra sentrum, inni skiva.
    for (const [v, lab] of [[E1, sub("ê", "1")], [E2, sub("ê", "2")], [E3, sub("ê", "3")]]) {
      pen.arrow(O, at(1.3, v), FIXED, 1.6);
      const [lx, ly] = P(at(1.44, v));
      labels += txt(lx, ly + 4, lab, { anchor: "middle" });
    }

    // Vinklene: φ i det vannrette planet, θ fra ê₃ til ê₃′, ψ på skiva.
    const angle = (val, r, fn, lab, lr, inPlane) => {
      if (val < 0.06) return;
      const n = Math.max(6, Math.ceil(val * 14));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const p = at(r, fn((i / n) * val));
        pts.push(inPlane ? lift(p) : p);
      }
      pen.polyline(pts, { color: DERIVED, width: 2 });
      const [lx, ly] = P(at(lr, fn(val / 2)));
      labels += txt(lx, ly + 4, lab, { anchor: "middle", fill: DERIVED });
    };
    const nodeCross = cross(eN, E3);
    angle(phi, 0.42, (u) => [Math.cos(u), Math.sin(u), 0], "φ", 0.58, false);
    angle(theta, 0.5, (u) => comb(Math.cos(u), E3, Math.sin(u), nodeCross), "θ", 0.66, false);
    angle(psi, 0.62, (u) => comb(Math.cos(u), eN, Math.sin(u), q), "ψ", 0.77, true);

    // Legemets akser.
    for (const [v, r, lab, inPlane] of [
      [e1p, 1.05, sub("ê′", "1"), true],
      [e2p, 1.05, sub("ê′", "2"), true],
      [e3p, 1.25, sub("ê′", "3"), false],
    ]) {
      pen.arrow(inPlane ? lift(O) : O, inPlane ? lift(at(r, v)) : at(r, v), MOVING, 2.2);
      const [lx, ly] = P(at(r + 0.16, v));
      labels += txt(lx, ly + 4, lab, { anchor: "middle", fill: MOVING });
    }
    pen.dotAt(lift(O), 3, FIXED);

    stage.innerHTML = svg(w, h, pen.svg(coin.rim + coin.cap) + labels);
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
