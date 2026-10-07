"use strict";

/* =========================================================
   État et sauvegarde (tout reste sur l'appareil)
   ========================================================= */

const STORAGE_KEY = "petits-pas";

const state = loadState();

function loadState() {
  const defaults = {
    settings: { name: "", gender: "m", voice: true, rate: "slow", choices: 3 },
    schedule: { items: DEFAULT_SCHEDULE.slice(), done: 0 },
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return defaults;
    return {
      settings: { ...defaults.settings, ...saved.settings },
      schedule: { ...defaults.schedule, ...saved.schedule },
    };
  } catch {
    return defaults;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Stockage indisponible : l'app fonctionne quand même, sans mémoriser.
  }
}

/* =========================================================
   Utilitaires
   ========================================================= */

// Accorde les mots écrits « [masculin|féminin] » selon le réglage de l'enfant.
function g(text) {
  return text.replace(/\[([^|\]]*)\|([^\]]*)\]/g, (_, m, f) => (state.settings.gender === "f" ? f : m));
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Plugin natif Capacitor (null dans un navigateur ordinaire).
function nativePlugin(name) {
  const cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== "function" || !cap.isNativePlatform()) return null;
  if (typeof cap.registerPlugin !== "function") return null;
  return cap.registerPlugin(name);
}

const activityById = (id) => ACTIVITIES.find((a) => a.id === id);
const childName = () => state.settings.name.trim();

/* =========================================================
   Voix (synthèse vocale)
   Sur Android, la WebView ne fournit pas speechSynthesis :
   on passe alors par le plugin natif TextToSpeech de Capacitor.
   ========================================================= */

const Voice = {
  plugin: null,

  init() {
    this.plugin = nativePlugin("TextToSpeech");
  },

  rate() {
    return state.settings.rate === "slow" ? 0.8 : 1.0;
  },

  stop() {
    if (this.plugin) this.plugin.stop().catch(() => {});
    else if (window.speechSynthesis) speechSynthesis.cancel();
  },

  speak(text, { force = false } = {}) {
    if ((!state.settings.voice && !force) || !text) return;
    text = g(text).replace(/[«»]/g, "");
    this.stop();
    if (this.plugin) {
      this.plugin
        .speak({ text, lang: "fr-FR", rate: this.rate(), pitch: 1.05, volume: 1.0, category: "playback" })
        .catch(() => {});
      return;
    }
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = this.rate() * 0.95;
    u.pitch = 1.05;
    const fr = speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith("fr"));
    if (fr) u.voice = fr;
    speechSynthesis.speak(u);
  },
};

/* =========================================================
   Navigation
   ========================================================= */

const root = document.getElementById("app");
const stack = [];
let current = null;

function go(name, params = {}) {
  stack.push({ name, params });
  show();
}

function back() {
  if (stack.length > 1) stack.pop();
  show();
}

function home() {
  stack.length = 1;
  show();
}

function show() {
  if (current && current.cleanup) current.cleanup();
  Voice.stop();
  const { name, params } = stack[stack.length - 1];
  current = SCREENS[name](params);
  root.innerHTML = current.html;
  window.scrollTo(0, 0);
  if (current.mount) current.mount(root);
}

function rerender() {
  if (current && current.cleanup) current.cleanup();
  const { name, params } = stack[stack.length - 1];
  const y = window.scrollY;
  current = SCREENS[name](params);
  root.innerHTML = current.html;
  window.scrollTo(0, y);
  if (current.mount) current.mount(root);
}

// Un seul écouteur : chaque bouton porte data-act (et éventuellement data-arg).
root.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled || !current) return;
  const act = el.dataset.act;
  if (act === "back") return back();
  if (act === "home") return home();
  const fn = current.actions && current.actions[act];
  if (fn) fn(el.dataset.arg, el);
});

