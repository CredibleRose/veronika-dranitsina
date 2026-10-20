import { animate, createTimeline, createAnimatable, stagger, svg, utils } from "animejs";
import { PROFILE, FILTERS, PROJECTS, SKILLS, NEW_SKILLS, TIMELINE, AWARDS, FACTS } from "./content.js";
import { cover } from "./covers.js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
// Анимация всегда полная; упростить можно только вручную кнопкой,
// которую видят те, у кого в системе включено «уменьшение движения»
const systemCalm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionPref = (() => { try { return localStorage.getItem("motion"); } catch { return null; } })();
const reduced = motionPref === "calm";
document.documentElement.classList.toggle("calm", reduced);
if (systemCalm || reduced) {
  const b = document.createElement("button");
  b.className = "motion-toggle glass";
  b.textContent = reduced ? "✦ Включить анимацию" : "Упростить анимацию";
  b.addEventListener("click", () => {
    try { localStorage.setItem("motion", reduced ? "full" : "calm"); } catch {}
    location.reload();
  });
  document.body.appendChild(b);
}
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

// Запускает callback один раз, когда элемент появляется на экране
function onView(el, cb, { threshold = 0.2, once = true } = {}) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        cb(e.target);
        if (once) io.unobserve(e.target);
      }
    }
  }, { threshold });
  io.observe(el);
  return io;
}

// Следит за видимостью: анимации на паузе, когда блок вне экрана
function whileVisible(el, anims) {
  new IntersectionObserver(([e]) => {
    for (const a of anims()) e.isIntersecting ? a.play() : a.pause();
  }).observe(el);
}

function countUp(el, to, { duration = 1800, suffix = "", delay = 0 } = {}) {
  const decimals = Number.isInteger(to) ? 0 : 1;
  const o = { v: 0 };
  animate(o, {
    v: to,
    duration,
    delay,
    ease: "outExpo",
    onUpdate: () => { el.textContent = o.v.toFixed(decimals).replace(".", ",") + suffix; },
  });
}

/* ------------------------------------------------------------------ */
/* Liquid Glass: карта смещения для преломления краёв (только Chromium) */
/* ------------------------------------------------------------------ */

const supportsLiquid = !!navigator.userAgentData && CSS.supports("backdrop-filter", "blur(1px)");
let liquidId = 0;

function displacementMap(w, h, r, bezel) {
  const s = 0.5;
  const cw = Math.max(2, Math.round(w * s));
  const ch = Math.max(2, Math.round(h * s));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(cw, ch);
  const hw = w / 2;
  const hh = h / 2;
  for (let py = 0; py < ch; py++) {
    for (let px = 0; px < cw; px++) {
      const x = px / s - hw;
      const y = py / s - hh;
      const qx = Math.abs(x) - (hw - r);
      const qy = Math.abs(y) - (hh - r);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
      const d = -outside;
      let nx = 0;
      let ny = 0;
      let m = 0;
      if (d > 0 && d < bezel) {
        const t = 1 - d / bezel;
        m = 1 - Math.sqrt(1 - t * t);
        if (qx > 0 && qy > 0) {
          const len = Math.hypot(qx, qy) || 1;
          nx = (qx / len) * Math.sign(x);
          ny = (qy / len) * Math.sign(y);
        } else if (qx > qy) {
          nx = Math.sign(x);
        } else {
          ny = Math.sign(y);
        }
      }
      const i = (py * cw + px) * 4;
      img.data[i] = 128 + nx * m * 127;
      img.data[i + 1] = 128 + ny * m * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

function liquid(el, { scale = 46, blur = 3 } = {}) {
  if (!supportsLiquid) return;
  const id = `lg${liquidId++}`;
  const defs = $("#liquidDefs");
  const build = () => {
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    const r = Math.min(parseFloat(getComputedStyle(el).borderRadius) || 0, height / 2, width / 2);
    const map = displacementMap(width, height, r, Math.min(26, height / 2.2));
    let f = document.getElementById(id);
    if (!f) {
      f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      f.id = id;
      f.setAttribute("color-interpolation-filters", "sRGB");
      f.setAttribute("filterUnits", "userSpaceOnUse");
      f.setAttribute("primitiveUnits", "userSpaceOnUse");
      defs.appendChild(f);
    }
    f.setAttribute("x", 0);
    f.setAttribute("y", 0);
    f.setAttribute("width", width);
    f.setAttribute("height", height);
    f.innerHTML = `<feImage href="${map}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/>
      <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`;
    el.style.backdropFilter = `blur(${blur}px) url(#${id}) saturate(190%) brightness(1.04)`;
  };
  new ResizeObserver(build).observe(el);
}

/* ---------------- Подсветка стекла за курсором ---------------- */
if (finePointer) {
  document.addEventListener("pointermove", (e) => {
    const g = e.target.closest?.(".glass");
    if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty("--mx", `${e.clientX - r.left}px`);
    g.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });
}

/* ------------------------------ Курсор ------------------------------ */
function initCursor() {
  if (!finePointer) return;
  const root = $(".cursor");
  const dot = createAnimatable($(".cursor-dot"), { x: 60, y: 60, ease: "out(2)" });
  const ring = createAnimatable($(".cursor-ring"), { x: 420, y: 420, ease: "out(3)" });
  const label = $(".cursor-label");
  window.addEventListener("pointermove", (e) => {
    dot.x(e.clientX); dot.y(e.clientY);
    ring.x(e.clientX); ring.y(e.clientY);
    const t = e.target.closest?.("[data-cursor], a, button, input");
    const kind = t?.dataset.cursor || (t ? "link" : "");
    root.className = "cursor" + (kind ? ` is-${kind}` : "");
    label.textContent = kind === "view" ? "Смотреть" : kind === "drag" ? "Тяни" : "";
  }, { passive: true });
}

/* --------------------------- Магнитные кнопки --------------------------- */
function initMagnetic() {
  if (!finePointer) return;
  for (const el of $$("[data-magnetic]")) {
    const a = createAnimatable(el, { x: 500, y: 500, ease: "out(3)" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      a.x((e.clientX - r.left - r.width / 2) * 0.35);
      a.y((e.clientY - r.top - r.height / 2) * 0.45);
    });
    el.addEventListener("pointerleave", () => { a.x(0); a.y(0); });
  }
}

/* --------------------------- Разбивка заголовков --------------------------- */
function splitWords(el) {
  const out = [];
  const wrap = (word, em) => `<span class="w"><span class="wi">${em ? `<em>${word}</em>` : word}</span></span>`;
  for (const node of el.childNodes) {
    const text = node.textContent.trim();
    if (!text) continue;
    const em = node.nodeName === "EM";
    out.push(text.split(/\s+/).map((w) => wrap(w, em)).join(" "));
  }
  el.innerHTML = out.join(" ");
  return $$(".wi", el);
}

function initHeadings() {
  for (const h of $$(".section-head .split")) {
    const words = splitWords(h);
    utils.set(words, { y: "110%", rotate: 6 });
    onView(h, () => animate(words, { y: "0%", rotate: 0, duration: 1100, delay: stagger(70), ease: "outExpo" }), { threshold: 0.4 });
  }
  for (const el of $$(".eyebrow, .lead")) {
    utils.set(el, { opacity: 0, y: 20 });
    onView(el, () => animate(el, { opacity: 1, y: 0, duration: 900, ease: "outExpo" }));
  }
}

/* -------------------------------- HERO -------------------------------- */
function buildHero() {
  const [first, second] = PROFILE.latin;
  const pretty = second[0] + second.slice(1).toLowerCase();
  const name = $("#heroName");
  name.setAttribute("aria-label", PROFILE.name);
  name.innerHTML = [first, pretty]
    .map((line) => `<span class="line" aria-hidden="true">${[...line].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`)
    .join("");
  $("#heroStatus").textContent = PROFILE.status;
  $("#heroCity").textContent = PROFILE.city;
  $("#heroTag").textContent = PROFILE.tagline;
  $("#heroIntro").textContent = PROFILE.intro;
  // Главное фото с запасным вариантом, если файла ещё нет
  const probe = new Image();
  probe.onload = () => {
    for (const id of ["#heroPhoto", "#islandPhoto", "#lockPhoto"]) $(id).src = PROFILE.heroPhoto;
    document.documentElement.classList.add("has-hero-photo");
  };
  $("#heroPhoto").src = PROFILE.photo;
  probe.src = PROFILE.heroPhoto;
  $("#footName").textContent = PROFILE.name;
  $("#islandMail").textContent = PROFILE.email;
  $("#islandSub").textContent = PROFILE.status;

  // Строки имени разъезжаются при прокрутке
  const lines = $$(".hero-name .line");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const p = Math.min(window.scrollY / window.innerHeight, 1.2);
      lines[0].style.transform = `translateX(${-p * 12}vw)`;
      lines[1].style.transform = `translateX(${p * 9}vw)`;
      ticking = false;
    });
  }, { passive: true });

  // 3D-наклон «телефона» с фото
  const phone = $(".hero-photo");
  if (finePointer) {
    const tilt = createAnimatable(phone, { rotateX: 700, rotateY: 700, ease: "out(3)" });
    window.addEventListener("pointermove", (e) => {
      tilt.rotateY(((e.clientX / innerWidth) * 2 - 1) * 14);
      tilt.rotateX(-((e.clientY / innerHeight) * 2 - 1) * 10);
    }, { passive: true });
  }
}

