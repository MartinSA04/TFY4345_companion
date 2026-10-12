/**
 * Malerrekkefølge for figurer med ett massivt legeme (Anatomy-regelen: alt
 * tegnes bakfra og fram, og der to ting overlapper, er det den nærmeste som
 * ligger øverst, målt og ikke gjettet).
 *
 * Linjer, buer og vektorer deles i korte biter. For hver bit sendes en
 * stråle fra midtpunktet mot kameraet: treffer den legemet, ligger biten bak
 * (eller inni) legemet og tegnes før det, ellers etter. Innen hvert lag
 * sorteres bitene fra lengst inne til nærmest. Bitene bak legemet tegnes en
 * gang til over det, svakt og stiplet, som skjulte linjer i en teknisk
 * tegning.
 *
 * Koordinater som i _mekanikk.js: x mot høyre, y innover, z opp. `view` er
 * retningen kameraet ser i (inn i skjermen).
 */

const r1 = (x) => x.toFixed(1);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const lerp = (a, b, t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];

/** Treffer strålen p + t·u (t > 0) boksen med senter c, akser e[a] og halve sider half[a]? */
export function boxHit(e, half, c = [0, 0, 0]) {
  return (p, u) => {
    let t0 = -Infinity;
    let t1 = Infinity;
    const w = sub(p, c);
    for (let a = 0; a < 3; a++) {
      const o = dot(w, e[a]);
      const d = dot(u, e[a]);
      if (Math.abs(d) < 1e-9) {
        if (Math.abs(o) > half[a]) return false;
        continue;
      }
      let ta = (-half[a] - o) / d;
      let tb = (half[a] - o) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
    }
    return t1 > Math.max(t0, 0) + 1e-6;
  };
}

/** Treffer strålen skiva med senter c, akse n, radius r og halv tykkelse ht? */
export function discHit(c, n, r, ht) {
  return (p, u) => {
    const w = sub(p, c);
    const a0 = dot(w, n);
    const an = dot(u, n);
    let t0 = 0;
    let t1 = Infinity;
    if (Math.abs(an) < 1e-9) {
      if (Math.abs(a0) > ht) return false;
    } else {
      let ta = (-ht - a0) / an;
      let tb = (ht - a0) / an;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
    }
    // Radiell del: |w⊥ + t u⊥|² ≤ r².
    const wp = sub(w, n.map((x) => x * a0));
    const up = sub(u, n.map((x) => x * an));
    const A = dot(up, up);
    const B = 2 * dot(wp, up);
    const C = dot(wp, wp) - r * r;
    if (A < 1e-12) {
      if (C > 0) return false;
    } else {
      const disc = B * B - 4 * A * C;
      if (disc < 0) return false;
      const s = Math.sqrt(disc);
      t0 = Math.max(t0, (-B - s) / (2 * A));
      t1 = Math.min(t1, (-B + s) / (2 * A));
    }
    return t1 > t0 + 1e-6 && t1 > 1e-6;
  };
}

/**
 * Et lerret for én figur: P projiserer, view er kamerets retning, hit(p, u)
 * er legemets stråletest. Legg til linjer og prikker i hvilken som helst
 * rekkefølge; svg(solid) setter alt sammen rundt legemet.
 */