function header(title, { emoji = "", homeBtn = false } = {}) {
  return `
    <header class="top">
      <button class="round" data-act="back" aria-label="Retour"><span class="emoji">⬅️</span></button>
      <h1>${emoji ? `<span class="emoji">${emoji}</span> ` : ""}${esc(title)}</h1>
      ${homeBtn ? `<button class="round" data-act="home" aria-label="Accueil"><span class="emoji">🏠</span></button>` : ""}
    </header>`;
}

/* =========================================================
   Écrans
   ========================================================= */

const SCREENS = {};

/* ---------- Accueil ---------- */
SCREENS.home = () => {
  const name = childName();
  let lockTimer = null;
  let lockStart = 0;

  return {
    html: `
      <p class="hello">Bonjour${name ? " " + esc(name) : ""} ! <span class="emoji">🌞</span>
        <span class="sub">Qu'est-ce qu'on fait ?</span></p>
      <div class="grid">
        ${MODULES.map((m) => `
          <button class="tile" style="--tile:${m.color}" data-act="open" data-arg="${m.id}">
            <span class="emoji">${m.emoji}</span>${esc(m.label)}
          </button>`).join("")}
      </div>
      <button class="parent-lock" id="lock" aria-label="Espace parents : rester appuyé">
        <span class="ring"><span class="emoji">🔒</span></span>
        Espace parents (rester appuyé)
      </button>`,

    actions: {
      open(id) {
        const m = MODULES.find((x) => x.id === id);
        go(id);
        Voice.speak(m.label);
      },
    },

    // Appui long de 2 secondes pour éviter que l'enfant ouvre les réglages par hasard.
    mount(el) {
      const lock = el.querySelector("#lock");
      const ring = lock.querySelector(".ring");
      const cancel = () => {
        cancelAnimationFrame(lockTimer);
        lockTimer = null;
        ring.style.setProperty("--p", 0);
      };
      const tick = () => {
        const p = Math.min(100, ((performance.now() - lockStart) / 2000) * 100);
        ring.style.setProperty("--p", p);
        if (p >= 100) {
          cancel();
          go("parent");
        } else {
          lockTimer = requestAnimationFrame(tick);
        }
      };
      lock.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        lockStart = performance.now();
        lockTimer = requestAnimationFrame(tick);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => lock.addEventListener(ev, cancel));
      lock.addEventListener("contextmenu", (e) => e.preventDefault());
    },
    cleanup() {
      cancelAnimationFrame(lockTimer);
    },
  };
};

