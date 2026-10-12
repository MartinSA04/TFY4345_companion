/**
 * Massive legemer for figurene i «Kjente systemer»: flatene males bakfra og
 * fram, og hver flate får én av fire toner etter hvor mye den vender mot ett
 * fast lys oppe til venstre foran. Tonene blandes fra temaets egne variabler
 * (materialet mot --solid-shade), så figurene bytter tema selv.
 *
 * Koordinater som i _mekanikk.js: x mot høyre, y innover i skjermen, z opp.
 */

const r1 = (x) => x.toFixed(1);

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = (a) => {
  const l = Math.hypot(...a) || 1;
  return a.map((c) => c / l);
};
export const add = (a, b, k = 1) => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];

/** Papir: den nøytrale flaten (sidekanter, sporing på skiver). */
export const PAPER = "var(--solid-paper)";

/** Lyset i kameraets akser, dreid om z med kameraets dreining beta. */
export function lightFor(beta = 0) {
  const [lx, ly, lz] = norm([-0.5, -0.55, 0.67]);
  const cb = Math.cos(beta);
  const sb = Math.sin(beta);
  return [lx * cb + ly * sb, -lx * sb + ly * cb, lz];
}

/** Retningen kameraet ser i (inn i skjermen), for skråprojeksjon med hevning alpha og dreining beta. */
export function viewFor(alpha, beta = 0) {
  const ca = Math.cos(alpha);
  return [Math.sin(beta) * ca, Math.cos(beta) * ca, -Math.sin(alpha)];
}

/**
 * Tone fra 0 (mot lyset) til 3 (bort fra lyset), glidende. Trinnvise toner
 * hopper når en flate dreier forbi en grense; en glidende tone følger
 * dreiningen jevnt.
 */
export function tone(n, light) {
  const l = dot(n, light);
  return Math.min(3, Math.max(0, ((0.6 - l) / 1.1) * 3));
}

/** Materialet i tone t: blandet mot --solid-shade, fra 100 % (t = 0) til 58 % (t = 3). */
export const shade = (base, t) =>
  t < 0.01 ? base : `color-mix(in oklab, ${base} ${(100 - 14 * t).toFixed(1)}%, var(--solid-shade))`;

/** Lukket flate gjennom skjermpunkter [[X, Y], …]. */
export function face(pts, fill, edge, width = 1) {
  let d = "";
  pts.forEach(([x, y], i) => {
    d += `${i === 0 ? "M" : "L"} ${r1(x)} ${r1(y)} `;
  });
  return `<path d="${d}Z" style="fill:${fill}" stroke="${edge}" stroke-width="${width}" stroke-linejoin="round"/>`;
}

/**
 * Sylinder (skive) med senter c, aksen n, radius r og halv tykkelse ht. eu og
 * ev spenner skiveplanet; u0 dreier kantoppdelingen så striper følger med.
 * Returnerer { rim, cap, capNormal, capPts, capCentre }: rim er de synlige
 * kantfeltene sortert bakfra, cap er den synlige endeflaten.
 */
export function disc({ c, n, eu, ev, r, ht, u0 = 0, view, light, P, base, stripe = null, seg = 48 }) {
  const capN = dot(n, view) < 0 ? n : n.map((x) => -x);
  const top = add(c, n, ht);
  const bot = add(c, n, -ht);
  const at = (o, u) => add(o, add(eu.map((x) => x * Math.cos(u)), ev.map((x) => x * Math.sin(u))), r);
  const quads = [];
  for (let i = 0; i < seg; i++) {
    const ua = u0 + (2 * Math.PI * i) / seg;
    const ub = u0 + (2 * Math.PI * (i + 1)) / seg;
    const um = (ua + ub) / 2;
    const nrm = add(eu.map((x) => x * Math.cos(um)), ev.map((x) => x * Math.sin(um)));
    if (dot(nrm, view) >= 0) continue;
    const mat = stripe ? stripe(i) : base;
    const t = tone(nrm, light);
    const mid = at(c, um);
    quads.push({
      depth: dot(mid, view),
      s: face([P(at(top, ua)), P(at(top, ub)), P(at(bot, ub)), P(at(bot, ua))], shade(mat, t), shade(mat, t), 0.6),
    });
  }
  quads.sort((a, b) => b.depth - a.depth);
  const capCentre = capN === n ? top : bot;
  const capPts = [];
  for (let i = 0; i < seg; i++) capPts.push(P(at(capCentre, u0 + (2 * Math.PI * i) / seg)));
  const t = tone(capN, light);
  return {
    rim: quads.map((q) => q.s).join(""),
    cap: face(capPts, shade(base, t), shade(base, 3), 1.1),
    capNormal: capN,
    capPts,
    capCentre,
  };
}

/**
 * Dreid legeme (som på en dreiebenk) med spissen i o og aksen n. profile er
 * knekkpunkter [s, r] langs aksen; eu og ev spenner planet vinkelrett på n,
 * og u0 dreier oppdelingen så malte felter følger med rotasjonen.
 * mat(band, sector) gir materialet til hvert felt. Feltene som vender mot
 * kameraet, sorteres bakfra og fram.
 */
export function lathe({ o, n, eu, ev, profile, u0 = 0, seg = 32, view, light, P, mat }) {
  const ring = (s, r, u) => add(add(o, n, s), add(eu.map((x) => x * Math.cos(u)), ev.map((x) => x * Math.sin(u))), r);
  const quads = [];
  for (let k = 0; k + 1 < profile.length; k++) {
    const [s0, r0] = profile[k];
    const [s1, r1] = profile[k + 1];
    if (r0 === 0 && r1 === 0) continue;
    const ds = s1 - s0;
    const dr = r1 - r0;
    for (let i = 0; i < seg; i++) {
      const ua = u0 + (2 * Math.PI * i) / seg;
      const ub = u0 + (2 * Math.PI * (i + 1)) / seg;
      const um = (ua + ub) / 2;
      const radial = add(eu.map((x) => x * Math.cos(um)), ev.map((x) => x * Math.sin(um)));
      const nrm = norm(add(radial.map((x) => x * ds), n, -dr));
      if (dot(nrm, view) >= 0) continue;
      const m = mat(k, i);
      const t = tone(nrm, light);
      const pts = [P(ring(s0, r0, ua)), P(ring(s0, r0, ub)), P(ring(s1, r1, ub)), P(ring(s1, r1, ua))];
      quads.push({ depth: dot(ring((s0 + s1) / 2, (r0 + r1) / 2, um), view), s: face(pts, shade(m, t), shade(m, t), 0.7) });
    }
  }
  quads.sort((a, b) => b.depth - a.depth);
  return quads.map((q) => q.s).join("");
}
