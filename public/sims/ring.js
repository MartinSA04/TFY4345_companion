/**
 * Perler på en ring: N like perler glir uten friksjon på en sirkelformet ring,
 * og like fjærer langs ringen forbinder hver perle med de to naboene. De små
 * strekene på ringen er hvilestillingene. En normalmode er en bølge rundt
 * ringen, θ_j = A cos(jφ − ωt), der faseforskjellen mellom naboer er
 * φ = 2πp/N og ω = 2ω₀|sin(φ/2)|. «Står» (standard) viser modene, stående
 * bølger: cos jφ for p under N/2, sin jφ for p over N/2 og cos jφ for p = N/2,
 * så p og N − p er de to modene med samme frekvens. «Løper» viser bølgen
 * cos(jφ − ωt), summen av de to med en kvart svingning mellom seg; for p over
 * N/2 går den med klokka. p = 0 er hele ringen som glir rundt med konstant fart.
 *
 * Fjærene har like mange tagger uansett lengde, så tettheten viser om de er
 * strukket eller trykt sammen. Under er ω tegnet mot φ fra
 * 0 til 2π, med en prikk for hver av de N modene og den valgte i oransje. Den
 * stiplede linja er ω = ω₀φ, der lange bølger ligger.
 *
 * Utslagene er forstørret (35 % av avstanden mellom perlene). Kontrakt:
 * default-eksportert init(api), api = { stage, controls, getSize, onResize,
 * signal }.
 */