/* ---------- Mes émotions ---------- */
SCREENS.emotions = (params) => {
  const tab = params.tab || "discover";
  const tabs = `
    <div class="tabs">
      <button class="${tab === "discover" ? "on" : ""}" data-act="tab" data-arg="discover">Découvrir</button>
      <button class="${tab === "game" ? "on" : ""}" data-act="tab" data-arg="game">Jouer</button>
    </div>`;
  const setTab = (t) => {
    params.tab = t;
    rerender();
  };

  if (tab === "discover") {
    return {
      html: `
        ${header("Mes émotions", { emoji: "😊" })}
        ${tabs}
        <div class="grid small">
          ${EMOTIONS.map((e) => `
            <button class="tile" style="--tile:${e.color}" data-act="emotion" data-arg="${e.id}">
              <span class="emoji">${e.emoji}</span>${esc(g(e.label))}
            </button>`).join("")}
        </div>`,
      actions: {
        tab: setTab,
        emotion: (id) => go("emotion", { id }),
      },
    };
  }

  // Jeu : « Trouve le visage… ». Pas de son d'échec, seulement des encouragements.
  const game = params.game || (params.game = { stars: 0, last: null });
  let round = null;
  let timer = null;

  const newRound = () => {
    const pool = EMOTIONS.filter((e) => e.id !== game.last);
    const target = pool[Math.floor(Math.random() * pool.length)];
    const others = shuffle(EMOTIONS.filter((e) => e.id !== target.id)).slice(0, state.settings.choices - 1);
    game.last = target.id;
    round = { target, options: shuffle([target, ...others]), misses: 0, locked: false };
  };
  newRound();

  const promptText = () => `Trouve le visage : ${g(round.target.label).toLowerCase()}.`;

  return {
    html: `
      ${header("Mes émotions", { emoji: "😊" })}
      ${tabs}
      <div class="stage">
        <div class="stars emoji" id="stars">${"⭐".repeat(game.stars)}</div>
        <button class="prompt" data-act="repeat">${esc(promptText())} <span class="emoji">🔊</span></button>
        <div class="choices" id="choices">
          ${round.options.map((o) => `
            <button class="choice emoji" data-act="pick" data-arg="${o.id}" aria-label="${esc(g(o.label))}">${o.emoji}</button>`).join("")}
        </div>
        <div class="feedback" id="feedback"></div>
      </div>`,
    mount() {
      timer = setTimeout(() => Voice.speak(promptText()), 300);
    },
    cleanup() {
      clearTimeout(timer);
    },
    actions: {
      tab: setTab,
      repeat: () => Voice.speak(promptText()),
      pick(id, el) {
        if (round.locked) return;
        const fb = document.getElementById("feedback");
        const buttons = [...document.querySelectorAll(".choice")];
        if (id === round.target.id) {
          round.locked = true;
          el.classList.add("right");
          buttons.filter((b) => b !== el).forEach((b) => b.classList.add("dim"));
          game.stars = game.stars >= 5 ? 1 : game.stars + 1;
          document.getElementById("stars").textContent = "⭐".repeat(game.stars);
          fb.textContent = game.stars === 5 ? "Super ! 5 étoiles ! 🎉" : "Bravo ! 🌟";
          Voice.speak(`Bravo ! ${g(round.target.label)} !`);
          timer = setTimeout(rerender, 2600);
        } else {
          round.misses++;
          el.classList.add("dim");
          fb.textContent = "Essaie encore 🙂";
          Voice.speak("Essaie encore.");
          if (round.misses >= 2) {
            buttons.find((b) => b.dataset.arg === round.target.id).classList.add("hint");
          }
        }
      },
    },
  };
};

SCREENS.emotion = ({ id }) => {
  const e = EMOTIONS.find((x) => x.id === id);
  let timer = null;
  return {
    html: `
      ${header(g(e.label))}
      <div class="stage">
        <div class="big-card" style="--tile:${e.color}">
          <div class="emoji">${e.emoji}</div>
          <div class="caption">${esc(g(e.say))}</div>
          <div class="detail">${esc(g(e.example))}</div>
        </div>
        <div class="row">
          <button class="btn" data-act="listen"><span class="emoji">🔊</span>Écouter</button>
          <button class="btn primary" data-act="mirror"><span class="emoji">🪞</span>Fais la même tête</button>
        </div>
      </div>`,
    mount() {
      timer = setTimeout(() => Voice.speak(`${e.say} ${e.example}`), 250);
    },
    cleanup() {
      clearTimeout(timer);
    },
    actions: {
      listen: () => Voice.speak(`${e.say} ${e.example}`),
      mirror: () => Voice.speak(`À toi ! Fais une tête ${g(e.label).toLowerCase()}.`),
    },
  };
};

/* ---------- Histoires sociales ---------- */
SCREENS.stories = () => ({
  html: `
    ${header("Histoires", { emoji: "📖" })}
    <div class="grid small">
      ${STORIES.map((s) => `
        <button class="tile" style="--tile:${s.color}" data-act="story" data-arg="${s.id}">
          <span class="emoji">${s.emoji}</span>${esc(s.title)}
        </button>`).join("")}
    </div>`,
  actions: {
    story: (id) => go("story", { id, step: 0 }),
  },
});

