// Обложки проектов рисуются кодом: у каждого проекта свой мотив и палитра.
// variant 0 — обложка, 1 — экран телефона, 2 — крупный план.

let uid = 0;

const W = 800;
const H = 600;

function frame(p, id, body, dark = false) {
  const [a, b, c] = p.colors;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
    <radialGradient id="${id}glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/></linearGradient>
    <linearGradient id="${id}rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".6"/></linearGradient>
    <filter id="${id}blur"><feGaussianBlur stdDeviation="40"/></filter>
    <filter id="${id}soft" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#2a1530" flood-opacity=".28"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${id}bg)"/>
  <g filter="url(#${id}blur)" opacity="${dark ? 0.55 : 0.7}">
    <circle cx="120" cy="90" r="190" fill="${dark ? b : "#fff"}" opacity=".5"/>
    <circle cx="700" cy="520" r="230" fill="${c}"/>
  </g>
  ${body}
</svg>`;
}

const glassRect = (id, x, y, w, h, r, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#${id}glass)" stroke="url(#${id}rim)" stroke-width="1.6" ${extra}/>`;

const motifs = {
  cards(p, id) {
    const card = (x, y, rot, op) => `<g transform="translate(${x} ${y}) rotate(${rot})" filter="url(#${id}soft)" opacity="${op}">
      ${glassRect(id, -170, -105, 340, 210, 26)}
      <rect x="-140" y="-62" width="46" height="34" rx="8" fill="#fff" opacity=".75"/>
      <path d="M-140 -45h46M-117 -62v34" stroke="${p.colors[1]}" stroke-width="1.5" opacity=".6"/>
      <circle cx="118" cy="-58" r="16" fill="#fff" opacity=".7"/><circle cx="138" cy="-58" r="16" fill="#fff" opacity=".4"/>
      <g fill="#fff" opacity=".9">${[0, 1, 2, 3].map((g) => [0, 1, 2, 3].map((d) => `<circle cx="${-138 + g * 66 + d * 11}" cy="28" r="3.2"/>`).join("")).join("")}</g>
      <rect x="-140" y="56" width="120" height="10" rx="5" fill="#fff" opacity=".6"/>
      <rect x="70" y="56" width="70" height="10" rx="5" fill="#fff" opacity=".45"/>
    </g>`;
    return card(330, 360, -14, 0.75) + card(420, 300, -4, 0.9) + card(470, 250, 8, 1);
  },
  rings(p, id) {
    const ring = (r, col, frac, w) => {
      const len = 2 * Math.PI * r;
      return `<circle r="${r}" fill="none" stroke="${col}" stroke-opacity=".22" stroke-width="${w}"/>
        <circle r="${r}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${len * frac} ${len}" transform="rotate(-90)"/>`;
    };
    return `<g transform="translate(400 300)" filter="url(#${id}soft)">
      <circle r="210" fill="#0f2a24" opacity=".86"/>
      ${ring(170, "#ff5f7a", 0.82, 34)}${ring(126, "#b6ff5c", 0.66, 34)}${ring(82, "#5ce1ff", 0.94, 34)}
      <path d="M-14 -170l14 -0M-12 -126h12M-10 -82h10" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>
    </g>
    ${glassRect(id, 560, 70, 190, 96, 24)}
    <text x="580" y="112" font-family="Inter Tight, sans-serif" font-weight="700" font-size="34" fill="#fff">12 480</text>
    <text x="582" y="142" font-family="Inter Tight, sans-serif" font-size="17" fill="#fff" opacity=".8">шагов сегодня</text>`;
  },
  grid(p, id) {
    let out = "";
    const kinds = ["btn", "toggle", "avatar", "chip", "input", "check", "slider", "icon"];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        const x = 80 + c * 132;
        const y = 70 + r * 118;
        const k = kinds[(r * 5 + c * 3) % kinds.length];
        out += glassRect(id, x, y, 116, 100, 20);
        const cx = x + 58;
        const cy = y + 50;
        if (k === "btn") out += `<rect x="${cx - 38}" y="${cy - 14}" width="76" height="28" rx="14" fill="#2b2a6b"/><rect x="${cx - 18}" y="${cy - 3}" width="36" height="6" rx="3" fill="#fff"/>`;
        if (k === "toggle") out += `<rect x="${cx - 26}" y="${cy - 15}" width="52" height="30" rx="15" fill="#34c759"/><circle cx="${cx + 11}" cy="${cy}" r="12" fill="#fff"/>`;
        if (k === "avatar") out += `<circle cx="${cx}" cy="${cy}" r="22" fill="#fff" opacity=".85"/><circle cx="${cx}" cy="${cy - 5}" r="8" fill="${p.colors[2]}"/><path d="M${cx - 13} ${cy + 15}q13 -14 26 0" fill="${p.colors[2]}"/>`;
        if (k === "chip") out += `<rect x="${cx - 40}" y="${cy - 12}" width="80" height="24" rx="12" fill="#fff" opacity=".85"/><circle cx="${cx - 26}" cy="${cy}" r="5" fill="${p.colors[2]}"/><rect x="${cx - 16}" y="${cy - 3}" width="44" height="6" rx="3" fill="#2b2a6b" opacity=".5"/>`;
        if (k === "input") out += `<rect x="${cx - 44}" y="${cy - 14}" width="88" height="28" rx="9" fill="#fff" opacity=".9"/><rect x="${cx - 34}" y="${cy - 3}" width="2" height="8" fill="#2b2a6b"/>`;
        if (k === "check") out += `<rect x="${cx - 15}" y="${cy - 15}" width="30" height="30" rx="9" fill="#2b2a6b"/><path d="M${cx - 7} ${cy}l5 5 10 -10" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
        if (k === "slider") out += `<rect x="${cx - 42}" y="${cy - 3}" width="84" height="6" rx="3" fill="#fff" opacity=".7"/><rect x="${cx - 42}" y="${cy - 3}" width="50" height="6" rx="3" fill="#2b2a6b"/><circle cx="${cx + 8}" cy="${cy}" r="11" fill="#fff"/>`;
        if (k === "icon") out += `<path d="M${cx} ${cy - 18}l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1z" fill="#fff"/>`;
      }
    }
    return out;
  },
  type(p, id) {
    const rows = ["KINETIC", "FEST·26", "KINETIC"];
    return `${rows
      .map((t, i) => `<text x="${-60 + i * 40}" y="${210 + i * 170}" font-family="Inter Tight, sans-serif" font-weight="900" font-size="200" letter-spacing="-14" fill="${i === 1 ? p.colors[2] : p.colors[1]}" ${i === 1 ? "" : `fill-opacity=".95"`}>${t}</text>`)
      .join("")}
      <circle cx="610" cy="300" r="120" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 10"/>
      <text font-family="Instrument Serif, serif" font-style="italic" font-size="64" fill="#fff" x="520" y="318">музыка</text>`;
  },
  route(p, id) {
    let grid = "";
    for (let i = 0; i < 12; i++) grid += `<path d="M${i * 72} 0V600" stroke="#fff" stroke-opacity=".12"/>`;
    for (let i = 0; i < 9; i++) grid += `<path d="M0 ${i * 72}H800" stroke="#fff" stroke-opacity=".12"/>`;
    return `${grid}
      <path d="M150 440C260 160 520 120 650 210" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="2 14" stroke-linecap="round"/>
      <circle cx="150" cy="440" r="14" fill="#fff"/><circle cx="150" cy="440" r="30" fill="#fff" opacity=".25"/>
      <circle cx="650" cy="210" r="14" fill="#fff"/><circle cx="650" cy="210" r="30" fill="#fff" opacity=".25"/>
      <path d="M420 178l30 6 22 -18 8 4 -14 22 26 6 8 -8 6 3 -6 14 -3 14 -6 1 -2 -11 -26 -1 -12 24 -8 0 4 -25 -29 -8z" fill="#fff" transform="rotate(8 450 190)"/>
      ${glassRect(id, 90, 70, 260, 110, 26)}
      <text x="116" y="126" font-family="Inter Tight, sans-serif" font-weight="700" font-size="40" fill="#fff">MOW → LIS</text>
      <text x="118" y="158" font-family="JetBrains Mono, monospace" font-size="16" fill="#fff" opacity=".85">14 ИЮН · от 18 400 ₽</text>`;
  },
  wave(p, id) {
    let bars = "";
    for (let i = 0; i < 46; i++) {
      const h = 30 + Math.abs(Math.sin(i * 0.55) * 120 + Math.sin(i * 1.7) * 40);
      bars += `<rect x="${110 + i * 13}" y="${430 - h / 2}" width="7" height="${h}" rx="3.5" fill="#fff" opacity="${i < 26 ? 0.95 : 0.4}"/>`;
    }
    return `<g filter="url(#${id}soft)">
      <rect x="250" y="70" width="300" height="230" rx="18" fill="#fff" opacity=".9"/>
      <path d="M400 92v186" stroke="${p.colors[2]}" stroke-width="2" opacity=".4"/>
      <path d="M280 120h90M280 140h80M280 160h96M280 180h70M430 120h90M430 140h84M430 160h70" stroke="${p.colors[2]}" stroke-width="5" stroke-linecap="round" opacity=".35"/>
      <circle cx="475" cy="230" r="34" fill="${p.colors[1]}" opacity=".9"/><path d="M466 214v32l26 -16z" fill="#fff"/>
    </g>${bars}`;
  },
  orb(p, id) {
    return `<g transform="translate(400 300)">
      ${[230, 180, 130].map((r, i) => `<circle r="${r}" fill="none" stroke="#fff" stroke-opacity="${0.18 + i * 0.1}" stroke-width="1.5"/>`).join("")}
      <circle r="110" fill="url(#${id}glass)" stroke="url(#${id}rim)" stroke-width="2" filter="url(#${id}soft)"/>
      <circle r="52" fill="#3b3a8f" opacity=".85"/><circle r="22" fill="#0e0d2a"/>
      <circle cx="-18" cy="-20" r="10" fill="#fff" opacity=".9"/>
      <ellipse cx="-30" cy="-60" rx="54" ry="22" fill="url(#${id}glow)" opacity=".8"/>
    </g>
    ${glassRect(id, 70, 440, 230, 86, 24)}
    <circle cx="112" cy="483" r="20" fill="#34c759"/><path d="M104 483l6 6 11 -12" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <text x="146" y="478" font-family="Inter Tight, sans-serif" font-weight="700" font-size="20" fill="#2b2a6b">Врач онлайн</text>
    <text x="146" y="502" font-family="Inter Tight, sans-serif" font-size="16" fill="#2b2a6b" opacity=".7">через 5 минут</text>`;
  },
  orb3d(p, id) {
    return `<defs><linearGradient id="${id}gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6e0"/><stop offset=".35" stop-color="#d9a86c"/><stop offset=".6" stop-color="#8a5a35"/><stop offset="1" stop-color="#f3d3a1"/></linearGradient></defs>
      <ellipse cx="400" cy="480" rx="200" ry="26" fill="#6b4a3a" opacity=".22"/>
      <g transform="translate(400 300) rotate(-18)" filter="url(#${id}soft)">
        <ellipse rx="170" ry="150" fill="none" stroke="url(#${id}gold)" stroke-width="44"/>
        <ellipse rx="170" ry="150" fill="none" stroke="#fff" stroke-width="3" stroke-opacity=".6" transform="scale(1.12)"/>
        <g transform="translate(0 -168)">
          <path d="M-46 0l46 -60 46 60 -46 40z" fill="#eaf6ff" stroke="#fff" stroke-width="2"/>
          <path d="M-46 0h92M0 -60v100M-23 -30l23 70 23 -70" stroke="#9fc9ea" stroke-width="1.5" fill="none"/>
        </g>
      </g>
      ${[[180, 140], [640, 120], [660, 420], [130, 380]].map(([x, y]) => `<path d="M${x} ${y - 16}q2 14 16 16q-14 2 -16 16q-2 -14 -16 -16q14 -2 16 -16z" fill="#fff"/>`).join("")}
      ${glassRect(id, 560, 470, 180, 64, 32)}
      <text x="600" y="510" font-family="Inter Tight, sans-serif" font-weight="700" font-size="20" fill="#5a3d2e">Покрутить 360°</text>`;
  },
  spark(p, id) {
    const star = (x, y, s, o) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -60C6 -18 18 -6 60 0C18 6 6 18 0 60C-6 18 -18 6 -60 0C-18 -6 -6 -18 0 -60z" fill="#fff" opacity="${o}"/>`;
    return `${star(250, 260, 2.1, 0.95)}${star(410, 150, 0.8, 0.8)}${star(360, 400, 0.55, 0.7)}
      <g filter="url(#${id}soft)">
        ${glassRect(id, 440, 230, 290, 84, 26)}
        <rect x="466" y="256" width="190" height="10" rx="5" fill="#fff"/><rect x="466" y="280" width="140" height="10" rx="5" fill="#fff" opacity=".7"/>
        <rect x="470" y="340" width="260" height="140" rx="26" fill="#fff" opacity=".92"/>
        <rect x="494" y="366" width="96" height="88" rx="14" fill="${p.colors[1]}" opacity=".7"/>
        <rect x="604" y="366" width="102" height="14" rx="7" fill="${p.colors[2]}" opacity=".6"/>
        <rect x="604" y="392" width="80" height="14" rx="7" fill="${p.colors[2]}" opacity=".35"/>
        <rect x="604" y="430" width="70" height="24" rx="12" fill="${p.colors[2]}"/>
      </g>`;
  },
  toggles(p, id) {
    const tog = (x, y, on) => `<rect x="${x}" y="${y}" width="92" height="54" rx="27" fill="${on ? "#34c759" : "#fff"}" fill-opacity="${on ? 1 : 0.4}"/><circle cx="${on ? x + 65 : x + 27}" cy="${y + 27}" r="22" fill="#fff"/>`;
    return `<circle cx="250" cy="280" r="150" fill="url(#${id}glow)"/>
      <g filter="url(#${id}soft)">
        <circle cx="250" cy="260" r="70" fill="#fff8e1"/>
        <rect x="226" y="330" width="48" height="40" rx="10" fill="#fff" opacity=".85"/>
      </g>
      ${glassRect(id, 440, 110, 290, 380, 34)}
      <text x="470" y="170" font-family="Inter Tight, sans-serif" font-weight="700" font-size="28" fill="#fff">Гостиная</text>
      <text x="470" y="200" font-family="Inter Tight, sans-serif" font-size="17" fill="#fff" opacity=".85">22° · свет 70%</text>
      ${tog(470, 240, true)}${tog(600, 240, false)}${tog(470, 320, false)}${tog(600, 320, true)}
      <rect x="470" y="410" width="222" height="12" rx="6" fill="#fff" opacity=".4"/><rect x="470" y="410" width="150" height="12" rx="6" fill="#fff"/>`;
  },
};

function phone(p, id) {
  const [a, b, c] = p.colors;
  return `<g filter="url(#${id}soft)">
    <rect x="270" y="30" width="260" height="540" rx="46" fill="#111"/>
    <rect x="280" y="40" width="240" height="520" rx="38" fill="#fbf8f5"/>
    <rect x="360" y="54" width="80" height="22" rx="11" fill="#111"/>
    <rect x="298" y="96" width="120" height="14" rx="7" fill="#1b1918"/>
    <rect x="298" y="118" width="80" height="10" rx="5" fill="#1b1918" opacity=".35"/>
    <rect x="298" y="146" width="204" height="140" rx="22" fill="${b}"/>
    <rect x="298" y="146" width="204" height="140" rx="22" fill="url(#${id}glass)"/>
    <circle cx="470" cy="180" r="18" fill="#fff" opacity=".8"/>
    <rect x="316" y="246" width="110" height="12" rx="6" fill="#fff"/>
    ${[0, 1, 2].map((i) => `<rect x="298" y="${304 + i * 66}" width="204" height="54" rx="16" fill="#fff"/><circle cx="324" cy="${331 + i * 66}" r="14" fill="${[a, b, c][i]}"/><rect x="348" y="${322 + i * 66}" width="${90 - i * 14}" height="9" rx="4.5" fill="#1b1918" opacity=".7"/><rect x="348" y="${336 + i * 66}" width="60" height="7" rx="3.5" fill="#1b1918" opacity=".3"/>`).join("")}
    <rect x="350" y="538" width="100" height="5" rx="2.5" fill="#1b1918" opacity=".8"/>
  </g>`;
}

export function cover(p, variant = 0) {
  const id = `c${uid++}`;
  const dark = p.colors[0] === "#1c1a19";
  if (variant === 1) return frame(p, id, phone(p, id), dark);
  const body = motifs[p.motif](p, id);
  if (variant === 2) return frame(p, id, `<g transform="translate(-260 -200) scale(1.7)">${body}</g>`, dark);
  return frame(p, id, body, dark);
}