function heroEntrance() {
  const tl = createTimeline({ defaults: { ease: "outExpo", duration: 1300 } });
  tl.add(".hero-name .ch", { y: ["115%", "0%"], rotateX: [-80, 0], delay: stagger(45) })
    .add(".hero-top .chip", { opacity: [0, 1], y: [-20, 0], delay: stagger(90) }, "-=1100")
    .add(".hero-photo", { opacity: [0, 1], y: [120, 0], rotate: [8, 0], scale: [0.8, 1], duration: 1600, ease: "outElastic(1, .8)" }, "-=1200")
    .add(".hero-photo-badge", { opacity: [0, 1], x: [-30, 0], scale: [0.6, 1], ease: "outBack(2)", duration: 900 }, "-=900")
    .add([".hero-tag", ".hero-intro", ".hero-actions .btn"], { opacity: [0, 1], y: [40, 0], delay: stagger(90) }, "-=1300")
    .add("#island", { opacity: [0, 1], y: [-60, 0], scale: [0.6, 1], duration: 1100, ease: "outElastic(1, .7)" }, "-=1200")
    .add("#tabbar", { opacity: [0, 1], y: [80, 0], duration: 1100, ease: "outElastic(1, .7)" }, "-=1000")
    .add(".scroll-cue", { opacity: [0, 1] }, "-=600");
  return tl;
}

function runIntro() {
  const intro = $("#intro");
  utils.set([".hero-name .ch"], { y: "115%" });
  utils.set([".hero-top .chip", ".hero-photo", ".hero-photo-badge", ".hero-tag", ".hero-intro", ".hero-actions .btn", "#island", "#tabbar", ".scroll-cue"], { opacity: 0 });
  if (reduced) {
    document.documentElement.classList.add("no-intro");
    heroEntrance().seek(99999);
    return;
  }
  // Заставку показываем один раз за сессию
  let seen = false;
  try { seen = sessionStorage.getItem("intro") === "1"; sessionStorage.setItem("intro", "1"); } catch {}
  if (seen) {
    intro.remove();
    heroEntrance();
    return;
  }
  const [l1, l2] = PROFILE.latin;
  const row = (t) => `<span class="row">${[...t].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`;
  $("#introName").innerHTML = row(l1) + row(l2[0] + l2.slice(1).toLowerCase());
  document.body.classList.add("locked");
  const counter = { v: 0 };
  const num = $("#introNum");
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    document.body.classList.remove("locked");
    const out = createTimeline({ defaults: { ease: "inOutExpo" } });
    out.add("#introName .ch", { y: [0, "-120%"], opacity: [1, 0], duration: 700, delay: stagger(25) })
      .add(intro, { clipPath: ["inset(0% 0% 0% 0%)", "inset(0% 0% 100% 0%)"], duration: 1000 }, "-=300")
      .call(() => { intro.remove(); }, "+=0");
    setTimeout(() => heroEntrance(), 900);
  };
  createTimeline({ onComplete: finish })
    .add("#introName .ch", { y: ["120%", "0%"], rotateX: [-90, 0], opacity: [0, 1], duration: 1000, delay: stagger(55), ease: "outExpo" })
    .add(counter, { v: 100, duration: 1900, ease: "inOutQuart", onUpdate: () => { num.textContent = String(Math.round(counter.v)).padStart(2, "0"); } }, 0)
    .add(".intro-line i", { scaleX: [0, 1], duration: 1900, ease: "inOutQuart" }, 0)
    .add(".intro-hint", { opacity: [0, 0.5], duration: 600 }, 200);
  intro.addEventListener("click", finish);
}

/* ------------------------------ Бегущая строка ------------------------------ */
function buildMarquee() {
  const words = ["UI/UX", "<em>motion</em>", "3D", "<em>дизайн-системы</em>", "прототипы", "<em>иллюстрация</em>", "исследования"];
  const chunk = `<span>${words.map((w) => `${w} <i></i>`).join(" ")}</span>`;
  const track = $("#marquee");
  track.innerHTML = chunk + chunk;
  const anim = animate(track, { x: ["0%", "-50%"], duration: 38000, ease: "linear", loop: true });
  // Скорость зависит от скорости прокрутки
  let last = window.scrollY;
  let speed = 1;
  const loop = () => {
    const v = Math.abs(window.scrollY - last);
    last = window.scrollY;
    speed += (1 + Math.min(v / 8, 6) - speed) * 0.08;
    anim.speed = speed;
    requestAnimationFrame(loop);
  };
  if (!reduced) loop(); else anim.pause();
}

