/**
 * Klossene og veggen: en tung kloss M glir mot venstre mot en lett kloss m som
 * ligger i ro foran en vegg. Alle støt er elastiske, og det er ingen friksjon.
 * Øverst står klossene og tallet på støt så langt; under er tilstanden tegnet
 * som et punkt med koordinatene X = √M·V og Y = √m·v, der V og v er farten til
 * den tunge og den lette klossen, positiv mot høyre.
 *
 * Energien ½MV² + ½mv² = ½(X² + Y²) er den samme gjennom alle støtene, så
 * punktet ligger på sirkelen. Et støt mellom klossene bevarer impulsen
 * MV + mv = √M·X + √m·Y, så punktet hopper langs en rett linje med fast
 * stigning til det andre skjæringspunktet med sirkelen. Et støt mot veggen
 * snur v, så punktet hopper loddrett, Y → −Y. Hvert hopp er tegnet som en
 * korde. Den skraverte kilen mellom X-aksen og linja med vinkelen θ,
 * tan θ = √(m/M), er der 0 ≤ v ≤ V: begge går mot høyre og den lette tar ikke
 * igjen den tunge, så det blir ingen flere støt.
 *
 * Simuleringen er eksakt (hendelse for hendelse), med klossenes bredder tatt
 * med, og går i sakte film.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, svg, txt, line, circle, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const RATIOS = [
    [1, "M = m"],
    [100, "M = 100m"],
    [1e4, "M = 10 000m"],
  ];
  let ratio = 100;
  // Tilstand i enheter der den tunge starter med V = −1 og veggen står i 0.
  let st;
  let playing = true;

  function reset() {
    st = {
      t: 0,
      xs: 0.42, // venstre kant av den lette klossen
      xb: 0.92, // venstre kant av den tunge klossen
      v: 0,
      V: -0.38,
      n: 0,
      pts: [], // tilstanden etter hvert støt
      done: false,
    };
    st.pts.push(state());
    playing = true;
    anim?.start();
    render();
  }
  const WS = 0.06; // bredden til den lette klossen, i samme enhet
  const state = () => [Math.sqrt(ratio) * st.V, st.v];

  function toggle(text, aria, pressed, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sim-btn";
    b.textContent = text;
    b.setAttribute("aria-label", aria);
    b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", onClick, { signal });
    return b;
  }
  const btns = RATIOS.map(([r, text], i) =>
    toggle(text, `Massen til den tunge klossen: ${text}`, r === ratio, () => {
      ratio = r;
      btns.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
      reset();
    }),
  );
  const again = document.createElement("button");
  again.type = "button";
  again.className = "sim-btn";
  again.textContent = "Start på nytt";
  again.addEventListener("click", reset, { signal });
  controls.append(...btns, again);

  // Gå fram tida dt med alle støt som skjer underveis.
  function advance(dt) {
    const m = 1;
    const M = ratio;
    let left = dt;
    let guard = 0;
    while (left > 0 && guard++ < 20000) {
      let tb = Infinity; // til neste støt mellom klossene
      if (st.V < st.v) tb = (st.xb - (st.xs + WS)) / (st.v - st.V);
      let tw = Infinity; // til neste støt mot veggen
      if (st.v < 0) tw = st.xs / -st.v;
      const next = Math.min(tb, tw);
      if (next > left) {
        st.xs += st.v * left;
        st.xb += st.V * left;
        st.t += left;
        break;
      }
      st.xs += st.v * next;
      st.xb += st.V * next;
      st.t += next;
      left -= next;
      if (tb <= tw) {
        const v = ((m - M) * st.v + 2 * M * st.V) / (m + M);
        const V = ((M - m) * st.V + 2 * m * st.v) / (m + M);
        st.v = v;
        st.V = V;
      } else {
        st.v = -st.v;
        st.xs = 0;
      }
      st.n += 1;
      st.pts.push(state());
    }
    if (st.v >= 0 && st.V >= st.v) st.done = true;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const floor = 74;
    const x0 = 14; // veggen
    const L = w - x0 - 8; // en lengdeenhet i px
    let g = "";

    // Gulvet, veggen og klossene.
    g += line(x0, floor, w, floor, { color: FIXED, width: 2 });
    g += line(x0, floor, x0, floor - 58, { color: FIXED, width: 2.5 });
    for (let y = floor - 52; y <= floor; y += 8) g += line(x0, y, x0 - 6, y + 5, { color: FIXED, width: 1 });
    const sw = WS * L;
    const bwid = ratio === 1 ? sw : ratio === 100 ? 34 : 46; // like masser er like store
    const xs = x0 + st.xs * L;
    const xb = x0 + st.xb * L;
    if (xs < w) {
      g += `<rect x="${xs.toFixed(1)}" y="${(floor - sw).toFixed(1)}" width="${sw.toFixed(1)}" height="${sw.toFixed(1)}" style="fill:${MOVING}"/>`;
      g += txt(xs + sw / 2, floor - sw - 5, "m", { anchor: "middle" });
    }
    if (xb < w) {
      g += `<rect x="${xb.toFixed(1)}" y="${(floor - bwid).toFixed(1)}" width="${bwid}" height="${bwid}" style="fill:var(--indigo)"/>`;
      g += txt(xb + bwid / 2, floor - bwid - 5, "M", { anchor: "middle" });
    }
    g += txt(w - 8, 18, `${st.n} støt`, { anchor: "end", size: 15, fill: "var(--fg)" });

    // Tilstandssirkelen.
    const cx = w / 2;
    const top = floor + 26;
    const R = Math.max(20, Math.min(w / 2 - 44, (h - top - 26) / 2));
    const cy = top + R + 8;
    const R0 = Math.sqrt(ratio) * 0.38; // radien i (X, Y)
    const P = (p) => [cx + (p[0] / R0) * R, cy - (p[1] / R0) * R];
    const th = Math.atan(Math.sqrt(1 / ratio));
    // Kilen der det ikke blir flere støt.
    const ex = cx + R * Math.cos(th);
    const ey = cy - R * Math.sin(th);
    g += `<path d="M ${cx} ${cy} L ${cx + R} ${cy} A ${R} ${R} 0 0 0 ${ex.toFixed(1)} ${ey.toFixed(1)} Z" style="fill:${DERIVED}" opacity="0.25"/>`;
    g += line(cx, cy, ex, ey, { color: DERIVED, width: 1.4 });
    g += circle(cx, cy, R, { stroke: HINT, width: 1.2 });
    g += line(cx - R - 12, cy, cx + R + 12, cy, { color: LABEL, width: 1 });
    g += line(cx, cy + R + 10, cx, cy - R - 12, { color: LABEL, width: 1 });
    g += txt(cx + R + 4, cy - 6, "√M·V"); // utenfor sirkelen, så kordene ikke krysser den
    g += txt(cx + 6, cy - R - 2, "√m·v");
    if (th > 0.03) g += txt(cx + 0.55 * R * Math.cos(th / 2) + 4, cy - 0.55 * R * Math.sin(th / 2) + 4, "θ", { fill: DERIVED });

    // Kordene og tilstanden nå.
    let d = "";
    for (let i = 0; i < st.pts.length; i++) {
      const [x, y] = P(st.pts[i]);
      d += `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    g += `<path d="${d}" fill="none" stroke="${LABEL}" stroke-width="${ratio > 100 ? 0.7 : 1.2}"/>`;
    const now = P(state());
    g += circle(now[0], now[1], 5, { fill: MOVING, stroke: MOVING, width: 0 });

    stage.innerHTML = svg(w, h, g);
  }

  let anim = null;
  reset();
  anim = animate({
    stage,
    signal,
    running: () => playing,
    onFrame: (dt) => {
      advance(dt * 0.55);
      // Hold bildet når den tunge klossen har forlatt scenen.
      if (st.done && st.xb > 1.15) playing = false;
      render();
    },
  });
  onResize(render);
}
