/**
 * Stasjonær virkning: prøvebaner for en ball kastet rett opp.
 *
 * Et drag i diagrammet former en prøvebane y(t) mellom de to faste
 * endepunktene: banen bules mot fingeren rundt punktet du drar i. Den stiplede
 * kurven er den virkelige banen. Søylen til høyre viser S − S*, hvor mye mer
 * virkning prøvebanen har enn den virkelige; førsteordensbidraget er null, så
 * nær den virkelige banen rører søylen seg knapt.
 *
 * Enheter: m = 1, g = 1, T = 2, så y*(t) = t(T − t)/2 og
 * S − S* = ½∫η̇² dt for avviket η(t).
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }. Fargene er sidens egne CSS-variabler, så figuren bytter
 * tema selv.
 */
export default function init({ stage, controls, getSize, onResize, signal }) {
  const T = 2; // kastets varighet
  const N = 240; // punkter langs kurven
  const W = 0.35; // bulens bredde
  const YMIN = -0.75;
  const YMAX = 1.55;
  const DSMAX = 2.6; // søylens toppverdi, funnet numerisk fra maksimalt drag

  const ytrue = (t) => 0.5 * t * (T - t);
  const win = (t) => (t * (T - t)) / ((T * T) / 4); // nuller avviket i endepunktene

  // Bulen: senter t0 og utslag d, altså q(t0) − y*(t0).
  let t0 = 0.7;
  let d = 0.25;

  const eta = (t) => {
    const u = (t - t0) / W;
    return (d / win(t0)) * Math.exp(-u * u) * win(t);
  };
  const q = (t) => ytrue(t) + eta(t);

  // S − S* = ½∫η̇² dt: førsteordensleddet forsvinner fordi y* løser
  // bevegelsesligningen og η er null i endepunktene.
  function deltaS() {
    let s = 0;
    const n = 300;
    const h = 1e-5;
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) * T) / n;
      const ed = (eta(t + h) - eta(t - h)) / (2 * h);
      s += 0.5 * ed * ed * (T / n);
    }
    return s;
  }

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "sim-btn";
  resetBtn.textContent = "Til virkelig bane";
  resetBtn.setAttribute("aria-label", "Legg prøvebanen oppå den virkelige banen");
  controls.append(resetBtn);

  // ── tegning ───────────────────────────────────────────────────────────────
  let geom = null; // px-avbildningen fra siste render, brukt av drag-handleren

  function render() {
    const { w, h } = getSize();
    const padL = 30;
    const padR = 46; // plass til søylen
    const padT = 14;
    const padB = 26;
    const pw = Math.max(40, w - padL - padR);
    const ph = Math.max(40, h - padT - padB);

    const px = (t) => padL + (t / T) * pw;
    const py = (y) => padT + (1 - (y - YMIN) / (YMAX - YMIN)) * ph;
    geom = { padL, pw, padT, ph };

    const curve = (f) => {
      let dd = "";
      for (let i = 0; i <= N; i++) {
        const t = (T * i) / N;
        dd += `${i === 0 ? "M" : "L"} ${px(t).toFixed(1)} ${py(f(t)).toFixed(1)} `;
      }
      return dd;
    };

    const yZero = py(0);
    let g = "";
    // Tidsaksen gjennom endepunktene.
    g += `<line x1="${padL}" y1="${yZero.toFixed(1)}" x2="${(padL + pw).toFixed(1)}" y2="${yZero.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;

    // Virkelig bane, stiplet, og prøvebanen oppå.
    g += `<path d="${curve(ytrue)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    g += `<path d="${curve(q)}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;

    // Faste endepunkter og håndtaket der det sist ble dratt.
    g += `<circle cx="${px(0).toFixed(1)}" cy="${yZero.toFixed(1)}" r="4.5" style="fill:var(--muted)"/>`;
    g += `<circle cx="${px(T).toFixed(1)}" cy="${yZero.toFixed(1)}" r="4.5" style="fill:var(--muted)"/>`;
    g += `<circle cx="${px(t0).toFixed(1)}" cy="${py(q(t0)).toFixed(1)}" r="5.5" style="fill:var(--accent);stroke:var(--bg-elevated);stroke-width:1.5"/>`;

    // Søylen: S − S* fra null og opp, med rammen som fast skala.
    const bx = padL + pw + 18;
    const bw = 10;
    const frac = Math.min(1, deltaS() / DSMAX);
    const bh = frac * ph;
    g += `<rect x="${bx}" y="${padT}" width="${bw}" height="${ph}" rx="3" fill="none" stroke="var(--border)" stroke-width="1"/>`;
    if (bh > 0.5) {
      g += `<rect x="${bx}" y="${(padT + ph - bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="3" style="fill:var(--orange)"/>`;
    }
    g += `<text x="${bx + bw / 2}" y="${(padT + ph + 18).toFixed(1)}" text-anchor="middle" style="fill:var(--orange);font-family:var(--font-mono);font-size:12px">S−S*</text>`;

    // Etiketter.
    g += `<text x="${padL + 4}" y="${padT + 10}" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">y(t)</text>`;
    g += `<text x="${(padL + pw - 4).toFixed(1)}" y="${(yZero + 18).toFixed(1)}" text-anchor="end" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">t</text>`;
    if (Math.abs(d) < 0.02) {
      g += `<text x="${(padL + pw / 2).toFixed(1)}" y="${(py(YMAX) + 26).toFixed(1)}" text-anchor="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">Dra i kurven for å prøve en annen bane</text>`;
    }

    stage.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block;touch-action:none;user-select:none;-webkit-user-select:none">${g}</svg>`;
  }

  // ── drag ──────────────────────────────────────────────────────────────────
  let dragging = false;

  function applyDrag(e) {
    if (!geom) return;
    const rect = stage.getBoundingClientRect();
    let t = (((e.clientX - rect.left) - geom.padL) / geom.pw) * T;
    t = Math.max(0.25, Math.min(T - 0.25, t));
    const y = YMIN + (1 - (e.clientY - rect.top - geom.padT) / geom.ph) * (YMAX - YMIN);
    t0 = t;
    d = Math.max(-0.65, Math.min(0.9, y - ytrue(t)));
    render();
  }

  stage.style.cursor = "grab";
  stage.addEventListener(
    "pointerdown",
    (e) => {
      dragging = true;
      stage.setPointerCapture(e.pointerId);
      stage.style.cursor = "grabbing";
      applyDrag(e);
    },
    { signal },
  );
  stage.addEventListener(
    "pointermove",
    (e) => {
      if (dragging) applyDrag(e);
    },
    { signal },
  );
  const endDrag = () => {
    dragging = false;
    stage.style.cursor = "grab";
  };
  stage.addEventListener("pointerup", endDrag, { signal });
  stage.addEventListener("pointercancel", endDrag, { signal });

  resetBtn.addEventListener(
    "click",
    () => {
      d = 0;
      render();
    },
    { signal },
  );

  onResize(render);
  render();
}