/* --------------------------------- О себе --------------------------------- */
function buildAbout() {
  $("#aboutText").innerHTML = PROFILE.about.map((p) => `<p>${p}</p>`).join("");
  const eq = Array.from({ length: 5 }, () => "<i></i>").join("");
  const bars = Array.from({ length: 9 }, () => "<i></i>").join("");
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<line x1="${50 + Math.sin(a) * 40}" y1="${50 - Math.cos(a) * 40}" x2="${50 + Math.sin(a) * 44}" y2="${50 - Math.cos(a) * 44}" stroke="#1b1918" stroke-width="${i % 3 ? 1 : 2.2}" stroke-linecap="round"/>`;
  }).join("");
  $("#widgets").innerHTML = `
    <div class="widget w-l w-photo glass reveal-w"><img src="${PROFILE.photo}" alt="Фото дизайнера"><div class="cap glass"><span>Это я, честно</span><span class="mono">2026</span></div></div>
    <div class="widget w-s w-clock glass reveal-w"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#fff"/>${ticks}
      <line id="hH" x1="50" y1="50" x2="50" y2="28" stroke="#1b1918" stroke-width="4" stroke-linecap="round"/>
      <line id="hM" x1="50" y1="50" x2="50" y2="16" stroke="#1b1918" stroke-width="2.6" stroke-linecap="round"/>
      <line id="hS" x1="50" y1="58" x2="50" y2="12" stroke="#ff7a3c" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="3" fill="#ff7a3c"/></svg></div>
    <div class="widget w-s ring-w glass reveal-w"><small>Кофеин</small>
      <svg viewBox="0 0 70 70"><circle cx="35" cy="35" r="28" stroke="rgba(27,25,24,.08)"/><circle id="coffee" cx="35" cy="35" r="28" stroke="#c0763a" stroke-dasharray="175.9" stroke-dashoffset="175.9"/></svg>
      <b class="big" id="coffeeNum">0%</b></div>
    <div class="widget w-m w-music glass reveal-w"><div class="art"></div><div class="meta"><small>Сейчас играет</small><b>Cerrone — Supernature</b><span style="color:var(--ink-3)">плейлист «Кернинг»</span><div class="eq">${eq}</div></div></div>
    <div class="widget w-s glass reveal-w"><small>Вдохновение</small><b class="big">24°</b><span>Ясно, без<br>дедлайнов ☀︎</span></div>
    <div class="widget w-s glass reveal-w"><small>Фреймов сегодня</small><b class="big" id="framesNum">0</b><div class="bars">${bars}</div></div>
    <div class="widget w-m w-lang glass reveal-w"><div><small>Языки</small><b style="display:block;font-size:20px;letter-spacing:-.02em;margin-top:6px">Русский · English C1</b><span style="color:var(--ink-3)">Презентую проекты на обоих</span></div><div class="flags"><span class="flag">RU</span><span class="flag">EN</span></div></div>`;

  $("#stats").innerHTML = PROFILE.stats.map((s) => `<div class="stat glass"><b data-to="${s.value}" data-suffix="${s.suffix}">0</b><span>${s.label}</span></div>`).join("");

  const ws = $$(".reveal-w");
  utils.set(ws, { opacity: 0, scale: 0.85, y: 40 });
  onView($("#widgets"), () => {
    animate(ws, { opacity: 1, scale: 1, y: 0, duration: 1200, delay: stagger(70, { from: "first" }), ease: "outElastic(1, .75)" });
    animate("#coffee", { strokeDashoffset: 175.9 * 0.13, duration: 2000, delay: 500, ease: "outExpo" });
    countUp($("#coffeeNum"), 87, { suffix: "%", delay: 500 });
    countUp($("#framesNum"), 312, { delay: 600 });
    animate(".bars i", { scaleY: [0, (_, i) => 0.3 + Math.abs(Math.sin(i * 1.3)) * 0.7], duration: 1200, delay: stagger(60, { start: 600 }), ease: "outElastic(1, .6)" });
  });
  const eqAnim = $$(".eq i").map((bar, i) =>
    animate(bar, { scaleY: [0.2, 1, 0.45, 0.85, 0.3], duration: 1100 + i * 170, loop: true, alternate: true, ease: "inOutSine", autoplay: false }),
  );
  whileVisible($("#widgets"), () => eqAnim);
  const stats = $$(".stat");
  utils.set(stats, { opacity: 0, y: 50 });
  onView($("#stats"), () => {
    animate(stats, { opacity: 1, y: 0, duration: 1000, delay: stagger(90), ease: "outExpo" });
    for (const b of $$("#stats b")) countUp(b, +b.dataset.to, { suffix: b.dataset.suffix, delay: 200 });
  });

  // Живые стрелки часов
  const hands = () => {
    const d = new Date();
    const s = d.getSeconds();
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;
    $("#hS").setAttribute("transform", `rotate(${s * 6} 50 50)`);
    $("#hM").setAttribute("transform", `rotate(${m * 6} 50 50)`);
    $("#hH").setAttribute("transform", `rotate(${h * 30} 50 50)`);
  };
  hands();
  setInterval(hands, 1000);
}

/* --------------------------------- Работы --------------------------------- */
function buildWork() {
  const grid = $("#projects");
  grid.innerHTML = PROJECTS.map((p) => `
    <article class="card ${p.size}" data-id="${p.id}" data-tags="${p.tags.join(" ")}" data-cursor="view" tabindex="0" aria-label="${p.title}: ${p.kind}">
      <div class="card-inner">
        <div class="card-cover">${cover(p)}</div>
        <div class="card-shine"></div>
      </div>
      <span class="card-year glass">${p.year}</span>
      <div class="card-meta glass"><div><h3>${p.title}</h3><p>${p.kind}</p></div><span class="card-arrow">→</span></div>
    </article>`).join("");

  const cards = $$(".card", grid);
  utils.set(cards, { opacity: 0, y: 100 });
  for (const card of cards) {
    onView(card, () => animate(card, { opacity: 1, y: 0, duration: 1300, ease: "outExpo", delay: utils.random(0, 160) }), { threshold: 0.1 });
    const p = PROJECTS.find((x) => x.id === card.dataset.id);
    card.addEventListener("click", () => openSheet(p));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") openSheet(p); });
    if (finePointer) {
      const tilt = createAnimatable(card, { rotateX: 600, rotateY: 600, ease: "out(3)" });
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        tilt.rotateY((px - 0.5) * 10);
        tilt.rotateX(-(py - 0.5) * 10);
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
      });
      card.addEventListener("pointerleave", () => { tilt.rotateX(0); tilt.rotateY(0); });
    }
  }

  // Фильтры с «жидкой» плашкой
  const filters = $("#filters");
  filters.insertAdjacentHTML("beforeend", FILTERS.map((f, i) => `<button data-filter="${f.id}" class="${i === 0 ? "active" : ""}">${f.label}</button>`).join(""));
  const pill = $("#filterPill");
  movePill(pill, $("button.active", filters), false);
  filters.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    $$("button", filters).forEach((x) => x.classList.toggle("active", x === b));
    movePill(pill, b, true);
    const f = b.dataset.filter;
    const shown = [];
    for (const c of cards) {
      const on = f === "all" || c.dataset.tags.includes(f);
      c.classList.toggle("dim", !on);
      if (on) shown.push(c);
    }
    animate(shown, { scale: [0.94, 1], duration: 900, delay: stagger(50), ease: "outElastic(1, .6)" });
  });
  window.addEventListener("resize", () => movePill(pill, $("button.active", filters), false));
}

// Плашка перетекает: вытягивается в сторону движения и сжимается на месте
function movePill(pill, target, animated) {
  if (!target) return;
  const left = target.offsetLeft;
  const width = target.offsetWidth;
  const top = target.offsetTop;
  const height = target.offsetHeight;
  if (!animated || reduced) {
    utils.set(pill, { x: left, width, top, height });
    return;
  }
  const from = utils.get(pill, "x", false);
  const dist = Math.abs(left - from);
  createTimeline()
    .add(pill, { x: left, width, top, height, duration: 700, ease: "outElastic(1, .75)" })
    .add(pill, { scaleY: [1, 0.82, 1], scaleX: [1, 1 + Math.min(dist / 400, 0.35), 1], duration: 600, ease: "outQuad" }, 0);
}

/* ------------------------------ Карточка проекта ------------------------------ */
function openSheet(p) {
  const sheet = $("#sheet");
  const body = $("#sheetBody");
  body.innerHTML = `
    <div class="sheet-hero s-in">${cover(p, 0)}</div>
    <div class="sheet-kind s-in">${p.kind} · ${p.year}</div>
    <h2 id="sheetTitle" class="s-in">${p.title}</h2>
    <p class="summary s-in">${p.summary}</p>
    <div class="sheet-cols s-in">
      <div><small>Роль</small>${p.role}</div>
      <div><small>Команда</small>${p.team}</div>
      <div><small>Срок</small>${p.duration}</div>
      <div><small>Год</small>${p.year}</div>
    </div>
    <div class="tools s-in">${p.tools.map((t) => `<span>${t}</span>`).join("")}</div>
    <div class="sheet-results">${p.results.map((r) => `<div class="s-in"><b data-to="${r.value}" data-suffix="${r.suffix}">0</b><span>${r.label}</span></div>`).join("")}</div>
    <div class="sheet-gallery"><div class="s-in">${cover(p, 1)}</div><div class="s-in">${cover(p, 2)}</div></div>`;
  body.scrollTop = 0;
  sheet.classList.add("open");
  document.body.classList.add("locked");
  $("#sheetBackdrop").style.pointerEvents = "auto";
  animate("#sheetBackdrop", { opacity: 1, duration: 500, ease: "outQuad" });
  animate(sheet, { y: ["105%", "0%"], duration: reduced ? 1 : 900, ease: "outExpo" });
  animate($$(".s-in", body), { opacity: [0, 1], y: [40, 0], duration: 900, delay: stagger(60, { start: 250 }), ease: "outExpo" });
  for (const b of $$(".sheet-results b", body)) countUp(b, +b.dataset.to, { suffix: b.dataset.suffix, delay: 700 });
  $("#sheetClose").focus({ preventScroll: true });
}

function closeSheet() {
  const sheet = $("#sheet");
  if (!sheet.classList.contains("open")) return;
  document.body.classList.remove("locked");
  $("#sheetBackdrop").style.pointerEvents = "none";
  animate("#sheetBackdrop", { opacity: 0, duration: 400 });
  animate(sheet, { y: "105%", duration: reduced ? 1 : 600, ease: "inExpo", onComplete: () => sheet.classList.remove("open") });
}

/* --------------------------- Showreel на таймлайне --------------------------- */
function buildReel() {
  const stage = $("#reelStage");
  const squares = Array.from({ length: 9 }, (_, i) => `<i style="background:${["#ff9b71", "#ff7aa2", "#a98bff", "#7cc4ff", "#8fe3c0", "#ffd36e", "#ff7aa2", "#a98bff", "#ff9b71"][i]}"></i>`).join("");
  const card = (n) => `<div class="r-card rc${n}"><i style="top:10%;width:40%"></i><i style="top:24%;height:28%;border-radius:16px;background:rgba(255,255,255,.3)"></i><i style="top:58%"></i><i style="top:71%;width:60%"></i><i style="top:84%;width:45%"></i></div>`;
  stage.innerHTML = `
    <div class="r-grid"></div>
    <div class="layer"><div class="r-blob"></div></div>
    <div class="layer la">
      <div class="r-word r-big r-serif a1">Дизайн —</div>
      <div class="r-word r-big a2">это то,</div>
      <div class="r-word r-big a3">что <span class="r-serif">чувствуешь</span></div>
    </div>
    <div class="layer lb"><div class="r-icons">${squares}</div></div>
    <div class="layer lc"><div class="r-phones">${card(1)}${card(2)}${card(3)}</div></div>
    <div class="layer ld"><div class="r-stat"><div class="r-word r-num"><span id="rNum">0</span></div><div class="r-word r-serif r-label">проекта, сделанных с любовью</div>
      <svg class="r-underline" viewBox="0 0 600 40"><path d="M10 28C120 6 260 34 380 16S560 22 590 12" fill="none" stroke="#ff9b71" stroke-width="6" stroke-linecap="round"/></svg></div></div>
    <div class="layer le"><div class="r-outro"><div class="r-word r-big">${PROFILE.latin[0]} <span class="r-serif">${PROFILE.latin[1][0] + PROFILE.latin[1].slice(1).toLowerCase()}</span></div><div class="r-sub">Product designer · Showreel 2026</div></div></div>
    <div class="r-rec"><i></i>REC</div>
    <div class="r-tc" id="rTc">00:00:00</div>
    <div class="r-caption" id="rCap">Сцена 01 — Манифест</div>`;

  const cap = $("#rCap");
  const caption = (t) => () => { cap.textContent = t; };
  const num = { v: 0 };
  const under = svg.createDrawable(".r-underline path");

  utils.set(".reel-stage .r-word, .r-icons i, .r-card, .r-sub", { opacity: 0 });
  utils.set(under, { draw: "0 0" });

  const tl = createTimeline({ autoplay: false, loop: true, defaults: { ease: "outExpo", duration: 900 } });
  tl.call(caption("Сцена 01 — Манифест"), 0)
    .add(".r-blob", { scale: [0.2, 1.4], opacity: [0, 0.9], backgroundColor: ["#a98bff", "#ff7aa2"], duration: 3000, ease: "inOutSine" }, 0)
    .add(".a1", { opacity: [0, 1], y: [80, 0], rotate: [-6, 0], scale: [1.3, 1] }, 200)
    .add(".a1", { opacity: 0, y: -80, duration: 500, ease: "inExpo" }, 1200)
    .add(".a2", { opacity: [0, 1], scale: [0.4, 1], letterSpacing: ["0.4em", "-0.06em"] }, 1600)
    .add(".a2", { opacity: 0, scale: 1.6, duration: 500, ease: "inExpo" }, 2500)
    .add(".a3", { opacity: [0, 1], x: ["-40%", "0%"] }, 2900)
    .add(".a3 .r-serif", { color: ["#ffffff", "#ffb199"], duration: 800 }, 3300)
    .add(".a3", { opacity: 0, x: "40%", duration: 600, ease: "inExpo" }, 4200)

    .call(caption("Сцена 02 — Формы и системы"), 4800)
    .add(".reel-stage", { backgroundColor: ["#121011", "#211a35"], duration: 1200, ease: "inOutSine" }, 4600)
    .add(".r-blob", { scale: 0.6, backgroundColor: "#7cc4ff", duration: 1500, ease: "inOutSine" }, 4600)
    .add(".r-icons i", { opacity: [0, 1], scale: [0, 1], rotate: [-120, 0], borderRadius: ["50%", "50%"], delay: stagger(70, { grid: [3, 3], from: "center" }), duration: 1000, ease: "outElastic(1, .6)" }, 4900)
    .add(".r-icons i", { borderRadius: ["50%", "28%"], duration: 700, delay: stagger(40), ease: "inOutQuad" }, 6100)
    .add(".r-icons", { rotate: [0, 45], scale: [1, 1.15], duration: 1100, ease: "inOutBack(2)" }, 6600)
    .add(".r-icons i", { opacity: 0, scale: 0, duration: 500, delay: stagger(40, { from: "center" }), ease: "inBack(2)" }, 7800)
    .add(".r-icons", { rotate: 0, scale: 1, duration: 10 }, 8600)

    .call(caption("Сцена 03 — Интерфейсы"), 8600)
    .add(".reel-stage", { backgroundColor: "#13222e", duration: 1200, ease: "inOutSine" }, 8400)
    .add(".r-blob", { scale: 1.2, backgroundColor: "#8fe3c0", duration: 1500, ease: "inOutSine" }, 8400)
    .add(".r-card", { opacity: [0, 1], y: ["120%", "0%"], rotate: (_, i) => [[-24, 0, 24][i], [-8, 0, 8][i]], duration: 1300, delay: stagger(120), ease: "outElastic(1, .75)" }, 8700)
    .add(".rc2", { scale: [1, 1.12], duration: 800, ease: "outBack(2)" }, 9800)
    .add(".r-card i", { opacity: [0, 1], x: ["-30%", "0%"], delay: stagger(30), duration: 600 }, 9300)
    .add(".r-card", { opacity: 0, y: "-120%", rotate: 0, delay: stagger(80), duration: 700, ease: "inExpo" }, 11300)

    .call(caption("Сцена 04 — Цифры"), 12000)
    .add(".reel-stage", { backgroundColor: "#2b1622", duration: 1000, ease: "inOutSine" }, 11800)
    .add(".r-blob", { scale: 0.9, backgroundColor: "#ff9b71", duration: 1500, ease: "inOutSine" }, 11800)
    .add(".r-num", { opacity: [0, 1], scale: [0.5, 1], duration: 1000, ease: "outElastic(1, .7)" }, 12100)
    .add(num, { v: [0, PROFILE.stats[1].value], duration: 1400, ease: "outExpo", onUpdate: () => { $("#rNum").textContent = Math.round(num.v); } }, 12100)
    .add(".r-label", { opacity: [0, 1], y: [30, 0] }, 12500)
    .add(under, { draw: ["0 0", "0 1"], duration: 1000, ease: "inOutQuad" }, 12800)
    .add([".r-num", ".r-label"], { opacity: 0, y: -40, duration: 500, ease: "inExpo" }, 14400)
    .add(under, { draw: "1 1", duration: 500, ease: "inQuad" }, 14400)

    .call(caption("Финал"), 15000)
    .add(".reel-stage", { backgroundColor: "#121011", duration: 800, ease: "inOutSine" }, 14800)
    .add(".r-blob", { scale: [0.9, 2.2], backgroundColor: "#a98bff", opacity: [0.9, 0.5], duration: 2400, ease: "inOutSine" }, 14800)
    .add(".r-outro .r-word", { opacity: [0, 1], letterSpacing: ["0.3em", "-0.05em"], duration: 1600 }, 15000)
    .add(".r-sub", { opacity: [0, 0.7], y: [20, 0] }, 15600)
    .add([".r-outro .r-word", ".r-sub"], { opacity: 0, duration: 600, ease: "inQuad" }, 17600)
    .add(".r-blob", { opacity: 0, scale: 0.2, duration: 600 }, 17600);

  const play = $("#reelPlay");
  const scrub = $("#reelScrub");
  const tc = $("#rTc");
  const time = $("#reelTime");
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const f = Math.floor((ms % 1000) / 41.67);
    return `00:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
  };
  const total = fmt(tl.iterationDuration ?? tl.duration).slice(3, 8);
  let scrubbing = false;
  const sync = () => {
    const ct = tl.iterationCurrentTime ?? tl.currentTime % tl.iterationDuration;
    const p = ct / (tl.iterationDuration || tl.duration);
    if (!scrubbing) scrub.value = Math.round(p * 1000);
    scrub.style.setProperty("--p", `${p * 100}%`);
    tc.textContent = fmt(ct);
    time.textContent = `${fmt(ct).slice(3, 8)} / ${total}`;
  };
  tl.onUpdate = sync;
  let userPaused = false;
  const setPaused = (p) => {
    play.classList.toggle("paused", p);
    play.setAttribute("aria-label", p ? "Играть" : "Пауза");
  };
  play.addEventListener("click", () => {
    userPaused = !tl.paused ? true : false;
    if (tl.paused) tl.play(); else tl.pause();
    setPaused(tl.paused);
  });
  scrub.addEventListener("input", () => {
    scrubbing = true;
    tl.pause();
    tl.seek((scrub.value / 1000) * (tl.iterationDuration || tl.duration));
    sync();
  });
  scrub.addEventListener("change", () => {
    scrubbing = false;
    if (!userPaused) tl.play();
    setPaused(tl.paused);
  });
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !userPaused && !reduced) tl.play();
    else tl.pause();
    setPaused(tl.paused);
  }, { threshold: 0.35 }).observe(stage);
  if (reduced) { tl.seek(15800); sync(); setPaused(true); }
}

/* --------------------------------- Навыки --------------------------------- */
const ART = {
  pen: () => `<svg viewBox="0 0 220 150"><path class="pen-path" d="M24 112C40 30 92 24 112 74S182 128 198 40" fill="none" stroke="#1b1918" stroke-width="3" stroke-linecap="round"/>
    <g class="pen-handles" stroke="#a98bff" stroke-width="1.5"><path d="M24 112L40 30"/><path d="M92 24L132 124"/><path d="M182 128L198 40"/></g>
    <g class="pen-nodes" fill="#fff" stroke="#a98bff" stroke-width="2"><rect x="19" y="107" width="10" height="10"/><rect x="107" y="69" width="10" height="10"/><rect x="193" y="35" width="10" height="10"/></g>
    <g class="pen-tip" transform="translate(198 40)"><path d="M0 0l14 30 -6 2 -2 12 -12 -42z" fill="#1b1918"/></g></svg>`,
  heat: () => `<svg viewBox="0 0 220 150"><rect x="30" y="18" width="160" height="114" rx="12" fill="#fff" stroke="rgba(27,25,24,.1)"/><rect x="44" y="32" width="80" height="10" rx="5" fill="#1b1918" opacity=".7"/><rect x="44" y="52" width="132" height="34" rx="8" fill="rgba(27,25,24,.06)"/><rect x="44" y="96" width="60" height="22" rx="11" fill="#1b1918"/>
    ${[[74, 107, 30], [70, 37, 22], [150, 70, 20], [110, 66, 16]].map(([x, y, r], i) => `<circle class="heat-dot" cx="${x}" cy="${y}" r="${r}" fill="url(#heat${i})"/><defs><radialGradient id="heat${i}"><stop offset="0" stop-color="#ff3d3d" stop-opacity=".85"/><stop offset=".45" stop-color="#ffd23f" stop-opacity=".6"/><stop offset="1" stop-color="#3ddc84" stop-opacity="0"/></radialGradient></defs>`).join("")}</svg>`,
  flow: () => `<svg viewBox="0 0 220 150"><g fill="none" stroke="#a98bff" stroke-width="2.5" stroke-linecap="round"><path class="flow-line" d="M66 50C110 50 100 100 150 100"/><path class="flow-line" d="M66 50C110 50 110 30 150 30"/><path class="flow-line" d="M66 50C90 50 90 124 150 124"/></g>
    <rect class="flow-node" x="16" y="30" width="50" height="40" rx="10" fill="#1b1918"/><rect class="flow-node" x="150" y="16" width="52" height="28" rx="9" fill="#fff" stroke="rgba(27,25,24,.15)"/><rect class="flow-node" x="150" y="86" width="52" height="28" rx="9" fill="#fff" stroke="rgba(27,25,24,.15)"/><rect class="flow-node" x="150" y="112" width="52" height="24" rx="9" fill="#ffd36e"/>
    <circle class="flow-cursor" cx="40" cy="50" r="6" fill="#ff7aa2"/></svg>`,
  curve: () => `<svg viewBox="0 0 220 150"><path d="M30 126H196M30 126V18" stroke="rgba(27,25,24,.2)" stroke-width="1.5"/><path class="curve-path" d="M30 126C90 126 70 24 196 22" fill="none" stroke="#1b1918" stroke-width="3" stroke-linecap="round"/>
    <path d="M30 126L90 126M196 22L70 24" stroke="#ff7aa2" stroke-width="1.5"/><circle cx="90" cy="126" r="5" fill="#ff7aa2"/><circle cx="70" cy="24" r="5" fill="#ff7aa2"/>
    <circle class="curve-ball" cx="30" cy="140" r="7" fill="#a98bff"/></svg>`,
  tiles: () => `<div class="tiles-art">${Array.from({ length: 20 }, () => "<i></i>").join("")}</div>`,
  type: () => `<div class="type-art">A<span>a</span></div>`,
  cube: () => `<div class="cube-scene"><div class="cube">${"<i></i>".repeat(6)}</div></div>`,
  brush: () => `<svg viewBox="0 0 220 150"><circle class="wash" cx="96" cy="78" r="44" fill="#ffb199" opacity=".45"/><circle class="wash" cx="130" cy="66" r="34" fill="#a98bff" opacity=".35"/><circle class="wash" cx="118" cy="104" r="26" fill="#8fe3c0" opacity=".45"/>
    <g fill="none" stroke="#1b1918" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path class="sketch" d="M110 128C108 104 112 86 110 62"/><path class="sketch" d="M110 62C92 58 84 42 96 32C106 24 112 40 110 62C112 40 126 22 136 32C146 44 128 58 110 62"/><path class="sketch" d="M110 62C96 70 80 66 78 56M110 62C124 72 142 70 144 58"/><path class="sketch" d="M110 100C96 96 88 86 92 80C100 82 108 90 110 100C114 88 124 82 132 84C132 92 122 98 110 100"/></g></svg>`,
};

function animateSkill(card, art) {
  const el = $(".skill-art", card);
  const loops = [];
  if (art === "pen") {
    const [path] = svg.createDrawable($(".pen-path", el));
    loops.push(animate(path, { draw: ["0 0", "0 1", "1 1"], duration: 3600, loop: true, ease: "inOutQuad", autoplay: false }));
    loops.push(animate($$(".pen-nodes rect", el), { scale: [0, 1.3, 1], opacity: [0, 1], duration: 900, delay: stagger(600), loop: true, loopDelay: 1600, ease: "outBack(3)", autoplay: false }));
    loops.push(animate($(".pen-tip", el), { x: [24, 112, 198], y: [112, 74, 40], duration: 1800, loop: true, alternate: true, ease: "inOutSine", autoplay: false }));
  }
  if (art === "heat") loops.push(animate($$(".heat-dot", el), { scale: [0.4, 1.25], opacity: [0.2, 1], duration: 1400, delay: stagger(300), loop: true, alternate: true, ease: "inOutSine", autoplay: false }));
  if (art === "flow") {
    loops.push(animate($$(".flow-line", el), { strokeDasharray: ["4 8", "4 8"], strokeDashoffset: [0, -48], duration: 1200, loop: true, ease: "linear", autoplay: false }));
    loops.push(animate($(".flow-cursor", el), { x: [0, 135, 135, 0], y: [0, -20, 50, 0], duration: 4000, loop: true, ease: "inOutQuad", autoplay: false }));
    loops.push(animate($$(".flow-node", el), { scale: [1, 1.08, 1], duration: 900, delay: stagger(250), loop: true, loopDelay: 800, ease: "outBack(3)", autoplay: false }));
  }
  if (art === "curve") {
    const [path] = svg.createDrawable($(".curve-path", el));
    loops.push(animate(path, { draw: ["0 0", "0 1"], duration: 1600, loop: true, alternate: true, ease: "inOutQuad", autoplay: false }));
    loops.push(animate($(".curve-ball", el), { x: { to: 166, ease: "linear" }, y: { to: -118, ease: "inOutBack(1.4)" }, duration: 1600, loop: true, alternate: true, autoplay: false }));
  }
  if (art === "tiles") {
    const tiles = $$(".tiles-art i", el);
    loops.push(animate(tiles, {
      scale: [{ to: 0.4 }, { to: 1 }],
      borderRadius: [{ to: "50%" }, { to: "7px" }],
      backgroundColor: [{ to: "#a98bff" }, { to: "#1b1918" }],
      delay: stagger(90, { grid: [5, 4], from: "center" }),
      duration: 700,
      loop: true,
      loopDelay: 600,
      ease: "inOutQuad",
      autoplay: false,
    }));
  }
  if (art === "type") loops.push(animate($(".type-art", el), { fontWeight: [100, 900], letterSpacing: ["0.04em", "-0.07em"], duration: 1800, loop: true, alternate: true, ease: "inOutSine", autoplay: false }));
  if (art === "cube") loops.push(animate($(".cube", el), { rotateX: [-25, 335], rotateY: [0, 360], duration: 9000, loop: true, ease: "linear", autoplay: false }));
  if (art === "brush") {
    const lines = svg.createDrawable($$(".sketch", el));
    loops.push(animate(lines, { draw: ["0 0", "0 1"], duration: 1400, delay: stagger(450), loop: true, loopDelay: 1400, ease: "inOutSine", autoplay: false }));
    loops.push(animate($$(".wash", el), { scale: [0.6, 1.1], opacity: [0, 0.5], duration: 2400, delay: stagger(300), loop: true, alternate: true, ease: "inOutSine", autoplay: false }));
  }
  return loops;
}

function buildSkills() {
  const grid = $("#skillsGrid");
  grid.innerHTML = SKILLS.map((s) => `
    <div class="skill glass" data-art="${s.art}">
      <div class="skill-art">${ART[s.art]()}</div>
      <h3>${s.title}</h3><p>${s.note}</p>
      <div class="skill-level"><span class="track"><span class="fill" data-l="${s.level}"></span></span><span class="lvl">${s.level}%</span></div>
    </div>`).join("");
  const cards = $$(".skill", grid);
  utils.set(cards, { opacity: 0, y: 60, rotateX: 18 });
  onView(grid, () => animate(cards, { opacity: 1, y: 0, rotateX: 0, duration: 1200, delay: stagger(80), ease: "outExpo" }), { threshold: 0.1 });
  for (const card of cards) {
    const loops = animateSkill(card, card.dataset.art);
    whileVisible(card, () => (reduced ? [] : loops));
    onView(card, () => animate($(".fill", card), { scaleX: [0, $(".fill", card).dataset.l / 100], duration: 1600, delay: 300, ease: "outExpo" }));
  }

  $("#newSkills").innerHTML = NEW_SKILLS.map((s, i) => {
    const col = ["#a98bff", "#ff7aa2", "#7cc4ff", "#ff9b71"][i];
    return `<div class="new-skill glass">
      <svg viewBox="0 0 62 62"><circle cx="31" cy="31" r="25" stroke="rgba(27,25,24,.08)"/><circle class="nring" cx="31" cy="31" r="25" stroke="${col}" stroke-dasharray="157.1" stroke-dashoffset="157.1" data-p="${s.progress}"/></svg>
      <span class="pct">0%</span>
      <div><b>${s.title}</b><span>${s.note}</span></div></div>`;
  }).join("");
  const ns = $$(".new-skill");
  utils.set(ns, { opacity: 0, x: 40 });
  onView($("#newSkills"), () => {
    animate(ns, { opacity: 1, x: 0, duration: 1000, delay: stagger(90), ease: "outExpo" });
    for (const n of ns) {
      const ring = $(".nring", n);
      animate(ring, { strokeDashoffset: 157.1 * (1 - ring.dataset.p / 100), duration: 2000, delay: 300, ease: "outExpo" });
      countUp($(".pct", n), +ring.dataset.p, { suffix: "%", delay: 300 });
    }
  });
}

/* ------------------------------ Процесс ------------------------------ */
function buildProcess() {
  const steps = $$("#steps li");
  utils.set(steps, { opacity: 0, x: -50 });
  onView($("#steps"), () => animate(steps, { opacity: 1, x: 0, duration: 1100, delay: stagger(110), ease: "outExpo" }));
  // Подгоняем высоту iframe с фигурой под содержимое
  const frame = $(".gauge iframe");
  frame.addEventListener("load", () => {
    try {
      const fit = () => { frame.style.height = `${frame.contentDocument.documentElement.scrollHeight}px`; };
      fit();
      new ResizeObserver(fit).observe(frame.contentDocument.body);
    } catch { /* file:// — оставляем высоту по умолчанию */ }
  });
}

/* ------------------------------ Путь ------------------------------ */
function buildTimeline() {
  const root = $("#timeline");
  $(".timeline-line", root).remove();
  root.insertAdjacentHTML("afterbegin", `<div class="t-line"><i></i></div>`);
  root.insertAdjacentHTML("beforeend", TIMELINE.map((t) => `
    <div class="t-item"><span class="t-dot"></span><div class="t-card glass"><span class="t-tag">${t.tag}</span><span class="yr">${t.years}</span><h3>${t.title}</h3><p>${t.text}</p></div></div>`).join(""));
  const fill = $(".t-line i", root);
  const progress = () => {
    const r = root.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
    fill.style.transform = `scaleY(${p})`;
  };
  window.addEventListener("scroll", progress, { passive: true });
  progress();
  for (const [i, item] of $$(".t-item", root).entries()) {
    const fromLeft = i % 2 === 0 && innerWidth > 760;
    utils.set($(".t-card", item), { opacity: 0, x: fromLeft ? -60 : 60, rotate: fromLeft ? -3 : 3 });
    utils.set($(".t-dot", item), { scale: 0 });
    onView(item, () => {
      animate($(".t-card", item), { opacity: 1, x: 0, rotate: 0, duration: 1100, ease: "outExpo" });
      animate($(".t-dot", item), { scale: [0, 1.4, 1], duration: 800, ease: "outBack(3)" });
    }, { threshold: 0.4 });
  }
}

/* ------------------------------ Награды ------------------------------ */
function buildAwards() {
  $("#medals").innerHTML = AWARDS.map((a) => `
    <div class="medal" tabindex="0">
      <div class="medal-face glass"><span class="coin">${a.glyph}</span><div><h3>${a.title}</h3><p>${a.note}</p></div></div>
      <div class="medal-face medal-back glass"><span class="mono" style="opacity:.6">наведите · нажмите</span><div><b>${a.year}</b><p>${a.note}</p></div></div>
    </div>`).join("");
  const medals = $$(".medal");
  for (const m of medals) m.addEventListener("click", () => m.classList.toggle("flip"));
  utils.set(medals, { opacity: 0, rotateY: -70, y: 40 });
  onView($("#medals"), () => {
    animate(medals, { opacity: 1, rotateY: 0, y: 0, duration: 1400, delay: stagger(90), ease: "outElastic(1, .8)" });
    animate($$(".coin"), { rotate: [-180, 0], scale: [0.3, 1], duration: 1400, delay: stagger(90, { start: 200 }), ease: "outElastic(1, .6)" });
  });
}

/* ------------------------------ Песочница ------------------------------ */
async function buildDesk() {
  const desk = $("#desk");
  const items = [
    { html: `<div class="d-shot">${cover(PROJECTS[0])}</div>`, x: 0.05, y: 0.08, r: -6 },
    { html: `<div class="d-note">final_v27<br>ТОЧНО финал ✦</div>`, x: 0.36, y: 0.05, r: 4 },
    { html: `<div class="d-polaroid"><img src="${PROFILE.photo}" alt="">хорошее утро</div>`, x: 0.62, y: 0.1, r: 7 },
    { html: `<div class="d-shot">${cover(PROJECTS[3])}</div>`, x: 0.12, y: 0.52, r: 5 },
    { html: `<div class="d-swatch"><div style="background:linear-gradient(135deg,#ff9b71,#ff7aa2)"></div>#FF9B71</div>`, x: 0.42, y: 0.5, r: -8 },
    { html: `<div class="d-sticker">open to<br>work ✦</div>`, x: 0.8, y: 0.55, r: 12 },
    { html: `<div class="d-cursor"><svg viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-8.5L21 10z" fill="#a98bff" stroke="#fff" stroke-width="1.5"/></svg><span style="background:#a98bff">Вероника</span></div>`, x: 0.33, y: 0.32, r: 0 },
    { html: `<div class="d-shot">${cover(PROJECTS[7])}</div>`, x: 0.58, y: 0.56, r: -4 },
    { html: `<div class="d-swatch"><div style="background:linear-gradient(135deg,#a98bff,#7cc4ff)"></div>#A98BFF</div>`, x: 0.86, y: 0.08, r: 6 },
    { html: `<div class="d-cursor"><svg viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-8.5L21 10z" fill="#3ddc84" stroke="#fff" stroke-width="1.5"/></svg><span style="background:#3ddc84">Клиент</span></div>`, x: 0.72, y: 0.4, r: 0 },
  ];
  desk.innerHTML = items.map((it) => `<div class="desk-item" data-cursor="drag" style="rotate:${it.r}deg">${it.html}</div>`).join("");
  const els = $$(".desk-item", desk);
  const place = () => {
    const w = desk.clientWidth;
    const h = desk.clientHeight;
    els.forEach((el, i) => {
      const it = items[i];
      el.style.left = `${Math.min(it.x * w, w - el.offsetWidth - 10)}px`;
      el.style.top = `${Math.min(it.y * h, h - el.offsetHeight - 10)}px`;
    });
  };
  place();
  let z = 10;
  const { createDraggable } = await import("animejs");
  const drags = els.map((el) => createDraggable(el, {
    container: desk,
    releaseStiffness: 120,
    releaseDamping: 14,
    onGrab: () => { el.style.zIndex = ++z; animate(el, { scale: 1.08, duration: 300, ease: "outBack(2)" }); },
    onRelease: () => animate(el, { scale: 1, duration: 600, ease: "outElastic(1, .6)" }),
  }));
  desk.addEventListener("dblclick", () => {
    for (const d of drags) d.reset();
    place();
  });
  window.addEventListener("resize", place);
  utils.set(els, { opacity: 0, scale: 0.4 });
  onView(desk, () => animate(els, { opacity: 1, scale: 1, duration: 1100, delay: stagger(80, { from: "random" }), ease: "outElastic(1, .65)" }), { threshold: 0.3 });
}