SCREENS.story = (params) => {
  const s = STORIES.find((x) => x.id === params.id);
  const i = params.step;
  const step = s.steps[i];
  const last = i === s.steps.length - 1;
  let timer = null;

  return {
    html: `
      ${header(s.title, { homeBtn: true })}
      <div class="stage">
        <div class="big-card" style="--tile:${s.color}">
          <div class="emoji">${step.emoji}</div>
        </div>
        <p class="story-text">${esc(g(step.text))}</p>
        <div class="dots">${s.steps.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>
        <div class="row">
          <button class="btn" data-act="prev" ${i === 0 ? "disabled" : ""} aria-label="Précédent"><span class="emoji">◀️</span></button>
          <button class="btn" data-act="listen" aria-label="Écouter"><span class="emoji">🔊</span></button>
          ${last
            ? `<button class="btn ok" data-act="end"><span class="emoji">⭐</span>Fini</button>`
            : `<button class="btn primary" data-act="next" aria-label="Suivant"><span class="emoji">▶️</span></button>`}
        </div>
      </div>`,
    mount() {
      timer = setTimeout(() => Voice.speak(step.text), 250);
    },
    cleanup() {
      clearTimeout(timer);
    },
    actions: {
      listen: () => Voice.speak(step.text),
      prev() {
        params.step--;
        rerender();
      },
      next() {
        params.step++;
        rerender();
      },
      end() {
        back();
        Voice.speak("Bravo ! L'histoire est finie.");
      },
    },
  };
};

/* ---------- Ma journée (emploi du temps visuel « Maintenant / Ensuite ») ---------- */
SCREENS.schedule = () => {
  const sch = state.schedule;
  const items = sch.items.map(activityById).filter(Boolean);
  const now = items[sch.done];
  const next = items[sch.done + 1];
  let timer = null;

  const strip = `
    <div class="strip" id="strip">
      ${items.map((a, k) => `<div class="emoji ${k < sch.done ? "done" : ""} ${k === sch.done ? "cur" : ""}" title="${esc(a.label)}">${a.emoji}</div>`).join("")}
    </div>`;

  let body;
  if (!items.length) {
    body = `
      <div class="stage">
        <div class="big-card"><div class="emoji">🗓️</div>
          <div class="detail">La journée est vide. Un adulte peut la préparer dans l'espace parents.</div></div>
      </div>`;
  } else if (!now) {
    body = `
      ${strip}
      <div class="stage">
        <div class="big-card" style="--tile:#e3f3ea"><div class="emoji">🎉</div>
          <div class="caption">Journée terminée !</div><div class="detail">Bravo !</div></div>
        <button class="btn primary" data-act="restart"><span class="emoji">🔄</span>Recommencer</button>
      </div>`;
  } else {
    body = `
      ${strip}
      <div class="stage">
        <div class="now-next">
          <button class="slot now" data-act="say">
            <span class="tag">Maintenant</span>
            <span class="emoji">${now.emoji}</span>
            <span class="name">${esc(now.label)}</span>
          </button>
          ${next ? `
          <button class="slot next" data-act="say">
            <span class="tag">Ensuite</span>
            <span class="emoji">${next.emoji}</span>
            <span class="name">${esc(next.label)}</span>
          </button>` : ""}
        </div>
        <div class="row">
          ${sch.done > 0 ? `<button class="btn" data-act="undo" aria-label="Revenir en arrière"><span class="emoji">↩️</span></button>` : ""}
          <button class="btn ok" data-act="done"><span class="emoji">✅</span>C'est fini</button>
        </div>
      </div>`;
  }

  const sayNow = () => {
    if (!now) return;
    Voice.speak(`Maintenant : ${now.label}.${next ? ` Ensuite : ${next.label}.` : ""}`);
  };

  return {
    html: `${header("Ma journée", { emoji: "🗓️" })}${body}`,
    mount(el) {
      const cur = el.querySelector(".strip .cur");
      if (cur) cur.scrollIntoView({ inline: "center", block: "nearest" });
      timer = setTimeout(sayNow, 250);
    },
    cleanup() {
      clearTimeout(timer);
    },
    actions: {
      say: sayNow,
      done() {
        sch.done++;
        saveState();
        if (sch.done >= items.length) Voice.speak("Bravo ! La journée est terminée.");
        rerender();
      },
      undo() {
        sch.done = Math.max(0, sch.done - 1);
        saveState();
        rerender();
      },
      restart() {
        sch.done = 0;
        saveState();
        rerender();
      },
    },
  };
};

