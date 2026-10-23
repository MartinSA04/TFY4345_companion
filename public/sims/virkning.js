/**
 * Virkningen for en kastet ball: ballen forlater hånden ved t = 0 og er
 * tilbake i hånden ved t = 2 s. Prøvebanene er
 *
 *   z(t) = h · 4t(T − t)/T² + a · sin(2πt/T),
 *
 * altså en parabel med høyden h midtveis og en bølge med utslag a som gjør
 * banen skjev. Alle går gjennom de to faste hendelsene. Til venstre for
 * tidsaksen går ballen selv opp og ned langs prøvebanen i virkelig tid.
 * Til høyre er virkningen S tegnet mot høyden midtveis, på den samme
 * høydeaksen: kurven er S for alle parabler med den valgte skjevheten, og
 * prikken er prøvebanen. Med L = T − V ligger bunnen av kurven i høyden til
 * den virkelige ballen, 4,9 m; med L = T + V ligger den i −4,9 m.
 *
 * For disse banene er (med m = 1)
 *   ∫T dt = 8h²/3T + π²a²/T,   ∫V dt = 2ghT/3,
 * så S = ∫T dt ∓ ∫V dt, og bølgen bidrar bare til den kinetiske delen.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }. Fargene er sidens egne CSS-variabler.
 */
