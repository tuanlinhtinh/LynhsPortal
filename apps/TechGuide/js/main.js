/* ==========================================================================
   main.js — builds the thumbnails and the pop-up.
   Settings: css/config.css · Text: css/content.css · Media: content/01, 02 …
   Works opened straight from disk; no web server needed.
   ========================================================================== */
(() => {
  "use strict";

  const root = document.documentElement;
  const readVar = (name, el = root) => getComputedStyle(el).getPropertyValue(name).trim();
  const num = (name, fallback) => {
    const v = parseFloat(readVar(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const str = (name, fallback) => readVar(name).replace(/^["']|["']$/g, "") || fallback;
  const ms = (name, fallback) => {
    const v = readVar(name);
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return fallback;
    return v.endsWith("ms") ? n : v.endsWith("s") ? n * 1000 : n;
  };

  const CFG = {
    count: Math.max(0, Math.round(num("--thumb-count", 4))),
    folder: str("--content-folder", "content").replace(/\/+$/, ""),
    digits: Math.max(1, Math.round(num("--folder-digits", 2))),
    thumbFile: str("--thumb-file", "thumbnail"),
    mediaPrefix: str("--media-file-prefix", "media-"),
    mediaSlots: Math.max(0, Math.round(num("--media-slots", 2))),
    autoplay: num("--video-autoplay", 1) !== 0,
    controls: num("--video-controls", 1) !== 0,
  };

  // Extensions tried for thumbnail.* and media-N.*, in this order.
  // Whichever one is found gets tried first next time.
  const EXTENSIONS = {
    jpg: "image", png: "image", webp: "image", mp4: "video", webm: "video",
    jpeg: "image", gif: "image", avif: "image", mov: "video", m4v: "video",
  };
  let preferredExt = [];

  const pad = (n) => String(n).padStart(CFG.digits, "0");
  const folderOf = (n) => `${CFG.folder}/${pad(n)}`;
  const kindOf = (name) => EXTENSIONS[name.split(".").pop().toLowerCase()] || "image";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let uid = 0;

  /* ---- Text from content.css ------------------------------------------
     Each quoted string in a custom property becomes one entry, so
     --text: "Para one." "Para two."  →  ["Para one.", "Para two."]      */
  function parseStrings(value) {
    const out = [];
    let i = 0;
    while (i < value.length) {
      const quote = value[i];
      if (quote !== '"' && quote !== "'") {
        i++;
        continue;
      }
      let s = "";
      i++;
      while (i < value.length && value[i] !== quote) {
        if (value[i] !== "\\") {
          s += value[i++];
          continue;
        }
        const next = value[i + 1];
        if (next === undefined) {
          i++;
        } else if (next === "\n" || next === "\r" || next === "\f") {
          i += next === "\r" && value[i + 2] === "\n" ? 3 : 2; // escaped line break: skip
        } else if (/[0-9a-f]/i.test(next)) {
          const hex = value.slice(i + 1).match(/^[0-9a-f]{1,6}/i)[0];
          const cp = parseInt(hex, 16);
          s += cp === 0 || cp > 0x10ffff ? "\uFFFD" : String.fromCodePoint(cp);
          i += 1 + hex.length;
          if (/[ \t\n]/.test(value[i] || "")) i++; // one space after a hex escape is part of it
        } else {
          s += next;
          i += 2;
        }
      }
      i++; // closing quote
      out.push(s.trim());
    }
    // Forgot the quotes? Use the raw value rather than nothing.
    if (!out.length && value.trim()) out.push(value.trim());
    return out.filter(Boolean);
  }

  function readContent(el) {
    const list = (name) => parseStrings(readVar(name, el));
    return {
      title: list("--title")[0] || "",
      subtitle: list("--subtitle")[0] || "",
      heading: list("--heading")[0] || "",
      thumbnail: list("--thumbnail")[0] || "",
      media: list("--media"),
      body: list("--text"),
    };
  }

  function renderParagraphs(el, paragraphs) {
    el.textContent = "";
    paragraphs.forEach((t) => {
      const p = document.createElement("p");
      p.textContent = t;
      el.append(p);
    });
  }

  /* ---- Finding images / videos by name -------------------------------- */
  function probeImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  function probeVideo(url) {
    return new Promise((resolve) => {
      const v = document.createElement("video");
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        v.removeAttribute("src");
        v.load();
        resolve(ok);
      };
      const timer = setTimeout(() => done(false), 8000);
      v.muted = true;
      v.preload = "metadata";
      v.onloadedmetadata = () => done(true);
      v.onerror = () => done(false);
      v.src = url;
    });
  }

  // From disk: load-test the file directly. On a web server, a HEAD request is
  // lighter and tells "missing" apart from "can't play".
  async function exists(url, kind) {
    const probe = () => (kind === "video" ? probeVideo(url) : probeImage(url));
    if (location.protocol === "file:") return probe();
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
      if (res.status === 405 || res.status === 501) return probe();
      // Hosts with catch-all rewrites answer 200 + index.html for any path
      return res.ok && !/text\/html/i.test(res.headers.get("content-type") || "");
    } catch {
      return probe();
    }
  }

  async function findFile(base, allowVideo) {
    const order = [...new Set([...preferredExt, ...Object.keys(EXTENSIONS)])]
      .filter((ext) => allowVideo || EXTENSIONS[ext] === "image");
    for (const ext of order) {
      const url = `${base}.${ext}`;
      const kind = EXTENSIONS[ext];
      if (await exists(url, kind)) {
        preferredExt = [ext, ...preferredExt.filter((e) => e !== ext)];
        return { url, kind };
      }
    }
    return null;
  }

  /* ---- Intro ----------------------------------------------------------- */
  function renderIntro() {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const data = readContent(hero);
    const title = hero.querySelector("[data-intro-title]");
    const heading = hero.querySelector("[data-intro-heading]");
    const body = hero.querySelector("[data-intro-body]");
    if (title) title.textContent = data.title;
    if (heading) {
      heading.textContent = data.heading;
      heading.hidden = !data.heading;
    }
    if (body) renderParagraphs(body, data.body);
  }

  /* ---- Thumbnails ------------------------------------------------------ */
  const thumbsEl = document.querySelector("[data-thumbs]");
  const template = document.getElementById("panel-template");
  const items = [];

  function createItem(n) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "thumb";
    el.dataset.thumb = pad(n); // matches [data-thumb="01"] in content.css
    el.setAttribute("aria-expanded", "false");
    el.innerHTML =
      '<span class="thumb-frame">' +
      '<img class="thumb-img" alt="" decoding="async">' +
      '<span class="thumb-shade"></span>' +
      '<span class="thumb-label"><span class="thumb-title"></span><span class="thumb-sub"></span></span>' +
      "</span>";
    const item = { n, folder: folderOf(n), el, data: null, media: null };
    el.addEventListener("click", () => toggle(item));
    return item;
  }

  // Runs after the card is in the page (computed styles need that)
  function loadItem(item) {
    const data = readContent(item.el);
    data.title = data.title || `Thumbnail ${item.n}`;
    item.data = data;

    item.el.querySelector(".thumb-title").textContent = data.title;
    const sub = item.el.querySelector(".thumb-sub");
    sub.textContent = data.subtitle;
    sub.hidden = !data.subtitle;

    const found = data.thumbnail
      ? Promise.resolve({ url: `${item.folder}/${data.thumbnail}` })
      : findFile(`${item.folder}/${CFG.thumbFile}`, false);
    found.then((thumb) => {
      if (!thumb) return;
      const img = item.el.querySelector(".thumb-img");
      img.onload = () => item.el.classList.add("has-image");
      img.src = thumb.url;
    });
  }

  // One promise per media slot, created on first open and then cached.
  function mediaSources(item) {
    if (!item.media) {
      const list = item.data.media;
      item.media = list.length
        ? list.map((name) => Promise.resolve({ url: `${item.folder}/${name}`, kind: kindOf(name), name }))
        : Array.from({ length: CFG.mediaSlots }, (_, i) =>
            findFile(`${item.folder}/${CFG.mediaPrefix}${i + 1}`, true));
    }
    return item.media;
  }

  /* ---- Rows: rebuilt whenever --thumb-columns changes ------------------ */
  let columns = 0;
  const rowOf = (item) => item.el.closest(".thumb-row");

  function layout() {
    const cols = Math.max(1, Math.round(num("--thumb-columns", 4)));
    if (cols === columns) return;
    columns = cols;

    const focused = thumbsEl.contains(document.activeElement) ? document.activeElement : null;
    thumbsEl.textContent = "";
    for (let i = 0; i < items.length; i += cols) {
      const row = document.createElement("div");
      row.className = "thumb-row";
      const chunk = items.slice(i, i + cols);
      chunk.forEach((item) => row.append(item.el));
      // Fillers keep a short last row's cards the same width as the others
      for (let k = chunk.length; k < cols; k++) {
        const filler = document.createElement("span");
        filler.className = "thumb-filler";
        filler.setAttribute("aria-hidden", "true");
        row.append(filler);
      }
      thumbsEl.append(row);
    }
    if (current) rowOf(current.item).after(current.slot);
    if (focused && focused.isConnected) focused.focus({ preventScroll: true });
  }

  /* ---- Pop-up ---------------------------------------------------------- */
  let current = null; // { item, slot }

  function toggle(item) {
    if (current && current.item === item) close();
    else open(item);
  }

  function setActive(item, slot, on) {
    item.el.classList.toggle("is-active", on);
    item.el.setAttribute("aria-expanded", String(on));
    if (on) item.el.setAttribute("aria-controls", slot.querySelector(".panel").id);
    else item.el.removeAttribute("aria-controls");
  }

  function open(item) {
    const row = rowOf(item);

    // Same row: keep the pop-up where it is, move the line, swap the contents
    if (current && rowOf(current.item) === row) {
      const { slot } = current;
      const panel = slot.querySelector(".panel");
      setActive(current.item, slot, false);
      current.item = item;
      setActive(item, slot, true);
      pauseVideos(slot);
      panel.classList.add("is-swapping");
      const swap = (slot._swap = (slot._swap || 0) + 1);
      setTimeout(() => {
        if (slot._swap !== swap) return;
        fillPanel(slot, item);
        panel.classList.remove("is-swapping");
      }, reduceMotion.matches ? 0 : 180);
      return;
    }

    if (current) collapse(current);

    const slot = template.content.firstElementChild.cloneNode(true);
    const panel = slot.querySelector(".panel");
    panel.id = `panel-${++uid}`;
    slot.querySelector(".panel-close").addEventListener("click", close);
    row.after(slot);

    current = { item, slot };
    setActive(item, slot, true);
    fillPanel(slot, item);

    slot.getBoundingClientRect(); // commit the closed state so the expansion animates
    slot.classList.add("is-open");
    afterTransition(slot, () => {
      if (current && current.slot === slot) bringIntoView(slot);
    });
  }

  function collapse({ item, slot }) {
    setActive(item, slot, false);
    pauseVideos(slot);
    slot._token = (slot._token || 0) + 1; // cancel media still loading
    slot.inert = true;
    slot.classList.remove("is-open");
    afterTransition(slot, () => slot.remove());
  }

  function close() {
    if (!current) return;
    const { item, slot } = current;
    const hadFocus = slot.contains(document.activeElement);
    collapse(current);
    current = null;
    if (hadFocus) item.el.focus({ preventScroll: true });
  }

  function afterTransition(slot, fn) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      slot.removeEventListener("transitionend", onEnd);
      fn();
    };
    const onEnd = (e) => {
      if (e.target === slot && e.propertyName === "grid-template-rows") finish();
    };
    slot.addEventListener("transitionend", onEnd);
    setTimeout(finish, ms("--dur-panel", 650) + 100);
  }

  function bringIntoView(slot) {
    const panelBox = slot.querySelector(".panel").getBoundingClientRect();
    const overflow = panelBox.bottom - window.innerHeight + 24;
    if (overflow <= 0) return;
    const rowTop = rowOf(current.item).getBoundingClientRect().top - 16;
    const by = Math.min(overflow, rowTop); // never scroll the clicked row out of view
    if (by > 0) window.scrollBy({ top: by, behavior: reduceMotion.matches ? "auto" : "smooth" });
  }

  function fillPanel(slot, item) {
    const token = (slot._token = (slot._token || 0) + 1);
    const data = item.data;
    const panel = slot.querySelector(".panel");
    const heading = slot.querySelector("[data-panel-heading]");
    heading.id = `${panel.id}-heading`;
    heading.textContent = data.heading || data.title;
    panel.setAttribute("aria-labelledby", heading.id);
    renderParagraphs(slot.querySelector("[data-panel-body]"), data.body);

    const grid = slot.querySelector("[data-panel-media]");
    grid.textContent = "";
    const sources = mediaSources(item);
    grid.hidden = sources.length === 0;

    sources.forEach((source, i) => {
      const fig = document.createElement("figure");
      fig.className = "media-slot";
      grid.append(fig);
      source.then((src) => {
        if (slot._token !== token) return;
        if (src) renderMedia(fig, src, item, i);
        else renderEmpty(fig, item, i);
      });
    });
  }

  function renderMedia(fig, src, item, i) {
    const label = `${item.data.title}, ${src.kind} ${i + 1}`;
    const fail = () => renderEmpty(fig, item, i, { name: src.name || src.url.split("/").pop(), kind: src.kind });
    let el;
    if (src.kind === "video") {
      el = document.createElement("video");
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.controls = CFG.controls;
      el.autoplay = CFG.autoplay;
      el.preload = CFG.autoplay ? "auto" : "metadata";
      el.setAttribute("aria-label", label);
      const ready = () => fig.classList.add("is-ready");
      el.addEventListener("loadeddata", ready, { once: true });
      el.addEventListener("loadedmetadata", ready, { once: true });
      el.addEventListener("error", fail, { once: true });
      // "#t=0.001" makes Safari paint the first frame when not autoplaying
      el.src = CFG.autoplay ? src.url : `${src.url}#t=0.001`;
    } else {
      el = new Image();
      el.decoding = "async";
      el.alt = label;
      el.onload = () => fig.classList.add("is-ready");
      el.onerror = fail;
      el.src = src.url;
    }
    fig.append(el);
  }

  function renderEmpty(fig, item, i, failed) {
    fig.textContent = "";
    fig.classList.remove("is-ready");
    fig.classList.add("is-empty");
    const box = document.createElement("figcaption");
    box.className = "media-empty";
    const big = document.createElement("strong");
    big.textContent = `Slot ${i + 1}`;
    const hint = document.createElement("span");
    const base = `${CFG.mediaPrefix}${i + 1}`;
    if (!failed) hint.textContent = `Add ${base}.jpg or ${base}.mp4 to ${item.folder}/`;
    else if (failed.kind === "video") hint.textContent = `${failed.name} can’t play in this browser. Export it as H.264 MP4 or WebM.`;
    else hint.textContent = `${failed.name} couldn’t be loaded from ${item.folder}/`;
    box.append(big, hint);
    fig.append(box);
  }

  function pauseVideos(slot) {
    slot.querySelectorAll("video").forEach((v) => v.pause());
  }

  /* ---- Start ----------------------------------------------------------- */
  renderIntro();
  for (let n = 1; n <= CFG.count; n++) items.push(createItem(n));
  layout();
  items.forEach(loadItem);

  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(layout);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !current) return;
    const { item } = current;
    close();
    item.el.focus({ preventScroll: true });
  });
})();
