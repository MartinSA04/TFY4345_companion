/**
 * Et hjul i kraftfeltet: et kraftfelt i planet tegnet som piler (lengden er ikke i skala), et lite hjul du
 * drar rundt i feltet, og en stiplet sirkel om origo gjennom hjulet.
 *
 * Kraften dytter på hver bit av kanten til hjulet, så dreiemomentet er
 * proporsjonalt med arbeidet ∮F·dr rundt kanten. Hjulet snurrer med en fart
 * proporsjonal med det arbeidet delt på arealet, som for et lite hjul er
 * (∇ × F)_z. Farten har et tak, så hjulet over aksen ikke snurrer så fort at
 * eikene flimrer. Sirkelen er en lukket vei, og etiketten på den er arbeidet
 * feltet gjør på én runde mot klokka.
 *
 * Tre felt:
 *  - sentralkraft: F = −r̂/r², konservativt. Arbeidet rundt hver lukket vei er
 *    null, så hjulet står stille overalt, også over sentrum.
 *  - virvel: F = (−y, x), som kraften fra kaffe som går rundt i en kopp på en
 *    skje du holder i ro. ∇ × F = 2 overalt, så hjulet snurrer like fort hvor
 *    det enn står, og arbeidet per runde er 2πr², ∇ × F ganger arealet.
 *  - rundt en akse: F = (−y, x)/r². Arbeidet langs et steg er vinkelen steget
 *    dreier rundt origo, så rundt en vei er arbeidet 2π når veien går rundt
 *    origo, og null ellers. Hjulet snurrer bare når origo er innenfor kanten.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, svg, txt, line, circle, arrow, nb, MOVING, DERIVED, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const L = 2; // feltet tegnes for −L ≤ x, y ≤ L
  const RPX = 22; // hjulets radius i piksler
  const SPIN = 0.6; // vinkelfart per enhet av arbeid/areal
  const SPIN_MAX = 3.5; // taket på vinkelfarten, rad/s
  const FIELDS = {
    sentral: {
      name: "Sentralkraft",
      F: (x, y) => {
        const r = Math.hypot(x, y);
        return r < 1e-6 ? [0, 0] : [-x / r ** 3, -y / r ** 3];
      },
      circ: () => 0,
      work: () => "W = 0",
      center: "sentrum",
    },
    virvel: {
      name: "Virvel",
      F: (x, y) => [-y, x],
      circ: (cx, cy, R) => 2 * Math.PI * R * R,
      work: (r) => `W = 2πr² = ${nb(2 * Math.PI * r * r, 1)}`,
      center: "",
    },
    akse: {
      name: "Rundt en akse",
      F: (x, y) => {
        const r2 = x * x + y * y;
        return r2 < 1e-6 ? [0, 0] : [-y / r2, x / r2];
      },
      circ: (cx, cy, R) => (Math.hypot(cx, cy) < R ? 2 * Math.PI : 0),
      work: () => `W = 2π = ${nb(2 * Math.PI, 1)}`,
      center: "aksen",
    },
  };

  let key = "virvel";
  let pos = [0.9, 0.5]; // hjulets sentrum
  let angle = 0; // hjulets dreiing
  let spin = 0; // hjulets vinkelfart
  let dragging = false;
  let moved = false; // hintet vises til hjulet er dratt første gang
  let geom = null;

  const btns = {};
  for (const k of Object.keys(FIELDS)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sim-btn";
    b.textContent = FIELDS[k].name;
    b.setAttribute("aria-label", `Feltet ${FIELDS[k].name.toLowerCase()}`);
    b.setAttribute("aria-pressed", String(k === key));
    b.addEventListener(
      "click",
      () => {
        key = k;
        for (const [kk, bb] of Object.entries(btns)) bb.setAttribute("aria-pressed", String(kk === k));
        render();
      },
      { signal },
    );
    btns[k] = b;
    controls.append(b);
  }

  // Vinkelfarten hjulet går mot der det står: arbeidet rundt kanten delt på arealet.
  function target() {
    if (!geom) return 0;
    const R = RPX / geom.s;
    const v = (SPIN * FIELDS[key].circ(pos[0], pos[1], R)) / (Math.PI * R * R);
    return Math.max(-SPIN_MAX, Math.min(SPIN_MAX, v));
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const size = Math.min(w - 16, h - 16);
    const ox = w / 2;
    const oy = h / 2;
    const s = size / (2 * L); // px per enhet
    const X = (x) => ox + x * s;
    const Y = (y) => oy - y * s;
    geom = { w, h, ox, oy, s };
    const f = FIELDS[key];
    let g = "";

    // Feltet som piler på et rutenett. Lengden vokser med kvadratroten av
    // styrken, så både svake og sterke områder kan leses.
    const n = 7;
    const step = (2 * L) / (n - 1);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = -L + i * step;
        const y = -L + j * step;
        if (Math.hypot(x, y) < 0.3) continue;
        const [fx, fy] = f.F(x, y);
        const mag = Math.hypot(fx, fy);
        if (mag < 1e-9) continue;
        const len = Math.max(10, Math.min(0.5 * step * s, 15 * Math.sqrt(mag)));
        const ux = fx / mag;
        const uy = fy / mag;
        const x0 = X(x) - (ux * len) / 2;
        const y0 = Y(y) + (uy * len) / 2;
        g += arrow(x0, y0, x0 + ux * len, y0 - uy * len, LABEL, 1.3);
      }
    }

    // Sirkelen om origo gjennom hjulet, med retningen mot klokka og arbeidet per runde.
    const r = Math.hypot(pos[0], pos[1]);
    if (r * s > 24) {
      g += circle(X(0), Y(0), r * s, { stroke: DERIVED, width: 1.5, dash: "5 4" });
      // En pilspiss på sirkelen øverst, mot klokka.
      const a = Math.PI / 2 + 0.25;
      const px = X(r * Math.cos(a));
      const py = Y(r * Math.sin(a));
      g += arrow(px + 6, py - 1, px - 2, py + 1, DERIVED, 1.5);
      const label = f.work(r);
      const ly = Math.max(14, Y(r) - 8);
      g += `<rect x="${(X(0) - 4.2 * label.length).toFixed(1)}" y="${(ly - 13).toFixed(1)}" width="${(8.4 * label.length).toFixed(1)}" height="17" rx="3" style="fill:var(--bg-elevated)" opacity="0.85"/>`;
      g += txt(X(0), ly, label, { fill: DERIVED, anchor: "middle", size: 12 });
    }

    // Hjulet, halvgjennomsiktig så sentrum eller aksen synes gjennom det.
    const cx = X(pos[0]);
    const cy = Y(pos[1]);
    g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${RPX}" style="fill:var(--bg-elevated)" opacity="0.6"/>`;
    g += circle(cx, cy, RPX, { stroke: MOVING, width: 1.6 });
    for (let k = 0; k < 4; k++) {
      const t = angle + (k * Math.PI) / 2;
      g += line(cx, cy, cx + RPX * Math.cos(t), cy - RPX * Math.sin(t), { color: MOVING, width: 3 });
    }
    g += circle(cx, cy, 3, { fill: MOVING, stroke: MOVING });
    if (f.center) {
      g += circle(X(0), Y(0), 3.5, { fill: LABEL, stroke: LABEL });
      // Etiketten står på motsatt side av hjulet når hjulet er nær sentrum.
      const near = Math.hypot(cx - X(0), cy - Y(0)) < RPX + 60;
      const toLeft = near && cx > X(0);
      g += txt(toLeft ? Math.min(X(0), cx - RPX) - 6 : Math.max(X(0), near ? cx + RPX : X(0)) + 7, Y(0) + 15, f.center, { size: 11, anchor: toLeft ? "end" : "start" });
    }
    if (!moved) {
      g += `<rect x="4" y="4" width="84" height="20" rx="3" style="fill:var(--bg-elevated)" opacity="0.9"/>`;
      g += txt(10, 18, "dra hjulet", { size: 12 });
    }

    stage.innerHTML = svg(w, h, g);
  }

  function toField(e) {
    const rect = stage.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * (geom.w / rect.width) - geom.ox) / geom.s;
    const y = -((e.clientY - rect.top) * (geom.h / rect.height) - geom.oy) / geom.s;
    return [Math.max(-L, Math.min(L, x)), Math.max(-L, Math.min(L, y))];
  }
  stage.style.cursor = "grab";
  stage.style.touchAction = "none";
  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (!geom) return;
      dragging = true;
      moved = true;
      stage.setPointerCapture?.(e.pointerId);
      pos = toField(e);
      render();
    },
    { signal },
  );
  stage.addEventListener(
    "pointermove",
    (e) => {
      if (!dragging || !geom) return;
      pos = toField(e);
      render();
    },
    { signal },
  );
  for (const ev of ["pointerup", "pointercancel"]) stage.addEventListener(ev, () => (dragging = false), { signal });

  onResize(render);
  render();
  animate({
    stage,
    signal,
    onFrame: (dt) => {
      // Hjulet får opp farten og bremser over et par tideler av et sekund, som et hjul med litt friksjon.
      spin += (target() - spin) * Math.min(1, 5 * dt);
      angle += spin * dt;
      render();
    },
  });
}
