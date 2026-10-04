/**
 * Ei tynn rektangulær plate med sidene a og b roterer med fast vinkelfart om
 * en loddrett aksel gjennom massesenteret. Akselen ligger i plateplanet og
 * holdes av to lagre. Vinkelen β mellom akselen og sida b velges med en
 * glidebryter.
 *
 * Dreieimpulsen L = Iω regnes i hovedaksene til plata (I₁ = Mb²/12 om en
 * akse langs a, I₂ = Ma²/12 om en akse langs b) og tegnes som oransje pil.
 * Er akselen ikke en hovedakse, peker L skrått, roterer med plata og sveiper
 * en kjegle. Endringen dL/dt = ω × L må komme fra et kraftpar i lagrene,
 * F = ωL_u/2H langs plateplanet, motsatt rettet i øvre og nedre lager.
 *
 * Enheter: M = b = 1, og L tegnes i enheten Mb²ω/12. Kontrakt:
 * default-eksportert init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, slider, button, animate, svg, txt, line, poly, arrow, projector,
  FIXED, HINT, DERIVED, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const ALPHA = 0.3; // kameraets hevning over vannrett
  const OMEGA = (2 * Math.PI) / 6; // én omdreining på 6 s
  const ZB = 0.95; // lagrenes høyde over og under massesenteret
  const XF = 0.98; // rammens avstand fra akselen
  const KL = 0.65; // lengden av L-pila per enhet Mb²ω/12
  const KF = 1.1; // lengden av kraftpilene per enhet av L_u

  let ratio = 2; // b/a
  let beta = Math.atan(1 / ratio); // langs diagonalen
  let phi = 0.5;

  const betaSlider = slider({
    text: "Aksens vinkel",
    aria: "Vinkelen mellom akselen og sida b",
    min: 0,
    max: 90,
    step: 1,
    value: Math.round((beta * 180) / Math.PI),
    format: (v) => `${v}°`,
    signal,
    onInput: (v) => {
      beta = (v * Math.PI) / 180;
      render();
    },
  });
  const betaInput = betaSlider.querySelector("input");

  controls.append(
    betaSlider,
    slider({
      text: "Sideforhold b/a",
      aria: "Forholdet mellom sidene b og a",
      min: 1,
      max: 3,
      step: 0.1,
      value: ratio,
      format: (v) => nb(v),
      signal,
      onInput: (v) => {
        ratio = v;
        render();
      },
    }),
    button(
      "Langs diagonalen",
      "Legg akselen langs diagonalen til plata",
      () => {
        betaInput.value = String(Math.round((Math.atan(1 / ratio) * 180) / Math.PI));
        betaInput.dispatchEvent(new Event("input"));
      },
      signal,
    ),
  );

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    // Tegningen går fra rammen ved x = −XF til kraftpilene ved x ≈ 0,85, og fra
    // under nedre lager til ω-pila over øvre.
    const s = Math.min((h - 24) / 2.5, (w - 12) / 1.9);
    const cx = w / 2 + 0.07 * s;
    const cy = h / 2 + 0.15 * s;
    const P = projector(cx, cy, s, ALPHA);

    const a = 1 / ratio;
    const b = 1;
    const sb = Math.sin(beta);
    const cb = Math.cos(beta);
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    // Punkt i plateplanet: u langs den vannrette retningen i planet, z opp.
    const Q = (u, z) => P(u * cp, u * sp, z);

    // Hovedtreghetsmomentene i enheten Mb²/12, og L i plateplanet.
    const I1 = b * b;
    const I2 = a * a;
    const Lu = sb * cb * (I2 - I1);
    const Lz = I1 * sb * sb + I2 * cb * cb;

    let g = "";

    // Rammen med lagrene: fast, i planet y = 0.
    const [fxt, fyt] = P(-XF, 0, ZB);
    const [fxb, fyb] = P(-XF, 0, -ZB);
    g += line(fxt, fyt, fxb, fyb, { color: FIXED, width: 2.5 });
    for (let z = -ZB + 0.08; z < ZB; z += 0.14) {
      const [hx, hy] = P(-XF, 0, z);
      g += line(hx, hy, hx - 6, hy + 6, { color: FIXED, width: 1 });
    }
    const [bxt, byt] = P(0, 0, ZB);
    const [bxb, byb] = P(0, 0, -ZB);
    g += line(fxt, fyt, bxt, byt, { color: FIXED, width: 2.5 });
    g += line(fxb, fyb, bxb, byb, { color: FIXED, width: 2.5 });

    // Akselen.
    const [ax0, ay0] = P(0, 0, -ZB - 0.1);
    const [ax1, ay1] = P(0, 0, ZB + 0.12);
    g += line(ax0, ay0, ax1, ay1, { color: FIXED, width: 2.5 });

    // Plata. Sida b ligger langs e₂, som danner vinkelen β med akselen.
    const e1 = [cb, -sb];
    const e2 = [sb, cb];
    const corner = (i, j) => Q(i * (a / 2) * e1[0] + j * (b / 2) * e2[0], i * (a / 2) * e1[1] + j * (b / 2) * e2[1]);
    const pts = [corner(1, 1), corner(1, -1), corner(-1, -1), corner(-1, 1), corner(1, 1)];
    let d = "";
    pts.forEach(([x, y], i) => {
      d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    });
    g += `<path d="${d}Z" style="fill:${MOVING}" fill-opacity="0.18" stroke="${MOVING}" stroke-width="2" stroke-linejoin="round"/>`;

    // Sidene a og b, merket når plata vender mot leseren.
    const face = Math.min(1, Math.max(0, (Math.abs(cp) - 0.35) / 0.35));
    if (face > 0) {
      const off = 0.1;
      const [la, lya] = Q((b / 2 + off) * e2[0], (b / 2 + off) * e2[1]);
      const [lb, lyb] = Q((a / 2 + off) * e1[0], (a / 2 + off) * e1[1]);
      g += txt(la, lya + 4, "a", { anchor: "middle", opacity: face });
      g += txt(lb, lyb + 4, "b", { anchor: "middle", opacity: face });
    }

    // Kjeglen L sveiper, og L selv fra massesenteret.
    const rho = Math.abs(Lu) * KL;
    if (rho > 0.02) {
      const cone = [];
      for (let i = 0; i <= 60; i++) {
        const t = (2 * Math.PI * i) / 60;
        cone.push(P(rho * Math.cos(t), rho * Math.sin(t), Lz * KL));
      }
      g += poly(cone, `stroke="${DERIVED}" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.6"`);
      const [o1x, o1y] = P(0, 0, Lz * KL);
      const [o2x, o2y] = P(0, 0, 0);
      g += line(o2x, o2y, o1x, o1y, { color: HINT, width: 1, dash: "3 4" });
    }
    const [lx0, ly0] = P(0, 0, 0);
    const [lx1, ly1] = Q(Lu * KL, Lz * KL);
    g += arrow(lx0, ly0, lx1, ly1, DERIVED, 2.8);
    const lLen = Math.hypot(lx1 - lx0, ly1 - ly0) || 1;
    g += txt(lx1 + ((lx1 - lx0) / lLen) * 10 + 6, ly1 + ((ly1 - ly0) / lLen) * 10 + 4, "L", { fill: DERIVED });
    g += `<circle cx="${lx0.toFixed(1)}" cy="${ly0.toFixed(1)}" r="3" style="fill:${FIXED}"/>`;

    // Lagrene.
    for (const [x, y] of [[bxt, byt], [bxb, byb]]) {
      g += `<rect x="${(x - 8).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="16" height="14" rx="2" style="fill:var(--bg-elevated)" stroke="${FIXED}" stroke-width="2"/>`;
    }

    // Kraftparet fra lagrene, langs plateplanet og motsatt rettet.
    const F = Lu * KF;
    if (Math.abs(F) > 0.025) {
      const [tx, ty] = P(F * cp, F * sp, ZB);
      const [ux, uy] = P(-F * cp, -F * sp, -ZB);
      const k = (x0, y0, x1, y1) => {
        const l = Math.hypot(x1 - x0, y1 - y0) || 1;
        return [x0 + ((x1 - x0) / l) * 9, y0 + ((y1 - y0) / l) * 9];
      };
      const [t0x, t0y] = k(bxt, byt, tx, ty);
      const [u0x, u0y] = k(bxb, byb, ux, uy);
      g += arrow(t0x, t0y, tx, ty, LABEL, 2);
      g += arrow(u0x, u0y, ux, uy, LABEL, 2);
      // Etikettene rett utenfor pilspissene, så de ikke treffer ω-pila over lageret.
      const tip = (x0, y0, x1, y1, label) => {
        const l = Math.hypot(x1 - x0, y1 - y0) || 1;
        return txt(x1 + ((x1 - x0) / l) * 14, y1 + ((y1 - y0) / l) * 14 + 4, label, { anchor: "middle" });
      };
      g += tip(bxt, byt, tx, ty, "F");
      g += tip(bxb, byb, ux, uy, "−F");
    }

    // Vinkelhastigheten: pil langs akselen over øvre lager, med dreieretningen.
    const zt = ZB + 0.12;
    const [wx0, wy0] = P(0, 0, zt);
    const [wx1, wy1] = P(0, 0, zt + 0.28);
    g += arrow(wx0, wy0, wx1, wy1, LABEL, 1.8);
    const rot = [];
    for (let i = 0; i <= 20; i++) {
      const u = 0.15 * Math.PI + (1.2 * Math.PI * i) / 20;
      rot.push(P(0.16 * Math.cos(u), 0.16 * Math.sin(u), zt + 0.1));
    }
    g += poly(rot, `stroke="${LABEL}" stroke-width="1.3"`);
    const [ex, ey] = rot[rot.length - 1];
    const [fx, fy] = rot[rot.length - 2];
    g += arrow(fx, fy, ex + (ex - fx) * 2, ey + (ey - fy) * 2, LABEL, 1.3);
    g += txt(wx1 + 9, wy1 + 8, "ω");

    stage.innerHTML = svg(w, h, g);
  }

  onResize(render);
  render();
  animate({
    stage,
    signal,
    onFrame: (dt) => {
      phi = (phi + OMEGA * dt) % (2 * Math.PI);
      render();
    },
  });
}
