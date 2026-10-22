/**
 * To kuler som støter, sett ovenfra: kule 1 kommer inn fra venstre mot kule 2,
 * som ligger i ro i laben. Kulene er glatte og harde, så kraften i støtet
 * virker langs linja gjennom sentrene, og støtet er elastisk.
 *
 * Prikkene er kulenes sentre med faste tidsmellomrom, så avstanden mellom to
 * prikker viser farten. Det oransje krysset er massesenteret. «Fra laben» viser
 * støtet fra bordet; «Fra massesenteret» viser det fra et system som følger
 * massesenteret, der krysset står stille. Med like masser i laben er vinkelen
 * mellom de to banene etter støtet merket; banene møtes i sentrum til kule 1
 * ved støtet, fordi kule 2 går ut langs linja gjennom de to sentrene.
 *
 * «Treff» er hvor langt fra midten kule 1 sikter, som brøkdel av summen av
 * radiene (0 er rett på). Massene: like, kule 1 tre ganger så tung, eller kule 1
 * en tredel så tung; radiene følger kvadratroten av massen.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, slider, nb, svg, txt, line, circle, arc, cross, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const SECOND = "var(--indigo)";
  const DOT = 0.14; // s mellom prikkene
  const T_IN = 1.8; // s fram til støtet
  const T_OUT = 2.2; // s etter støtet
  const T_PAUSE = 1.4; // s pause før neste runde

  let view = "lab";
  let treff = 0.5;
  let masses = [1, 1];
  let t = 0;

  function toggle(text, aria, pressed, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sim-btn";
    b.textContent = text;
    b.setAttribute("aria-label", aria);
    b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", onClick, { signal });
    return b;
  }
  const bLab = toggle("Fra laben", "Se støtet fra bordet", true, () => setView("lab"));
  const bCm = toggle("Fra massesenteret", "Se støtet fra et system som følger massesenteret", false, () => setView("cm"));
  const massSets = [
    ["Like masser", "Like masser", [1, 1]],
    ["Tung mot lett", "Kule 1 er tre ganger så tung som kule 2", [3, 1]],
    ["Lett mot tung", "Kule 1 er en tredel så tung som kule 2", [1, 3]],
  ];
  const massBtns = massSets.map(([text, aria, m], i) =>
    toggle(text, aria, i === 0, () => {
      masses = m;
      massBtns.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
      t = 0;
      render();
    }),
  );
  const sTreff = slider({
    text: "Treff",
    aria: "Hvor langt fra midten kule 1 sikter, 0 er rett på",
    min: 0,
    max: 0.95,
    step: 0.05,
    value: treff,
    format: (v) => (v === 0 ? "rett på" : nb(v, 2)),
    signal,
    onInput: (v) => {
      treff = v;
      t = 0;
      render();
    },
  });
  controls.append(bLab, bCm, ...massBtns, sTreff);

  function setView(v) {
    view = v;
    bLab.setAttribute("aria-pressed", String(v === "lab"));
    bCm.setAttribute("aria-pressed", String(v === "cm"));
    render();
  }

  // Hele støtet i labkoordinater (px), med kule 2 i origo og farten u langs x.
  function model(w) {
    const [m1, m2] = masses;
    const M = m1 + m2;
    const base = Math.min(15, w / 26);
    const r1 = base * Math.sqrt(m1);
    const r2 = base * Math.sqrt(m2);
    const D = r1 + r2;
    const u = (0.42 * w) / T_IN;
    const b = treff * D;
    const xc = -Math.sqrt(D * D - b * b); // kule 1 ved støtet
    const c1 = [xc, b];
    const n = [-xc / D, -b / D]; // fra 1 mot 2
    const un = u * n[0];
    const v1 = [u - ((2 * m2) / M) * un * n[0], -((2 * m2) / M) * un * n[1]];
    const v2 = [((2 * m1) / M) * un * n[0], ((2 * m1) / M) * un * n[1]];
    const V = (m1 * u) / M; // massesenterets fart
    const pos = (s) => {
      // s er tid målt fra støtet
      if (s < 0) return [[c1[0] + u * s, b], [0, 0]];
      return [
        [c1[0] + v1[0] * s, c1[1] + v1[1] * s],
        [v2[0] * s, v2[1] * s],
      ];
    };
    const cmAt = (s) => [(m1 * c1[0]) / M + V * s, (m1 * c1[1]) / M];
    return { r1, r2, c1, v1, v2, u, V, pos, cmAt, n };
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const md = model(w);
    const s = Math.min(t, T_IN + T_OUT) - T_IN; // tid fra støtet
    const shift = (q, tt) => {
      // Fra lab til skjerm: massesenteret ved støtet midt i bildet, og i
      // massesenterets system trekkes massesenterets forflytning fra.
      const cm0 = md.cmAt(0);
      const dx = view === "cm" ? md.V * tt : 0;
      return [w / 2 + q[0] - cm0[0] - dx, h / 2 - (q[1] - cm0[1])];
    };
    let g = "";

    // Prikker for hvert tidssteg som har gått.
    for (let k = 0; ; k++) {
      const tt = -T_IN + k * DOT;
      if (tt > s + 1e-9) break;
      const [p1, p2] = md.pos(tt);
      const a = shift(p1, tt);
      const b = shift(p2, tt);
      g += circle(a[0], a[1], 2.4, { fill: MOVING, stroke: MOVING, width: 0 });
      g += circle(b[0], b[1], 2.4, { fill: SECOND, stroke: SECOND, width: 0 });
    }

    // Vinkelen mellom banene etter støtet, merket i laben.
    if (view === "lab" && s > 0.25) {
      const c = shift(md.c1, 0);
      const a1 = Math.atan2(-md.v1[1], md.v1[0]);
      const a2 = Math.atan2(-md.n[1], md.n[0]);
      const sp1 = Math.hypot(...md.v1);
      if (sp1 > 1e-6) {
        g += line(c[0], c[1], c[0] + 70 * Math.cos(a2), c[1] + 70 * Math.sin(a2), { color: HINT, width: 1.2, dash: "4 4" });
        if (masses[0] === masses[1]) {
          // rett vinkel: en liten firkant
          const e = 11;
          const p = [c[0] + e * Math.cos(a1), c[1] + e * Math.sin(a1)];
          const q = [c[0] + e * Math.cos(a2), c[1] + e * Math.sin(a2)];
          const r = [p[0] + e * Math.cos(a2), p[1] + e * Math.sin(a2)];
          g += `<path d="M ${p[0].toFixed(1)} ${p[1].toFixed(1)} L ${r[0].toFixed(1)} ${r[1].toFixed(1)} L ${q[0].toFixed(1)} ${q[1].toFixed(1)}" fill="none" stroke="${LABEL}" stroke-width="1.3"/>`;
        } else {
          let d = a1 - a2;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          g += arc(c[0], c[1], 16, a2, a2 + d, { color: LABEL, width: 1.3 });
        }
      }
    }

    // Kulene og massesenteret nå.
    const [p1, p2] = md.pos(s);
    const a = shift(p1, s);
    const b = shift(p2, s);
    g += circle(a[0], a[1], md.r1, { fill: MOVING, stroke: MOVING, width: 0, opacity: 0.9 });
    g += circle(b[0], b[1], md.r2, { fill: SECOND, stroke: SECOND, width: 0, opacity: 0.9 });
    g += txt(a[0], a[1] + 4, "1", { anchor: "middle", fill: "var(--bg)", size: 12 });
    g += txt(b[0], b[1] + 4, "2", { anchor: "middle", fill: "var(--bg)", size: 12 });
    const cm = shift(md.cmAt(s), s);
    g += cross(cm[0], cm[1], DERIVED, 6);

    g += txt(8, 16, view === "lab" ? "laben" : "massesenterets system");
    stage.innerHTML = svg(w, h, g);
  }

  animate({
    stage,
    signal,
    onFrame: (dt) => {
      t += dt;
      if (t > T_IN + T_OUT + T_PAUSE) t = 0;
      render();
    },
  });
  onResize(render);
  render();
}