/* ---------- Je dis (tableau de communication) ---------- */
SCREENS.talk = () => ({
  html: `
    ${header("Je dis", { emoji: "💬" })}
    <div class="panel" style="text-align:center;min-height:72px;display:grid;place-items:center">
      <div id="said" style="font-size:1.5rem;font-weight:800">Appuie sur une image</div>
    </div>
    <div class="grid small">
      ${TALK.map((t, k) => `
        <button class="tile" style="--tile:${t.color}" data-act="say" data-arg="${k}">
          <span class="emoji">${t.emoji}</span>${esc(g(t.label))}
        </button>`).join("")}
    </div>`,
  actions: {
    say(k) {
      const t = TALK[k];
      document.getElementById("said").innerHTML = `<span class="emoji">${t.emoji}</span> ${esc(g(t.say))}`;
      // Toujours parler ici : c'est la voix de l'enfant, même si la voix guide est coupée.
      Voice.speak(t.say, { force: true });
    },
  },
});

/* ---------- Chacun son tour ---------- */
SCREENS.turns = (params) => {
  const GOAL = 10;
  const t = params.t || (params.t = { blocks: [], turn: "me" });
  const name = childName();
  const players = {
    me: { emoji: "🧒", who: "Moi", sub: name, color: "#f0a868", say: "À moi !" },
    you: { emoji: "🧑", who: "Toi", sub: "l'adulte", color: "#5b8def", say: "À toi !" },
  };
  const finished = t.blocks.length >= GOAL;
  let timer = null;

  const card = (id) => {
    const p = players[id];
    const active = !finished && t.turn === id;
    return `
      <div class="player ${active || finished ? "active" : ""}" style="--pc:${p.color}">
        <span class="emoji">${p.emoji}</span>
        <span class="who">${esc(p.who)}</span>
        ${p.sub ? `<small>${esc(p.sub)}</small>` : ""}
        <button class="add" data-act="add" data-arg="${id}" ${active ? "" : "disabled"}>+ 1 bloc</button>
      </div>`;
  };

  return {
    html: `
      ${header("Chacun son tour", { emoji: "🧱" })}
      <div class="stage">
        <div class="players">${card("me")}${card("you")}</div>
        <div class="tower">
          ${t.blocks.map((b, k) => `<div class="block ${k === t.blocks.length - 1 && t.fresh ? "new" : ""}" style="--bc:${players[b].color}"></div>`).join("")}
        </div>
        ${finished
          ? `<p class="prompt"><span class="emoji">🎉</span> On a fait une tour ensemble !</p>
             <button class="btn primary" data-act="again"><span class="emoji">🔄</span>Encore une tour</button>`
          : `<p class="prompt">${esc(players[t.turn].say)}</p>`}
      </div>`,
    mount() {
      t.fresh = false;
      timer = setTimeout(() => {
        if (finished) Voice.speak("Bravo ! On a construit une tour ensemble !");
        else Voice.speak(players[t.turn].say);
      }, 300);
    },
    cleanup() {
      clearTimeout(timer);
    },
    actions: {
      add(id) {
        if (id !== t.turn || finished) return;
        t.blocks.push(id);
        t.fresh = true;
        t.turn = id === "me" ? "you" : "me";
        rerender();
      },
      again() {
        params.t = { blocks: [], turn: "me" };
        rerender();
      },
    },
  };
};