import {
  slider, button, animate, svg, txt, line, circle, poly, DERIVED, FIXED, HINT, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const W0 = 2.2; // ω₀ i rad/s på skjermen
  const DRIFT = 0.25; // rad/s for p = 0
  let N = 3;
  let p = 1;
  let standing = true;
  let t = 0;

  const phi = () => (2 * Math.PI * p) / N;
  const omega = (ph) => 2 * W0 * Math.abs(Math.sin(ph / 2));
  const amp = () => Math.min(0.6, 0.35 * ((2 * Math.PI) / N));

  // Utslaget til perle s. For p over N/2 er p − N den samme bølgen, og den går med klokka.
  function shape(sPos) {
    if (p === 0) return 0;
    const pp = 2 * p > N ? p - N : p;
    const ph = (2 * Math.PI * pp) / N;
    const w = omega(phi());
    if (!standing) return amp() * Math.cos(sPos * ph - w * t);
    // Moden: cos jφ for p ≤ N/2 og sin jφ for p over N/2, så p og N − p er de to degenererte.
    const sp = 2 * p <= N ? Math.cos(sPos * ph) : Math.sin(sPos * ph);
    return amp() * sp * Math.cos(w * t);
  }
  const theta = (j) => (p === 0 ? DRIFT * t : shape(j));

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const panelH = Math.min(130, h * 0.32);
    const ringH = h - panelH;
    const R = Math.max(30, Math.min(w / 2 - 44, ringH / 2 - 30));
    const cx = w / 2;
    const cy = ringH / 2 + 4;
    // Vinkel på skjermen for plassen s: perle 0 øverst, positiv retning mot klokka.
    const ang = (s) => Math.PI / 2 + (2 * Math.PI * s) / N;
    const P = (a, r = R) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    let g = "";

    g += circle(cx, cy, R, { stroke: FIXED, width: 1.4 });
    // Hvilestillingene.
    for (let j = 0; j < N; j++) {
      const a = ang(j);
      const [x0, y0] = P(a, R - 6);
      const [x1, y1] = P(a, R + 6);
      g += line(x0, y0, x1, y1, { color: HINT, width: 1.2 });
    }
    // Perlenes vinkler på skjermen.
    const pos = [];
    for (let j = 0; j < N; j++) pos.push(ang(j) + theta(j));
    // Fjærene langs ringen, like mange tagger uansett lengde, så tettheten viser strekket.
    const br = Math.max(5, Math.min(8, (Math.PI * R) / N / 4));
    for (let j = 0; j < N; j++) {
      let a0 = pos[j];
      let a1 = pos[(j + 1) % N];
      while (a1 <= a0) a1 += 2 * Math.PI;
      const gap = br / R;
      const s0 = a0 + gap;
      const s1 = a1 - gap;
      if (s1 <= s0) continue;
      const pts = [P(s0)];
      // Taggene står om lag 12 px fra hverandre i hvile, så tettheten viser om fjæra er strukket eller trykt sammen.
      const n = Math.max(4, Math.round((2 * Math.PI * R) / N / 12));
      const lead = Math.min(0.15 * (s1 - s0), 6 / R);
      pts.push(P(s0 + lead));
      for (let i = 1; i < 2 * n; i++) {
        const a = s0 + lead + ((s1 - s0 - 2 * lead) * i) / (2 * n);
        pts.push(P(a, R + (i % 2 ? 4.5 : -4.5)));
      }
      pts.push(P(s1 - lead), P(s1));
      g += poly(pts, `stroke="${LABEL}" stroke-width="1.2" stroke-linejoin="round"`);
    }
    for (let j = 0; j < N; j++) {
      const [x, y] = P(pos[j]);
      g += circle(x, y, br, { fill: MOVING, stroke: "none" });
    }
    g += txt(cx, cy + 4, `N = ${N}`, { anchor: "middle" });

    // ── ω mot φ ──
    const left = 34;
    const right = w - 14;
    const ptop = ringH + 14;
    const pbot = h - 20;
    const X = (ph) => left + (ph / (2 * Math.PI)) * (right - left);
    const Y = (om) => pbot - (om / (2 * W0)) * (pbot - ptop);
    g += line(left, pbot, right, pbot, { width: 1.2 });
    g += line(left, pbot, left, ptop - 4, { width: 1.2 });
    g += txt(left - 6, ptop + 4, "2ω₀", { anchor: "end", size: 11 });
    g += line(left - 3, Y(2 * W0), left + 3, Y(2 * W0), { width: 1.2 });
    g += txt(left - 6, (ptop + pbot) / 2 + 4, "ω", { anchor: "end" });
    for (const [ph, lab] of [[0, "0"], [Math.PI, "π"], [2 * Math.PI, "2π"]]) {
      g += line(X(ph), pbot - 3, X(ph), pbot + 3, { width: 1.2 });
      g += txt(X(ph), pbot + 15, lab, { anchor: ph === 2 * Math.PI ? "end" : "middle", size: 11 });
    }
    g += txt((X(0) + X(Math.PI)) / 2, pbot + 15, "φ", { anchor: "middle" });
    // Lydlinjene ω = ω₀φ og speilbildet om π.
    const lim = 1.9;
    g += line(X(0), Y(0), X(lim), Y(W0 * lim), { color: HINT, dash: "4 4", width: 1.2 });
    g += line(X(2 * Math.PI), Y(0), X(2 * Math.PI - lim), Y(W0 * lim), { color: HINT, dash: "4 4", width: 1.2 });
    const curve = [];
    for (let i = 0; i <= 120; i++) {
      const ph = (2 * Math.PI * i) / 120;
      curve.push([X(ph), Y(omega(ph))]);
    }
    g += poly(curve, `stroke="${FIXED}" stroke-width="1.6"`);
    for (let q = 0; q < N; q++) {
      const ph = (2 * Math.PI * q) / N;
      const chosen = q === p;
      g += circle(X(ph), Y(omega(ph)), chosen ? 5.5 : 3.5, { fill: chosen ? DERIVED : LABEL, stroke: "none" });
    }
    stage.innerHTML = svg(w, h, g);
  }

  const pSlider = slider({
    text: "Mode p",
    aria: "Hvilken mode: antall bølgelengder rundt ringen",
    min: 0,
    max: N - 1,
    step: 1,
    value: p,
    format: (v) => String(v),
    signal,
    onInput: (v) => {
      p = v;
      t = 0;
      render();
    },
  });
  const pInput = pSlider.querySelector("input");
  const pOut = pSlider.querySelector("output");
  const nSlider = slider({
    text: "Antall perler N",
    aria: "Antall perler på ringen",
    min: 2,
    max: 16,
    step: 1,
    value: N,
    format: (v) => String(v),
    signal,
    onInput: (v) => {
      N = v;
      p = Math.min(p, N - 1);
      pInput.max = String(N - 1);
      pInput.value = String(p);
      pOut.textContent = String(p);
      t = 0;
      render();
    },
  });
  function toggle(text, aria, pressed, onClick) {
    const b = button(text, aria, onClick, signal);
    b.setAttribute("aria-pressed", String(pressed));
    return b;
  }
  const standBtn = toggle("Står", "Vis moden, en stående bølge", true, () => setStanding(true));
  const runBtn = toggle("Løper", "Vis bølgen som løper rundt ringen, summen av de to modene med samme frekvens", false, () => setStanding(false));
  function setStanding(on) {
    standing = on;
    runBtn.setAttribute("aria-pressed", String(!on));
    standBtn.setAttribute("aria-pressed", String(on));
    t = 0;
    render();
  }
  controls.append(nSlider, pSlider, standBtn, runBtn);

  animate({
    stage,
    signal,
    onFrame: (dt) => {
      t += dt;
      render();
    },
  });
  onResize(render);
  render();
}