import { nb, slider, button, animate, svg, txt, line, circle, poly, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const T = 2; // s, tida ballen er i lufta
  const G = 9.8; // m/s²
  const ZMIN = -8;
  const ZMAX = 12;
  const PAUSE = 0.7; // s mellom hver gjennomkjøring
  const SMIN = -40;
  const SMAX = 130;

  let h = 2; // høyden midtveis, m
  let a = 0; // bølgens utslag, m
  let sign = -1; // L = T + sign·V
  let tAnim = 0;

  const zTrue = (t) => 0.5 * G * t * (T - t);
  const zTrial = (t) => (h * 4 * t * (T - t)) / (T * T) + a * Math.sin((2 * Math.PI * t) / T);
  const action = (hh) => (8 * hh * hh) / (3 * T) + (Math.PI * Math.PI * a * a) / T + sign * ((2 * G * hh * T) / 3);

  // ── kontroller ────────────────────────────────────────────────────────────
  const hSlider = slider({
    text: "Høyde midtveis",
    aria: "Høyden til prøvebanen midt i kastet",
    min: -6,
    max: 10,
    step: 0.1,
    value: h,
    format: (v) => `${nb(v)} m`,
    signal,
    onInput: (v) => {
      h = v;
      render();
    },
  });
  const aSlider = slider({
    text: "Skjevhet",
    aria: "Utslaget til bølgen som gjør prøvebanen skjev",
    min: -3,
    max: 3,
    step: 0.1,
    value: a,
    format: (v) => `${nb(v)} m`,
    signal,
    onInput: (v) => {
      a = v;
      render();
    },
  });
  const minus = button("L = T − V", "Regn virkningen med L = T − V", () => setSign(-1), signal);
  const plus = button("L = T + V", "Regn virkningen med L = T + V", () => setSign(1), signal);
  function setSign(s) {
    sign = s;
    minus.setAttribute("aria-pressed", String(s === -1));
    plus.setAttribute("aria-pressed", String(s === 1));
    render();
  }
  setSign(-1);
  controls.append(hSlider, aSlider, minus, plus);

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w, h: H } = getSize();
    if (w < 60 || H < 60) return;
    const padT = 16;
    const padB = 34;
    const colW = 30; // søylen der ballen selv går opp og ned
    const axL = colW + 26; // plass til høydeetikettene
    const sW = Math.max(84, Math.min(150, 0.3 * w));
    const gap = 14;
    const pw = Math.max(60, w - axL - gap - sW - 6);
    const ph = Math.max(60, H - padT - padB);
    const px = (t) => axL + (t / T) * pw;
    const pz = (z) => padT + (1 - (z - ZMIN) / (ZMAX - ZMIN)) * ph;
    const sx0 = axL + pw + gap;
    const ps = (s) => sx0 + ((s - SMIN) / (SMAX - SMIN)) * sW;
    const clip = (z) => Math.max(ZMIN, Math.min(ZMAX, z));

    let g = "";
    g += `<defs><clipPath id="vk-plot"><rect x="${axL}" y="${padT}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}"/></clipPath>`;
    g += `<clipPath id="vk-s"><rect x="${sx0}" y="${padT}" width="${sW.toFixed(1)}" height="${ph.toFixed(1)}"/></clipPath></defs>`;

    // Høydeakse med merker, og hånden i høyde 0.
    for (const z of [-5, 0, 5, 10]) {
      g += line(axL - 4, pz(z), axL, pz(z), { color: LABEL, width: 1 });
      g += txt(axL - 7, pz(z) + 4, z === 10 ? "10 m" : String(z), { anchor: "end", size: 11 });
    }
    g += line(axL, padT, axL, padT + ph, { color: HINT, width: 1 });
    g += line(axL, pz(0), axL + pw, pz(0), { color: HINT, width: 1 });
    // Tidsakse nederst.
    const yB = padT + ph;
    for (const t of [0, 1, 2]) {
      g += line(px(t), yB, px(t), yB + 4, { color: LABEL, width: 1 });
      g += txt(px(t), yB + 16, t === 2 ? "2 s" : String(t), { anchor: "middle", size: 11 });
    }
    g += txt(axL + pw / 2, yB + 30, "t", { anchor: "middle", size: 12 });

    // Søylen: ballen selv over hånden.
    const cx = colW / 2 + 2;
    g += line(cx - 9, pz(0) + 7, cx + 9, pz(0) + 7, { color: FIXED, width: 3 });

    // Banene.
    const pts = (f) => {
      const out = [];
      for (let i = 0; i <= 160; i++) {
        const t = (T * i) / 160;
        out.push([px(t), pz(f(t))]);
      }
      return out;
    };
    g += `<g clip-path="url(#vk-plot)">`;
    g += poly(pts(zTrue), `stroke="${LABEL}" stroke-width="1.5" stroke-dasharray="5 4"`);
    g += poly(pts(zTrial), `stroke="${MOVING}" stroke-width="2.5"`);
    g += `</g>`;
    // De to faste hendelsene.
    g += circle(px(0), pz(0), 4.5, { fill: FIXED, stroke: "none" });
    g += circle(px(T), pz(0), 4.5, { fill: FIXED, stroke: "none" });

    // Midtpunktet på prøvebanen og linja over til virkningskurven.
    const zMid = h;
    const sNow = action(h);
    const sDot = Math.max(SMIN, Math.min(SMAX, sNow));
    g += line(px(T / 2), pz(zMid), ps(sDot), pz(zMid), { color: HINT, width: 1, dash: "2 3" });
    g += circle(px(T / 2), pz(zMid), 4, { fill: "var(--bg-elevated)", stroke: MOVING, width: 2 });

    // Virkningen mot høyden midtveis.
    g += line(sx0, padT, sx0, yB, { color: HINT, width: 1 });
    const sCurve = [];
    for (let i = 0; i <= 120; i++) {
      const hh = ZMIN + ((ZMAX - ZMIN) * i) / 120;
      sCurve.push([ps(action(hh)), pz(hh)]);
    }
    g += `<g clip-path="url(#vk-s)">`;
    g += poly(sCurve, `stroke="${DERIVED}" stroke-width="2"`);
    g += `</g>`;
    if (sNow <= SMAX) g += circle(ps(sNow), pz(zMid), 5, { fill: DERIVED, stroke: "none" });
    else {
      // S er større enn panelet viser: en pil ved kanten i stedet for prikken.
      const xe = sx0 + sW;
      const ye = pz(zMid);
      g += `<path d="M ${(xe - 9).toFixed(1)} ${(ye - 6).toFixed(1)} L ${xe.toFixed(1)} ${ye.toFixed(1)} L ${(xe - 9).toFixed(1)} ${(ye + 6).toFixed(1)} Z" style="fill:${DERIVED}"/>`;
    }
    g += txt(sx0 + 4, yB + 16, "S →", { size: 12, fill: DERIVED });

    // Ballen, som går langs prøvebanen.
    const tb = Math.min(tAnim, T);
    const zb = clip(zTrial(tb));
    g += line(cx, pz(zb), px(tb), pz(zb), { color: HINT, width: 1, dash: "1 4" });
    g += circle(cx, pz(zb), 6.5, { fill: MOVING, stroke: "none" });
    g += circle(px(tb), pz(zb), 3.5, { fill: MOVING, stroke: "none" });

    stage.innerHTML = svg(w, H, g);
  }

  animate({
    stage,
    signal,
    onFrame: (dt) => {
      tAnim += dt;
      if (tAnim > T + PAUSE) tAnim = 0;
      render();
    },
  });
  onResize(render);
  render();
}