/* ------------------------------ Уведомления ------------------------------ */
function buildNotifs() {
  const stack = $("#notifs");
  const colors = ["#a259ff", "#ff9b71", "#ff2d55", "#34c759", "#ffcc00"];
  const icons = ["F", "✎", "♫", "♥", "✓"];
  stack.innerHTML = FACTS.map((f, i) => `
    <div class="notif glass" style="z-index:${10 - i}">
      <span class="ico" style="background:${colors[i]}">${icons[i]}</span>
      <b>${f.app} · ${f.title}</b><small>${f.time}</small><p>${f.text}</p>
    </div>`).join("");
  stack.insertAdjacentHTML("afterend", `<div class="notif-hint">нажмите, чтобы развернуть</div>`);
  const ns = $$(".notif", stack);
  let open = false;
  const layout = (animated = true) => {
    // Высоты разные (текст бывает в две строки), поэтому складываем по очереди
    const tops = [];
    let h = 0;
    for (const n of ns) { tops.push(h); h += n.offsetHeight + 12; }
    ns.forEach((n, i) => {
      const props = open
        ? { y: tops[i], scale: 1, opacity: 1 }
        : { y: Math.min(i, 2) * 14, scale: 1 - Math.min(i, 3) * 0.05, opacity: i < 3 ? 1 - i * 0.25 : 0 };
      if (animated) animate(n, { ...props, duration: 900, delay: open ? i * 50 : (ns.length - i) * 30, ease: "outElastic(1, .8)" });
      else utils.set(n, props);
    });
    stack.classList.toggle("open", open);
    stack.style.height = open ? `${h + 10}px` : "";
    $(".notif-hint").textContent = open ? "нажмите, чтобы свернуть" : "нажмите, чтобы развернуть";
  };
  utils.set(ns, { y: -120, opacity: 0 });
  onView(stack, () => {
    animate(ns, { y: (_, i) => Math.min(i, 2) * 14, scale: (_, i) => 1 - Math.min(i, 3) * 0.05, opacity: (_, i) => (i < 3 ? 1 - i * 0.25 : 0), duration: 1000, delay: stagger(140, { from: "last" }), ease: "outElastic(1, .7)" });
  }, { threshold: 0.6 });
  stack.addEventListener("click", () => { open = !open; layout(); });
}

