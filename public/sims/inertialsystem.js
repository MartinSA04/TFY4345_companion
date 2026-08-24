/**
 * Galileis skip som interaktiv figur: ei vogn skyter en ball rett opp og tar
 * den imot igjen, og du velger hvilket inertialsystem du ser hendelsen fra.
 *
 * Sett fra bakken (K) er banen en parabel; sett fra vogna (K') går ballen rett
 * opp og ned mens bakken glir forbi. Prikkene er posisjonen med faste
 * tidsmellomrom, lagret som hendelser (t, x, y) i bakkekoordinater og projisert
 * inn i det valgte systemet, så et bytte midt i flukten stiller de samme
 * prikkene opp som den andre banen. Grepet er det samme som i PSSC-filmen
 * "Frames of Reference": kameraet følger systemet.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }. Fargene er sidens egne CSS-variabler, så figuren bytter
 * tema av seg selv.
 */
export default function init({ stage, controls, getSize, onResize, signal }) {
  const TC = 3.6; // sekunder per syklus
  const T0 = 0.6; // ballen skytes opp
  const TF = 2.2; // flygetid; ballen lander i vogna ved T0 + TF
  const G = 7.3; // tyngdeakselerasjon i sakte film, m/s²
  const UY = (G * TF) / 2; // startfarten opp som gir flygetida TF
  const W = 22; // synlig bredde i meter
  const CX = W / 2; // vogna står her i K'-visningen
  const REST = 1.08; // ballens hvilehøyde oppå vogna
  const DT = 0.11; // tidsmellomrommet mellom prikkene

  let v = 3; // vognas fart i K
  let t = 0;
  let view = "ground"; // "ground" = K, "cart" = K'
  let trail = []; // hendelser {t, x, y} i bakkekoordinater
  // Redusert bevegelse: start i pause og la brukeren spille av selv.
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const x0 = () => CX - (v * TC) / 2; // startposisjon som sentrerer turen
  const xc = (s) => x0() + v * s; // vognas posisjon i K
  const inFlight = (s) => s >= T0 && s <= T0 + TF;
  const ballY = (s) => {
    if (!inFlight(s)) return REST;
    const u = s - T0;
    return REST + UY * u - 0.5 * G * u * u;
  };

  const nb = (x, n = 1) => x.toFixed(n).replace(".", ",");

  // ── kontroller ────────────────────────────────────────────────────────────
  function viewBtn(text, value) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sim-btn";
    b.textContent = text;
    b.setAttribute("aria-pressed", String(view === value));
    b.addEventListener("click", () => setView(value), { signal });
    return b;
  }
  const groundBtn = viewBtn("Fra bakken (K)", "ground");
  const cartBtn = viewBtn("Fra vogna (K′)", "cart");
  function setView(value) {
    view = value;
    groundBtn.setAttribute("aria-pressed", String(value === "ground"));
    cartBtn.setAttribute("aria-pressed", String(value === "cart"));
    render();
  }

  const vLabel = document.createElement("label");
  vLabel.append("Vognas fart v ");
  const vOut = document.createElement("output");
  const vInput = document.createElement("input");
  vInput.type = "range";
  vInput.min = "0";
  vInput.max = "6";
  vInput.step = "0.5";
  vInput.value = String(v);
  vInput.setAttribute("aria-label", "Vognas fart i meter per sekund");
  vLabel.append(vOut, vInput);

  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "sim-btn";
  playBtn.textContent = playing ? "Pause" : "Spill av";

  controls.append(groundBtn, cartBtn, vLabel, playBtn);

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    const s = w / W; // px per meter
    const groundY = h - 26;
    const px = (x) => x * s;
    const py = (y) => groundY - y * s;

    // Alt som står stille i K forskyves med off i K'-visningen; prikkene
    // bruker forskyvningen ved sitt eget tidspunkt, ballen og vogna ved t.
    const offAt = (s0) => (view === "cart" ? CX - xc(s0) : 0);
    const off = offAt(t);

    let g = "";
    // Bakken: linje, merker hver 2. meter og stolper hver 8. meter.
    g += `<line x1="0" y1="${groundY}" x2="${w}" y2="${groundY}" stroke="var(--border-strong)" stroke-width="1.5"/>`;
    for (let k = Math.floor(-off / 2) - 1; k * 2 + off <= W + 2; k++) {
      const x = px(k * 2 + off);
      if (x < -10 || x > w + 10) continue;
      if (k % 4 === 0) {
        g += `<line x1="${x.toFixed(1)}" y1="${groundY}" x2="${x.toFixed(1)}" y2="${py(0.55).toFixed(1)}" stroke="var(--border-strong)" stroke-width="2"/>`;
      } else {
        g += `<line x1="${x.toFixed(1)}" y1="${groundY}" x2="${x.toFixed(1)}" y2="${groundY + 5}" stroke="var(--border)" stroke-width="1"/>`;
      }
    }

    // Prikkene: samme hendelser, projisert inn i det valgte systemet.
    for (const p of trail) {
      const x = px(p.x + offAt(p.t));
      g += `<circle cx="${x.toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="${Math.max(2, 0.09 * s).toFixed(1)}" style="fill:var(--accent)" opacity="0.5"/>`;
    }

    // Vogna med hjul, og ballen.
    const cx = px(xc(t) + off);
    const bw = 1.8 * s;
    g +=
      `<rect x="${(cx - bw / 2).toFixed(1)}" y="${py(0.86).toFixed(1)}" width="${bw.toFixed(1)}" height="${(0.5 * s).toFixed(1)}" rx="${(0.08 * s).toFixed(1)}" style="fill:var(--border)"/>` +
      `<circle cx="${(cx - bw * 0.3).toFixed(1)}" cy="${py(0.18).toFixed(1)}" r="${(0.18 * s).toFixed(1)}" style="fill:var(--border-strong)"/>` +
      `<circle cx="${(cx + bw * 0.3).toFixed(1)}" cy="${py(0.18).toFixed(1)}" r="${(0.18 * s).toFixed(1)}" style="fill:var(--border-strong)"/>`;
    g += `<circle cx="${cx.toFixed(1)}" cy="${py(ballY(t)).toFixed(1)}" r="${(0.22 * s).toFixed(1)}" style="fill:var(--accent)"/>`;

    // Hvilket system ser du fra?
    const tag = view === "ground" ? "sett fra bakken (K)" : "sett fra vogna (K′)";
    g += `<text x="10" y="20" style="fill:var(--muted);font-family:var(--font-mono);font-size:12px">${tag}</text>`;

    stage.innerHTML =
      `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block">${g}</svg>`;

    vOut.textContent = `${nb(v)} m/s`;
  }

  // ── animasjon ─────────────────────────────────────────────────────────────
  let last = null;
  function frame(now) {
    if (signal?.aborted) return;
    if (playing) {
      if (last !== null) {
        const nt = (t + (now - last) / 1000) % TC;
        if (nt < t) trail = []; // ny syklus, nytt kast
        t = nt;
        if (inFlight(t) && (trail.length === 0 || t - trail[trail.length - 1].t >= DT)) {
          trail.push({ t, x: xc(t), y: ballY(t) });
        }
      }
      last = now;
    } else {
      last = null;
    }
    render();
    requestAnimationFrame(frame);
  }

  vInput.addEventListener("input", () => {
    v = Number(vInput.value);
    t = 0; // nytt kast med den nye farten, så prikkene hører til samme forsøk
    trail = [];
    render();
  }, { signal });
  playBtn.addEventListener("click", () => {
    playing = !playing;
    playBtn.textContent = playing ? "Pause" : "Spill av";
    last = null;
  }, { signal });

  onResize(render);
  render();
  requestAnimationFrame(frame);
}
