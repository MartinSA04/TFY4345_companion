/**
 * Ledningen: ei ledning med positive ioner og ledningselektroner, og et
 * elektron utenfor ledningen som går parallelt med den. I laboratoriet står
 * ionene i ro, og elektronene i ledningen og elektronet utenfor går like fort,
 * med farten v = 0,6c mot høyre. Ledningen er nøytral der: ionene og
 * elektronene står like tett. Du velger hvor fort du selv beveger deg langs
 * ledningen, og alt tegnes i ditt eget system.
 *
 * I systemet ditt, med farten w:
 * - ionene har farten −w og avstanden a/γ_w,
 * - elektronene har farten v′ = (v − w)/(1 − vw) og avstanden a/(γ_w(1 − vw)),
 *   siden de har avstanden aγ_v i sitt eget system,
 * - ladningen per lengde er λ = γ_w v w · e/a, og strømmen γ_w v · e/a mot venstre,
 *   akkurat det firerstrømmen gir.
 * Kreftene på elektronet utenfor, i enheter av e²/(2πε₀ a r):
 *   elektrisk  γ_w v w       (mot ledningen når λ > 0),
 *   magnetisk  γ_w v v′      (mot ledningen når elektronet går mot høyre).
 * Summen er γ_v v²/γ_{v′}, alltid mot ledningen. Pilene står etter hverandre,
 * den elektriske først, så spissen til den siste viser summen.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, svg, txt, line, circle, arrow, nb, FIXED, MOVING, DERIVED, LABEL } from "./_mekanikk.js";

const MAGNETIC = "var(--indigo)";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const V = 0.6; // farten til elektronene i laboratoriet, i enheter av c
  const A = 28; // avstanden mellom ionene i ro, og mellom elektronene i laboratoriet, i px
  const CPX = 110; // lysfarten på skjermen, px per sekund (sakte film)
  const WMIN = -0.6;
  const WMAX = 0.8;

  let w = 0; // din fart, i enheter av c
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let phaseIon = 0;
  let phaseEl = A / 2;
  let xe = null; // elektronet utenfor; settes midt på ved første tegning

  // ── kontroller ────────────────────────────────────────────────────────────
  const label = document.createElement("label");
  label.append("Din fart ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(WMIN);
  input.max = String(WMAX);
  input.step = "0.01";
  input.value = "0";
  input.setAttribute("aria-label", "Din fart langs ledningen, i enheter av lysfarten");
  label.append(out, input);
  const show = () => {
    const s = `${nb(w, 2)}c`.replace("-", "−");
    out.textContent = Math.abs(w) < 0.005 ? `${s}, som ionene` : Math.abs(w - V) < 0.005 ? `${s}, som elektronene` : s;
  };
  input.addEventListener(
    "input",
    () => {
      w = Number(input.value);
      show();
      render();
    },
    { signal },
  );
  show();
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "sim-btn";
  playBtn.textContent = playing ? "Pause" : "Spill av";
  controls.append(label, playBtn);

  // ── fysikk ────────────────────────────────────────────────────────────────
  function state() {
    const gw = 1 / Math.sqrt(1 - w * w);
    const ve = (V - w) / (1 - V * w); // elektronene i ledningen og elektronet utenfor
    return {
      vIon: -w,
      vEl: ve,
      sIon: A / gw,
      sEl: A / (gw * (1 - V * w)),
      lambda: gw * V * w,
      fE: gw * V * w, // positiv = mot ledningen
      fB: gw * V * ve,
    };
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w: W, h: H } = getSize();
    if (W < 60 || H < 60) return; // før scenen har fått mål
    if (xe === null) xe = W / 2;
    const st = state();
    let g = "";

    // Ledningen, med ionene på den øverste rekka og elektronene på den nederste.
    const yT = H - 76;
    const yB = H - 42;
    g += `<rect x="-4" y="${yT}" width="${W + 8}" height="${yB - yT}" rx="6" style="fill:var(--bg-elevated)" stroke="${FIXED}" stroke-width="1.5"/>`;
    const yIon = yT + 10;
    const yEl = yB - 9;
    const row = (phase, s, draw) => {
      const p = ((phase % s) + s) % s;
      let r = "";
      for (let x = p - s; x <= W + s; x += s) r += draw(x);
      return r;
    };
    g += row(phaseIon, st.sIon, (x) =>
      circle(x, yIon, 6, { stroke: LABEL, width: 1.4 }) +
      line(x - 3.2, yIon, x + 3.2, yIon, { color: LABEL, width: 1.4 }) +
      line(x, yIon - 3.2, x, yIon + 3.2, { color: LABEL, width: 1.4 }),
    );
    g += row(phaseEl, st.sEl, (x) => circle(x, yEl, 4.5, { fill: MOVING, stroke: "none" }));

    // Under ledningen: strømmen går mot venstre i alle systemer, og ladningen per lengde.
    const yNote = H - 16;
    g += txt(10, yNote + 4, "I", { size: 13 });
    g += arrow(48, yNote, 20, yNote, LABEL, 1.5);
    const charge = Math.abs(w) < 0.005 ? "nøytral" : st.lambda > 0 ? "positivt ladd" : "negativt ladd";
    g += txt(W - 10, yNote + 4, `ledningen: ${charge}`, { anchor: "end", size: 13 });

    // Elektronet utenfor, med den elektriske og den magnetiske kraften etter hverandre.
    const S = Math.min(156, (yT - 30) / 1.25); // px per enhet kraft
    const ye = Math.max(24 + 0.45 * S, 30);
    const ex = xe;
    const tipE = ye + st.fE * S;
    const opposite = st.fE * st.fB < 0 && Math.abs(st.fE * S) > 4;
    const xB = opposite ? ex + 7 : ex;
    const tipB = tipE + st.fB * S;
    const tag = (x, y, s, color, side) => {
      const wt = 7.3 * s.length;
      const left = side < 0 ? x - 10 - wt > 2 : x + 10 + wt > W - 2;
      return txt(left ? x - 10 : x + 10, y + 4, s, { fill: color, anchor: left ? "end" : "start" });
    };
    if (Math.abs(st.fE * S) > 4) {
      g += arrow(ex, ye, ex, tipE, DERIVED, 2.4);
      g += tag(ex, (ye + tipE) / 2, "elektrisk", DERIVED, -1);
    }
    if (Math.abs(st.fB * S) > 4) {
      g += arrow(xB, tipE, xB, tipB, MAGNETIC, 2.4);
      g += tag(xB, (tipE + tipB) / 2, "magnetisk", MAGNETIC, 1);
    }
    g += circle(ex, ye, 6, { fill: MOVING, stroke: "none" });

    stage.innerHTML = svg(W, H, g);
  }

  // ── animasjon ─────────────────────────────────────────────────────────────
  onResize(render);
  render();
  const loop = animate({
    stage,
    signal,
    running: () => playing,
    onFrame: (dt) => {
      const { w: W } = getSize();
      const st = state();
      phaseIon += st.vIon * CPX * dt;
      phaseEl += st.vEl * CPX * dt;
      if (xe !== null && W > 0) {
        xe += st.vEl * CPX * dt;
        if (xe > W + 10) xe -= W + 20;
        if (xe < -10) xe += W + 20;
      }
      render();
    },
  });
  playBtn.addEventListener(
    "click",
    () => {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Spill av";
      if (playing) loop.start();
    },
    { signal },
  );
}