/* ---------- Coin calme (respiration guidée) ---------- */
SCREENS.calm = () => {
  let timer = null;
  let cycle = 0;

  return {
    html: `
      ${header("Coin calme", { emoji: "🍃" })}
      <div class="calm-stage">
        <div class="bubble" id="bubble"></div>
        <div class="breath-label" id="breath"></div>
        <button class="btn ok" data-act="better"><span class="emoji">🙂</span>Ça va mieux</button>
      </div>`,
    mount(el) {
      const bubble = el.querySelector("#bubble");
      const label = el.querySelector("#breath");
      // Inspire 4 s, souffle 4 s. La voix accompagne seulement les premiers cycles.
      const phase = (inhale) => {
        bubble.classList.toggle("in", inhale);
        label.textContent = inhale ? "Inspire…" : "Souffle…";
        if (cycle < 3) Voice.speak(inhale ? "Inspire" : "Souffle");
        if (!inhale) cycle++;
        timer = setTimeout(() => phase(!inhale), 4000);
      };
      timer = setTimeout(() => phase(true), 600);
    },
    cleanup() {
      clearTimeout(timer);
    },
    actions: {
      better() {
        home();
        Voice.speak("Bravo. Tu es calme.");
      },
    },
  };
};

/* ---------- Espace parents ---------- */
SCREENS.parent = () => {
  const s = state.settings;
  const sch = state.schedule;
  const seg = (key, options) => `
    <div class="seg">
      ${options.map(([value, label]) => `
        <button class="${String(s[key]) === String(value) ? "on" : ""}" data-act="set" data-arg="${key}:${value}">${label}</button>`).join("")}
    </div>`;

  return {
    html: `
      ${header("Espace parents", { emoji: "🔒" })}

      <section class="panel">
        <h2>Mon enfant</h2>
        <label class="field">Prénom <input type="text" id="name" maxlength="20" value="${esc(s.name)}" placeholder="Ex. : Léo"></label>
        <div class="field">Accords ${seg("gender", [["m", "Garçon"], ["f", "Fille"]])}</div>
      </section>

      <section class="panel">
        <h2>Voix</h2>
        <div class="field">Voix guide ${seg("voice", [[true, "Oui"], [false, "Non"]])}</div>
        <div class="field">Vitesse ${seg("rate", [["slow", "Lente"], ["normal", "Normale"]])}</div>
        <p>Le tableau « Je dis » parle toujours, même si la voix guide est coupée.</p>
        <button class="link-btn" data-act="test">🔊 Tester la voix</button>
      </section>

      <section class="panel">
        <h2>Jeu des émotions</h2>
        <div class="field">Nombre d'images ${seg("choices", [[2, "2"], [3, "3"], [4, "4"]])}</div>
        <p>Commencez avec 2 images pour les plus petits, puis augmentez.</p>
      </section>

      <section class="panel">
        <h2>Ma journée</h2>
        <ul class="sched-list">
          ${sch.items.map((id, k) => {
            const a = activityById(id);
            if (!a) return "";
            return `
              <li>
                <span class="emoji">${a.emoji}</span><span class="lbl">${esc(a.label)}</span>
                <button data-act="up" data-arg="${k}" ${k === 0 ? "disabled" : ""} aria-label="Monter">↑</button>
                <button data-act="down" data-arg="${k}" ${k === sch.items.length - 1 ? "disabled" : ""} aria-label="Descendre">↓</button>
                <button data-act="remove" data-arg="${k}" aria-label="Retirer">✕</button>
              </li>`;
          }).join("") || "<li>Aucune activité.</li>"}
        </ul>
        <p>Ajouter une activité :</p>
        <div class="picker">
          ${ACTIVITIES.map((a) => `
            <button data-act="addAct" data-arg="${a.id}"><span class="emoji">${a.emoji}</span>${esc(a.label)}</button>`).join("")}
        </div>
        <div class="row" style="justify-content:flex-start;margin-top:12px;gap:18px">
          <button class="link-btn" data-act="resetDay">🔄 Recommencer la journée</button>
          <button class="link-btn" data-act="defaultDay">↺ Programme par défaut</button>
          <button class="link-btn" data-act="clearDay">🗑️ Tout vider</button>
        </div>
      </section>

      <section class="panel">
        <h2>Conseils d'utilisation</h2>
        <ul>
          <li>Utilisez l'application <strong>avec</strong> votre enfant, quelques minutes à la fois, quand il est calme.</li>
          <li>Répétez souvent les mêmes histoires : la répétition rassure et aide à apprendre.</li>
          <li>Lisez une histoire sociale <strong>avant</strong> la situation réelle (docteur, crèche, parc…).</li>
          <li>Montrez l'exemple : dites vous-même « bonjour », « à toi », « à moi », nommez vos émotions.</li>
          <li>Félicitez chaque essai. Ne forcez pas le regard ni le contact.</li>
          <li>Le tableau « Je dis » ne remplace pas la parole : il l'accompagne. Dites le mot en même temps.</li>
          <li>Préparez « Ma journée » le soir ou le matin, et laissez votre enfant valider chaque étape.</li>
        </ul>
      </section>

      <section class="panel">
        <h2>À propos</h2>
        <p>Petits Pas est un outil éducatif de soutien pour les enfants de 1 à 5 ans. Il ne remplace ni un diagnostic ni
          l'accompagnement par des professionnels (médecin, orthophoniste, psychomotricien, éducateur, CRA…).
          Parlez-en avec eux pour adapter les activités à votre enfant.</p>
        <p>Aucune publicité, aucun compte, aucune connexion internet nécessaire. Les réglages restent sur cet appareil.</p>
      </section>`,

    mount(el) {
      el.querySelector("#name").addEventListener("input", (e) => {
        s.name = e.target.value.slice(0, 20);
        saveState();
      });
    },

    actions: {
      set(arg) {
        const [key, raw] = arg.split(":");
        s[key] = raw === "true" ? true : raw === "false" ? false : /^\d+$/.test(raw) ? Number(raw) : raw;
        saveState();
        rerender();
      },
      test() {
        const n = childName();
        Voice.speak(`Bonjour${n ? " " + n : ""} ! Je suis [content|contente] de jouer avec toi.`, { force: true });
      },
      up(k) {
        k = Number(k);
        [sch.items[k - 1], sch.items[k]] = [sch.items[k], sch.items[k - 1]];
        saveState();
        rerender();
      },
      down(k) {
        k = Number(k);
        [sch.items[k + 1], sch.items[k]] = [sch.items[k], sch.items[k + 1]];
        saveState();
        rerender();
      },
      remove(k) {
        k = Number(k);
        sch.items.splice(k, 1);
        if (sch.done > k) sch.done--;
        sch.done = Math.min(sch.done, sch.items.length);
        saveState();
        rerender();
      },
      addAct(id) {
        sch.items.push(id);
        saveState();
        rerender();
      },
      resetDay() {
        sch.done = 0;
        saveState();
        Voice.speak("La journée recommence.", { force: true });
      },
      defaultDay() {
        sch.items = DEFAULT_SCHEDULE.slice();
        sch.done = 0;
        saveState();
        rerender();
      },
      clearDay() {
        sch.items = [];
        sch.done = 0;
        saveState();
        rerender();
      },
    },
  };
};

/* =========================================================
   Démarrage
   ========================================================= */

// D'abord afficher l'accueil : un souci avec un plugin natif ne doit jamais bloquer l'écran.
go("home");

try {
  Voice.init();
} catch (err) {
  console.error("Voix indisponible", err);
}

// Bouton « retour » d'Android : revient à l'écran précédent au lieu de fermer l'app.
try {
  const App = nativePlugin("App");
  if (App) {
    App.addListener("backButton", () => {
      if (stack.length > 1) back();
      else App.exitApp();
    });
  }
} catch (err) {
  console.error("Bouton retour indisponible", err);
}

// Certains navigateurs chargent les voix en différé.
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};
