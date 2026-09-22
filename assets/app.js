/* CHAPA — compositor de prensa NFC */
(function () {
  const PX_PER_MM_300 = 11.811;
  const PRESETS = {
    tarjeta: [54.1, 85.1],
    mesa: [100, 140],
    plaza: [90, 90],
    display: [120, 180],
  };

  const DEMO = {
    dominant: "#5c3317",
    support: "#c45c26",
    accent: "#c45c26",
    ink: "#1a120c",
    paper: "#f3e6d4",
  };

  const USOS = {
    google: {
      top: "Reseña en Google",
      title: "Califícanos en Google",
      sub: "Acerca el teléfono y deja tu reseña",
      nfc: "Toca para dejar tu experiencia",
      hint: "Pega el enlace de reseña de Google. El QR se genera al instante.",
      placeholder: "https://g.page/r/…/review",
      qrEmpty: "Pega la URL de Google para generar el QR",
      stars: true,
    },
    carta: {
      top: "Carta digital",
      title: "Mira el menú",
      sub: "Acerca el teléfono y abre la carta",
      nfc: "Toca para ver la carta",
      hint: "Pega el link del menú (web, PDF o Drive).",
      placeholder: "https://…/menu",
      qrEmpty: "Pega el link de la carta para generar el QR",
      stars: false,
    },
    redes: {
      top: "Redes sociales",
      title: "Síguenos",
      sub: "Acerca el teléfono y entra a nuestras redes",
      nfc: "Toca para seguirnos",
      hint: "Elige Instagram, Facebook, WhatsApp o tu web y pega el link.",
      placeholder: "https://instagram.com/…",
      qrEmpty: "Pega el link de la red para generar el QR",
      stars: false,
    },
    whatsapp: {
      top: "WhatsApp",
      title: "Escríbenos",
      sub: "Acerca el teléfono y chatea con nosotros",
      nfc: "Toca para escribirnos",
      hint: "Pega wa.me o el número con código de país (ej. 51987654321).",
      placeholder: "https://wa.me/51…",
      qrEmpty: "Pega el WhatsApp para generar el QR",
      stars: false,
    },
  };

  const REDES = {
    instagram: {
      top: "Instagram",
      title: "Síguenos en Instagram",
      sub: "Acerca el teléfono y mira nuestro perfil",
      nfc: "Toca para seguirnos",
      hint: "Pega el link de tu perfil de Instagram.",
      placeholder: "https://instagram.com/…",
      qrEmpty: "Pega el Instagram para generar el QR",
      label: "Instagram",
    },
    facebook: {
      top: "Facebook",
      title: "Síguenos en Facebook",
      sub: "Acerca el teléfono y visita nuestra página",
      nfc: "Toca para seguirnos",
      hint: "Pega el link de tu página de Facebook.",
      placeholder: "https://facebook.com/…",
      qrEmpty: "Pega el Facebook para generar el QR",
      label: "Facebook",
    },
    whatsapp: {
      top: "WhatsApp",
      title: "Escríbenos por WhatsApp",
      sub: "Acerca el teléfono y chatea con nosotros",
      nfc: "Toca para escribirnos",
      hint: "Pega wa.me o el número con código de país.",
      placeholder: "https://wa.me/51…",
      qrEmpty: "Pega el WhatsApp para generar el QR",
      label: "WhatsApp",
    },
    web: {
      top: "Sitio web",
      title: "Visita nuestra web",
      sub: "Acerca el teléfono y entra a la página",
      nfc: "Toca para abrir la web",
      hint: "Pega la URL de tu página web.",
      placeholder: "https://www.tunegocio.com",
      qrEmpty: "Pega la web para generar el QR",
      label: "Web",
    },
  };

  const state = {
    widthMm: 54.1,
    heightMm: 85.1,
    unit: "cm",
    bleed: 0,
    layout: "farol",
    layoutLocked: false,
    fondoOscuro: false,
    fondoManual: false,
    demo: true,
    logoSrc: "assets/demo-logo.png",
    logoShape: "logo-sq",
    logoClaro: false,
    logoLum: 0.35,
    variant: "dom",
    uso: "google",
    red: "instagram",
    font: "outfit",
    typeTitle: 70,
    typeBody: 82,
    qrScaleByKey: {},
    logoScaleByUso: {},
    lockupScaleByUso: {},
    nfcScaleByUso: {},
    starsScaleByUso: {},
    ornamentScaleByUso: {},
    typeTitleByKey: {},
    typeBodyByKey: {},
    palette: { ...DEMO },
    tintaLock: null,
    cuerpoLock: null,
    qrDataUrl: "",
    url: "",
  };

  const el = {
    drop: document.getElementById("drop-marca"),
    file: document.getElementById("logo-file"),
    thumb: document.getElementById("logo-thumb"),
    swatches: document.getElementById("swatches"),
    swatchesBody: document.getElementById("swatches-body"),
    w: document.getElementById("mm-w"),
    h: document.getElementById("mm-h"),
    ratio: document.getElementById("ratio-readout"),
    sheet: document.getElementById("press-sheet"),
    stage: document.getElementById("stage"),
    well: document.getElementById("light-well"),
    rulerX: document.getElementById("ruler-x"),
    rulerY: document.getElementById("ruler-y"),
    status: document.getElementById("press-status"),
    qrImg: () => document.getElementById("qr-img"),
    top: document.getElementById("copy-top"),
    title: document.getElementById("copy-title"),
    sub: document.getElementById("copy-sub"),
    url: document.getElementById("copy-url"),
    nfc: document.getElementById("copy-nfc"),
    name: document.getElementById("copy-name"),
    typeTitle: document.getElementById("type-title"),
    typeBody: document.getElementById("type-body"),
    qrScale: document.getElementById("qr-scale"),
    logoScale: document.getElementById("logo-scale"),
    lockupScale: document.getElementById("lockup-scale"),
    nfcScale: document.getElementById("nfc-scale"),
    starsScale: document.getElementById("stars-scale"),
    ornamentScale: document.getElementById("ornament-scale"),
    exportHost: document.getElementById("export-host"),
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function niceNum(n, digits) {
    return String(+(Number(n).toFixed(digits)));
  }

  function unitTag() {
    return state.unit === "cm" ? "cm" : "mm";
  }

  function toInputValue(mm) {
    return state.unit === "cm" ? niceNum(mm / 10, 2) : niceNum(mm, 1);
  }

  function formatPair(w, h) {
    return toInputValue(w) + " × " + toInputValue(h) + " " + unitTag();
  }

  function readMm(input, fallback) {
    const raw = parseFloat(input && input.value);
    if (!Number.isFinite(raw)) return fallback;
    const mm = state.unit === "cm" ? raw * 10 : raw;
    return clamp(mm, 20, 400);
  }

  function sameMm(a, b) {
    return Math.abs(a - b) < 0.051;
  }

  function syncUnitUi() {
    document.querySelectorAll("[data-unit]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.unit === state.unit));
    });
    const heading = document.getElementById("medidas-h");
    if (heading) heading.textContent = "Medidas (" + unitTag() + ")";
    const isCm = state.unit === "cm";
    el.w.min = isCm ? 2 : 20;
    el.w.max = isCm ? 40 : 400;
    el.h.min = el.w.min;
    el.h.max = el.w.max;
    const labels = isCm
      ? { tarjeta: "Tarjeta 5.41×8.51", mesa: "Mesa 10×14", plaza: "Plaza 9×9", display: "Display 12×18" }
      : { tarjeta: "Tarjeta 54.1×85.1", mesa: "Mesa 100×140", plaza: "Plaza 90×90", display: "Display 120×180" };
    el.w.step = isCm ? 0.01 : 0.1;
    el.h.step = el.w.step;
    el.w.value = toInputValue(state.widthMm);
    el.h.value = toInputValue(state.heightMm);
    document.querySelectorAll("[data-preset]").forEach((c) => {
      if (labels[c.dataset.preset]) c.textContent = labels[c.dataset.preset];
    });
    document.querySelectorAll("[data-bleed]").forEach((b) => {
      const mm = Number(b.dataset.bleed);
      b.textContent = isCm ? niceNum(mm / 10, 1) + " cm" : mm + " mm";
    });
  }

  function hexToRgb(hex) {
    const raw = String(hex || "#12110f").replace("#", "");
    const h = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    return {
      r: parseInt(h.slice(0, 2), 16) || 0,
      g: parseInt(h.slice(2, 4), 16) || 0,
      b: parseInt(h.slice(4, 6), 16) || 0,
    };
  }
  function rgbToHex(r, g, b) {
    const p = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return `#${p(r)}${p(g)}${p(b)}`;
  }
  function lum({ r, g, b }) {
    const s = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  }
  function contrast(a, b) {
    const L1 = lum(hexToRgb(a));
    const L2 = lum(hexToRgb(b));
    const hi = Math.max(L1, L2);
    const lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function sat(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) return 0;
    return (max - min) / max;
  }
  function readableOn(bg) {
    const ink = state.palette.ink || "#12110f";
    const paper = state.palette.paper || "#e8e0d4";
    return contrast(ink, bg) >= contrast(paper, bg) ? ink : paper;
  }

  function extraerPaleta(img) {
    const canvas = document.createElement("canvas");
    const max = 120;
    const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
    let w;
    let h;
    if (img.naturalWidth >= img.naturalHeight) {
      w = max;
      h = Math.max(1, Math.round(max / ratio));
    } else {
      h = max;
      w = Math.max(1, Math.round(max * ratio));
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const buckets = new Map();

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 40) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 245 && g > 245 && b > 245) continue;
      if (r < 12 && g < 12 && b < 12) continue;
      const q = (x) => Math.round(x / 32) * 32;
      const key = `${q(r)},${q(g)},${q(b)}`;
      const prev = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      prev.n += 1;
      prev.r += r;
      prev.g += g;
      prev.b += b;
      buckets.set(key, prev);
    }

    const ranked = [...buckets.values()]
      .map((v) => ({
        n: v.n,
        r: v.r / v.n,
        g: v.g / v.n,
        b: v.b / v.n,
        hex: rgbToHex(v.r / v.n, v.g / v.n, v.b / v.n),
        s: sat(v.r / v.n, v.g / v.n, v.b / v.n),
        L: lum({ r: v.r / v.n, g: v.g / v.n, b: v.b / v.n }),
      }))
      .sort((a, b) => b.n - a.n);

    const chromatic = ranked.filter((c) => c.s > 0.12);
    const pool = chromatic.length ? chromatic : ranked;
    const dominant = pool[0] || { hex: DEMO.dominant, s: 0.4, L: 0.2, r: 92, g: 51, b: 23 };
    const accent = [...pool].sort((a, b) => b.s - a.s).find((c) => c.hex !== dominant.hex) || dominant;
    const support = pool.find((c) => c.hex !== dominant.hex && c.hex !== accent.hex) || accent;
    const inkC = [...ranked].sort((a, b) => a.L - b.L)[0];
    const paperC = [...ranked].sort((a, b) => b.L - a.L)[0];

    const palette = {
      dominant: dominant.hex,
      accent: accent.hex,
      support: support.hex,
      ink: inkC && inkC.L < 0.35 ? inkC.hex : "#1a120c",
      paper: paperC && paperC.L > 0.7 ? paperC.hex : "#e8e0d4",
    };
    return palette;
  }

  function luminanciaLogo(img) {
    const canvas = document.createElement("canvas");
    const max = 80;
    const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
    const w = img.naturalWidth >= img.naturalHeight ? max : Math.max(1, Math.round(max * ratio));
    const h = img.naturalWidth >= img.naturalHeight ? Math.max(1, Math.round(max / ratio)) : max;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 40) continue;
      sum += lum({ r: data[i], g: data[i + 1], b: data[i + 2] });
      n += 1;
    }
    return n ? sum / n : 0.4;
  }

  function bannerAuto(p) {
    const ranked = [p.dominant, p.accent, p.support, p.ink, p.paper];
    if (state.logoClaro) {
      return ranked.reduce((best, c) => (lum(hexToRgb(c)) < lum(hexToRgb(best)) ? c : best));
    }
    const byLight = [...ranked].sort((a, b) => lum(hexToRgb(b)) - lum(hexToRgb(a)));
    if (contrast(byLight[0], p.paper) < 1.2) {
      return p.accent !== p.dominant ? p.accent : p.support;
    }
    return byLight[0];
  }

  function syncFondoButtons() {
    document.querySelectorAll("[data-fondo]").forEach((b) => {
      b.setAttribute("aria-pressed", String((b.dataset.fondo === "oscuro") === state.fondoOscuro));
    });
  }

  function syncVariantButtons() {
    document.querySelectorAll("[data-variant]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.variant === state.variant));
    });
  }

  function aplicarFondoAuto() {
    if (state.fondoManual) return;
    state.fondoOscuro = state.logoClaro;
    syncFondoButtons();
    const hint = document.getElementById("auto-fondo-hint");
    if (hint) {
      hint.textContent = state.logoClaro
        ? "Logo claro: la parte superior queda oscura. La inferior se elige abajo."
        : "Logo oscuro: la parte superior queda clara. La inferior se elige abajo.";
    }
  }

  const FONTS = {
    outfit: { title: "Outfit, sans-serif", body: "Outfit, sans-serif" },
    syne: { title: "Syne, sans-serif", body: "Manrope, sans-serif" },
    manrope: { title: "Manrope, sans-serif", body: "Manrope, sans-serif" },
    bebas: { title: '"Bebas Neue", sans-serif', body: "Manrope, sans-serif" },
    oswald: { title: "Oswald, sans-serif", body: "Manrope, sans-serif" },
    nunito: { title: "Nunito, sans-serif", body: "Nunito, sans-serif" },
    playfair: { title: '"Playfair Display", serif', body: "Manrope, sans-serif" },
    archivo: { title: "Archivo, sans-serif", body: "Archivo, sans-serif" },
  };

  function applyTypeCss() {
    const f = FONTS[state.font] || FONTS.outfit;
    const sheet = el.sheet;
    if (!sheet) return;
    const title = clamp(markPct(state.typeTitleByKey, defaultTitlePct()), 50, 130);
    const body = clamp(markPct(state.typeBodyByKey, defaultBodyPct()), 50, 130);
    sheet.style.setProperty("--font-title", f.title);
    sheet.style.setProperty("--font-body", f.body);
    sheet.style.setProperty("--type-title", String(title / 100));
    sheet.style.setProperty("--type-body", String(body / 100));
    if (el.typeTitle) el.typeTitle.value = title;
    if (el.typeBody) el.typeBody.value = body;
    const tVal = document.getElementById("type-title-val");
    const bVal = document.getElementById("type-body-val");
    if (tVal) tVal.textContent = title + "%";
    if (bVal) bVal.textContent = body + "%";
    document.querySelectorAll("[data-font]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.font === state.font));
    });
  }

  function usoKey() {
    return USOS[state.uso] ? state.uso : "google";
  }

  function layoutKey() {
    return state.layout === "placa" || state.layout === "ficha" ? state.layout : "farol";
  }

  function scaleKey() {
    return usoKey() + "-" + layoutKey();
  }

  function defaultTitlePct() {
    if (layoutKey() === "ficha") return 58;
    if (layoutKey() === "placa") return 68;
    return 70;
  }

  function defaultBodyPct() {
    return layoutKey() === "ficha" ? 78 : 82;
  }

  function defaultNfcPct() {
    return layoutKey() === "ficha" ? 145 : 100;
  }

  function markPct(map, fallback) {
    if (!map) return fallback;
    const exact = map[scaleKey()];
    if (Number.isFinite(exact)) return exact;
    const uso = map[usoKey()];
    if (Number.isFinite(uso)) return uso;
    return fallback;
  }

  function setMark(map, value) {
    if (!map) return;
    map[scaleKey()] = value;
  }

  function syncMarkLabels() {
    const names = { google: "Reseña", carta: "Carta", redes: "Redes", whatsapp: "WhatsApp" };
    const icons = { google: "Google", carta: "Carta", redes: "la red", whatsapp: "WhatsApp" };
    const layouts = { farol: "Farol", placa: "Placa", ficha: "Ficha" };
    const usoNom = names[usoKey()] || "este uso";
    const layNom = layouts[layoutKey()] || "Farol";
    const combo = usoNom + " · " + layNom;
    const setLab = (id, text) => {
      const node = document.getElementById(id);
      if (node) node.textContent = text;
    };
    setLab("type-title-lab", "Tamaño del título (" + combo + ")");
    setLab("type-body-lab", "Tamaño del texto (" + combo + ")");
    setLab("qr-scale-lab", "Tamaño del QR (" + combo + ")");
    setLab("logo-scale-lab", "Logo del negocio (" + combo + ")");
    setLab("lockup-scale-lab", "Icono de " + (icons[usoKey()] || "uso") + " (" + layNom + ")");
    setLab("nfc-scale-lab", "Icono NFC (ondas) (" + combo + ")");
    setLab("stars-scale-lab", "Estrellas de reseña (" + combo + ")");
  }

  function applyMarkCss() {
    const sheet = el.sheet;
    if (!sheet) return;
    const logo = clamp(markPct(state.logoScaleByUso, 100), 50, 160);
    const lock = clamp(markPct(state.lockupScaleByUso, 100), 50, 160);
    const nfc = clamp(markPct(state.nfcScaleByUso, defaultNfcPct()), 50, 220);
    const stars = clamp(markPct(state.starsScaleByUso, 100), 50, 180);
    const orn = clamp(markPct(state.ornamentScaleByUso, 100), 50, 180);
    sheet.style.setProperty("--logo-scale", String(logo / 100));
    sheet.style.setProperty("--lockup-scale", String(lock / 100));
    sheet.style.setProperty("--stars-scale", String(stars / 100));
    sheet.style.setProperty("--ornament-scale", String(orn / 100));
    sheet.style.setProperty("--nfc-scale", String(nfc / 100));
    if (el.logoScale) el.logoScale.value = logo;
    if (el.lockupScale) el.lockupScale.value = lock;
    if (el.nfcScale) el.nfcScale.value = nfc;
    if (el.starsScale) el.starsScale.value = stars;
    if (el.ornamentScale) el.ornamentScale.value = orn;
    const lv = document.getElementById("logo-scale-val");
    const kv = document.getElementById("lockup-scale-val");
    const nv = document.getElementById("nfc-scale-val");
    const sv = document.getElementById("stars-scale-val");
    const ov = document.getElementById("ornament-scale-val");
    if (lv) lv.textContent = logo + "%";
    if (kv) kv.textContent = lock + "%";
    if (nv) nv.textContent = nfc + "%";
    if (sv) sv.textContent = stars + "%";
    if (ov) ov.textContent = orn + "%";
    const starsWrap = document.getElementById("stars-scale-wrap");
    if (starsWrap) {
      if (usoKey() === "google") starsWrap.removeAttribute("hidden");
      else starsWrap.setAttribute("hidden", "");
    }
    const ornWrap = document.getElementById("ornament-scale-wrap");
    const ornLab = document.getElementById("ornament-scale-lab");
    if (ornWrap) {
      if (usoKey() === "carta" || usoKey() === "redes") ornWrap.removeAttribute("hidden");
      else ornWrap.setAttribute("hidden", "");
    }
    if (ornLab) {
      ornLab.textContent = usoKey() === "redes" ? "Adorno (puntos)" : "Adorno (línea y rombo)";
    }
    syncMarkLabels();
    applyNfcSize();
  }

  function applyPaletteCss() {
    const p = { ...state.palette };
    const invertido = state.variant === "inv" || state.fondoOscuro;
    if (invertido) {
      const ink = p.ink;
      p.ink = p.paper;
      p.paper = ink;
    }
    let banner = bannerAuto(state.palette);
    if (state.variant === "acc") banner = state.palette.accent;
    if (state.variant === "inv") banner = state.palette.ink;
    if (state.tintaLock) banner = state.tintaLock;
    const body = state.cuerpoLock || p.paper;
    const sheet = el.sheet;
    sheet.style.setProperty("--c-dom", banner);
    sheet.style.setProperty("--c-acc", p.accent);
    sheet.style.setProperty("--c-sup", p.support);
    sheet.style.setProperty("--c-ink", p.ink);
    sheet.style.setProperty("--c-paper", p.paper);
    sheet.style.setProperty("--c-on-dom", readableOn(banner));
    sheet.style.setProperty("--c-body", body);
    sheet.style.setProperty("--c-on-body", readableOn(body));
    renderSwatches({
      dominant: state.palette.dominant,
      support: state.palette.support,
      accent: state.palette.accent,
      ink: state.palette.ink,
      paper: state.palette.paper,
    });
  }

  function paintSwatches(container, colors, locked, title, onPick) {
    if (!container) return;
    container.innerHTML = "";
    colors.forEach((c) => {
      const b = document.createElement("button");
      b.className = "swatch";
      b.type = "button";
      b.title = title + " " + c;
      b.style.background = c;
      b.setAttribute("aria-pressed", String(locked === c));
      b.addEventListener("click", () => onPick(c));
      container.appendChild(b);
    });
  }

  function renderSwatches(p) {
    const colors = [p.dominant, p.support, p.accent, p.ink, p.paper];
    paintSwatches(el.swatches, colors, state.tintaLock, "Color de la parte superior", (c) => {
      state.tintaLock = c;
      state.variant = "dom";
      syncVariantButtons();
      applyPaletteCss();
      renderCard();
    });
    paintSwatches(el.swatchesBody, colors, state.cuerpoLock, "Color de la parte inferior", (c) => {
      state.cuerpoLock = c;
      applyPaletteCss();
      renderCard();
    });
  }

  function pickLayoutAuto() {
    if (state.layoutLocked) return;
    const w = state.widthMm;
    const h = state.heightMm;
    const ratio = w / h;
    if (ratio > 0.9 && ratio < 1.12) state.layout = "placa";
    else if (h > w) state.layout = "farol";
    else if (w > h * 1.3) state.layout = "ficha";
    else state.layout = "placa";
    document.querySelectorAll("[data-layout]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.layout === state.layout));
    });
  }

  function gcd(a, b) {
    a = Math.round(a * 10);
    b = Math.round(b * 10);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  const GOOGLE_G_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.61.28-3.16.78-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.77.9 7.31 2.56 10.41l7.97-5.82z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="#4285F4" d="M24 24h22.98v4H24z"/>
    </svg>`;

  function googleG() {
    return `<svg class="g-mark" viewBox="0 0 48 48" aria-hidden="true">${GOOGLE_G_SVG.replace(/<\/?svg[^>]*>/g, "")}</svg>`;
  }

  function googleWord() {
    return `<span class="word"><span class="g-blue">G</span><span class="g-red">o</span><span class="g-yellow">o</span><span class="g-blue">g</span><span class="g-green">l</span><span class="g-red">e</span></span>`;
  }

  function stars() {
    const s = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.2l2.4 6.9h7.2l-5.8 4.3 2.2 6.9L12 16.9 6 20.3l2.2-6.9L2.4 9.1h7.2z"/></svg>`;
    return `<div class="stars" aria-hidden="true">${s.repeat(5)}</div>`;
  }

  function lockupCarta() {
    return `<div class="use-lockup" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <rect x="10" y="8" width="28" height="34" rx="3" stroke="currentColor" stroke-width="3"/>
        <path d="M16 16h16M16 23h16M16 30h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
      <span>Carta</span>
    </div>`;
  }

  function iconIg() {
    return `<svg class="brand-ico" viewBox="0 0 48 48" aria-hidden="true">
      <defs><linearGradient id="ig-g" x1="8" y1="40" x2="40" y2="8" gradientUnits="userSpaceOnUse">
        <stop stop-color="#f58529"/><stop offset=".45" stop-color="#dd2a7b"/><stop offset="1" stop-color="#515bd4"/>
      </linearGradient></defs>
      <rect x="6" y="6" width="36" height="36" rx="10" fill="url(#ig-g)"/>
      <rect x="15" y="15" width="18" height="18" rx="6" fill="none" stroke="#fff" stroke-width="2.6"/>
      <circle cx="24" cy="24" r="5" fill="none" stroke="#fff" stroke-width="2.6"/>
      <circle cx="32.5" cy="15.5" r="1.8" fill="#fff"/>
    </svg>`;
  }

  function iconFb() {
    return `<svg class="brand-ico" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#1877F2"/>
      <path fill="#fff" d="M27.2 38V26.7h3.8l.6-4.4h-4.4v-2.8c0-1.3.4-2.1 2.2-2.1H32V13.3c-.4 0-1.9-.2-3.6-.2-3.6 0-6 2.2-6 6.1v3.1h-4v4.4h4V38h4.8z"/>
    </svg>`;
  }

  function iconWa() {
    return `<svg class="brand-ico" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#25D366"/>
      <path fill="#fff" d="M24.1 14.2c-5.4 0-9.8 4.4-9.8 9.8 0 1.7.5 3.3 1.3 4.7l-1.4 5.2 5.3-1.4c1.3.7 2.9 1.1 4.6 1.1 5.4 0 9.8-4.4 9.8-9.8s-4.4-9.6-9.8-9.6zm5.7 13.8c-.2.7-1.4 1.3-1.9 1.3-.5 0-1 .2-3.4-.7-2.9-1.1-4.7-3.8-4.9-4-.2-.2-1.3-1.7-1.3-3.3s.8-2.3 1.1-2.6c.2-.3.5-.4.8-.4h.6c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.2.1.3 0 .5-.1.2-.2.3-.3.5l-.5.6c-.2.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.2.5.1.7-.1l.9-1.2c.2-.2.4-.2.7-.1.3.1 1.8.8 2.1 1 .3.1.5.2.6.4.1.3 0 1.1-.2 1.8z"/>
    </svg>`;
  }

  function iconWeb() {
    return `<svg class="brand-ico" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#0f766e"/>
      <circle cx="24" cy="24" r="10" fill="none" stroke="#fff" stroke-width="2.4"/>
      <path d="M14 24h20M24 14c2.8 2.6 4.4 6 4.4 10S26.8 31.4 24 34c-2.8-2.6-4.4-6-4.4-10S21.2 16.6 24 14z" fill="none" stroke="#fff" stroke-width="2.2"/>
    </svg>`;
  }

  function lockupRedes() {
    const red = state.red || "instagram";
    const label = (REDES[red] && REDES[red].label) || "Redes";
    const icons = { instagram: iconIg, facebook: iconFb, whatsapp: iconWa, web: iconWeb };
    const ico = (icons[red] || iconIg)();
    return `<div class="use-lockup use-lockup-red">${ico}<span>${label}</span></div>`;
  }

  function lockupWhatsapp() {
    return `<div class="use-lockup" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M24 8c8.8 0 16 7.2 16 16 0 8.8-7.2 16-16 16-2.5 0-4.9-.6-7-1.6L8 40l1.8-8.8A15.9 15.9 0 0 1 8 24C8 15.2 15.2 8 24 8z" stroke="currentColor" stroke-width="3"/>
        <path d="M18 20c.4 4.2 3.8 7.6 8 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
      <span>WhatsApp</span>
    </div>`;
  }

  function purposeLockup() {
    if (state.uso === "carta") return lockupCarta();
    if (state.uso === "redes") return lockupRedes();
    if (state.uso === "whatsapp") return lockupWhatsapp();
    return `<div class="g-lockup">${googleG()}${googleWord()}</div>`;
  }

  function purposeStars() {
    return USOS[state.uso].stars ? stars() : "";
  }

  function purposeOrnament() {
    if (state.uso === "carta") {
      return `<div class="ornament ornament-carta" aria-hidden="true"><span></span><i></i><span></span></div>`;
    }
    if (state.uso === "redes") {
      return `<div class="ornament ornament-redes" aria-hidden="true"><b></b><b></b><b></b></div>`;
    }
    return "";
  }

  function applyCopyPack(u) {
    if (!u) return;
    el.top.value = u.top;
    el.title.value = u.title;
    el.sub.value = u.sub;
    el.nfc.value = u.nfc;
    el.url.placeholder = u.placeholder;
    const hint = document.getElementById("url-hint");
    const usoHint = document.getElementById("uso-hint");
    if (hint) hint.textContent = u.hint;
    if (usoHint) usoHint.textContent = u.hint;
  }

  function syncRedButtons() {
    document.querySelectorAll("[data-red]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.red === state.red));
    });
  }

  function applyRed(id) {
    if (!REDES[id]) return;
    state.red = id;
    syncRedButtons();
    applyCopyPack(REDES[id]);
    renderCard();
  }

  function applyUso(id) {
    const u = USOS[id];
    if (!u) return;
    state.uso = id;
    const sub = document.getElementById("redes-sub");
    if (sub) {
      if (id === "redes") sub.removeAttribute("hidden");
      else sub.setAttribute("hidden", "");
    }
    document.querySelectorAll("[data-uso]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.uso === id));
    });
    if (id === "redes") applyRed(state.red || "instagram");
    else {
      applyCopyPack(u);
      applyMarkCss();
      renderCard();
    }
  }

  function nfcIcon(color) {
    return `<svg class="nfc" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="10" fill="${color}"/>
      <path d="M42 60a18 18 0 0 1 36 0" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
      <path d="M30 60a30 30 0 0 1 60 0" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
      <path d="M18 60a42 42 0 0 1 84 0" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
    </svg>`;
  }

  function qrBlock() {
    const pack = state.uso === "redes" ? REDES[state.red] : USOS[state.uso];
    const empty = (pack && pack.qrEmpty) || "Pega la URL para generar el QR";
    if (!state.qrDataUrl) {
      return `<div class="qr-box is-empty"><span class="qr-empty">${empty}</span></div>`;
    }
    return `<div class="qr-box"><img id="qr-img" alt="Código QR" src="${state.qrDataUrl}"></div>`;
  }

  function normalizarUrl(raw) {
    let s = String(raw || "").trim();
    if (!s) return "";
    if (state.uso === "whatsapp" || (state.uso === "redes" && state.red === "whatsapp")) {
      const digits = s.replace(/[^\d]/g, "");
      if (!/^https?:/i.test(s) && digits.length >= 8) {
        return "https://wa.me/" + digits;
      }
    }
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) s = "https://" + s;
    return s;
  }

  function pintarQrClasico(texto) {
    if (typeof qrcode !== "function") {
      throw new Error("Falta la librería de QR");
    }
    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs["UTF-8"]) {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
    }
    const qr = qrcode(0, "M");
    qr.addData(texto, "Byte");
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 4;
    const cell = 12;
    const dim = (n + quiet * 2) * cell;
    const canvas = document.createElement("canvas");
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = "#000000";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((quiet + c) * cell, (quiet + r) * cell, cell, cell);
        }
      }
    }
    return canvas.toDataURL("image/png");
  }

  function escalaHoja() {
    const s = Math.min(state.widthMm, state.heightMm);
    if (s < 48) return "micro";
    if (s < 72) return "compact";
    if (s < 120) return "regular";
    return "large";
  }

  function esPiezaTarjeta() {
    const a = Math.min(state.widthMm, state.heightMm);
    const b = Math.max(state.widthMm, state.heightMm);
    return a >= 50 && a <= 58 && b >= 80 && b <= 90;
  }

  function esPlaza() {
    const r = state.widthMm / state.heightMm;
    return r > 0.9 && r < 1.12;
  }

  function tamañoMarcaMm() {
    const w = state.widthMm;
    const h = state.heightMm;
    const short = Math.min(w, h);
    let mark;
    if (esPlaza()) {
      mark = state.layout === "placa" ? short * 0.16 : short * 0.18;
    } else if (state.layout === "ficha") {
      mark = Math.min(w * 0.18, h * 0.22, short * 0.24);
    } else if (state.layout === "farol") {
      mark = Math.min(w * 0.24, h * 0.14, short * 0.25);
    } else {
      mark = Math.min(w * 0.22, h * 0.15, short * 0.24);
    }
    const minM = esPlaza() ? 14 : short < 62 ? 11 : 16;
    const maxM = short * (esPlaza() ? 0.22 : 0.28);
    return Math.round(clamp(mark, minM, maxM) * 10) / 10;
  }

  function tamañoQrMm() {
    const short = Math.min(state.widthMm, state.heightMm);
    const scale = markPct(state.qrScaleByKey, 100) / 100;
    const base = esPlaza() ? short * 0.28 : tamañoMarcaMm();
    const scaled = base * scale;
    const maxM = short * (esPlaza() ? 0.38 : 0.5);
    return Math.round(clamp(scaled, 10, maxM) * 10) / 10;
  }

  function applyQrSize() {
    if (!el.sheet) return;
    const pct = markPct(state.qrScaleByKey, 100);
    el.sheet.style.setProperty("--qr-mm", tamañoQrMm() + "mm");
    if (el.qrScale) el.qrScale.value = pct;
    const val = document.getElementById("qr-scale-val");
    if (val) val.textContent = pct + "%";
  }

  function tamañoNfcMm() {
    const short = Math.min(state.widthMm, state.heightMm);
    const base = tamañoMarcaMm();
    return Math.round(clamp(base, 8, short * 0.42) * 10) / 10;
  }

  function applyNfcSize() {
    if (!el.sheet) return;
    el.sheet.style.setProperty("--nfc-mm", tamañoNfcMm() + "mm");
    const val = document.getElementById("nfc-scale-val");
    if (val) val.textContent = markPct(state.nfcScaleByUso, defaultNfcPct()) + "%";
  }

  function renderCard() {
    const scale = escalaHoja();
    const compact = scale === "micro" || scale === "compact";
    const hideGWord = scale === "micro" || state.widthMm < 70;
    const pack = state.uso === "redes" ? (REDES[state.red] || USOS.redes) : USOS[state.uso];
    const top = el.top.value.trim() || pack.top;
    const title = el.title.value.trim() || pack.title;
    const sub = el.sub.value.trim();
    const nfc = el.nfc.value.trim();
    const name = el.name ? el.name.value.trim() : "";
    const p = state.palette;
    const nameHtml = name ? `<div class="biz-name">${escapeHtml(name)}</div>` : "";
    const logo = `<div class="brand-lockup"><div class="logo-slot ${state.logoShape}"><img alt="Logo del cliente" src="${state.logoSrc}"></div>${nameHtml}</div>`;
    const demo = state.demo ? `<div class="demo-mark">DEMO</div>` : "";
    const lockup = purposeLockup();
    const starsHtml = purposeStars();
    const ornament = purposeOrnament();
    const titleHtml = state.uso === "whatsapp"
      ? `<h3 class="bubble">${escapeHtml(title)}</h3>`
      : `<h3>${escapeHtml(title)}</h3>`;
    let html = "";

    el.sheet.className = "";
    el.sheet.classList.add("layout-" + state.layout);
    el.sheet.classList.add("scale-" + scale);
    el.sheet.classList.add("uso-" + state.uso);
    if (state.uso === "redes") el.sheet.classList.add("red-" + (state.red || "instagram"));
    if (compact) el.sheet.classList.add("compact");
    if (hideGWord) el.sheet.classList.add("hide-g-word");
    if (esPiezaTarjeta()) el.sheet.classList.add("is-card");
    if (esPlaza()) el.sheet.classList.add("is-square");
    if (name) el.sheet.classList.add("has-name");

    if (state.layout === "farol") {
      html = `${demo}
        <div class="sheet-inner${compact ? " compact" : ""}">
          <div class="banner">
            ${logo}
            ${lockup}
          </div>
          <div class="body">
            <div class="eyebrow">${escapeHtml(top)}</div>
            ${nfcIcon("currentColor")}
            ${starsHtml}
            ${ornament}
            ${titleHtml}
            <div class="sub">${escapeHtml(sub)}</div>
            <div class="bottom">
              <div class="nfc-hint">${escapeHtml(nfc)}</div>
              ${qrBlock()}
            </div>
          </div>
        </div>`;
    } else if (state.layout === "placa") {
      html = esPlaza()
        ? `${demo}
        <div class="sheet-inner${compact ? " compact" : ""}">
          ${logo}
          <div class="badge">
            ${lockup}
            ${starsHtml}
            ${ornament}
          </div>
          ${titleHtml}
          <div class="sub">${escapeHtml(sub)}</div>
          ${qrBlock()}
          <div class="placa-meta">
            ${nfcIcon("currentColor")}
            <div class="nfc-hint">${escapeHtml(nfc)}</div>
          </div>
        </div>`
        : `${demo}
        <div class="sheet-inner${compact ? " compact" : ""}">
          ${logo}
          <div class="badge">
            ${lockup}
            ${starsHtml}
            ${ornament}
          </div>
          ${titleHtml}
          <div class="sub">${escapeHtml(sub)}</div>
          <div class="placa-foot">
            ${nfcIcon("currentColor")}
            ${qrBlock()}
          </div>
          <div class="nfc-hint">${escapeHtml(nfc)}</div>
        </div>`;
    } else {
      html = `${demo}
        <div class="sheet-inner${compact ? " compact" : ""}">
          <div class="brand-col">
            ${logo}
            ${nfcIcon(readableOn(p.dominant))}
            <div class="nfc-hint">${escapeHtml(nfc)}</div>
          </div>
          <div class="review-col">
            ${lockup}
            ${starsHtml}
            ${ornament}
            ${titleHtml}
            <div class="sub">${escapeHtml(sub)}</div>
            ${qrBlock()}
          </div>
        </div>`;
    }

    el.sheet.innerHTML = html;
    applyPaletteCss();
    applyTypeCss();
    applyMarkCss();
    sizeSheet();
    updateStatus();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function sizeSheet() {
    const w = state.widthMm;
    const h = state.heightMm;
    const short = Math.min(w, h);
    el.sheet.style.width = w + "mm";
    el.sheet.style.height = h + "mm";
    el.sheet.style.setProperty("--short", short + "mm");
    const tent = h > w;
    const credit = w > h;
    const tier = escalaHoja();
    el.sheet.style.borderRadius = tier === "micro" || credit ? "4mm" : tent ? "14px" : "10px";
    el.sheet.style.setProperty("--mark-mm", tamañoMarcaMm() + "mm");
    applyQrSize();
    applyNfcSize();

    const well = el.well.getBoundingClientRect();
    const cssW = w * 3.779527559;
    const cssH = h * 3.779527559;
    const pad = Math.min(72, Math.max(16, Math.min(well.width, well.height) * 0.12));
    const fit = Math.min((well.width - pad) / cssW, (well.height - pad) / cssH, 1.15);
    el.sheet.style.transform = `scale(${Math.max(0.12, fit)})`;

    drawRulers(w, h);
    const g = gcd(w, h);
    el.ratio.textContent = `Proporción ${formatPair(w, h)}  ·  ${+(w / (g / 10)).toFixed(2)} : ${+(h / (g / 10)).toFixed(2)}`;
  }

  function drawRulers(w, h) {
    el.rulerX.innerHTML = "";
    el.rulerY.innerHTML = "";
    const step = state.unit === "cm" ? 10 : (w > 80 ? 10 : 5);
    for (let i = 0; i <= w; i += step) {
      const t = document.createElement("span");
      t.textContent = state.unit === "cm" ? niceNum(i / 10, 1) : i;
      t.style.position = "absolute";
      t.style.left = (i / w) * 100 + "%";
      t.style.top = "4px";
      el.rulerX.appendChild(t);
    }
    for (let i = 0; i <= h; i += step) {
      const t = document.createElement("span");
      t.textContent = state.unit === "cm" ? niceNum(i / 10, 1) : i;
      t.style.position = "absolute";
      t.style.top = (i / h) * 100 + "%";
      t.style.left = "2px";
      el.rulerY.appendChild(t);
    }
  }

  function updateStatus() {
    const n = 5;
    const qr = state.qrDataUrl ? "QR listo para escanear" : "QR en espera (falta URL)";
    el.status.textContent = `Tamaño de prensa: ${formatPair(state.widthMm, state.heightMm)} · paleta detectada: ${n} tintas · ${qr}`;
    updateExportHint();
  }

  async function regenQr() {
    const url = normalizarUrl(el.url.value);
    state.url = url;
    if (!url) {
      state.qrDataUrl = "";
      renderCard();
      return;
    }
    try {
      state.qrDataUrl = pintarQrClasico(url);
    } catch (err) {
      state.qrDataUrl = "";
      console.error(err);
    }
    renderCard();
  }

  function formaLogo(w, h) {
    if (!w || !h) return "logo-sq";
    const r = w / h;
    if (r >= 2.1) return "logo-wide";
    if (r <= 0.78) return "logo-tall";
    return "logo-sq";
  }

  function recortarLogo(img) {
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) return { src: img.src, w: srcW, h: srcH };

    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] < 18) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX <= minX || maxY <= minY) {
      return { src: canvas.toDataURL("image/png"), w, h };
    }

    const pad = Math.round(Math.max(maxX - minX + 1, maxY - minY + 1) * 0.06);
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(w - sx, maxX + pad - sx + 1);
    const sh = Math.min(h - sy, maxY + pad - sy + 1);
    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    out.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return { src: out.toDataURL("image/png"), w: sw, h: sh };
  }

  function aplicarLogo(img, srcFallback) {
    let fitted;
    try {
      fitted = recortarLogo(img);
    } catch (err) {
      fitted = {
        src: srcFallback || img.src,
        w: img.naturalWidth || img.width,
        h: img.naturalHeight || img.height,
      };
    }
    state.demo = false;
    state.logoSrc = fitted.src;
    state.logoShape = formaLogo(fitted.w, fitted.h);
    state.tintaLock = null;
    state.cuerpoLock = null;
    state.variant = "dom";
    state.fondoManual = false;
    try {
      state.palette = extraerPaleta(img);
      state.logoLum = luminanciaLogo(img);
      state.logoClaro = state.logoLum > 0.52;
      aplicarFondoAuto();
    } catch (err) {
      state.palette = { ...DEMO };
    }
    syncVariantButtons();
    el.thumb.src = fitted.src;
    const head = document.querySelector(".table-head span:last-child");
    if (head) {
      const nom = el.name && el.name.value.trim();
      head.textContent = nom ? nom + " · paleta viva" : "Marca cargada · paleta viva";
    }
    renderCard();
  }

  async function imagenDesdeSvg(file) {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.documentElement;
    if (svg.querySelector("parsererror")) throw new Error("SVG inválido");
    if (!svg.getAttribute("width") || !svg.getAttribute("height")) {
      const vb = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/);
      if (vb.length === 4) {
        svg.setAttribute("width", vb[2]);
        svg.setAttribute("height", vb[3]);
      } else {
        svg.setAttribute("width", "1024");
        svg.setAttribute("height", "1024");
      }
    }
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
    return URL.createObjectURL(blob);
  }

  function cargarImagen(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = async () => {
        try {
          if (img.decode) await img.decode();
        } catch (err) { /* algunos SVG no implementan decode */ }
        resolve(img);
      };
      img.onerror = () => reject(new Error("No se pudo leer el logo"));
      img.src = src;
    });
  }

  async function loadLogoFromFile(file) {
    if (!file) return;
    const ok = /image\/(png|jpeg|jpg|webp|svg\+xml)/i.test(file.type) || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
    if (!ok) return;
    try {
      let src;
      if (/svg/i.test(file.type) || /\.svg$/i.test(file.name)) {
        src = await imagenDesdeSvg(file);
      } else {
        src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      const img = await cargarImagen(src);
      aplicarLogo(img, src);
    } catch (err) {
      alert("No se pudo acomodar ese logo. Prueba PNG o JPG con fondo transparente.");
    }
  }

  function slugify(s) {
    return (s || "chapa")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "pieza";
  }

  function sizeSlug() {
    return toInputValue(state.widthMm) + "x" + toInputValue(state.heightMm) + unitTag();
  }

  function updateExportHint() {
    const node = document.getElementById("export-size");
    if (!node) return;
    const pieza = formatPair(state.widthMm, state.heightMm);
    if (state.bleed) {
      const full = formatPair(state.widthMm + state.bleed * 2, state.heightMm + state.bleed * 2);
      node.textContent = `Pieza ${pieza}. El PDF/PNG salen a ${full} (incluye sangrado) a 300 dpi.`;
    } else {
      node.textContent = `El PDF sale a ${pieza}. El PNG es la misma pieza a 300 dpi, lista para imprenta.`;
    }
  }

  async function rasterAt300() {
    const bleed = state.bleed;
    const cardW = state.widthMm;
    const cardH = state.heightMm;
    const wMm = cardW + bleed * 2;
    const hMm = cardH + bleed * 2;
    const pxCardW = Math.round(cardW * PX_PER_MM_300);
    const pxCardH = Math.round(cardH * PX_PER_MM_300);
    const pxW = Math.round(wMm * PX_PER_MM_300);
    const pxH = Math.round(hMm * PX_PER_MM_300);
    const pxShort = Math.round(Math.min(cardW, cardH) * PX_PER_MM_300);
    const clone = el.sheet.cloneNode(true);
    clone.id = "press-sheet-export";
    clone.style.transform = "none";
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0";
    clone.style.width = pxCardW + "px";
    clone.style.height = pxCardH + "px";
    clone.style.setProperty("--short", pxShort + "px");
    clone.style.setProperty("--mark-mm", Math.round(tamañoMarcaMm() * PX_PER_MM_300) + "px");
    clone.style.setProperty("--qr-mm", Math.round(tamañoQrMm() * PX_PER_MM_300) + "px");
    clone.style.setProperty("--nfc-mm", Math.round(tamañoNfcMm() * PX_PER_MM_300) + "px");
    clone.style.setProperty("--nfc-scale", String(markPct(state.nfcScaleByUso, defaultNfcPct()) / 100));
    clone.style.setProperty("--logo-scale", String(markPct(state.logoScaleByUso, 100) / 100));
    clone.style.setProperty("--lockup-scale", String(markPct(state.lockupScaleByUso, 100) / 100));
    clone.style.setProperty("--stars-scale", String(markPct(state.starsScaleByUso, 100) / 100));
    clone.style.setProperty("--ornament-scale", String(markPct(state.ornamentScaleByUso, 100) / 100));
    const wrap = document.createElement("div");
    wrap.style.boxSizing = "border-box";
    wrap.style.width = pxW + "px";
    wrap.style.height = pxH + "px";
    wrap.style.padding = Math.round(bleed * PX_PER_MM_300) + "px";
    wrap.style.background = getComputedStyle(el.sheet).getPropertyValue("--c-paper") || "#fff";
    wrap.appendChild(clone);
    el.exportHost.innerHTML = "";
    el.exportHost.appendChild(wrap);
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (err) { /* sigue con fallback */ }
    }
    const canvas = await html2canvas(wrap, {
      scale: 1,
      width: pxW,
      height: pxH,
      windowWidth: pxW,
      windowHeight: pxH,
      backgroundColor: null,
      useCORS: true,
      logging: false,
    });
    el.exportHost.innerHTML = "";
    let out = canvas;
    if (canvas.width !== pxW || canvas.height !== pxH) {
      const exact = document.createElement("canvas");
      exact.width = pxW;
      exact.height = pxH;
      exact.getContext("2d").drawImage(canvas, 0, 0, pxW, pxH);
      out = exact;
    }
    return { canvas: out, wMm, hMm };
  }

  async function exportPdf() {
    const { canvas, wMm, hMm } = await rasterAt300();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: [wMm, hMm], orientation: wMm > hMm ? "landscape" : "portrait" });
    const img = canvas.toDataURL("image/png");
    pdf.addImage(img, "PNG", 0, 0, wMm, hMm);
    const slug = slugify((el.name && el.name.value) || el.title.value);
    pdf.save(`chapa-${slug}-${sizeSlug()}.pdf`);
  }

  async function exportPng() {
    const { canvas } = await rasterAt300();
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `chapa-${slugify((el.name && el.name.value) || el.title.value)}-${sizeSlug()}.png`;
    a.click();
  }

  function bind() {
    syncUnitUi();
    el.drop.addEventListener("click", () => el.file.click());
    el.drop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") el.file.click();
    });
    el.file.addEventListener("change", () => loadLogoFromFile(el.file.files[0]));
    ["dragenter", "dragover"].forEach((ev) => {
      el.drop.addEventListener(ev, (e) => {
        e.preventDefault();
        el.drop.classList.add("is-over");
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      el.drop.addEventListener(ev, (e) => {
        e.preventDefault();
        el.drop.classList.remove("is-over");
      });
    });
    el.drop.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files[0];
      loadLogoFromFile(f);
    });

    document.querySelectorAll("[data-fondo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.fondoManual = true;
        state.fondoOscuro = btn.dataset.fondo === "oscuro";
        syncFondoButtons();
        renderCard();
      });
    });

    document.querySelectorAll("[data-variant]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.variant = btn.dataset.variant;
        state.tintaLock = null;
        if (state.variant === "inv") {
          state.fondoOscuro = true;
        } else if (!state.fondoManual) {
          aplicarFondoAuto();
        }
        syncVariantButtons();
        renderCard();
      });
    });

    const onMm = () => {
      state.widthMm = readMm(el.w, 54.1);
      state.heightMm = readMm(el.h, 85.1);
      document.querySelectorAll("[data-preset]").forEach((c) => {
        const p = PRESETS[c.dataset.preset];
        const on = p && sameMm(p[0], state.widthMm) && sameMm(p[1], state.heightMm);
        c.setAttribute("aria-pressed", String(!!on));
      });
      if (![...document.querySelectorAll("[data-preset]")].some((c) => c.getAttribute("aria-pressed") === "true")) {
        document.getElementById("preset-custom").setAttribute("aria-pressed", "true");
      }
      pickLayoutAuto();
      renderCard();
    };
    el.w.addEventListener("input", onMm);
    el.h.addEventListener("input", onMm);

    document.querySelectorAll("[data-unit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.unit = btn.dataset.unit === "mm" ? "mm" : "cm";
        syncUnitUi();
        sizeSheet();
        updateStatus();
      });
    });

    document.querySelectorAll("[data-preset]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const key = chip.dataset.preset;
        if (PRESETS[key]) {
          state.layoutLocked = false;
          el.w.value = toInputValue(PRESETS[key][0]);
          el.h.value = toInputValue(PRESETS[key][1]);
        }
        document.querySelectorAll("[data-preset]").forEach((c) => c.setAttribute("aria-pressed", "false"));
        chip.setAttribute("aria-pressed", "true");
        onMm();
      });
    });

    document.querySelectorAll("[data-bleed]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.bleed = Number(btn.dataset.bleed);
        document.querySelectorAll("[data-bleed]").forEach((b) => {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        updateStatus();
      });
    });

    document.querySelectorAll("[data-uso]").forEach((btn) => {
      btn.addEventListener("click", () => applyUso(btn.dataset.uso));
    });
    document.querySelectorAll("[data-red]").forEach((btn) => {
      btn.addEventListener("click", () => applyRed(btn.dataset.red));
    });

    document.querySelectorAll("[data-layout]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.layout = btn.dataset.layout;
        state.layoutLocked = true;
        document.querySelectorAll("[data-layout]").forEach((b) => {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        renderCard();
      });
    });

    document.querySelectorAll("[data-font]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.font = btn.dataset.font;
        applyTypeCss();
      });
    });
    const onType = (key, input) => {
      if (!input) return;
      const apply = () => {
        const val = clamp(Number(input.value) || 100, 50, 130);
        if (key === "typeTitle") setMark(state.typeTitleByKey, val);
        else setMark(state.typeBodyByKey, val);
        applyTypeCss();
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    };
    onType("typeTitle", el.typeTitle);
    onType("typeBody", el.typeBody);
    const onQr = () => {
      if (!el.qrScale) return;
      setMark(state.qrScaleByKey, clamp(Number(el.qrScale.value) || 100, 50, 180));
      applyQrSize();
    };
    if (el.qrScale) {
      el.qrScale.addEventListener("input", onQr);
      el.qrScale.addEventListener("change", onQr);
    }
    const onMark = (which) => {
      const input = which === "logo" ? el.logoScale : el.lockupScale;
      if (!input) return;
      const apply = () => {
        const map = which === "logo" ? state.logoScaleByUso : state.lockupScaleByUso;
        setMark(map, clamp(Number(input.value) || 100, 50, 160));
        applyMarkCss();
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    };
    onMark("logo");
    onMark("lockup");
    const onIcon = (which) => {
      const input = which === "nfc" ? el.nfcScale : el.starsScale;
      const map = which === "nfc" ? state.nfcScaleByUso : state.starsScaleByUso;
      if (!input) return;
      const apply = () => {
        const max = which === "nfc" ? 220 : 180;
        setMark(map, clamp(Number(input.value) || 100, 50, max));
        applyMarkCss();
      };
      input.addEventListener("input", apply);
      input.addEventListener("change", apply);
    };
    onIcon("nfc");
    onIcon("stars");
    if (el.ornamentScale) {
      const applyOrn = () => {
        setMark(state.ornamentScaleByUso, clamp(Number(el.ornamentScale.value) || 100, 50, 180));
        applyMarkCss();
      };
      el.ornamentScale.addEventListener("input", applyOrn);
      el.ornamentScale.addEventListener("change", applyOrn);
    }

    ["copy-top", "copy-title", "copy-sub", "copy-nfc", "copy-name"].forEach((id) => {
      const node = document.getElementById(id);
      if (!node) return;
      node.addEventListener("input", () => {
        if (id === "copy-name") {
          const head = document.querySelector(".table-head span:last-child");
          const nom = node.value.trim();
          if (head && !state.demo) head.textContent = nom ? nom + " · paleta viva" : "Marca cargada · paleta viva";
        }
        renderCard();
      });
    });
    el.url.addEventListener("input", () => {
      clearTimeout(el.url._qrTimer);
      el.url._qrTimer = setTimeout(regenQr, 250);
    });
    el.url.addEventListener("change", regenQr);
    el.url.addEventListener("keydown", (e) => {
      if (e.key === "Enter") regenQr();
    });

    document.getElementById("btn-pdf").addEventListener("click", () => {
      exportPdf().catch((err) => alert("No se pudo exportar el PDF. Abre el archivo vía un servidor local si el navegador bloquea html2canvas."));
    });
    document.getElementById("btn-png").addEventListener("click", () => {
      exportPng().catch(() => alert("No se pudo exportar el PNG."));
    });

    let fitRaf = 0;
    const onFitResize = () => {
      cancelAnimationFrame(fitRaf);
      fitRaf = requestAnimationFrame(sizeSheet);
    };
    window.addEventListener("resize", onFitResize);
    window.addEventListener("orientationchange", onFitResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onFitResize);
    }
  }

  function bootDemo() {
    const img = new Image();
    img.onload = () => {
      try {
        state.palette = extraerPaleta(img);
        const fitted = recortarLogo(img);
        state.logoSrc = fitted.src || state.logoSrc;
        state.logoShape = formaLogo(fitted.w, fitted.h);
        state.logoLum = luminanciaLogo(img);
        state.logoClaro = state.logoLum > 0.52;
        aplicarFondoAuto();
        el.thumb.src = state.logoSrc;
      } catch (err) {
        el.thumb.src = state.logoSrc;
      }
      renderCard();
    };
    img.onerror = () => renderCard();
    img.src = state.logoSrc;
  }

  bind();
  bootDemo();
  regenQr();
})();
