/**
 * Delte hjelpere for simuleringene i «Kjente systemer»: tallformat, en
 * Runge-Kutta-integrator, kontroller i rammeverkets stil, en animasjonsløkke
 * som stopper når figuren er utenfor skjermen eller sida byttes ut, og et
 * felles tegnespråk for mekaniske systemer.
 *
 * Tegnespråket: fast geometri (oppheng, skinner, akser) i --border-strong,
 * det som beveger seg i --accent, avledede størrelser (massesenter, sentrum,
 * likevektspunkt, energilinje) i --orange, hjelpelinjer stiplet i --border,
 * og etiketter i monospace i --muted. Alt tegnes som SVG-strenger inn i
 * `stage`, så figurene bytter tema selv.
 */

/** Desimaltall med komma. */
export const nb = (x, n = 1) => x.toFixed(n).replace(".", ",");

export const FIXED = "var(--border-strong)";
export const MOVING = "var(--accent)";
export const DERIVED = "var(--orange)";
export const HINT = "var(--border)";
export const LABEL = "var(--muted)";

const r1 = (x) => x.toFixed(1);

/** Ett Runge-Kutta-steg av fjerde orden for y' = f(t, y), y en tallrekke. */
export function rk4(y, f, t, dt) {
  const n = y.length;
  const k1 = f(t, y);
  const y2 = new Array(n);
  for (let i = 0; i < n; i++) y2[i] = y[i] + 0.5 * dt * k1[i];
  const k2 = f(t + 0.5 * dt, y2);
  const y3 = new Array(n);
  for (let i = 0; i < n; i++) y3[i] = y[i] + 0.5 * dt * k2[i];
  const k3 = f(t + 0.5 * dt, y3);
  const y4 = new Array(n);
  for (let i = 0; i < n; i++) y4[i] = y[i] + dt * k3[i];
  const k4 = f(t + dt, y4);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = y[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return out;
}

/**
 * Glidebryter med ledetekst og verdi, i den formen rammeverket styler
 * (<label> med <output> og <input type="range">).
 */
export function slider({ text, aria, min, max, step, value, format, signal, onInput }) {
  const label = document.createElement("label");
  label.append(`${text} `);
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute("aria-label", aria);
  label.append(out, input);
  const show = () => {
    out.textContent = format(Number(input.value));
  };
  input.addEventListener(
    "input",
    () => {
      show();
      onInput(Number(input.value));
    },
    { signal },
  );
  show();
  return label;
}

/** Knapp i rammeverkets .sim-btn-stil. */
export function button(text, aria, onClick, signal) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "sim-btn";
  b.textContent = text;
  b.setAttribute("aria-label", aria);
  b.addEventListener("click", onClick, { signal });
  return b;
}

/**
 * Animasjonsløkke: kaller onFrame(dt) hvert bilde med dt i sekunder (maks
 * 0,05 så et bakgrunnsfaneopphold ikke blir ett kjempesteg). Stopper mens
 * figuren er utenfor skjermen og for godt når sida byttes ut.
 */
export function animate({ stage, signal, onFrame }) {
  let raf = 0;
  let last = 0;
  let visible = true;
  function frame(now) {
    raf = 0;
    if (signal?.aborted) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    onFrame(dt);
    if (visible) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (raf || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    },
    { threshold: 0 },
  );
  io.observe(stage);
  signal?.addEventListener(
    "abort",
    () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    },
    { once: true },
  );
  start();
}

/** Pakk SVG-innhold i et element som fyller scenen. */
export function svg(w, h, inner, style = "") {
  return `<svg width="100%" height="100%" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none" role="img" aria-hidden="true" style="display:block;${style}">${inner}</svg>`;
}

/** Kort tekst i monospace. */
export function txt(x, y, s, { fill = LABEL, anchor = "start", size = 12, opacity = 1 } = {}) {
  return `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" opacity="${opacity}" style="fill:${fill};font-family:var(--font-mono);font-size:${size}px">${s}</text>`;
}

/** Linje; `dash` er en SVG stroke-dasharray-streng, tom for heltrukken. */
export function line(x1, y1, x2, y2, { color = FIXED, width = 1.5, dash = "", opacity = 1 } = {}) {
  return `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""} opacity="${opacity}"/>`;
}

/** Sirkel, som omriss når fill er "none". */
export function circle(cx, cy, r, { fill = "none", stroke = FIXED, width = 1.5, dash = "", opacity = 1 } = {}) {
  return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(Math.max(0, r))}" style="fill:${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""} opacity="${opacity}"/>`;
}

/** Pil fra (x1, y1) til (x2, y2). */
export function arrow(x1, y1, x2, y2, color, width = 2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const hx = x2 - ux * 8;
  const hy = y2 - uy * 8;
  return (
    `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(hx)}" y2="${r1(hy)}" stroke="${color}" stroke-width="${width}"/>` +
    `<path d="M ${r1(x2)} ${r1(y2)} L ${r1(hx - uy * 4.5)} ${r1(hy + ux * 4.5)} L ${r1(hx + uy * 4.5)} ${r1(hy - ux * 4.5)} Z" style="fill:${color}"/>`
  );
}

