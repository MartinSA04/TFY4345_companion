/**
 * Responsmetoden: deltadytt og superposisjon for den drevne oscillatoren.
 *
 * Et trykk i diagrammet legger inn et dytt J·δ(t − t′): vannrett plassering er
 * tidspunktet t′, høyden over eller under aksen er styrken J med fortegn. Hver
 * tynn kurve er responsen J·G_R(t − t′) fra ett dytt, null før sitt eget dytt,
 * og den tykke kurven er summen av dem. Glidebryteren styrer egenfrekvensen ω;
 * «Dytt»-knappen legger inn et dytt der det er mest plass.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }. Fargene er sidens egne CSS-variabler, så figuren bytter
 * tema selv.
 */
export default function init({ stage, controls, getSize, onResize, signal }) {
  const T = 12; // synlig tidsvindu i sekunder
  const N = 320; // punkter per kurve
  const MAXDYTT = 8; // eldste dytt fjernes over dette
  const m = 1;

  let omega = 1.8;
  let kicks = [
    { t: 2.4, J: 1 },
    { t: 6.8, J: -0.8 },
  ];

  const nb = (x, n = 1) => x.toFixed(n).replace(".", ",");
  const GR = (tau) => (tau > 0 ? Math.sin(omega * tau) / (m * omega) : 0);
  const xAt = (t) => kicks.reduce((s, k) => s + k.J * GR(t - k.t), 0);

  // ── kontroller ────────────────────────────────────────────────────────────
  const wLabel = document.createElement("label");
  wLabel.append("Frekvens ω ");
  const wOut = document.createElement("output");
  const wInput = document.createElement("input");
  wInput.type = "range";
  wInput.min = "0.6";
  wInput.max = "3.6";
  wInput.step = "0.2";
  wInput.value = String(omega);
  wInput.setAttribute("aria-label", "Oscillatorens egenfrekvens omega");
  wLabel.append(wOut, wInput);

  function button(text, aria) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sim-btn";
    b.textContent = text;
    b.setAttribute("aria-label", aria);
    return b;
  }
  const kickBtn = button("Dytt", "Legg inn et dytt der det er mest plass");
  const clearBtn = button("Nullstill", "Fjern alle dytt");

  controls.append(wLabel, kickBtn, clearBtn);

  // «Dytt»-knappen (og tastaturbrukere) treffer midtpunktet av det største
  // ledige mellomrommet, så hvert trykk gir et nytt, synlig dytt.
  function nextKickTime() {
    const edge = 0.8;
    const pts = [edge, ...kicks.map((k) => k.t).sort((a, b) => a - b), T - edge];
    let best = -1;
    let at = T / 2;
    for (let i = 1; i < pts.length; i++) {
      const gap = pts[i] - pts[i - 1];
      if (gap > best) {
        best = gap;
        at = (pts[i] + pts[i - 1]) / 2;
      }
    }
    return at;
  }

  function addKick(t, J) {
    kicks.push({ t, J });
    if (kicks.length > MAXDYTT) kicks.shift();
    render();
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  let geom = null; // px-avbildningen fra siste render, brukt av trykk-handleren

  function render() {
    const { w, h } = getSize();
    const padL = 34;
    const padR = 14;
    const padT = 14;
    const padB = 26;
    const pw = Math.max(40, w - padL - padR);
    const ph = Math.max(40, h - padT - padB);
    const midY = padT + ph / 2;

    // Skalaen dekker både summen og pilene for dyttstyrkene.
    const sum = [];
    let peak = 1;
    for (let i = 0; i <= N; i++) {
      const v = xAt((T * i) / N);
      sum.push(v);
      peak = Math.max(peak, Math.abs(v));
    }
    for (const k of kicks) peak = Math.max(peak, Math.abs(k.J));
    const S = peak * 1.15;

    const px = (t) => padL + (t / T) * pw;
    const py = (v) => midY - (v / S) * (ph / 2);
    geom = { padL, pw, midY, half: ph / 2, S };

    const curve = (f) => {
      let d = "";
      for (let i = 0; i <= N; i++) {
        const t = (T * i) / N;
        d += `${i === 0 ? "M" : "L"} ${px(t).toFixed(1)} ${py(f(t)).toFixed(1)} `;
      }
      return d;
    };

    let g = "";
    // Tidsaksen med merker hvert 2. sekund.
    g += `<line x1="${padL}" y1="${midY.toFixed(1)}" x2="${(padL + pw).toFixed(1)}" y2="${midY.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
    for (let t = 0; t <= T; t += 2) {
      g += `<line x1="${px(t).toFixed(1)}" y1="${midY.toFixed(1)}" x2="${px(t).toFixed(1)}" y2="${(midY + 4).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
    }

    // Hvert dytt: pil for styrken og en tynn kurve for responsen fra det alene.
    for (const k of kicks) {
      const x = px(k.t);
      const tipY = py(k.J);
      const dir = k.J > 0 ? 1 : -1; // 1 = pil opp
      g += `<line x1="${x.toFixed(1)}" y1="${midY.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(tipY + dir * 5).toFixed(1)}" stroke="var(--orange)" stroke-width="2"/>`;
      g += `<path d="M ${(x - 4).toFixed(1)} ${(tipY + dir * 7).toFixed(1)} L ${(x + 4).toFixed(1)} ${(tipY + dir * 7).toFixed(1)} L ${x.toFixed(1)} ${tipY.toFixed(1)} Z" style="fill:var(--orange)"/>`;
      g += `<path d="${curve((t) => k.J * GR(t - k.t))}" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.3"/>`;
    }

    // Summen, altså responsen på hele kraften.
    if (kicks.length > 0) {
      let d = "";
      for (let i = 0; i <= N; i++) {
        d += `${i === 0 ? "M" : "L"} ${px((T * i) / N).toFixed(1)} ${py(sum[i]).toFixed(1)} `;
      }
      g += `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;
    } else {
      g += `<text x="${(padL + pw / 2).toFixed(1)}" y="${(midY - 12).toFixed(1)}" text-anchor="middle" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">Trykk i diagrammet for å dytte</text>`;
    }

    g += `<text x="${padL + 4}" y="${padT + 10}" style="fill:var(--orange);font-family:var(--font-mono);font-size:12px">dytt J</text>`;
    g += `<text x="${padL + 58}" y="${padT + 10}" style="fill:var(--accent);font-family:var(--font-mono);font-size:12px">respons x(t)</text>`;
    g += `<text x="${(padL + pw).toFixed(1)}" y="${(padT + ph + 18).toFixed(1)}" text-anchor="end" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">t</text>`;

    stage.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${g}</svg>`;

    wOut.textContent = `${nb(omega)} rad/s`;
  }

  stage.style.cursor = "crosshair";
  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (!geom) return;
      const rect = stage.getBoundingClientRect();
      const t = (((e.clientX - rect.left) - geom.padL) / geom.pw) * T;
      if (t < 0.3 || t > T - 0.3) return;
      let J = ((geom.midY - (e.clientY - rect.top)) / geom.half) * geom.S;
      if (Math.abs(J) < 0.2) J = J < 0 ? -0.2 : 0.2;
      J = Math.max(-2, Math.min(2, J));
      addKick(t, J);
    },
    { signal },
  );

  wInput.addEventListener(
    "input",
    () => {
      omega = Number(wInput.value);
      render();
    },
    { signal },
  );
  kickBtn.addEventListener("click", () => addKick(nextKickTime(), 1), { signal });
  clearBtn.addEventListener(
    "click",
    () => {
      kicks = [];
      render();
    },
    { signal },
  );

  onResize(render);
  render();
}
