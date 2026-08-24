/**
 * Potensialkurven V(x) = ½kx² + ¼λx⁴ med energilinje, vendepunkter og
 * likevektspunkter.
 *
 * Glidebryterne styrer de to koeffisientene i potensialet og partikkelens
 * energi. Skyggen er det klassisk tillatte området V(x) ≤ E, og markørene på
 * kurven er nullpunktene til V′. Utfylt markør betyr V″ > 0 (stabil), åpen ring
 * betyr V″ < 0 (ustabil). Når k skifter fortegn går den ene brønnen over i to, og
 * likevekten i origo blir ustabil.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize }. Fargene er sidens egne CSS-variabler, så figuren bytter tema selv.
 */
export default function init({ stage, controls, getSize, onResize }) {
  const XMIN = -3;
  const XMAX = 3;
  const N = 240; // punkter langs kurven

  let k = 2;
  let lam = 1;
  let E = 0.6;

  const V = (x) => 0.5 * k * x * x + 0.25 * lam * x * x * x * x;
  const V2 = (x) => k + 3 * lam * x * x; // V″(x)

  const nb = (x, n = 2) => x.toFixed(n).replace(".", ",");

  function slider(text, min, max, step, value, aria) {
    const label = document.createElement("label");
    label.append(text + " ");
    const out = document.createElement("output");
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.setAttribute("aria-label", aria);
    label.append(out, input);
    return { label, input, out };
  }

  const kC = slider("Koeffisient k", -4, 4, 0.25, k, "Koeffisienten k i potensialet");
  const lC = slider("Koeffisient λ", 0, 2, 0.25, lam, "Koeffisienten lambda i potensialet");
  const eC = slider("Energi E", -4, 6, 0.2, E, "Partikkelens energi E");

  controls.append(kC.label, lC.label, eC.label);

  // Likevektspunktene: V′(x) = x(k + λx²) = 0.
  function equilibria() {
    const pts = [0];
    if (lam > 0 && k < 0) {
      const r = Math.sqrt(-k / lam);
      if (r < XMAX) pts.push(-r, r);
    }
    return pts.sort((a, b) => a - b);
  }

  function render() {
    const { w, h } = getSize();
    const padL = 34;
    const padR = 14;
    const padT = 14;
    const padB = 26;
    const pw = Math.max(40, w - padL - padR);
    const ph = Math.max(40, h - padT - padB);

    // Prøv kurven, og la den vertikale skalaen dekke både kurven og E.
    const xs = [];
    const vs = [];
    for (let i = 0; i <= N; i++) {
      const x = XMIN + ((XMAX - XMIN) * i) / N;
      xs.push(x);
      vs.push(V(x));
    }
    let vmin = Math.min(E, ...vs);
    let vmax = Math.max(E, ...vs);
    if (vmax - vmin < 1e-6) vmax = vmin + 1;
    const pad = 0.12 * (vmax - vmin);
    vmin -= pad;
    vmax += pad;

    const px = (x) => padL + ((x - XMIN) / (XMAX - XMIN)) * pw;
    const py = (val) => padT + (1 - (val - vmin) / (vmax - vmin)) * ph;

    // Kurven.
    let d = "";
    for (let i = 0; i <= N; i++) {
      d += `${i === 0 ? "M" : "L"} ${px(xs[i]).toFixed(1)} ${py(vs[i]).toFixed(1)} `;
    }

    // Klassisk tillatte intervaller: sammenhengende biter der V(x) ≤ E.
    let shade = "";
    const turning = [];
    let start = null;
    for (let i = 0; i <= N; i++) {
      const inside = vs[i] <= E;
      if (inside && start === null) start = i;
      if ((!inside || i === N) && start !== null) {
        const end = inside ? i : i - 1;
        let seg = `M ${px(xs[start]).toFixed(1)} ${py(E).toFixed(1)} L ${px(xs[end]).toFixed(1)} ${py(E).toFixed(1)} `;
        for (let j = end; j >= start; j--) {
          seg += `L ${px(xs[j]).toFixed(1)} ${py(vs[j]).toFixed(1)} `;
        }
        shade += seg + "Z ";
        start = null;
      }
      // Vendepunkt der V − E skifter fortegn, funnet ved lineær interpolasjon.
      if (i > 0 && vs[i - 1] !== vs[i] && (vs[i - 1] - E) * (vs[i] - E) < 0) {
        const f = (E - vs[i - 1]) / (vs[i] - vs[i - 1]);
        turning.push(xs[i - 1] + f * (xs[i] - xs[i - 1]));
      }
    }

    const yZero = py(0);
    const xZero = px(0);

    let marks = "";
    for (const x0 of equilibria()) {
      const stable = V2(x0) > 0;
      const cx = px(x0).toFixed(1);
      const cy = py(V(x0)).toFixed(1);
      // Formen bærer betydningen, fargen gjentar den: utfylt = stabil, åpen = ustabil.
      marks += stable
        ? `<circle cx="${cx}" cy="${cy}" r="5.5" style="fill:var(--green);stroke:var(--bg-elevated);stroke-width:1.5"/>`
        : `<circle cx="${cx}" cy="${cy}" r="5.5" style="fill:var(--bg-elevated);stroke:var(--red);stroke-width:2.5"/>`;
    }
    for (const xt of turning) {
      marks +=
        `<line x1="${px(xt).toFixed(1)}" y1="${(py(E) - 7).toFixed(1)}" x2="${px(xt).toFixed(1)}" y2="${(py(E) + 7).toFixed(1)}" stroke="var(--orange)" stroke-width="2"/>`;
    }

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">` +
      `<path d="${shade}" style="fill:var(--accent)" opacity="0.13"/>` +
      // Akser.
      `<line x1="${padL}" y1="${yZero.toFixed(1)}" x2="${(padL + pw).toFixed(1)}" y2="${yZero.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>` +
      `<line x1="${xZero.toFixed(1)}" y1="${padT}" x2="${xZero.toFixed(1)}" y2="${(padT + ph).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>` +
      // Energilinja.
      `<line x1="${padL}" y1="${py(E).toFixed(1)}" x2="${(padL + pw).toFixed(1)}" y2="${py(E).toFixed(1)}" stroke="var(--orange)" stroke-width="1.5" stroke-dasharray="5 4"/>` +
      `<text x="${(padL + pw - 2).toFixed(1)}" y="${(py(E) - 6).toFixed(1)}" text-anchor="end" style="fill:var(--orange);font-family:var(--font-mono);font-size:12px">E</text>` +
      // Kurven.
      `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>` +
      marks +
      `<text x="4" y="${(padT + 10).toFixed(1)}" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">V(x)</text>` +
      `<text x="${(padL + pw).toFixed(1)}" y="${(padT + ph + 18).toFixed(1)}" text-anchor="end" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">x</text>` +
      `</svg>`;

    kC.out.textContent = nb(k, 2);
    lC.out.textContent = nb(lam, 2);
    eC.out.textContent = nb(E, 1);
  }

  kC.input.addEventListener("input", () => {
    k = Number(kC.input.value);
    render();
  });
  lC.input.addEventListener("input", () => {
    lam = Number(lC.input.value);
    render();
  });
  eC.input.addEventListener("input", () => {
    E = Number(eC.input.value);
    render();
  });

  onResize(render);
  render();
}