/* ------------------------------ Экран блокировки ------------------------------ */
function buildContact() {
  const timeEl = $("#lockTime");
  const dateEl = $("#lockDate");
  const tick = () => {
    const d = new Date();
    timeEl.textContent = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const date = d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
    dateEl.textContent = date[0].toUpperCase() + date.slice(1);
  };
  tick();
  setInterval(tick, 10000);
  const mail = $("#lockMail");
  mail.textContent = PROFILE.email;
  mail.href = `mailto:${PROFILE.email}`;
  $("#lockSocials").innerHTML = PROFILE.socials.map((s) => `<a class="glass" href="${s.href}">${s.label}</a>`).join("");
  $("#island").addEventListener("click", () => $("#island").classList.toggle("open"));

  // Слайдер «смахните»: своё перетаскивание с пружиной назад
  const slide = $("#slide");
  const knob = $("#slideKnob");
  const knobX = createAnimatable(knob, { x: 0, ease: "linear" });
  let startX = 0;
  let x = 0;
  let unlocked = false;
  const max = () => slide.clientWidth - knob.offsetWidth - 12;
  knob.addEventListener("pointerdown", (e) => {
    if (unlocked) return;
    knob.setPointerCapture(e.pointerId);
    startX = e.clientX - x;
  });
  knob.addEventListener("pointermove", (e) => {
    if (!knob.hasPointerCapture(e.pointerId)) return;
    x = Math.max(0, Math.min(max(), e.clientX - startX));
    knobX.x(x);
    $(".slide-text").style.opacity = 1 - x / max();
  });
  const release = () => {
    if (unlocked) return;
    if (x > max() * 0.8) unlock();
    else {
      animate(knob, { x: 0, duration: 800, ease: "outElastic(1, .5)" });
      animate(".slide-text", { opacity: 1, duration: 400 });
      x = 0;
    }
  };
  knob.addEventListener("pointerup", release);
  knob.addEventListener("pointercancel", release);
  knob.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") unlock(); });
  knob.tabIndex = 0;
  knob.setAttribute("role", "button");
  knob.setAttribute("aria-label", "Показать контакты");

  function unlock() {
    unlocked = true;
    animate(knob, { x: max(), duration: 300, ease: "outQuad" });
    createTimeline({ defaults: { ease: "outExpo" } })
      .add(slide, { opacity: 0, scale: 0.9, duration: 500 }, 200)
      .add(".lock-time", { scale: [1, 0.72], y: -20, duration: 900 }, 200)
      .add(".lock-notif", { y: -10, scale: [1, 0.96], duration: 700 }, 250)
      .add("#lockReveal", { opacity: [0, 1], y: [40, 0], duration: 900, onBegin: () => $("#lockReveal").classList.add("on") }, 400)
      .add(".lock-socials a", { opacity: [0, 1], y: [20, 0], scale: [0.8, 1], delay: stagger(70), duration: 900, ease: "outElastic(1, .7)" }, 600);
    setTimeout(() => (slide.style.display = "none"), 800);
  }
}