/** Polylinje gjennom punkter [[x, y], …]. */
export function poly(pts, attrs) {
  if (pts.length < 2) return "";
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    d += `${i === 0 ? "M" : "L"} ${r1(pts[i][0])} ${r1(pts[i][1])} `;
  }
  return `<path d="${d}" fill="none" ${attrs}/>`;
}

/**
 * Sirkelbue om (cx, cy) fra vinkel a0 til a1 i skjermkoordinater (0 = mot
 * høyre, positiv retning med klokka siden y peker ned). Buen går den veien
 * fortegnet til a1 − a0 sier.
 */
export function arc(cx, cy, r, a0, a1, { color = LABEL, width = 1.2, dash = "" } = {}) {
  const d = a1 - a0;
  if (Math.abs(d) < 0.02 || r < 2) return "";
  const large = Math.abs(d) > Math.PI ? 1 : 0;
  const sweep = d > 0 ? 1 : 0;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  return `<path d="M ${r1(x0)} ${r1(y0)} A ${r1(r)} ${r1(r)} 0 ${large} ${sweep} ${r1(x1)} ${r1(y1)}" fill="none" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}

/**
 * Vinkelbue for en pendelvinkel θ målt fra loddlinja nedover, med etikett
 * like utenfor buen. Tegnes bare når vinkelen er stor nok til å leses.
 */
export function angleFromDown(cx, cy, r, th, label) {
  if (Math.abs(th) < 0.1) return "";
  const a0 = Math.PI / 2;
  const a1 = Math.PI / 2 - th;
  const am = (a0 + a1) / 2;
  return (
    arc(cx, cy, r, a0, a1) +
    txt(cx + (r + 11) * Math.cos(am), cy + (r + 11) * Math.sin(am) + 4, label, { anchor: "middle" })
  );
}

/** Fast oppheng: en kort skravert list med opphengspunktet under. */
export function support(x, y, half = 18) {
  let s = line(x - half, y, x + half, y, { width: 2 });
  for (let u = -half + 4; u <= half; u += 7) {
    s += line(u + x, y, u + x - 5, y - 6, { width: 1 });
  }
  s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="3.5" style="fill:${FIXED}"/>`;
  return s;
}

/** Stang mellom to punkter. */
export function rod(x1, y1, x2, y2, color = FIXED) {
  return line(x1, y1, x2, y2, { color, width: 2.5 });
}

/** Kule med etikett ved siden av. */
export function bob(x, y, r = 8, color = MOVING, label = "") {
  let s = `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" style="fill:${color}"/>`;
  if (label) s += txt(x + r + 5, y + 4, label);
  return s;
}

/** Tyngdeakselerasjonen som en nedoverpil med g ved siden. */
export function gravity(x, y, len = 34) {
  return arrow(x, y, x, y + len, LABEL, 1.5) + txt(x + 7, y + len / 2 + 4, "g");
}

/** Kryss som markerer et punkt. */
export function cross(x, y, color = DERIVED, half = 7) {
  return line(x - half, y, x + half, y, { color, width: 2 }) + line(x, y - half, x, y + half, { color, width: 2 });
}

/**
 * Skråprojeksjon av rommet: x mot høyre, y innover i skjermen, z opp. Kameraet
 * er hevet vinkelen alpha over vannrett, så vannrette sirkler blir ellipser
 * og det som ligger lenger inne kommer høyere på skjermen. Returnerer en
 * funksjon (x, y, z) → [X, Y] i piksler om (cx, cy) med skala s.
 */
export function projector(cx, cy, s, alpha) {
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  return (x, y, z) => [cx + s * x, cy - s * (z * ca + y * sa)];
}

/** Fritt dreibart opphengspunkt, en tapp stanga kan gå helt rundt om. */
export function pin(x, y) {
  return (
    circle(x, y, 5.5, { fill: "var(--bg-elevated)", stroke: FIXED, width: 2 }) +
    `<circle cx="${r1(x)}" cy="${r1(y)}" r="2" style="fill:${FIXED}"/>`
  );
}

/** Etikett langs en stang, brøkdelen frac fra første ende, forskjøvet vinkelrett ut. */
export function rodLabel(x1, y1, x2, y2, label, off = 11, frac = 0.68) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  return txt(x1 + frac * dx + (off * dy) / len, y1 + frac * dy - (off * dx) / len + 4, label, { anchor: "middle" });
}
