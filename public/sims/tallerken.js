/**
 * Ei tynn skive (en tallerken, I₃ = 2I₁) som vingler, sett fra et system
 * som faller med den. L står fast og peker loddrett opp. Glidebryteren
 * setter vinkelen θ mellom L og symmetriaksen, og et farget merke nær kanten
 * viser hvordan tallerkenen dreier.
 *
 * Bevegelsen er den eksakte løsningen for en fri symmetrisk snurrebass med
 * L langs ê₃: θ er fast, φ̇ = L/I₁ og ψ̇ = −Ω = −(I₃ − I₁)ω₃/I₁ med
 * ω₃ = L cos θ/I₃. Vinkelhastigheten er ω = φ̇ ê₃ + ψ̇ ê₃′.
 *
 * To visninger. «Fra rommet»: tallerkenen vingler, aksen (grå stang) går
 * rundt L, og den stiplede sirkelen er banen til enden av aksen. «Fra
 * tallerkenen»: kameraet følger tallerkenen, som da ligger stille, og L og ω
 * går rundt aksen.
 *
 * Tallerkenen er massiv og skyggelagt fra ett lys (_solid.js), og linjene
 * deles og sorteres mot den (_painter.js).
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import {
  slider, button, animate, svg, txt,
  DERIVED, LABEL, MOVING,
} from "./_mekanikk.js";
import { PAPER, disc, lightFor, viewFor } from "./_solid.js";
import { discHit, painter } from "./_painter.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const ALPHA = 0.42; // kameraets hevning over vannrett
  const VIEW = viewFor(ALPHA);
  const LIGHT = lightFor();
  const R = 1; // radien
  const HT = 0.045; // halve tykkelsen
  const I1 = 1;
  const I3 = 2;
  const LMAG = (2 * Math.PI) / 1.6; // L/I₁: én vingling på 1,6 s
  const deg = Math.PI / 180;
  const ROD = 0.62;
  const TRAIL = 260;

  let th = 20 * deg;
  let t = 0;
  let fromBody = false;
  let trail = [];

  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const comb = (a, u, b, v) => [0, 1, 2].map((i) => a * u[i] + b * v[i]);

  // Legemets akser i rommet ved tida t.
  function frame(time) {
    const w3 = (LMAG * I1 * Math.cos(th)) / I3;
    const Om = ((I3 - I1) * w3) / I1;
    const ph = LMAG * time;
    const ps = -Om * time;
    const eN = [Math.cos(ph), Math.sin(ph), 0];
    const e3 = [Math.sin(th) * Math.sin(ph), -Math.sin(th) * Math.cos(ph), Math.cos(th)];
    const e2n = cross(e3, eN);
    const e1 = comb(Math.cos(ps), eN, Math.sin(ps), e2n);
    const e2 = comb(-Math.sin(ps), eN, Math.cos(ps), e2n);
    const om = comb(LMAG, [0, 0, 1], -Om, e3);
    return { e: [e1, e2, e3], om };
  }

  controls.append(
    slider({
      text: "Helning",
      aria: "Vinkelen mellom L og symmetriaksen",
      min: 3,
      max: 30,
      step: 1,
      value: 20,
      format: (v) => `${v}°`,
      signal,
      onInput: (v) => {
        th = v * deg;
        trail = [];
        render();
      },
    }),
  );
  const viewBtns = ["Fra rommet", "Fra tallerkenen"].map((name, i) =>
    button(
      name,
      i ? "Vis bevegelsen sett fra tallerkenen" : "Vis bevegelsen sett fra rommet",
      () => {
        fromBody = i === 1;
        trail = [];
        viewBtns.forEach((bt, j) => bt.setAttribute("aria-pressed", String(j === i)));
        render();
      },
      signal,
    ),
  );
  viewBtns[0].setAttribute("aria-pressed", "true");
  controls.append(...viewBtns);

  // Tallerkenen sett fra seg selv: aksen rett opp.
  const EB = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const s = Math.min((w - 16) / 2.5, (h - 20) / 2.3);
    const cx = w / 2;
    const cy = h / 2 + 0.25 * s;
    const ca = Math.cos(ALPHA);
    const sa = Math.sin(ALPHA);
    const P = ([x, yy, z]) => [cx + s * x, cy - s * (z * ca + yy * sa)];
    const { e: es, om } = frame(t);
    // I legemets akser: komponentene av L og ω, avbildet med legemet stående stille.
    const toBody = (v) => es.map((ea) => dot(v, ea));
    const e = fromBody ? EB : es;
    const vecL = fromBody ? toBody([0, 0, 1]) : [0, 0, 1];
    const vecW = fromBody ? toBody(om) : om;
    const pen = painter({ P, view: VIEW, hit: discHit([0, 0, 0], e[2], R, HT) });

    // Merket: en farget prikk på oversida, 0,62 ut langs ê₁′.
    const d = disc({ c: [0, 0, 0], n: e[2], eu: e[0], ev: e[1], r: R, ht: HT, view: VIEW, light: LIGHT, P, base: PAPER });
    let plate = d.rim + d.cap;
    const top = d.capNormal === e[2];
    const markC = comb(0.62, e[0], top ? HT : -HT, e[2]);
    const mk = [];
    for (let i = 0; i < 24; i++) {
      const u = (2 * Math.PI * i) / 24;
      mk.push(P(comb(1, markC, 0.12, comb(Math.cos(u), e[0], Math.sin(u), e[1]))));
    }
    plate += `<path d="${mk.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} Z" style="fill:${MOVING}" opacity="${top ? 1 : 0.35}"/>`;

    // Aksen som stang, banen til enden, ω og L.
    const tipAx = e[2].map((c) => ROD * c);
    if (!fromBody) {
      trail.push(tipAx);
      if (trail.length > TRAIL) trail.shift();
      pen.polyline(trail, { color: LABEL, width: 1.2, dash: "3 4", opacity: 0.8 });
      pen.polyline([e[2].map((c) => -ROD * c), tipAx], { color: LABEL, width: 3 });
      pen.dotAt(tipAx, 4.5, LABEL);
    } else {
      trail.push(vecL.map((c) => 1.25 * c));
      if (trail.length > TRAIL) trail.shift();
      pen.polyline(trail, { color: DERIVED, width: 1.2, dash: "3 4", opacity: 0.8 });
      pen.polyline([e[2].map((c) => -ROD * c), tipAx], { color: LABEL, width: 3 });
    }
    const wn = Math.hypot(...vecW) || 1;
    const Wt = vecW.map((c) => (1.05 * c) / wn);
    pen.arrow([0, 0, 0], Wt, LABEL, 1.6);
    const Lt = vecL.map((c) => 1.25 * c);
    pen.arrow([0, 0, 0], Lt, DERIVED, 2.6);

    let labels = "";
    const [lx, ly] = P(Lt);
    labels += txt(lx + 8, ly + 2, "L", { fill: DERIVED });
    const [wx, wy] = P(Wt);
    labels += txt(wx + (wx < cx ? -12 : 8), wy + 2, "ω");

    stage.innerHTML = svg(w, h, pen.svg(plate) + labels);
  }

  onResize(render);
  render();
  animate({
    stage,
    signal,
    onFrame: (dt) => {
      t += dt;
      render();
    },
  });
}