/* ---------------------- Активный раздел: остров + таббар ---------------------- */
function initNav() {
  const tabFor = { home: "home", about: "about", work: "work", reel: "work", skills: "skills", process: "skills", path: "about", awards: "about", play: "work", facts: "about", contact: "contact" };
  const pill = $("#tabPill");
  const tabs = $$("#tabbar a");
  let current = "";
  const setTab = (id, animated = true) => {
    const tab = tabs.find((t) => t.dataset.tab === tabFor[id]);
    if (!tab || tab.classList.contains("active")) return;
    tabs.forEach((t) => t.classList.toggle("active", t === tab));
    movePill(pill, tab, animated);
  };
  setTab("home", false);
  window.addEventListener("resize", () => movePill(pill, $("#tabbar a.active"), false));

  const title = $("#islandTitle");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const id = e.target.id;
      if (id === current) continue;
      current = id;
      setTab(id);
      animate(title, {
        opacity: [1, 0],
        y: [0, -8],
        duration: 160,
        ease: "inQuad",
        onComplete: () => {
          title.textContent = e.target.dataset.title;
          animate(title, { opacity: [0, 1], y: [8, 0], duration: 350, ease: "outExpo" });
        },
      });
      animate("#island", { scaleX: [1, 1.08, 1], duration: 700, ease: "outElastic(1, .6)" });
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("section[data-title]").forEach((s) => io.observe(s));

  const ring = $("#islandProgress");
  window.addEventListener("scroll", () => {
    const p = window.scrollY / (document.documentElement.scrollHeight - innerHeight);
    ring.style.strokeDashoffset = 56.55 * (1 - p);
  }, { passive: true });
}

/* --------------------------------- Старт --------------------------------- */
function boot() {
  buildHero();
  buildMarquee();
  buildAbout();
  buildWork();
  buildReel();
  buildSkills();
  buildProcess();
  buildTimeline();
  buildAwards();
  buildDesk();
  buildNotifs();
  buildContact();
  initHeadings();
  initNav();
  initCursor();
  initMagnetic();
  for (const el of $$("[data-liquid]")) liquid(el);

  $("#sheetClose").addEventListener("click", closeSheet);
  $("#sheetBackdrop").addEventListener("click", closeSheet);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  runIntro();

  // 3D подгружаем отдельно: если WebGL недоступен, сайт работает без него
  import("./hero3d.js")
    .then(({ startHero3D }) => startHero3D($("#hero3d"), { reduced }))
    .catch((err) => console.warn("3D отключено:", err));
}

boot();