export function painter({ P, view, hit }) {
  const toViewer = view.map((x) => -x);
  const back = [];
  const front = [];
  const put = (p, s) => (hit(p, toViewer) ? back : front).push({ d: dot(p, view), s });

  /** Polylinje gjennom romlige punkter, delt i biter på høyst `step`. */
  function polyline(pts, { color, width = 1.5, dash = "", opacity = 1, step = 0.05 } = {}) {
    const style = `stroke="${color}" stroke-width="${width}" stroke-linecap="round" fill="none"${dash ? ` stroke-dasharray="${dash}"` : ""}${opacity < 1 ? ` opacity="${opacity}"` : ""}`;
    // Bitene samles i løp så lenge de havner i samme lag. Hvert løp starter
    // stiplingen der forrige slapp (stroke-dashoffset = lengden så langt på
    // skjermen), så strekene ikke hopper når grensen mot legemet flytter seg.
    let run = [];
    let runBack = null;
    let runDepth = 0;
    let runStart = 0;
    let acc = 0;
    const flush = () => {
      if (run.length < 2) return;
      let d = "";
      run.forEach((q, i) => {
        const [x, y] = P(q);
        d += `${i === 0 ? "M" : "L"} ${r1(x)} ${r1(y)} `;
      });
      const off = dash ? ` stroke-dashoffset="${r1(runStart)}"` : "";
      (runBack ? back : front).push({ d: runDepth / (run.length - 1), s: `<path d="${d}" ${style}${off}/>` });
    };
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(...sub(b, a)) / step));
      for (let k = 0; k < n; k++) {
        const p0 = lerp(a, b, k / n);
        const p1 = lerp(a, b, (k + 1) / n);
        const m = lerp(p0, p1, 0.5);
        const isBack = hit(m, toViewer);
        if (isBack !== runBack) {
          flush();
          run = [p0];
          runBack = isBack;
          runDepth = 0;
          runStart = acc;
        }
        run.push(p1);
        runDepth += dot(m, view);
        const [ax, ay] = P(p0);
        const [bx, by] = P(p1);
        acc += Math.hypot(bx - ax, by - ay);
      }
    }
    flush();
  }

  /** Pil i rommet: skaftet som polylinje, hodet som én bit ved spissen. */
  function arrow(from, to, color, width = 2) {
    const [x1, y1] = P(from);
    const [x2, y2] = P(to);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const t = Math.max(0, 1 - 8 / len);
    polyline([from, lerp(from, to, t)], { color, width });
    const hx = x2 - ux * 8;
    const hy = y2 - uy * 8;
    put(lerp(from, to, 1 - 4 / len), `<path d="M ${r1(x2)} ${r1(y2)} L ${r1(hx - uy * 4.5)} ${r1(hy + ux * 4.5)} L ${r1(hx + uy * 4.5)} ${r1(hy - ux * 4.5)} Z" style="fill:${color}"/>`);
  }

  /** Prikk i rommet. */
  function dotAt(p, r, color) {
    const [x, y] = P(p);
    put(p, `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" style="fill:${color}"/>`);
  }

  function svg(solid) {
    const order = (list) => list.sort((a, b) => b.d - a.d).map((it) => it.s).join("");
    const hidden = order(back);
    // Bitene bak ligger alle innenfor legemets omriss, så legemet ville dekket dem helt;
    // de tegnes bare som spøkelse over det, og trenger ingen klipping.
    return solid + `<g opacity="0.35" stroke-dasharray="3 3">${hidden}</g>` + order(front);
  }

  return { polyline, arrow, dotAt, put, svg };
}

/**
 * Stråletest for et dreid legeme med spissen i o, aksen n og profilen
 * [[s, r], …] (s stigende). Først en rask test mot den omsluttende
 * sylinderen, så små steg langs strålen innenfor den.
 */
export function latheHit(o, n, profile) {
  const sMax = profile[profile.length - 1][0];
  const rMax = Math.max(...profile.map(([, r]) => r));
  const box = discHit(o.map((x, i) => x + (n[i] * sMax) / 2), n, rMax, sMax / 2);
  const radius = (s) => {
    for (let k = 0; k + 1 < profile.length; k++) {
      const [s0, r0] = profile[k];
      const [s1, r1] = profile[k + 1];
      if (s <= s1) return s1 > s0 ? r0 + ((s - s0) / (s1 - s0)) * (r1 - r0) : Math.max(r0, r1);
    }
    return 0;
  };
  const inside = (q) => {
    const w = sub(q, o);
    const s = dot(w, n);
    if (s < 0 || s > sMax) return false;
    const rad = Math.hypot(...sub(w, n.map((x) => x * s)));
    return rad < radius(s);
  };
  return (p, u) => {
    if (!box(p, u)) return false;
    for (let t = 0.006; t < 2 * (sMax + rMax); t += 0.008) {
      if (inside([p[0] + t * u[0], p[1] + t * u[1], p[2] + t * u[2]])) return true;
    }
    return false;
  };
}
