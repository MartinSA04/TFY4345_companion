/**
 * Foucaults pendel sett ovenfra, slik den henger over gulvet i et bygg på
 * breddegraden φ. Alt er tegnet i systemet som følger gulvet. Ringen er en
 * gradskive på gulvet med nord opp og øst til høyre, og den rette streken er
 * pendeltråden sett ovenfra, fra punktet rett under opphenget ut til kula.
 *
 * Kula slippes fra ro mot nord. Den stiplede linja er svingeplanet ved
 * slippet, og buen ved ringen viser hvor langt svingeplanet har dreid siden,
 * opp til en hel runde. Sporet er kulas bane de siste sekundene.
 *
 * Bevegelsen er de små utslagene til en pendel med Corioliskraften tatt med,
 * ξ = x + iy, ξ'' = −ω₀²ξ − 2iΩξ', Ω = ω sin φ, integrert med Runge–Kutta.
 * Jordas rotasjon er sterkt overdrevet: på polen går svingeplanet rundt på
 * 30 s, og pendelen svinger fram og tilbake på 1,6 s.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, slider, button, svg, txt, line, circle, arc, poly, rk4, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const W0 = (2 * Math.PI) / 1.6; // pendelens vinkelfrekvens ω₀, rad/s
  const WPOLE = (2 * Math.PI) / 30; // jordas overdrevne ω, rad/s
  const A = 1; // utslaget ved slippet; gradskiva har radius 1,25
  const TRAIL = 5; // sekunder med spor
  const DT = 1 / 240; // integrasjonssteg, s

  let phi = 63; // breddegraden i grader, positiv nord
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let state, t, psi, trail, acc;

  const Omega = () => WPOLE * Math.sin((phi * Math.PI) / 180);
  // y = [x, y, ẋ, ẏ]; ẍ = −ω₀²x + 2Ωẏ, ÿ = −ω₀²y − 2Ωẋ.
  const f = (_, y) => {
    const O = Omega();
    return [y[2], y[3], -W0 * W0 * y[0] + 2 * O * y[3], -W0 * W0 * y[1] - 2 * O * y[2]];
  };

  function release() {
    state = [0, A, 0, 0];
    t = 0;
    psi = 0; // vinkelen svingeplanet har dreid, positiv mot klokka
    trail = [{ t: 0, x: 0, y: A }];
    acc = 0;
  }
  release();

  function step(dt) {
    acc += dt;
    while (acc >= DT) {
      state = rk4(state, f, t, DT);
      t += DT;
      psi -= Omega() * DT;
      acc -= DT;
    }
    trail.push({ t, x: state[0], y: state[1] });
    while (trail.length && trail[0].t < t - TRAIL) trail.shift();
  }

  // ── kontroller ────────────────────────────────────────────────────────────
  const fmt = (v) => (v === 0 ? "0°" : `${Math.abs(v)}° ${v > 0 ? "N" : "S"}`);
  const latSlider = slider({
    text: "Breddegrad φ",
    aria: "Breddegraden der pendelen henger, fra 90 grader sør til 90 grader nord",
    min: -90,
    max: 90,
    step: 1,
    value: phi,
    format: fmt,
    signal,
    onInput: (v) => {
      phi = v;
      release();
      render();
    },
  });
  const again = button("Slipp på nytt", "Slipp kula på nytt fra ro mot nord", () => {
    release();
    render();
  }, signal);
  const playBtn = button(playing ? "Pause" : "Spill av", "Start eller stopp pendelen", () => {
    playing = !playing;
    playBtn.textContent = playing ? "Pause" : "Spill av";
    if (playing) loop.start();
  }, signal);
  controls.append(again, playBtn, latSlider);

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const ring = Math.min(w, h) / 2 - 26; // gradskivens radius, px
    const s = ring / 1.25; // px per utslagsenhet
    const cx = w / 2;
    const cy = h / 2;
    const P = (x, y) => [cx + s * x, cy - s * y];
    let g = "";

    // Gradskiva: ring med streker hver 10°, lengre hver 30°, og himmelretningene.
    g += circle(cx, cy, ring, { stroke: FIXED, width: 2 });
    for (let k = 0; k < 36; k++) {
      const a = (k * Math.PI) / 18;
      const long = k % 3 === 0;
      const r0 = ring - (long ? 9 : 5);
      g += line(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), cx + ring * Math.cos(a), cy + ring * Math.sin(a), { color: FIXED, width: long ? 1.5 : 1 });
    }
    for (const [lab, a] of [
      ["N", -Math.PI / 2],
      ["Ø", 0],
      ["S", Math.PI / 2],
      ["V", Math.PI],
    ]) {
      g += txt(cx + (ring + 13) * Math.cos(a), cy + (ring + 13) * Math.sin(a) + 4, lab, { anchor: "middle", size: 13 });
    }

    // Svingeplanet ved slippet, og buen som viser hvor langt det har dreid.
    g += line(cx, cy - ring, cx, cy + ring, { color: HINT, width: 1.2, dash: "5 5" });
    // Vinkelen planet har dreid siden slippet, med fortegn; buen vokser til en hel runde og starter på nytt.
    const back = psi % (2 * Math.PI);
    if (Math.abs(back) > 0.02) {
      // Skjermvinkler: nord er −π/2, og mot klokka på gulvet er minkende vinkel på skjermen.
      g += arc(cx, cy, ring - 16, -Math.PI / 2, -Math.PI / 2 - back, { color: DERIVED, width: 3 });
      const a1 = -Math.PI / 2 - back;
      g += line(cx + (ring - 24) * Math.cos(a1), cy + (ring - 24) * Math.sin(a1), cx + (ring - 8) * Math.cos(a1), cy + (ring - 8) * Math.sin(a1), { color: DERIVED, width: 2.5 });
    }

    // Sporet, tråden sett ovenfra og kula.
    if (trail.length > 1) {
      const pts = trail.map((p) => P(p.x, p.y));
      g += poly(pts, `stroke="${MOVING}" stroke-width="1.5" stroke-opacity="0.45" stroke-linejoin="round"`);
    }
    const [bx, by] = P(state[0], state[1]);
    g += line(cx, cy, bx, by, { color: FIXED, width: 1.5 });
    g += circle(cx, cy, 3.5, { fill: FIXED, stroke: "none", width: 0 });
    g += circle(bx, by, 9, { fill: MOVING, stroke: "none", width: 0 });

    stage.innerHTML = svg(w, h, g);
  }

  const loop = animate({
    stage,
    signal,
    running: () => playing,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
  // Uten animasjon vises de første ti sekundene.
  if (!playing) for (let i = 0; i < 600; i++) step(1 / 60);
  onResize(render);
  render();
}
