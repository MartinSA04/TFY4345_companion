/**
 * Corioliskraften på jorda, sett fra jorda (K′). En puck sendes av gårde
 * langs bakken uten friksjon fra et punkt på breddegraden φ. Sentrifugalkraften
 * er tatt inn i g_eff, så langs bakken kjenner pucken bare den horisontale
 * Corioliskraften, 2mωv sin φ vinkelrett på farten: banen krummer mot høyre på
 * den nordlige halvkula og mot venstre på den sørlige. Langt fra ekvator er
 * banen nesten en sirkel med radien v/(2ω sin φ); nær ekvator endrer sin φ seg
 * langs banen, og sirkelen åpner seg. Langs selve ekvator går pucken rett fram.
 *
 * Bevegelsen integreres på kula med øst- og nordfarten (u, v):
 *   u̇ = f v + u v tan φ / R,  v̇ = −f u − u² tan φ / R,  f = 2ω sin φ,
 * der leddene med tan φ holder pucken på kula.
 *
 * Kloden males massiv med glidende tone; gradnettet deles i biter, og bitene
 * på baksiden tegnes svakt stiplet. Enheter: R = 1, ω = 0,5 rad/s og
 * v = 0,15 R/s, alt overdrevet så sirklene får plass på kloden.
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { slider, button, animate, svg, txt, line, arrow, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";
import { shade } from "./_solid.js";

const OM = 0.5; // jordas vinkelfart
const V0 = 0.15; // puckens fart
const MAXLEN = 2.0; // lengste bane før ny tur, i R
const HOLD = 1.2; // pause ved slutten
const DOT = 0.25; // tid mellom prikkene
const DIRS = [
  ["Nord", 0, 1],
  ["Øst", 1, 0],
  ["Sør", 0, -1],
  ["Vest", -1, 0],
];
const deg = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(...a) || 1;
  return a.map((c) => c / l);
};
const onSphere = (lat, lon) => [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
const eastAt = (lon) => [-Math.sin(lon), Math.cos(lon), 0];
const northAt = (lat, lon) => [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)];

export default function init({ stage, controls, getSize, onResize, signal }) {
  const gid = `jord-${Math.random().toString(36).slice(2, 8)}`;
  let lat0 = 60 * deg;
  let dir = 0; // indeks i DIRS
  let s; // tilstand: lat, lon, u, v, t, len, trail

  const reset = () => {
    const [, e, n] = DIRS[dir];
    s = { lat: lat0, lon: 0, u: V0 * e, v: V0 * n, t: 0, len: 0, done: 0, trail: [] };
    // Kameraet sikter på midtpunktet av hele banen, regnet ut på forhånd.
    const probe = { ...s, trail: [] };
    const c = [0, 0, 0];
    let k = 0;
    while (probe.len < MAXLEN) {
      advance(probe, 0.05);
      onSphere(probe.lat, probe.lon).forEach((x, i) => (c[i] += x));
      k++;
    }
    const t = norm(k ? c : onSphere(lat0, 0));
    s.aimLat = Math.asin(t[2]);
    s.aimLon = Math.atan2(t[1], t[0]);
  };
  reset();

  // ── kontroller ────────────────────────────────────────────────────────────
  const dirBtns = DIRS.map(([name], i) => {
    const b = button(`Mot ${name.toLowerCase()}`, `Send pucken mot ${name.toLowerCase()}`, () => setDir(i), signal);
    b.setAttribute("aria-pressed", String(i === dir));
    return b;
  });
  function setDir(i) {
    dir = i;
    dirBtns.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    reset();
  }
  controls.append(
    slider({
      text: "Breddegrad φ",
      aria: "Breddegraden pucken starter på, i grader",
      min: -75,
      max: 75,
      step: 5,
      value: 60,
      format: (v) => (v === 0 ? "0° (ekvator)" : `${Math.abs(v)}° ${v > 0 ? "N" : "S"}`),
      signal,
      onInput: (v) => {
        lat0 = v * deg;
        reset();
      },
    }),
    ...dirBtns,
    button("Start på nytt", "Send pucken av gårde på nytt", reset, signal),
  );

  // ── fysikk ────────────────────────────────────────────────────────────────
  function deriv([lat, , u, v]) {
    const f = 2 * OM * Math.sin(lat);
    const tn = Math.tan(lat);
    return [v, u / Math.cos(lat), f * v + u * v * tn, -f * u - u * u * tn];
  }
  function step(dt) {
    if (s.len >= MAXLEN) {
      s.done += dt;
      if (s.done > HOLD) reset();
      return;
    }
    advance(s, dt);
    if (s.trail.length === 0 || s.t - s.trail[s.trail.length - 1].t >= DOT) {
      s.trail.push({ t: s.t, lat: s.lat, lon: s.lon });
    }
  }
  function advance(s, dt) {
    const h = dt / 4;
    for (let k = 0; k < 4; k++) {
      const y = [s.lat, s.lon, s.u, s.v];
      const k1 = deriv(y);
      const k2 = deriv(y.map((c, i) => c + (h / 2) * k1[i]));
      const k3 = deriv(y.map((c, i) => c + (h / 2) * k2[i]));
      const k4 = deriv(y.map((c, i) => c + h * k3[i]));
      [s.lat, s.lon, s.u, s.v] = y.map((c, i) => c + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
      s.t += h;
      s.len += V0 * h;
    }
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const R = Math.min(0.4 * h, 0.4 * w);
    const cx = w / 2;
    const cy = h / 2 + 6;
    // Kameraet ser mot banen, litt fra vest, så kloden får dybde.
    const el = Math.max(-50, Math.min(50, s.aimLat / deg)) * deg;
    const az = s.aimLon - 0.3;
    const cam = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
    const right = norm(cross([0, 0, 1], cam));
    const up = cross(cam, right);
    const P = (p) => [cx + R * dot(p, right), cy - R * dot(p, up)];
    const front = (p) => dot(p, cam) > 0;
    let g = "";

    // Kloden, massiv med glidende tone fra lyset oppe til venstre.
    const base = "color-mix(in oklab, var(--cyan) 22%, var(--solid-paper))";
    g += `<defs><radialGradient id="${gid}" cx="36%" cy="30%" r="78%">`;
    for (const t of [0, 0.8, 1.6, 2.4, 3]) {
      g += `<stop offset="${(t / 3) * 100}%" style="stop-color:${shade(base, t)}"/>`;
    }
    g += `</radialGradient></defs>`;
    g += `<circle cx="${cx}" cy="${cy}" r="${R}" style="fill:url(#${gid})" stroke="${FIXED}" stroke-width="1.5"/>`;

    // Gradnettet i biter: forsiden heltrukken, baksiden svakt stiplet.
    let back = "";
    let fore = "";
    const curve = (pts, opts) => {
      for (let i = 1; i < pts.length; i++) {
        const m = norm(pts[i - 1].map((c, k) => c + pts[i][k]));
        const [x1, y1] = P(pts[i - 1]);
        const [x2, y2] = P(pts[i]);
        if (front(m)) fore += line(x1, y1, x2, y2, opts);
        else back += line(x1, y1, x2, y2, { ...opts, dash: "2 4", opacity: 0.35 });
      }
    };
    for (let la = -60; la <= 60; la += 30) {
      const pts = [];
      for (let k = 0; k <= 72; k++) pts.push(onSphere(la * deg, (k / 72) * 2 * Math.PI));
      curve(pts, { color: la === 0 ? FIXED : HINT, width: la === 0 ? 1.5 : 1 });
    }
    for (let lo = 0; lo < 360; lo += 30) {
      const pts = [];
      for (let k = 0; k <= 36; k++) pts.push(onSphere(-Math.PI / 2 + (k / 36) * Math.PI, lo * deg));
      curve(pts, { color: HINT, width: 1 });
    }
    g += back + fore;

    // Jordaksen med ω ut av nordpolen.
    const [nx, ny] = P([0, 0, 1]);
    const [sx, sy] = P([0, 0, -1]);
    const [ax, ay] = P([0, 0, 1.38]);
    const [bx, by] = P([0, 0, -1.2]);
    g += line(sx, sy, bx, by, { color: FIXED, width: 1.5 });
    g += arrow(nx, ny, ax, ay, LABEL, 2) + txt(ax + 8, ay + 4, "ω");
    if (front([0, 0, 1])) g += txt(nx + 6, ny + 14, "N", { size: 11 });
    if (front([0, 0, -1])) g += txt(sx + 6, sy - 6, "S", { size: 11 });

    // Startpunktet og banen.
    const p0 = onSphere(lat0, 0);
    const [qx, qy] = P(p0);
    g += `<circle cx="${qx.toFixed(1)}" cy="${qy.toFixed(1)}" r="4" fill="none" stroke="${FIXED}" stroke-width="1.5"/>`;
    for (const d of s.trail) {
      const p = onSphere(d.lat, d.lon);
      const [x, y] = P(p);
      g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" style="fill:${MOVING}" opacity="${front(p) ? 0.55 : 0.15}"/>`;
    }

    // Pucken, farten og Corioliskraften, i det lokale bakkeplanet.
    const p = onSphere(s.lat, s.lon);
    const [px, py] = P(p);
    if (front(p)) {
      const e = eastAt(s.lon);
      const n = northAt(s.lat, s.lon);
      const vel = e.map((c, k) => (c * s.u + n[k] * s.v) / V0);
      const f = Math.sin(s.lat); // Coriolis: f·(v, −u), i enheter av 2ωv
      const cor = e.map((c, k) => f * (c * s.v - n[k] * s.u) / V0);
      const tip = (d, L) => P(p.map((c, k) => c + L * d[k]));
      const [vx, vy] = tip(vel, 0.2);
      g += arrow(px, py, vx, vy, MOVING, 2) + txt(vx + 6, vy + 4, "v′", { fill: MOVING });
      if (Math.abs(f) > 0.08) {
        const [kx, ky] = tip(cor, 0.2);
        g += arrow(px, py, kx, ky, DERIVED, 2) + txt(kx + 6, ky + 4, "Coriolis", { fill: DERIVED });
      }
      g += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="6.5" style="fill:${MOVING}"/>`;
    }

    g += txt(10, 18, "sett fra jorda (K′)");
    stage.innerHTML = svg(w, h, g);
  }

  onResize(render);
  render();
  animate({
    stage,
    signal,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
}
