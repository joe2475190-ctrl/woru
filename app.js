// ---------- Access code: keeps strangers from using your AI ----------
// The code is typed once and kept in this browser only (key "sc-access", not part of backups).
function scGet(key) { try { return localStorage.getItem(key) || ""; } catch (e) { return ""; } }
function scProfile() {
  try {
    var p = JSON.parse(scGet("studycore-profile"));
    if (p && typeof p === "object") return { name: String(p.name || ""), field: String(p.field || "") };
  } catch (e) {}
  return { name: "", field: "" };
}

(function guardAI() {
  var realFetch = window.fetch.bind(window);
  var KEY = "sc-access";
  function saved() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function withCode(init, code) {
    var copy = Object.assign({}, init);
    var headers = Object.assign({}, init.headers || {});
    var own = scGet("sc-userkey");
    var field = scProfile().field;
    if (own) headers["x-user-key"] = own;
    if (field) headers["x-student"] = encodeURIComponent(field);
    copy.headers = headers;
    try {
      var b = JSON.parse(init.body);
      b.code = code;
      copy.body = JSON.stringify(b);
    } catch (e) {}
    return copy;
  }
  window.fetch = function (url, init) {
    if (typeof url !== "string" || url.indexOf("/functions/v1/") === -1 || !init || typeof init.body !== "string") {
      return realFetch(url, init);
    }
    function go(code, retried) {
      return realFetch(url, withCode(init, code)).then(function (res) {
        if (res.status !== 401 || retried) return res;
        return res.clone().json().catch(function () { return {}; }).then(function (d) {
          if (d.auth !== true) return res;
          if (window.WORU_FRIEND) {
            return new Response(JSON.stringify({ error: "Add your Gemini key first: Profile, then Settings." }), { status: 401, headers: { "Content-Type": "application/json" } });
          }
          var entered = window.prompt("Enter your WORU access code:");
          if (!entered || !entered.trim()) return res;
          store(entered.trim());
          return go(entered.trim(), true);
        });
      });
    }
    return go(saved(), false);
  };
})();

const buttons = document.querySelectorAll("nav button");
const screens = document.querySelectorAll(".screen");

buttons.forEach(function (button) {
  button.addEventListener("click", function () {
    screens.forEach(function (s) { s.classList.remove("active"); });
    buttons.forEach(function (b) { b.classList.remove("active"); });
    document.getElementById(button.dataset.screen).classList.add("active");
    button.classList.add("active");
  });
});
(function loadMyCourses() {
  try {
    var saved = JSON.parse(scGet("studycore-courses"));
    var good = Array.isArray(saved) && saved.length > 0 && saved.every(function (c) {
      return c && typeof c.id === "string" && typeof c.name === "string" && Array.isArray(c.topics);
    });
    if (good) {
      courses.length = 0;
      saved.forEach(function (c) { courses.push(c); });
    }
  } catch (e) {}
})();

const hour = new Date().getHours();
let greeting = "Good evening";
if (hour < 12) {
  greeting = "Good morning";
} else if (hour < 17) {
  greeting = "Good afternoon";
}
const whoName = scProfile().name || (window.WORU_FRIEND ? "" : "Joseph");
document.getElementById("greeting").textContent = greeting + (whoName ? ", " + whoName : "");
const messagesBox = document.getElementById("messages");
const questionInput = document.getElementById("question");
const sendButton = document.getElementById("send");

const AI_URL = "https://yepsrbpykoybuqgkduml.supabase.co/functions/v1/ask-ai";
let chatHistory = [];
let aiBusy = false;

let chatMode = "general";
const modeNotes = {
  general: "Everyday questions, explanations and revision.",
  engineering: "Step-by-step calculations with units and checks.",
  autocad: "Click-by-click AutoCAD guidance. It guides you and does not do the assignment for you.",
  coding: "Programming help: hints first, full code when you ask.",
  writing: "Essays, news and scripts: coaching and feedback that makes you a better writer."
};
const modeNote = document.getElementById("mode-note");
if (window.WORU_FRIEND) {
  document.documentElement.classList.add("friend");
  ["autocad", "coding", "engineering"].forEach(function (m) {
    var b = document.querySelector('.mode[data-mode="' + m + '"]');
    if (b) b.remove();
  });
  var modesBox = document.querySelector(".modes");
  if (modesBox) {
    var wb = document.createElement("button");
    wb.type = "button";
    wb.className = "mode";
    wb.dataset.mode = "writing";
    wb.textContent = "Writing";
    var gen = modesBox.querySelector('.mode[data-mode="general"]');
    if (gen) gen.after(wb); else modesBox.prepend(wb);
    // theme.js renames the mode buttons while the page loads; this puts the right word back
    window.addEventListener("load", function () { wb.textContent = "Writing"; });
  }
}
const modeButtons = document.querySelectorAll(".mode[data-mode]");

function setMode(name) {
  chatMode = name;
  modeButtons.forEach(function (b) {
    b.classList.toggle("active", b.dataset.mode === name);
  });
  if (modeNote) modeNote.textContent = modeNotes[name];
}

modeButtons.forEach(function (b) {
  b.addEventListener("click", function () { setMode(b.dataset.mode); });
});
setMode("general");

function renderMath(el) {
  if (typeof renderMathInElement !== "function") return;
  try {
    renderMathInElement(el, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false
    });
  } catch (e) {}
}
function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  if (who === "ai" && /^(Thinking|Reading your (photo|PDF))\.\.\.$/.test(text)) {
    // waiting message: three pulsing dots and a small label
    const dots = document.createElement("span");
    dots.className = "dots";
    dots.innerHTML = "<i></i><i></i><i></i>";
    const label = document.createElement("span");
    label.className = "think-label";
    label.textContent = /^Thinking/.test(text) ? "THINKING" : text.replace("...", "").toUpperCase();
    div.appendChild(dots);
    div.appendChild(label);
  } else {
    div.textContent = text;
  }
  messagesBox.appendChild(div);
  div.scrollIntoView({ behavior: "smooth", block: "end" });
  return div;
}

function showAIError(message, text, image) {
  const div = document.createElement("div");
  div.className = "msg ai error";
  const label = document.createElement("span");
  label.textContent = message + " ";
  const retry = document.createElement("button");
  retry.className = "retry";
  retry.textContent = "RETRY";
  retry.addEventListener("click", function () {
    div.remove();
    askAI(text, image);
  });
  div.appendChild(label);
  div.appendChild(retry);
  messagesBox.appendChild(div);
  div.scrollIntoView({ behavior: "smooth", block: "end" });
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(area);
}

function copyText(text, button) {
  function done() {
    button.textContent = "COPIED";
    setTimeout(function () { button.textContent = "COPY"; }, 1500);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function () {
      fallbackCopy(text);
      done();
    });
  } else {
    fallbackCopy(text);
    done();
  }
}

function renderReply(box, reply) {
  box.innerHTML = "";
  const parts = reply.split("```");
  parts.forEach(function (part, i) {
    if (i % 2 === 0) {
      const text = part.replace(/^\n+|\n+$/g, "");
      if (text === "") return;
      const p = document.createElement("div");
      p.textContent = text;
      box.appendChild(p);
      renderMath(p);
      return;
    }

    let code = part;
    let language = "code";
    const firstBreak = code.indexOf("\n");
    if (firstBreak !== -1) {
      const label = code.slice(0, firstBreak).trim();
      if (label.length <= 20 && label.indexOf(" ") === -1) {
        if (label !== "") language = label;
        code = code.slice(firstBreak + 1);
      }
    }
    code = code.replace(/\n+$/, "");

    const wrap = document.createElement("div");
    wrap.className = "code";
    const head = document.createElement("div");
    head.className = "code-head";
    const name = document.createElement("span");
    name.textContent = language.toUpperCase();
    const copy = document.createElement("button");
    copy.className = "copy";
    copy.textContent = "COPY";
    copy.addEventListener("click", function () { copyText(code, copy); });
    head.appendChild(name);
    head.appendChild(copy);
    const pre = document.createElement("pre");
    const codeEl = document.createElement("code");
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    wrap.appendChild(head);
    wrap.appendChild(pre);
    box.appendChild(wrap);
  });
}

async function askAI(text, image) {
  if (aiBusy) return;
  if (!navigator.onLine) {
    showAIError("AI requires an internet connection.", text, image);
    return;
  }

  aiBusy = true;
  sendButton.disabled = true;
  updateQuick();
  const thinking = addMessage(image ? (image.mime === "application/pdf" ? "Reading your PDF..." : "Reading your photo...") : "Thinking...", "ai");
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, image ? (image.mime === "application/pdf" ? 80000 : 50000) : 30000);

  try {
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ mode: chatMode, messages: chatHistory.concat([{ role: "user", text: text }]), image: image || undefined }),
      signal: controller.signal
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.reply) {
      throw new Error(data.error || "Something went wrong. Please try again.");
    }
    renderReply(thinking, data.reply);
    if (data.model) {
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = data.model + " · " + (data.mode || chatMode).toUpperCase();
      thinking.appendChild(meta);
    }
    addFollowups(thinking, data.reply);
    chatHistory.push({ role: "user", text: image ? (image.mime === "application/pdf" ? "[PDF] " : "[Photo] ") + text : text });
    chatHistory.push({ role: "model", text: data.reply });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
  } catch (err) {
    thinking.remove();
    let message = err.message;
    if (err.name === "AbortError") {
      message = "The AI took too long.";
    } else if (err instanceof TypeError) {
      message = "Could not reach the AI. Check your internet.";
    }
    showAIError(message, text, image);
  } finally {
    clearTimeout(timer);
    aiBusy = false;
    sendButton.disabled = false;
    updateQuick();
  }
}

function sendQuestion() {
  let text = questionInput.value.trim();
  const image = photoData;
  if ((text === "" && !image) || aiBusy) return;
  const isPdf = !!image && image.mime === "application/pdf";
  if (text === "") text = isPdf ? "Read this PDF. Tell me what it is and the key points." : "Read this image and solve or explain it step by step.";
  const bubble = addMessage(text, "user");
  if (image && isPdf) {
    const tag = document.createElement("div");
    tag.className = "msg-doc";
    tag.textContent = "📄 " + (image.name || "PDF");
    bubble.insertBefore(tag, bubble.firstChild);
  } else if (image) {
    const pic = document.createElement("img");
    pic.className = "msg-photo";
    pic.src = "data:" + image.mime + ";base64," + image.data;
    bubble.insertBefore(pic, bubble.firstChild);
  }
  if (image && window.noteAttachment) window.noteAttachment(isPdf ? "📄 " + (image.name || "PDF") : "📷 Photo");
  questionInput.value = "";
  clearPhoto();
  simplerLevel = 1;
  askAI(text, image);
}

const quickButtons = document.querySelectorAll(".quick button");
let simplerLevel = 1;

const quickPrompts = {
  hint: "Give me a hint only, not the full answer.",
  quiz: "Quiz me on what we are discussing. Ask one question at a time and wait for my answer.",
  example: "Show me a worked example.",
  steps: "Explain this step by step, and ask me a small question after each step."
};

function updateQuick() {
  quickButtons.forEach(function (b) {
    b.disabled = aiBusy || chatHistory.length === 0;
  });
}

function sendQuick(kind) {
  if (aiBusy || chatHistory.length === 0) return;
  let text = quickPrompts[kind];
  let shown = text;
  if (kind === "simpler") {
    simplerLevel = Math.min(5, simplerLevel + 1);
    text = "I still do not understand. Explain it again at simplification level " + simplerLevel +
      " of 5 (level 2 = simpler words, level 3 = everyday analogy, level 4 = worked example, level 5 = guide me step by step with small questions).";
    shown = "Explain simpler (level " + simplerLevel + " of 5)";
  }
  addMessage(shown, "user");
  askAI(text);
}

quickButtons.forEach(function (b) {
  b.addEventListener("click", function () { sendQuick(b.dataset.quick); });
});
updateQuick();

sendButton.addEventListener("click", sendQuestion);
questionInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") sendQuestion();
});
const studyHome = document.getElementById("study-home");
const courseList = document.getElementById("course-list");
const topicView = document.getElementById("topic-view");
const courseTitle = document.getElementById("course-title");
const topicList = document.getElementById("topic-list");
let studyCourse = null;

function showCourses() {
  courseList.innerHTML = "";
  courses.forEach(function (course) {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = course.name;
    div.addEventListener("click", function () { showTopics(course); });
    courseList.appendChild(div);
  });
}

const readerEl = document.getElementById("reader");
let studyView = "home";

function setStudyView(name) {
  studyView = name;
  studyHome.classList.toggle("hidden", name !== "home");
  topicView.classList.toggle("hidden", name !== "topics");
  readerEl.classList.toggle("hidden", name !== "reader");
  cbtEl.classList.toggle("hidden", name !== "cbt");
}

function showTopics(course) {
  if (cbt.active) {
    if (!cbt.submitted) return;
    closeCbt();
  }
  flushNotes();
  studyCourse = course;
  setStudyView("topics");
  courseTitle.textContent = course.name;
  topicList.innerHTML = "";
  course.topics.forEach(function (topic) {
    const live = sessionTimer !== null && sessionCourseObj !== null && sessionCourseObj.id === course.id && sessionTopic.value === topic;
    const key = topicKey(course.id, topic);
    const saved = [];
    if (lessons[key]) saved.push("LESSON");
    if (notesStore[key] && notesStore[key].trim()) saved.push("NOTES");

    const div = document.createElement("div");
    div.className = "item topic" + (live ? " now" : "");
    const info = document.createElement("div");
    info.className = "name";
    const name = document.createElement("span");
    name.textContent = live ? topic + "  ·  studying now" : topic;
    info.appendChild(name);
    if (saved.length > 0) {
      const tag = document.createElement("span");
      tag.className = "rd-tag";
      tag.textContent = saved.join(" · ") + " SAVED";
      info.appendChild(tag);
    }
    const quizButton = document.createElement("button");
    quizButton.className = "mini";
    quizButton.textContent = "QUIZ";
    quizButton.addEventListener("click", function (e) {
      e.stopPropagation();
      beginGeneratedQuiz({ courseId: course.id, topic: topic });
    });
    div.addEventListener("click", function () { openReading(course, topic); });
    div.appendChild(info);
    div.appendChild(quizButton);
    topicList.appendChild(div);
  });
}

document.getElementById("back").addEventListener("click", function () {
  studyCourse = null;
  setStudyView("home");
});

showCourses();
// ===== CBT: exam-style quiz =====
// Questions the AI made earlier are kept on this phone, so you can still practise them offline.
const aiBankKey = "studycore-aibank";

function validQuestion(q) {
  return !!q && typeof q.question === "string" && q.question.length > 0 &&
    Array.isArray(q.options) && q.options.length === 4 &&
    q.options.every(function (o) { return typeof o === "string" && o.length > 0; }) &&
    Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3;
}

function loadAiBank() {
  try {
    const saved = JSON.parse(localStorage.getItem(aiBankKey));
    return Array.isArray(saved) ? saved.filter(validQuestion) : [];
  } catch (e) {
    return [];
  }
}

let aiBank = loadAiBank();

function saveAiBank() {
  try { localStorage.setItem(aiBankKey, JSON.stringify(aiBank)); } catch (e) {}
}

function savedQuestions() {
  return questions.concat(aiBank);
}

const letters = ["A", "B", "C", "D"];
const cbtEl = document.getElementById("cbt");
const cbtExam = document.getElementById("cbt-exam");
const cbtResult = document.getElementById("cbt-result");
const cbtTitle = document.getElementById("cbt-title");
const cbtTimer = document.getElementById("cbt-timer");
const cbtCount = document.getElementById("cbt-count");
const cbtMore = document.getElementById("cbt-more");
const cbtNote = document.getElementById("cbt-note");
const cbtResume = document.getElementById("cbt-resume");
const cbtQuestion = document.getElementById("cbt-question");
const cbtOptions = document.getElementById("cbt-options");
const cbtPalette = document.getElementById("cbt-palette");
const cbtPrev = document.getElementById("cbt-prev");
const cbtNext = document.getElementById("cbt-next");
const cbtFlag = document.getElementById("cbt-flag");

const cbt = {
  active: false,
  submitted: false,
  qs: [],
  picked: [],
  flagged: [],
  current: 0,
  startedAt: 0,
  endsAt: 0,
  usedMs: 0,
  loading: false,
  pending: [],
  note: "",
  warn: "",
  times: [],
  shownAt: 0,
  returnTo: "",
  studyTopic: null,
  ctx: null,
  timerId: null,
  review: "wrong"
};
let genToken = 0;
let genBusy = false;

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function courseCode(course) {
  return course.name.split(" · ")[0];
}

function clockText(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return (h > 0 ? h + ":" + pad(m) : pad(m)) + ":" + pad(sec);
}

function stopCbtTimer() {
  if (cbt.timerId !== null) clearInterval(cbt.timerId);
  cbt.timerId = null;
}

function startCbt(ctx, list, opts) {
  stopCbtTimer();
  cbt.active = true;
  cbt.submitted = false;
  cbt.ctx = ctx;
  cbt.qs = list.slice();
  cbt.picked = list.map(function () { return -1; });
  cbt.flagged = list.map(function () { return false; });
  cbt.times = list.map(function () { return 0; });
  cbt.shownAt = Date.now();
  cbt.returnTo = studyView;
  cbt.current = 0;
  cbt.loading = false;
  cbt.pending = [];
  cbt.warn = "";
  cbt.note = (opts && opts.note) || "";
  cbt.startedAt = Date.now();
  cbt.endsAt = cbt.startedAt + list.length * 60000;
  setStudyView("cbt");
  cbtExam.classList.remove("hidden");
  cbtResult.classList.add("hidden");
  document.body.classList.add("in-cbt");
  cbt.timerId = setInterval(tickCbt, 1000);
  renderCbt();
  tickCbt();
  window.scrollTo(0, 0);
}

function renderCbtHeader() {
  cbtTitle.textContent = cbt.ctx ? cbt.ctx.label : "";
  cbtCount.textContent = "Question " + (cbt.current + 1) + " of " + cbt.qs.length;
  cbtMore.classList.toggle("hidden", !cbt.loading);
  cbtResume.classList.toggle("hidden", cbt.loading || cbt.submitted || cbt.pending.length === 0);
  const shownNote = [cbt.note, cbt.warn].filter(Boolean).join(" ");
  cbtNote.textContent = shownNote;
  cbtNote.classList.toggle("hidden", !shownNote);
  cbtNext.disabled = cbt.current >= cbt.qs.length - 1;
}

function renderPalette() {
  cbtPalette.innerHTML = "";
  cbt.qs.forEach(function (q, i) {
    const b = document.createElement("button");
    b.className = "pal" + (i === cbt.current ? " cur" : "") + (cbt.picked[i] >= 0 ? " done" : "") + (cbt.flagged[i] ? " flag" : "");
    b.textContent = String(i + 1);
    b.addEventListener("click", function () { goToQuestion(i); });
    cbtPalette.appendChild(b);
  });
}

function renderCbt() {
  const q = cbt.qs[cbt.current];
  cbtQuestion.textContent = q.question;
  cbtOptions.innerHTML = "";
  q.options.forEach(function (text, i) {
    const row = document.createElement("div");
    row.className = "opt" + (cbt.picked[cbt.current] === i ? " sel" : "");
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = letters[i];
    const label = document.createElement("span");
    label.className = "opt-text";
    label.textContent = text;
    row.appendChild(badge);
    row.appendChild(label);
    row.addEventListener("click", function () { pickAnswer(i); });
        cbtOptions.appendChild(row);
  });
  renderMath(cbtQuestion);
  renderMath(cbtOptions);
  cbtPrev.disabled = cbt.current === 0;
  cbtFlag.classList.toggle("on", cbt.flagged[cbt.current]);
  cbtFlag.textContent = cbt.flagged[cbt.current] ? "⚑ FLAGGED" : "⚑ FLAG";
  renderCbtHeader();
  renderPalette();
}

function pickAnswer(i) {
  if (!cbt.active || cbt.submitted) return;
  cbt.picked[cbt.current] = i;
  renderCbt();
  const row = cbtOptions.children[i];
  if (row) row.classList.add("pop");
}

// Adds the time spent on the question that is on screen. A pause longer than 3 minutes counts as 3 (phone asleep, etc.).
function accrueTime() {
  if (!cbt.active || cbt.submitted || cbt.shownAt === 0) return;
  const now = Date.now();
  cbt.times[cbt.current] += Math.min(now - cbt.shownAt, 180000);
  cbt.shownAt = now;
}

function goToQuestion(n) {
  if (!cbt.active || cbt.submitted) return;
  if (n < 0 || n >= cbt.qs.length) return;
  accrueTime();
  cbt.current = n;
  renderCbt();
  window.scrollTo(0, 0);
}

function toggleFlag() {
  if (!cbt.active || cbt.submitted) return;
  cbt.flagged[cbt.current] = !cbt.flagged[cbt.current];
  renderCbt();
}

function tickCbt() {
  if (!cbt.active || cbt.submitted) return;
  const left = cbt.endsAt - Date.now();
  cbtTimer.textContent = clockText(left);
  cbtTimer.classList.toggle("low", left < 60000);
  if (left <= 0) submitCbt(true);
}

// More questions arrive in the background while the student is already answering.
function appendQuestions(list) {
  if (!cbt.active || cbt.submitted || list.length === 0) return;
  list.forEach(function (q) {
    cbt.qs.push(q);
    cbt.picked.push(-1);
    cbt.flagged.push(false);
    cbt.times.push(0);
  });
  cbt.endsAt += list.length * 60000;
  if (list.some(function (q) { return q.unchecked; }) && cbt.note.indexOf("double-checked") === -1) {
    cbt.note = (cbt.note ? cbt.note + " " : "") + "Some questions could not be double-checked.";
  }
  renderCbtHeader();
  renderPalette();
  tickCbt();
}

function submitCbt(auto) {
  if (!cbt.active || cbt.submitted) return;
  if (!auto) {
    const blank = cbt.picked.filter(function (p) { return p < 0; }).length;
    const message = blank > 0
      ? "You have " + blank + " unanswered question" + (blank === 1 ? "" : "s") + ". Submit anyway?"
      : "Submit your answers now?";
    if (!confirm(message)) return;
  }
  accrueTime();
  cbt.submitted = true;
  genToken++;
  cbt.loading = false;
  stopCbtTimer();
  cbt.usedMs = Date.now() - cbt.startedAt;
  let score = 0;
  cbt.qs.forEach(function (q, i) {
    if (cbt.picked[i] < 0) return;
    const right = cbt.picked[i] === q.answer;
    if (right) score++;
    recordAnswer(q, right, cbt.times[i]);
  });
  recordQuiz(score, cbt.qs.length);
  showCbtResult(auto);
}

function setReviewTab() {
  document.getElementById("cr-tab-wrong").classList.toggle("active", cbt.review === "wrong");
  document.getElementById("cr-tab-all").classList.toggle("active", cbt.review === "all");
}

function showCbtResult(auto) {
  const total = cbt.qs.length;
  let right = 0;
  let wrong = 0;
  let skip = 0;
  cbt.qs.forEach(function (q, i) {
    if (cbt.picked[i] < 0) skip++;
    else if (cbt.picked[i] === q.answer) right++;
    else wrong++;
  });
  const pct = total > 0 ? Math.round((right / total) * 100) : 0;
  document.getElementById("cr-score").textContent = pct + "%";
  document.getElementById("cr-right").textContent = right;
  document.getElementById("cr-wrong").textContent = wrong;
  document.getElementById("cr-skip").textContent = skip;
  document.getElementById("cr-time").textContent = clockText(cbt.usedMs);
  document.getElementById("cr-line").textContent = (auto ? "Time is up, so your answers were submitted. " : "") +
    right + " out of " + total + " correct. " +
    (pct >= 70 ? "Strong work." : pct >= 50 ? "Good effort. Go through the mistakes below." : "Keep going. Read each mistake below, then try again.");
  cbtExam.classList.add("hidden");
  cbtResult.classList.remove("hidden");
  document.body.classList.remove("in-cbt");
  cbt.review = wrong + skip > 0 ? "wrong" : "all";
  setReviewTab();
  renderReview();
  renderAnalytics();
  window.scrollTo(0, 0);
}

// Groups the questions by sub-topic (or topic) and adds up accuracy and time for each group.
function cbtBreakdown() {
  const groups = {};
  cbt.qs.forEach(function (q, i) {
    const name = q.subtopic || q.topic;
    if (!groups[name]) groups[name] = { name: name, topic: q.topic, course: q.course, n: 0, answered: 0, right: 0, ms: 0, timed: 0 };
    const g = groups[name];
    g.n++;
    if (cbt.times[i] > 0) { g.ms += cbt.times[i]; g.timed++; }
    if (cbt.picked[i] >= 0) {
      g.answered++;
      if (cbt.picked[i] === q.answer) g.right++;
    }
  });
  return Object.keys(groups).map(function (k) { return groups[k]; });
}

function renderAnalytics() {
  const box = document.getElementById("cr-breakdown");
  const insight = document.getElementById("cr-insight");
  const studyButton = document.getElementById("cr-study");
  box.innerHTML = "";
  studyButton.classList.add("hidden");
  cbt.studyTopic = null;

  const groups = cbtBreakdown();
  let totalMs = 0;
  let timed = 0;
  groups.forEach(function (g) { totalMs += g.ms; timed += g.timed; });
  const avgSec = timed > 0 ? Math.round(totalMs / timed / 1000) : 0;
  function groupSec(g) { return g.timed > 0 ? Math.round(g.ms / g.timed / 1000) : 0; }
  function accuracy(g) { return g.answered > 0 ? g.right / g.answered : 0; }

  const lines = [];
  if (avgSec > 0) {
    lines.push("You averaged " + avgSec + "s per question. The exam timer allows 60s." + (avgSec > 60 ? " You are slower than exam pace, so practise answering faster." : ""));
  }
  const withTime = groups.filter(function (g) { return g.timed > 0; });
  if (withTime.length > 1) {
    const slowest = withTime.slice().sort(function (a, b) { return groupSec(b) - groupSec(a); })[0];
    lines.push("Most time went on " + slowest.name + " (about " + groupSec(slowest) + "s each).");
  }
  const attempted = groups.filter(function (g) { return g.answered > 0; });
  const ranked = attempted.slice().sort(function (a, b) { return accuracy(a) - accuracy(b) || groupSec(b) - groupSec(a); });
  const weakest = ranked.length > 0 && accuracy(ranked[0]) < 1 ? ranked[0] : null;
  if (weakest) lines.push("Weakest area: " + weakest.name + " (" + Math.round(accuracy(weakest) * 100) + "% correct).");
  insight.textContent = lines.length > 0 ? lines.join(" ") : "Answer some questions to see your speed and accuracy.";

  const rows = ranked.concat(groups.filter(function (g) { return g.answered === 0; }));
  rows.slice(0, 10).forEach(function (g) {
    const row = document.createElement("div");
    row.className = "bd";
    const top = document.createElement("div");
    top.className = "bd-top";
    const name = document.createElement("span");
    name.textContent = g.name;
    const stat = document.createElement("span");
    stat.className = "bd-stat";
    stat.textContent = g.answered > 0
      ? Math.round(accuracy(g) * 100) + "% · " + groupSec(g) + "s avg · " + g.answered + "/" + g.n + " answered"
      : "not attempted";
    top.appendChild(name);
    top.appendChild(stat);
    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = Math.round(accuracy(g) * 100) + "%";
    bar.appendChild(fill);
    row.appendChild(top);
    row.appendChild(bar);

    const tags = document.createElement("div");
    tags.className = "bd-tags";
    function tag(kind, text) {
      const t = document.createElement("span");
      t.className = "bd-tag " + kind;
      t.textContent = text;
      tags.appendChild(t);
    }
    if (g.answered >= 2 && accuracy(g) < 0.6) tag("weak", "WEAK");
    if (g.timed >= 2 && groupSec(g) >= 20 && avgSec > 0 && groupSec(g) > avgSec * 1.3) tag("slow", "SLOW");
    if (g.answered === 0) tag("skip", "SKIPPED");
    if (tags.children.length > 0) row.appendChild(tags);
    box.appendChild(row);
  });

  if (weakest && weakest.topic) {
    cbt.studyTopic = { courseId: weakest.course, topic: weakest.topic };
    studyButton.textContent = "READ UP: " + weakest.topic.toUpperCase();
    studyButton.classList.remove("hidden");
  }
}

function renderReview() {
  const box = document.getElementById("cr-review");
  box.innerHTML = "";
  let shown = 0;
  cbt.qs.forEach(function (q, i) {
    const p = cbt.picked[i];
    const status = p < 0 ? "skip" : p === q.answer ? "ok" : "bad";
    if (cbt.review === "wrong" && status === "ok") return;
    shown++;

    const card = document.createElement("div");
    card.className = "rev " + status;
    card.style.animationDelay = Math.min(i * 70, 700) + "ms";
    const head = document.createElement("div");
    head.className = "rev-head";
    const left = document.createElement("span");
    left.textContent = "Q" + (i + 1) + " · " + q.topic;
    const tag = document.createElement("span");
    tag.className = "rev-tag";
    tag.textContent = status === "ok" ? "CORRECT" : status === "bad" ? "WRONG" : "SKIPPED";
    head.appendChild(left);
    head.appendChild(tag);
    card.appendChild(head);

    const text = document.createElement("div");
    text.className = "rev-q";
    text.textContent = q.question;
    card.appendChild(text);

    q.options.forEach(function (option, k) {
      const line = document.createElement("div");
      line.className = "rev-opt" + (k === q.answer ? " right" : "") + (k === p && k !== q.answer ? " wrong" : "");
      line.textContent = letters[k] + ".  " + option + (k === q.answer ? "   ✓" : "") + (k === p && k !== q.answer ? "   (your answer)" : "");
      card.appendChild(line);
    });

    if (q.explanation) {
      const why = document.createElement("div");
      why.className = "why";
      why.textContent = q.explanation;
      card.appendChild(why);
    }
    if (status !== "ok") {
      const ask = document.createElement("button");
      ask.className = "mini";
      ask.textContent = "ASK TUTOR";
      ask.addEventListener("click", function () { askTutorAbout(q, p); });
      card.appendChild(ask);
    }
    box.appendChild(card);
  });
  if (shown === 0) {
    const p = document.createElement("p");
    p.className = "small";
    p.textContent = "No mistakes. Perfect score!";
    box.appendChild(p);
  }
  renderMath(box);
}

function askTutorAbout(q, picked) {
  setMode(courseModes[q.course] || "general");
  showScreen("ai");
  if (aiBusy) return;
  const short = q.question.length > 90 ? q.question.slice(0, 90) + "..." : q.question;
  addMessage("Explain this exam question: " + short, "user");
  simplerLevel = 1;
  const options = q.options.map(function (o, i) { return letters[i] + ". " + o; }).join("\n");
  askAI("Explain this CBT exam question to me step by step.\nQuestion: " + q.question + "\n" + options +
    "\nThe marked correct answer is " + letters[q.answer] + "." +
    (picked >= 0 ? " I chose " + letters[picked] + "." : " I skipped it.") +
    " Show why the correct answer is right and why the others are wrong.");
}

function closeCbt() {
  stopCbtTimer();
  genToken++;
  cbt.active = false;
  cbt.submitted = false;
  cbt.loading = false;
  document.body.classList.remove("in-cbt");
  const back = cbt.returnTo;
  cbt.returnTo = "";
  if (back === "reader" && reader.course) setStudyView("reader");
  else if ((back === "topics" || back === "reader") && studyCourse) setStudyView("topics");
  else setStudyView("home");
  setGenStatus("");
  renderLaunch();
}

// Called by other screens. It never throws away an exam that is still in progress.
function exitQuiz() {
  if (cbt.active && !cbt.submitted) return;
  closeCbt();
}

function leaveExam() {
  if (!cbt.active) return;
  if (!cbt.submitted && !confirm("Leave this quiz? Your answers will not be saved.")) return;
  closeCbt();
}

cbtPrev.addEventListener("click", function () { goToQuestion(cbt.current - 1); });
cbtNext.addEventListener("click", function () { goToQuestion(cbt.current + 1); });
cbtFlag.addEventListener("click", toggleFlag);
document.getElementById("cbt-submit").addEventListener("click", function () { submitCbt(false); });
document.getElementById("cbt-exit").addEventListener("click", leaveExam);
cbtResume.addEventListener("click", resumeLoading);
document.getElementById("cr-close").addEventListener("click", closeCbt);
document.getElementById("cr-study").addEventListener("click", function () {
  const target = cbt.studyTopic;
  if (!target) return;
  const course = courses.find(function (c) { return c.id === target.courseId; });
  if (!course) return;
  closeCbt();
  openReading(course, target.topic);
});
document.getElementById("cr-tab-wrong").addEventListener("click", function () { cbt.review = "wrong"; setReviewTab(); renderReview(); });
document.getElementById("cr-tab-all").addEventListener("click", function () { cbt.review = "all"; setReviewTab(); renderReview(); });
document.getElementById("cr-again").addEventListener("click", function () {
  const ctx = cbt.ctx;
  closeCbt();
  if (ctx && ctx.courseId && !ctx.saved) beginGeneratedQuiz({ courseId: ctx.courseId, topic: ctx.topic });
  else startSavedPractice();
});
window.addEventListener("beforeunload", function (e) {
  if (cbt.active && !cbt.submitted) {
    e.preventDefault();
    e.returnValue = "";
  }
});

const sessionCourse = document.getElementById("session-course");
const sessionTopic = document.getElementById("session-topic");
const sessionSetup = document.getElementById("session-setup");
const sessionLive = document.getElementById("session-live");
const liveSubject = document.getElementById("live-subject");
const liveTopic = document.getElementById("live-topic");
const liveTime = document.getElementById("live-time");
const liveFill = document.getElementById("live-fill");
const liveProgress = document.getElementById("live-progress");
const liveMessage = document.getElementById("live-message");
const liveLeaves = document.getElementById("live-leaves");
const livePhase = document.getElementById("live-phase");
const endSession = document.getElementById("end-session");
const sessionBar = document.getElementById("session-bar");
const barSubject = document.getElementById("bar-subject");
const barTime = document.getElementById("bar-time");

let sessionEnd = 0;
let sessionTotal = 0;
let sessionMin = 50;
let sessionMode = "normal";
let sessionTimer = null;
let sessionCourseObj = null;
let leaveCount = 0;

let breakEvery = Infinity;
let breakLength = 600000;
let nextBreakAt = Infinity;
let onBreak = false;
let breakStart = 0;
let breakEnd = 0;
let audioCtx = null;

function showScreen(id) {
  screens.forEach(function (s) { s.classList.remove("active"); });
  buttons.forEach(function (b) { b.classList.remove("active"); });
  document.getElementById(id).classList.add("active");
  document.querySelector('nav button[data-screen="' + id + '"]').classList.add("active");
  if (id === "study") renderLaunch();
  if (id === "planner" && !sessionLive.classList.contains("hidden")) {
    showPlannerView("session");
  }
}

function openSessionStudy() {
  if (!sessionCourseObj) return;
  showScreen("study");
  if (cbt.active && !cbt.submitted) return; // never interrupt an exam in progress
  const topic = sessionTopic.value;
  if (topic && sessionCourseObj.topics.indexOf(topic) !== -1) openReading(sessionCourseObj, topic);
  else showTopics(sessionCourseObj);
}

function fillSessionTopics() {
  const course = courses.find(function (c) { return c.id === sessionCourse.value; });
  sessionTopic.innerHTML = "";
  if (!course) return;
  course.topics.forEach(function (t) {
    const option = document.createElement("option");
    option.textContent = t;
    sessionTopic.appendChild(option);
  });
}

function fillSessionCourses() {
  courses.forEach(function (course) {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name;
    sessionCourse.appendChild(option);
  });
  fillSessionTopics();
}

function pad(n) { return String(n).padStart(2, "0"); }

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  return pad(Math.floor(total / 3600)) + ":" + pad(Math.floor((total % 3600) / 60)) + ":" + pad(total % 60);
}

function getPercent() {
  const ref = onBreak ? breakStart : Date.now();
  const remaining = Math.max(0, sessionEnd - ref);
  return Math.floor(((sessionTotal - remaining) / sessionTotal) * 100);
}

function unlockAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

function beep(times) {
  if (audioCtx) {
    for (let i = 0; i < times; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const t = audioCtx.currentTime + i * 0.5;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  }
  if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
}

function tick() {
  const now = Date.now();

  if (onBreak) {
    const breakLeft = Math.max(0, breakEnd - now);
    livePhase.textContent = "BREAK";
    liveTime.textContent = formatTime(breakLeft);
    barTime.textContent = "BREAK " + formatTime(breakLeft);
    liveMessage.textContent = "Break ends in " + formatTime(breakLeft) + ". You will return to study automatically.";
    if (breakLeft === 0) {
      sessionEnd += now - breakStart;
      nextBreakAt = now + breakEvery;
      onBreak = false;
      livePhase.textContent = "STUDY SESSION";
      beep(2);
      openSessionStudy();
    }
    return;
  }

  if (nextBreakAt < sessionEnd && now >= nextBreakAt) {
    onBreak = true;
    breakStart = now;
    breakEnd = now + breakLength;
    beep(3);
    showScreen("planner");
    tick();
    return;
  }

  const remaining = Math.max(0, sessionEnd - now);
  const percent = getPercent();
  liveTime.textContent = formatTime(remaining);
  barTime.textContent = formatTime(remaining) + " · " + percent + "%";
  liveFill.style.width = percent + "%";
  liveProgress.textContent = "Progress: " + percent + "%";

  if (remaining === 0) {
    clearInterval(sessionTimer);
    sessionTimer = null;
    recordSession(sessionTotal);
    liveMessage.textContent = "Session complete. Well done!";
    endSession.disabled = false;
    endSession.textContent = "DONE";
    sessionBar.classList.add("hidden");
    showScreen("planner");
    beep(3);
  } else if (percent < sessionMin) {
    liveMessage.textContent = "You're below your minimum target (" + sessionMin + "%). Keep going.";
    if (sessionMode === "strict") {
      endSession.disabled = true;
      endSession.textContent = "LOCKED UNTIL " + sessionMin + "%";
    }
  } else {
    liveMessage.textContent = "Minimum target reached. You can leave now. Recommended: continue to 100%.";
    endSession.disabled = false;
    endSession.textContent = "END SESSION";
  }
}

function startSession() {
  unlockAudio();
  const minutes = Number(document.getElementById("session-minutes").value);
  const min = Number(document.getElementById("session-min").value);
  const every = Number(document.getElementById("session-break-every").value);
  const length = Number(document.getElementById("session-break-length").value);
  if (!(minutes >= 1)) {
    alert("Enter a duration of at least 1 minute.");
    return;
  }
  sessionMin = Math.min(100, Math.max(1, min || 50));
  sessionMode = document.getElementById("session-mode").value;
  breakEvery = every >= 1 ? every * 60000 : Infinity;
  breakLength = Math.max(1, length || 10) * 60000;
  onBreak = false;
  leaveCount = 0;
  liveLeaves.textContent = "";
  livePhase.textContent = "STUDY SESSION";
  sessionTotal = minutes * 60000;
  sessionEnd = Date.now() + sessionTotal;
  nextBreakAt = Date.now() + breakEvery;
  sessionCourseObj = courses.find(function (c) { return c.id === sessionCourse.value; });

  liveSubject.textContent = sessionCourse.options[sessionCourse.selectedIndex].textContent;
  liveTopic.textContent = sessionTopic.value + " · " + sessionMode.toUpperCase() + " · minimum " + sessionMin + "%";
  barSubject.textContent = liveSubject.textContent + " · " + sessionTopic.value;
  endSession.disabled = false;
  endSession.textContent = "END SESSION";
  sessionSetup.classList.add("hidden");
  sessionLive.classList.remove("hidden");
  sessionBar.classList.remove("hidden");

  sessionTimer = setInterval(tick, 1000);
  tick();
  openSessionStudy();
}

function leaveSession() {
  if (sessionTimer !== null && sessionMode === "focus" && getPercent() < sessionMin) {
    const sure = confirm("You're below your minimum target. Leave anyway?");
    if (!sure) return;
  }
  if (sessionTimer !== null) {
    recordSession(sessionTotal - Math.max(0, sessionEnd - (onBreak ? breakStart : Date.now())));
  }
  clearInterval(sessionTimer);
  sessionTimer = null;
  onBreak = false;
  sessionCourseObj = null;
  livePhase.textContent = "STUDY SESSION";
  endSession.disabled = false;
  sessionBar.classList.add("hidden");
  sessionLive.classList.add("hidden");
  sessionSetup.classList.remove("hidden");
}

document.addEventListener("visibilitychange", function () {
  if (sessionTimer === null || sessionMode === "normal" || onBreak) return;
  if (document.hidden) {
    leaveCount++;
  } else {
    liveLeaves.textContent = "You left the session " + leaveCount + " time(s). Stay focused.";
  }
});

window.addEventListener("beforeunload", function (e) {
  if (sessionTimer !== null && sessionMode !== "normal") {
    e.preventDefault();
    e.returnValue = "";
  }
});

sessionBar.addEventListener("click", function () { showScreen("planner"); });
sessionCourse.addEventListener("change", fillSessionTopics);
document.getElementById("start-session").addEventListener("click", startSession);
document.getElementById("test-alarm").addEventListener("click", function () {
  unlockAudio();
  beep(3);
});
endSession.addEventListener("click", leaveSession);
fillSessionCourses();

// ===== TIMETABLE =====
const timetableKey = "studycore-timetable";
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayOrder = [1, 2, 3, 4, 5, 6, 0];

const viewSessionBtn = document.getElementById("view-session");
const viewTimetableBtn = document.getElementById("view-timetable");
const plannerSession = document.getElementById("planner-session");
const plannerTimetable = document.getElementById("planner-timetable");
const ttDay = document.getElementById("tt-day");
const ttStart = document.getElementById("tt-start");
const ttEnd = document.getElementById("tt-end");
const ttCourse = document.getElementById("tt-course");
const ttTopic = document.getElementById("tt-topic");
const ttMessage = document.getElementById("tt-message");
const ttToday = document.getElementById("tt-today");
const ttWeek = document.getElementById("tt-week");

function loadTimetable() {
  try {
    const saved = JSON.parse(localStorage.getItem(timetableKey));
    return Array.isArray(saved) ? saved : [];
  } catch (e) {
    return [];
  }
}

function saveTimetable() {
  try {
    localStorage.setItem(timetableKey, JSON.stringify(timetable));
  } catch (e) {
    alert("Could not save the timetable on this browser.");
  }
}

let timetable = loadTimetable();

function showPlannerView(which) {
  plannerSession.classList.toggle("hidden", which !== "session");
  plannerTimetable.classList.toggle("hidden", which !== "timetable");
  viewSessionBtn.classList.toggle("active", which === "session");
  viewTimetableBtn.classList.toggle("active", which === "timetable");
}

function timeToMinutes(t) {
  const parts = t.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function entryText(entry) {
  const course = courses.find(function (c) { return c.id === entry.courseId; });
  const name = course ? course.name : entry.courseName;
  return entry.start + " – " + entry.end + " · " + name + " · " + entry.topic;
}

function sortByStart(list) {
  return list.sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); });
}

function removeEntry(id) {
  timetable = timetable.filter(function (e) { return e.id !== id; });
  saveTimetable();
  renderTimetable();
  renderNext();
}

function renderTimetable() {
  const now = new Date();
  const today = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  ttToday.innerHTML = "";
  const todays = sortByStart(timetable.filter(function (e) { return e.day === today; }));
  if (todays.length === 0) {
    const p = document.createElement("p");
    p.className = "small";
    p.textContent = "Nothing scheduled today.";
    ttToday.appendChild(p);
  }
  todays.forEach(function (e) {
    const div = document.createElement("div");
    div.className = "item tt";
    const isNow = nowMin >= timeToMinutes(e.start) && nowMin < timeToMinutes(e.end);
    if (isNow) div.classList.add("now");
    div.textContent = (isNow ? "NOW · " : "") + entryText(e);
    ttToday.appendChild(div);
  });

  ttWeek.innerHTML = "";
  let any = false;
  dayOrder.forEach(function (d) {
    const list = sortByStart(timetable.filter(function (e) { return e.day === d; }));
    if (list.length === 0) return;
    any = true;
    const label = document.createElement("div");
    label.className = "label day-label";
    label.textContent = dayNames[d].toUpperCase();
    ttWeek.appendChild(label);
    list.forEach(function (e) {
      const div = document.createElement("div");
      div.className = "item tt";
      const text = document.createElement("span");
      text.textContent = entryText(e);
      const del = document.createElement("button");
      del.textContent = "✕";
      del.addEventListener("click", function () { removeEntry(e.id); });
      div.appendChild(text);
      div.appendChild(del);
      ttWeek.appendChild(div);
    });
  });
  if (!any) {
    const p = document.createElement("p");
    p.className = "small";
    p.textContent = "Your timetable is empty. Add your first class above.";
    ttWeek.appendChild(p);
  }
}

function addTimetableEntry() {
  const start = ttStart.value;
  const end = ttEnd.value;
  const course = courses.find(function (c) { return c.id === ttCourse.value; });
  if (!course) return;
  if (!start || !end) {
    ttMessage.textContent = "Pick a start time and an end time.";
    return;
  }
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    ttMessage.textContent = "The end time must be after the start time.";
    return;
  }
  timetable.push({
    id: Date.now(),
    day: Number(ttDay.value),
    start: start,
    end: end,
    courseId: course.id,
    courseName: course.name,
    topic: ttTopic.value
  });
  saveTimetable();
  ttMessage.textContent = "Added.";
  renderTimetable();
  renderNext();
}

function fillTimetableTopics() {
  const course = courses.find(function (c) { return c.id === ttCourse.value; });
  ttTopic.innerHTML = "";
  if (!course) return;
  course.topics.forEach(function (t) {
    const option = document.createElement("option");
    option.textContent = t;
    ttTopic.appendChild(option);
  });
}

function fillTimetableForm() {
  dayOrder.forEach(function (d) {
    const option = document.createElement("option");
    option.value = String(d);
    option.textContent = dayNames[d];
    ttDay.appendChild(option);
  });
  ttDay.value = String(new Date().getDay());
  courses.forEach(function (course) {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name;
    ttCourse.appendChild(option);
  });
  fillTimetableTopics();
}

viewSessionBtn.addEventListener("click", function () { showPlannerView("session"); });
viewTimetableBtn.addEventListener("click", function () { showPlannerView("timetable"); });
ttCourse.addEventListener("change", fillTimetableTopics);
document.getElementById("tt-add").addEventListener("click", addTimetableEntry);

fillTimetableForm();
renderTimetable();
setInterval(renderTimetable, 60000);

// ===== PROGRESS AND PROFILE =====
const progressKey = "studycore-progress";
const dailyTargetMinutes = 120;
const examKey = "studycore-exam";
let nextSlot = null;
let nextMinutes = 45;

const courseModes = {
  get201: "engineering",
  get203: "autocad",
  get205: "engineering",
  get207: "engineering",
  get209: "engineering",
  get211: "coding",
  ent211: "general"
};
courses.forEach(function (c) { if (c.mode) courseModes[c.id] = c.mode; });

const dayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey));
    if (saved && Array.isArray(saved.sessions) && Array.isArray(saved.quizzes)) return saved;
  } catch (e) {}
  return { sessions: [], quizzes: [] };
}

function saveProgress() {
  try {
    localStorage.setItem(progressKey, JSON.stringify(progress));
  } catch (e) {}
}

let progress = loadProgress();
if (!Array.isArray(progress.answers)) progress.answers = [];
function dateKey(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function recordSession(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return;
  progress.sessions.push({
        date: dateKey(new Date()),
    hour: new Date().getHours(),
    minutes: minutes,
    courseId: sessionCourseObj ? sessionCourseObj.id : "",
    courseName: liveSubject.textContent,
    topic: sessionTopic.value
  });
  saveProgress();
  renderProfile();
}

function recordAnswer(q, correct, ms) {
  const entry = { date: dateKey(new Date()), course: q.course, topic: q.topic, correct: correct };
  if (typeof ms === "number" && ms > 0) entry.ms = Math.round(ms);
  progress.answers.push(entry);
  if (progress.answers.length > 2000) progress.answers = progress.answers.slice(-2000);
  saveProgress();
}

function recordQuiz(score, total) {
  progress.quizzes.push({ date: dateKey(new Date()), score: score, total: total });
  saveProgress();
  renderProfile();
}

function activeDays() {
  const days = {};
  progress.sessions.forEach(function (s) { days[s.date] = true; });
  progress.quizzes.forEach(function (q) { days[q.date] = true; });
  return days;
}

function calcStreak(days) {
  const d = new Date();
  if (!days[dateKey(d)]) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days[dateKey(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function formatMinutes(m) {
  if (m < 60) return m + "m";
  return Math.floor(m / 60) + "h " + (m % 60) + "m";
}

function renderProfile() {
  renderHome();
  const streakEl = document.getElementById("p-streak");
  if (!streakEl) return;

  const days = activeDays();
  const streak = calcStreak(days);
    streakEl.innerHTML = streak + " DAY STREAK" + (streak > 0 ? ' <span class="flame">🔥</span>' : "");

  const week = document.getElementById("p-week");
  week.innerHTML = "";
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const done = days[dateKey(d)];
    const box = document.createElement("div");
    box.className = "day" + (done ? " done" : "");
    box.textContent = dayShort[d.getDay()] + (done ? " ✓" : "");
    week.appendChild(box);
  }

  let totalMinutes = 0;
  progress.sessions.forEach(function (s) { totalMinutes += s.minutes; });
  let answered = 0;
  let correct = 0;
  progress.quizzes.forEach(function (q) {
    answered += q.total;
    correct += q.score;
  });

  document.getElementById("p-time").textContent = formatMinutes(totalMinutes);
  document.getElementById("p-sessions").textContent = progress.sessions.length;
  document.getElementById("p-questions").textContent = answered;
  document.getElementById("p-avg").textContent = answered > 0 ? Math.round((correct / answered) * 100) + "%" : "–";
  renderBadges();
}

const resetButton = document.getElementById("reset-progress");
if (resetButton) {
  resetButton.addEventListener("click", function () {
    if (!confirm("Delete all saved study time, quiz scores and streak?")) return;
    progress = { sessions: [], quizzes: [], answers: [] };
    saveProgress();
    renderProfile();
  });
}
function renderWeak() {
  const box = document.getElementById("h-weak");
  if (!box) return;
  const stats = {};
  progress.answers.forEach(function (a) {
    const key = a.course + "|" + a.topic;
    if (!stats[key]) stats[key] = { course: a.course, topic: a.topic, tries: 0, right: 0 };
    stats[key].tries++;
    if (a.correct) stats[key].right++;
  });
  function accuracy(t) { return t.right / t.tries; }
  const weak = Object.keys(stats)
    .map(function (k) { return stats[k]; })
    .filter(function (t) { return t.tries >= 2 && accuracy(t) < 0.7; })
    .sort(function (a, b) { return accuracy(a) - accuracy(b); })
    .slice(0, 5);
  box.innerHTML = "";
  if (weak.length === 0) {
    const p = document.createElement("p");
    p.className = "small";
    p.textContent = "No weak topics yet. Answer more CBT questions and they will show up here.";
    box.appendChild(p);
    return;
  }
  weak.forEach(function (t) {
    const course = courses.find(function (c) { return c.id === t.course; });
    const code = course ? course.name.split(" · ")[0] : t.course;

    const div = document.createElement("div");
    div.className = "item tt weak";

    const info = document.createElement("div");
    info.className = "weak-info";
    const name = document.createElement("div");
    name.textContent = t.topic;
    const meta = document.createElement("div");
    meta.className = "small";
    meta.textContent = code + " · " + Math.round(accuracy(t) * 100) + "% correct (" + t.right + "/" + t.tries + ")";
    info.appendChild(name);
    info.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "weak-actions";
    const practise = document.createElement("button");
    practise.textContent = "PRACTISE";
    practise.addEventListener("click", function () { practiseTopic(t.course, t.topic); });
    const explain = document.createElement("button");
    explain.textContent = "EXPLAIN";
    explain.addEventListener("click", function () { explainTopic(t.course, t.topic); });
    actions.appendChild(practise);
    actions.appendChild(explain);

    div.appendChild(info);
    div.appendChild(actions);
    box.appendChild(div);
  });
}

renderProfile();

// ===== HOME =====
function homeText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderHome() 
{
  renderWeak();
  renderExam();
  const fill = document.getElementById("h-fill");
  if (!fill) return;

  const today = dateKey(new Date());
  const weekKeys = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weekKeys[dateKey(d)] = true;
  }

  let todayMin = 0;
  const byCourse = {};
  progress.sessions.forEach(function (s) {
    if (s.date === today) todayMin += s.minutes;
    if (weekKeys[s.date]) byCourse[s.courseName] = (byCourse[s.courseName] || 0) + s.minutes;
  });

    const streak = calcStreak(activeDays());
  const homeStreak = document.getElementById("h-streak");
  if (homeStreak) {
    if (streak > 0) homeStreak.innerHTML = '<span class="flame">🔥</span> ' + streak + " day streak";
    else homeStreak.textContent = "Study for a minute or finish a quiz to start a streak.";
  }
  renderNext();

  fill.style.width = Math.min(100, Math.round((todayMin / dailyTargetMinutes) * 100)) + "%";
  homeText("h-today", formatMinutes(todayMin) + " of " + formatMinutes(dailyTargetMinutes) + " today");

  const last = progress.sessions[progress.sessions.length - 1];
  homeText("h-course", last ? last.courseName : "No sessions yet");
  homeText("h-topic", last ? last.topic + " · tap to open" : "Start one from the Planner.");

  const list = document.getElementById("h-courses");
  if (!list) return;
  list.innerHTML = "";
  const names = Object.keys(byCourse).sort(function (a, b) { return byCourse[b] - byCourse[a]; });
  if (names.length === 0) {
    const p = document.createElement("p");
    p.className = "small";
    p.textContent = "No study time recorded this week yet.";
    list.appendChild(p);
  }
  names.forEach(function (name) {
    const subject = document.createElement("div");
    const row = document.createElement("div");
    row.className = "row";
    const left = document.createElement("span");
    left.textContent = name;
    const right = document.createElement("span");
    right.textContent = formatMinutes(byCourse[name]);
    row.appendChild(left);
    row.appendChild(right);
    const bar = document.createElement("div");
    bar.className = "bar";
    const f = document.createElement("div");
    f.className = "fill";
    f.style.width = Math.round((byCourse[name] / byCourse[names[0]]) * 100) + "%";
    bar.appendChild(f);
    subject.appendChild(row);
    subject.appendChild(bar);
    list.appendChild(subject);
  });
}

const continueCard = document.getElementById("h-continue");
if (continueCard) {
  continueCard.addEventListener("click", function () {
    const last = progress.sessions[progress.sessions.length - 1];
    if (!last) return;
    const course = courses.find(function (c) { return c.id === last.courseId; });
    if (!course) return;
    showScreen("study");
    if (cbt.active && !cbt.submitted) return;
    if (last.topic && course.topics.indexOf(last.topic) !== -1) openReading(course, last.topic);
    else showTopics(course);
  });
}

document.querySelectorAll("[data-go]").forEach(function (b) {
  b.addEventListener("click", function () {
    const go = b.dataset.go;
    if (go === "cbt") {
      showScreen("study");
      const ctx = launchContext();
      if (ctx) beginGeneratedQuiz(ctx);
      return;
    }
    showScreen(go);
    if (go === "planner" && sessionLive.classList.contains("hidden")) showPlannerView("timetable");
  });
});

renderHome();
setInterval(renderHome, 60000);

// ===== HOME: UP NEXT, weak-topic actions =====
function renderNext() {
  const title = document.getElementById("h-next-title");
  if (!title) return;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todays = sortByStart(timetable.filter(function (e) { return e.day === now.getDay(); }));

  let current = null;
  let upcoming = null;
  todays.forEach(function (e) {
    const start = timeToMinutes(e.start);
    const end = timeToMinutes(e.end);
    if (nowMin >= start && nowMin < end) {
      if (!current) current = e;
    } else if (start > nowMin && !upcoming) {
      upcoming = e;
    }
  });

  nextSlot = current || upcoming;
  const btn = document.getElementById("h-next-btn");
  if (!nextSlot) {
    homeText("h-next-label", "UP NEXT");
    title.textContent = "Nothing else on today's timetable";
    homeText("h-next-sub", "Add classes or study slots to plan your day.");
    btn.textContent = "OPEN TIMETABLE";
    return;
  }

  const course = courses.find(function (c) { return c.id === nextSlot.courseId; });
  homeText("h-next-label", current ? "NOW" : "UP NEXT · " + nextSlot.start);
  title.textContent = course ? course.name : nextSlot.courseName;
  homeText("h-next-sub", nextSlot.topic + " · " + nextSlot.start + " – " + nextSlot.end);
  nextMinutes = current
    ? Math.max(1, timeToMinutes(current.end) - nowMin)
    : Math.max(1, timeToMinutes(nextSlot.end) - timeToMinutes(nextSlot.start));
  btn.textContent = sessionTimer !== null ? "VIEW SESSION" : "SET UP SESSION";
}

function prepareSession(courseId, topic, minutes) {
  if (courses.some(function (c) { return c.id === courseId; })) {
    sessionCourse.value = courseId;
    fillSessionTopics();
    const hasTopic = Array.prototype.some.call(sessionTopic.options, function (o) { return o.value === topic; });
    if (hasTopic) sessionTopic.value = topic;
  }
  document.getElementById("session-minutes").value = Math.max(1, Math.round(minutes));
  showScreen("planner");
  showPlannerView("session");
}

const nextButton = document.getElementById("h-next-btn");
if (nextButton) {
  nextButton.addEventListener("click", function () {
    if (sessionTimer !== null) {
      showScreen("planner");
      return;
    }
    if (!nextSlot) {
      showScreen("planner");
      showPlannerView("timetable");
      return;
    }
    prepareSession(nextSlot.courseId, nextSlot.topic, nextMinutes);
  });
}

function practiseTopic(courseId, topic) {
  showScreen("study");
  beginGeneratedQuiz({ courseId: courseId, topic: topic });
}

function explainTopic(courseId, topic) {
  const course = courses.find(function (c) { return c.id === courseId; });
  const courseName = course ? course.name : courseId;
  setMode(courseModes[courseId] || "general");
  showScreen("ai");
  if (aiBusy) return;
  addMessage("Explain " + topic + " (" + courseName + ")", "user");
  simplerLevel = 1;
  askAI("I am finding this topic hard in my CBT practice: \"" + topic + "\" from " + courseName +
    ". Explain it in simple words, then ask me one short question to check that I understood.");
}

// ===== AI-GENERATED CBT: built from what you are studying =====
const QUIZ_URL = "https://yepsrbpykoybuqgkduml.supabase.co/functions/v1/make-quiz";
const researchKey = "studycore-research";

function loadResearch() {
  try {
    const saved = JSON.parse(localStorage.getItem(researchKey));
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch (e) {
    return {};
  }
}

// The fact sheet the AI gathered from the web for a topic. It is kept, so the next quiz on that topic is faster.
let researchCache = loadResearch();

function keepResearch(key, text) {
  researchCache[key] = text;
  const keys = Object.keys(researchCache);
  if (keys.length > 40) delete researchCache[keys[0]];
  try { localStorage.setItem(researchKey, JSON.stringify(researchCache)); } catch (e) {}
}

function setGenStatus(text) {
  ["gen-status", "gen-status-2", "rd-status"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });
}

function setGenButtons(disabled) {
  document.querySelectorAll("#gen-go, #course-quiz, #topic-list .mini").forEach(function (b) { b.disabled = disabled; });
  updateReaderButtons();
}

function friendlyError(err) {
  if (err && err.name === "AbortError") return "The AI took too long.";
  if (err instanceof TypeError) return "Could not reach the AI. Check your internet.";
  return (err && err.message) || "Something went wrong.";
}

function normQuestion(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function savedForCtx(ctx) {
  return savedQuestions().filter(function (q) {
    return q.course === ctx.courseId && (!ctx.topic || q.topic === ctx.topic);
  });
}

function cacheGenerated(list) {
  const seen = {};
  aiBank.forEach(function (q) { seen[q.course + "|" + q.topic + "|" + q.question] = true; });
  list.forEach(function (q) {
    if (q.unchecked) return;
    const key = q.course + "|" + q.topic + "|" + q.question;
    if (seen[key]) return;
    seen[key] = true;
    aiBank.push({ id: q.id, course: q.course, topic: q.topic, subtopic: q.subtopic || "", question: q.question, options: q.options, answer: q.answer, explanation: q.explanation, ai: true });
  });
  if (aiBank.length > 300) aiBank = aiBank.slice(-300);
  saveAiBank();
}

async function requestQuiz(body) {
  if (!navigator.onLine) throw new Error("You are offline.");
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 120000);
  try {
    const res = await fetch(QUIZ_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error(data.error || "Could not make questions. Please try again.");
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Asks for one set of questions. "existing" are the questions already in this exam, so nothing repeats.
async function fetchBatch(ctx, step, existing) {
  const course = courses.find(function (c) { return c.id === ctx.courseId; });
  const sheetKey = ctx.courseId + "|" + step.topic;
  const everAsked = aiBank
    .filter(function (q) { return q.course === ctx.courseId && q.topic === step.topic; })
    .map(function (q) { return q.question; })
    .concat(existing.filter(function (q) { return q.topic === step.topic; }).map(function (q) { return q.question; }));
  const earlier = everAsked.filter(function (q, i) { return everAsked.indexOf(q) === i; });
  const data = await requestQuiz({
    source: ctx.notes ? "notes" : "topic",
    courseName: course.name,
    topic: step.topic,
    count: step.count,
    batch: step.batch,
    notes: ctx.notes || "",
    reference: ctx.notes ? "" : (researchCache[sheetKey] || ""),
    avoid: earlier.slice(-30)
  });
  if (data.reference) keepResearch(sheetKey, data.reference);

  const seen = {};
  existing.forEach(function (q) { seen[normQuestion(q.question)] = true; });
  const list = [];
  data.questions.filter(validQuestion).forEach(function (q, i) {
    const key = normQuestion(q.question);
    if (seen[key]) return;
    seen[key] = true;
    list.push({
      id: "ai-" + Date.now() + "-" + step.batch + "-" + i,
      course: ctx.courseId,
      topic: step.topic,
      subtopic: typeof q.subtopic === "string" ? q.subtopic : "",
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation || "",
      ai: true,
      unchecked: data.checked === false
    });
  });
  if (list.length === 0) throw new Error("The AI sent questions the app could not use. Please try again.");
  if (!ctx.notes) cacheGenerated(list);
  return { list: list, checked: data.checked !== false };
}

// One topic: 4 sets of 10. Whole course: up to 5 topics, weak ones first, 8 questions each.
function buildPlan(ctx, course) {
  if (ctx.notes) {
    return [1, 2].map(function (n) { return { topic: ctx.topic, count: 10, batch: n }; });
  }
  if (ctx.topic) {
    return [1, 2, 3, 4].map(function (n) { return { topic: ctx.topic, count: 10, batch: n }; });
  }
  const stats = {};
  progress.answers.forEach(function (a) {
    if (a.course !== course.id) return;
    if (!stats[a.topic]) stats[a.topic] = { tries: 0, right: 0 };
    stats[a.topic].tries++;
    if (a.correct) stats[a.topic].right++;
  });
  function accuracy(t) { return stats[t].right / stats[t].tries; }
  const weak = Object.keys(stats)
    .filter(function (t) { return stats[t].tries >= 2 && accuracy(t) < 0.7 && course.topics.indexOf(t) !== -1; })
    .sort(function (a, b) { return accuracy(a) - accuracy(b); });
  const rest = shuffle(course.topics.filter(function (t) { return weak.indexOf(t) === -1; }));
  return weak.concat(rest).slice(0, 5).map(function (t) { return { topic: t, count: 8, batch: 1 }; });
}

let retryDelayMs = 3000;

// "Took too long" and "busy" often work on a second try. A rate limit does not, so that one is not retried.
function isTransient(message) {
  return /took too long|very busy|Could not reach/.test(message || "");
}

async function loadMore(ctx, steps, token) {
  cbt.pending = steps.slice();
  cbt.warn = "";
  cbt.loading = steps.length > 0;
  renderCbtHeader();
  while (cbt.pending.length > 0) {
    if (token !== genToken || !cbt.active || cbt.submitted) return;
    const step = cbt.pending[0];
    let result = null;
    let lastError = null;
    for (let attempt = 0; attempt < 2 && !result; attempt++) {
      try {
        result = await fetchBatch(ctx, step, cbt.qs);
      } catch (err) {
        lastError = err;
        if (token !== genToken || !cbt.active || cbt.submitted) return;
        if (!isTransient(friendlyError(err))) break;
        if (attempt === 0) await new Promise(function (resolve) { setTimeout(resolve, retryDelayMs); });
      }
    }
    if (token !== genToken || !cbt.active || cbt.submitted) return;
    if (!result) {
      cbt.warn = "Stopped loading more questions: " + friendlyError(lastError) + " Tap LOAD MORE to continue.";
      break;
    }
    cbt.pending.shift();
    appendQuestions(ctx.topic ? result.list : shuffle(result.list));
  }
  if (token === genToken && cbt.active && !cbt.submitted) {
    cbt.loading = false;
    renderCbtHeader();
  }
}

function resumeLoading() {
  if (!cbt.active || cbt.submitted || cbt.loading || cbt.pending.length === 0) return;
  loadMore(cbt.ctx, cbt.pending, genToken);
}

async function beginGeneratedQuiz(input) {
  if (genBusy || (cbt.active && !cbt.submitted)) return;
  const course = courses.find(function (c) { return c.id === input.courseId; });
  if (!course) return;
  if (cbt.active) closeCbt();
  const ctx = {
    courseId: course.id,
    topic: input.topic || null,
    notes: input.notes || "",
    label: courseCode(course) + " · " + (input.topic || "Mixed topics") + (input.notes ? " · my notes" : "")
  };
  const plan = buildPlan(ctx, course);
  const token = ++genToken;

  genBusy = true;
  setGenButtons(true);
  setGenStatus("Preparing your quiz. The AI looks the topic up on the web, writes questions and double-checks them. Usually 20 to 40 seconds...");
  let first;
  try {
    first = await fetchBatch(ctx, plan[0], []);
  } catch (err) {
    genBusy = false;
    setGenButtons(false);
    if (token !== genToken) return;
    const message = friendlyError(err);
    const pool = savedForCtx(ctx);
    if (pool.length > 0) {
      setGenStatus("");
      startCbt(ctx, shuffle(pool).slice(0, 40), { note: message + " Using saved questions instead." });
    } else {
      setGenStatus(message + " Please try again in a moment.");
    }
    return;
  }
  genBusy = false;
  setGenButtons(false);
  setGenStatus("");
  if (token !== genToken) return;
  startCbt(ctx, first.list, { note: first.checked ? "" : "These questions could not be double-checked." });
  loadMore(ctx, plan.slice(1), token);
}

// What is the student doing right now? A live session first, then the last thing they studied.
function launchContext() {
  if (sessionTimer !== null && sessionCourseObj) {
    return { courseId: sessionCourseObj.id, topic: sessionTopic.value, live: true };
  }
  const last = progress.sessions[progress.sessions.length - 1];
  if (last && courses.some(function (c) { return c.id === last.courseId; })) {
    return { courseId: last.courseId, topic: last.topic, live: false };
  }
  return null;
}

function renderLaunch() {
  const title = document.getElementById("ql-title");
  if (!title) return;
  const ctx = launchContext();
  const button = document.getElementById("gen-go");
  if (!ctx) {
    document.getElementById("ql-label").textContent = "CBT PRACTICE";
    title.textContent = "Quiz yourself";
    document.getElementById("ql-sub").textContent = "Start a study session, or open a course below. The AI then makes a CBT quiz from what you are studying.";
    button.classList.add("hidden");
    return;
  }
  const course = courses.find(function (c) { return c.id === ctx.courseId; });
  document.getElementById("ql-label").textContent = ctx.live ? "CBT · FROM YOUR LIVE SESSION" : "CBT · FROM WHAT YOU STUDIED LAST";
  title.textContent = "Quiz me on " + ctx.topic;
  document.getElementById("ql-sub").textContent = course.name + ". As many questions as the AI can make, from the web and its own knowledge.";
  button.classList.remove("hidden");
}

function startSavedPractice() {
  const pool = studyCourse
    ? savedQuestions().filter(function (q) { return q.course === studyCourse.id; })
    : savedQuestions();
  if (pool.length === 0) {
    setGenStatus("No saved questions yet. Generate a quiz first, and its questions are saved here for offline practice.");
    return;
  }
  const label = studyCourse ? courseCode(studyCourse) + " · Saved questions" : "Saved questions";
  startCbt(
    { courseId: studyCourse ? studyCourse.id : null, topic: null, label: label, saved: true },
    shuffle(pool).slice(0, 40),
    { note: "Saved questions. These work without internet." }
  );
}

document.getElementById("gen-go").addEventListener("click", function () {
  const ctx = launchContext();
  if (ctx) beginGeneratedQuiz(ctx);
});
document.getElementById("course-quiz").addEventListener("click", function () {
  if (studyCourse) beginGeneratedQuiz({ courseId: studyCourse.id, topic: null });
});
document.getElementById("offline-practice").addEventListener("click", startSavedPractice);
buttons.forEach(function (b) {
  b.addEventListener("click", function () {
    if (b.dataset.screen === "study") renderLaunch();
  });
});
renderLaunch();

// ===== EXAM COUNTDOWN (Home) =====
function loadExam() {
  try {
    const value = localStorage.getItem(examKey);
    const date = value ? new Date(value) : null;
    return date && !isNaN(date.getTime()) ? date : null;
  } catch (e) {
    return null;
  }
}

function localInputValue(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
// ===== EXAM COUNTDOWN: compact flip cards =====
// (var with no starting value on purpose: renderExam also runs once at startup)
var gateTimer, gateTarget, gateParts;

function stopGate() {
  if (gateTimer) { clearInterval(gateTimer); gateTimer = null; }
}

function buildGate(box) {
  box.innerHTML = "";
  gateParts = {};
  const row = document.createElement("div");
  row.className = "gate";
  [["d", "DAYS"], ["h", "HRS"], ["m", "MIN"], ["s", "SEC"]].forEach(function (pair) {
    const card = document.createElement("div");
    card.className = "gate-cell";
    const num = document.createElement("b");
    num.textContent = "00";
    const lab = document.createElement("span");
    lab.textContent = pair[1];
    card.appendChild(num);
    card.appendChild(lab);
    row.appendChild(card);
    gateParts[pair[0]] = num;
  });
  const ms = document.createElement("div");
  ms.className = "gate-ms";
  ms.textContent = ".000";
  box.appendChild(row);
  box.appendChild(ms);
  gateParts.ms = ms;
}

// Flips a card to a new number: the card folds edge-on, the number changes, then it folds back.
function flipTo(num, text) {
  if (num.dataset.v === text) return;
  const first = num.dataset.v === undefined;
  num.dataset.v = text;
  if (first) { num.textContent = text; return; }
  const card = num.parentNode;
  card.classList.remove("flip");
  void card.offsetWidth; // lets the animation restart
  card.classList.add("flip");
  setTimeout(function () { num.textContent = text; }, 150);
}

function gateTick() {
  if (!gateParts) return;
  const home = document.getElementById("home");
  if (document.hidden || !home || !home.classList.contains("active")) return; // save battery when you can't see it
  const left = gateTarget - Date.now();
  if (left <= 0) { stopGate(); renderExam(); return; }
  flipTo(gateParts.d, pad(Math.floor(left / 86400000)));
  flipTo(gateParts.h, pad(Math.floor((left % 86400000) / 3600000)));
  flipTo(gateParts.m, pad(Math.floor((left % 3600000) / 60000)));
  flipTo(gateParts.s, pad(Math.floor((left % 60000) / 1000)));
  gateParts.ms.textContent = "." + String(Math.floor(left % 1000)).padStart(3, "0");
}

function startGate(exam) {
  stopGate();
  gateTarget = exam.getTime();
  gateTick();
  gateTimer = setInterval(gateTick, 50);
}
function renderExam() {
  const count = document.getElementById("h-exam-count");
  if (!count) return;
  const label = document.getElementById("h-exam-label");
  const dateLine = document.getElementById("h-exam-date");
  const edit = document.getElementById("h-exam-edit");
  const exam = loadExam();
  stopGate();
  edit.textContent = exam ? "CHANGE DATE" : "SET DATE";
  if (!exam) {
    count.classList.remove("soon");
    label.textContent = "SEMESTER EXAMS";
    count.textContent = "Set your exam date";
    dateLine.textContent = "Then you will see exactly how many days, hours and minutes are left.";
    return;
  }
  const ms = exam.getTime() - Date.now();
  count.classList.toggle("soon", ms < 7 * 86400000);
  const when = exam.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) +
    " · " + pad(exam.getHours()) + ":" + pad(exam.getMinutes());
  if (ms > 0) {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    label.textContent = "EXAMS START IN";
        buildGate(count);
    startGate(exam);
    dateLine.textContent = when;
  } else if (ms > -30 * 86400000) {
    label.textContent = "SEMESTER EXAMS";
    count.textContent = "Exams are on. All the best!";
    dateLine.textContent = "Started " + when;
  } else {
    label.textContent = "SEMESTER EXAMS";
    count.textContent = "Set your next exam date";
    dateLine.textContent = "The last date has passed.";
  }
}

document.getElementById("h-exam-edit").addEventListener("click", function () {
  const form = document.getElementById("h-exam-form");
  const exam = loadExam();
  document.getElementById("h-exam-input").value = exam ? localInputValue(exam) : "";
  form.classList.toggle("hidden");
});
document.getElementById("h-exam-save").addEventListener("click", function () {
  const value = document.getElementById("h-exam-input").value;
  const date = value ? new Date(value) : null;
  if (!date || isNaN(date.getTime())) return;
  try { localStorage.setItem(examKey, date.toISOString()); } catch (e) {}
  document.getElementById("h-exam-form").classList.add("hidden");
  renderExam();
});
document.getElementById("h-exam-clear").addEventListener("click", function () {
  try { localStorage.removeItem(examKey); } catch (e) {}
  document.getElementById("h-exam-form").classList.add("hidden");
  renderExam();
});

// ===== READING VIEW: AI lessons and your own notes =====
const maxNotesChars = 12000;
const lessonsKey = "studycore-lessons";
const notesKey = "studycore-notes";

function loadStore(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch (e) {
    return {};
  }
}

let lessons = loadStore(lessonsKey);
let notesStore = loadStore(notesKey);

function topicKey(courseId, topic) {
  return courseId + "|" + topic;
}

function validLesson(l) {
  return !!l && Array.isArray(l.sections) && l.sections.length > 0;
}

function saveLessons() {
  const keys = Object.keys(lessons);
  if (keys.length > 60) {
    keys.sort(function (a, b) { return lessons[a].savedAt - lessons[b].savedAt; });
    keys.slice(0, keys.length - 60).forEach(function (k) { delete lessons[k]; });
  }
  try { localStorage.setItem(lessonsKey, JSON.stringify(lessons)); } catch (e) {}
}

function saveNotesStore() {
  try { localStorage.setItem(notesKey, JSON.stringify(notesStore)); } catch (e) {}
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function mk(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const reader = { course: null, topic: "", tab: "lesson", busy: false };
const rdTabLesson = document.getElementById("rd-tab-lesson");
const rdTabNotes = document.getElementById("rd-tab-notes");
const rdLesson = document.getElementById("rd-lesson");
const rdNotes = document.getElementById("rd-notes");
const rdStatus = document.getElementById("rd-status");
const rdBody = document.getElementById("rd-lesson-body");
const rdGenerate = document.getElementById("rd-generate");
const rdCaution = document.getElementById("rd-caution");
const rdNotesText = document.getElementById("rd-notes-text");
const rdNotesCount = document.getElementById("rd-notes-count");
const rdFill = document.getElementById("rd-fill");
const rdFileInput = document.getElementById("rd-file-input");
const rdQuiz = document.getElementById("rd-quiz");
const rdQuizNotes = document.getElementById("rd-quiz-notes");
let notesTimer = null;

function currentKey() {
  return reader.course ? topicKey(reader.course.id, reader.topic) : "";
}

function saveCurrentNotes() {
  if (!reader.course) return;
  const key = currentKey();
  const value = rdNotesText.value.slice(0, maxNotesChars);
  if (value.trim()) notesStore[key] = value;
  else delete notesStore[key];
  saveNotesStore();
  updateReaderButtons();
}

// Saves what is in the notes box right now (called before leaving the page or changing topic).
function flushNotes() {
  clearTimeout(notesTimer);
  if (reader.course) saveCurrentNotes();
}

function updateNotesCount() {
  const n = rdNotesText.value.length;
  rdNotesCount.textContent = n + " / " + maxNotesChars + " characters" + (n >= maxNotesChars ? " (limit reached)" : "");
}

function updateReaderButtons() {
  if (!reader.course) return;
  const notesLong = rdNotesText.value.trim().length >= 80;
  rdGenerate.disabled = reader.busy;
  rdFill.disabled = reader.busy || !notesLong;
  rdQuiz.disabled = reader.busy || genBusy;
  rdQuizNotes.disabled = reader.busy || genBusy || !notesLong;
}

function renderLesson(box, lesson) {
  if (lesson.summary) box.appendChild(mk("div", "ls-sum", lesson.summary));
  lesson.sections.forEach(function (sec) {
    box.appendChild(mk("h3", "ls-h", sec.heading));
    if (sec.text) box.appendChild(mk("p", "ls-p", sec.text));
    if (sec.bullets && sec.bullets.length > 0) {
      const ul = mk("ul", "ls-ul");
      sec.bullets.forEach(function (b) { ul.appendChild(mk("li", "", b)); });
      box.appendChild(ul);
    }
    (sec.formulas || []).forEach(function (f) { box.appendChild(mk("div", "formula", f)); });
  });
  if (lesson.examples && lesson.examples.length > 0) {
    box.appendChild(mk("h3", "ls-h", "Worked examples"));
    lesson.examples.forEach(function (ex, i) {
      const card = mk("div", "ls-ex");
      card.appendChild(mk("b", "", "EXAMPLE " + (i + 1)));
      card.appendChild(mk("p", "ls-p", ex.problem));
      card.appendChild(mk("b", "", "SOLUTION"));
      card.appendChild(mk("p", "ls-p", ex.solution));
      box.appendChild(card);
    });
  }
  [["COMMON MISTAKES", lesson.mistakes], ["KEY TAKEAWAYS", lesson.takeaways]].forEach(function (pair) {
    const items = pair[1];
    if (!items || items.length === 0) return;
    const card = mk("div", "ls-box");
    card.appendChild(mk("div", "ls-bt", pair[0]));
    const ul = mk("ul", "ls-ul");
    items.forEach(function (t) { ul.appendChild(mk("li", "", t)); });
    card.appendChild(ul);
    box.appendChild(card);
  });
  renderMath(box);
}

function renderReader() {
  if (!reader.course) return;
  const key = currentKey();
  document.getElementById("reader-course").textContent = reader.course.name;
  document.getElementById("reader-topic").textContent = reader.topic;
  rdTabLesson.classList.toggle("active", reader.tab === "lesson");
  rdTabNotes.classList.toggle("active", reader.tab === "notes");
  rdLesson.classList.toggle("hidden", reader.tab !== "lesson");
  rdNotes.classList.toggle("hidden", reader.tab !== "notes");

  rdBody.innerHTML = "";
  const saved = lessons[key];
  if (saved && validLesson(saved.lesson)) {
    if (saved.withNotes) rdBody.appendChild(mk("p", "small", "Built from your notes and the web."));
    renderLesson(rdBody, saved.lesson);
    rdGenerate.textContent = "WRITE A NEW LESSON";
    rdCaution.classList.remove("hidden");
  } else {
    rdBody.appendChild(mk("p", "small", "No lesson yet. Tap the button and the AI writes one for this topic, using the web. It is saved on your phone, so next time it opens instantly, even offline."));
    rdGenerate.textContent = "WRITE A LESSON";
    rdCaution.classList.add("hidden");
  }

  const notes = notesStore[key] || "";
  if (rdNotesText.value !== notes) rdNotesText.value = notes;
  updateNotesCount();
  updateReaderButtons();
}

function openReading(course, topic) {
  if (cbt.active) {
    if (!cbt.submitted) return;
    closeCbt();
  }
  flushNotes();
  studyCourse = course;
  reader.course = course;
  reader.topic = topic;
  reader.busy = false;
  const key = topicKey(course.id, topic);
  reader.tab = (notesStore[key] || "").trim() ? "notes" : "lesson";
  rdStatus.textContent = "";
  setStudyView("reader");
  renderReader();
  window.scrollTo(0, 0);
}

async function requestLesson(course, topic, notes) {
  if (!navigator.onLine) throw new Error("You are offline.");
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 150000);
  try {
    const res = await fetch(QUIZ_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        task: "lesson",
        courseName: course.name,
        topic: topic,
        notes: notes,
        reference: researchCache[topicKey(course.id, topic)] || ""
      }),
      signal: controller.signal
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || !validLesson(data.lesson)) {
      throw new Error(data.error || "Could not write the lesson. Please try again.");
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function generateLesson(withNotes) {
  if (reader.busy || !reader.course) return;
  const course = reader.course;
  const topic = reader.topic;
  const key = topicKey(course.id, topic);
  flushNotes();
  const notes = withNotes ? (notesStore[key] || "").slice(0, maxNotesChars) : "";
  if (withNotes && notes.trim().length < 80) {
    rdStatus.textContent = "Write a bit more in your notes first (at least a few sentences).";
    reader.tab = "lesson";
    renderReader();
    return;
  }
  if (lessons[key] && !withNotes && !confirm("Replace the saved lesson with a new one?")) return;

  reader.busy = true;
  reader.tab = "lesson";
  renderReader();
  rdStatus.textContent = "Writing your lesson. The AI looks the topic up on the web first. This usually takes 30 to 60 seconds...";
  try {
    let data;
    try {
      data = await requestLesson(course, topic, notes);
    } catch (err) {
      if (!isTransient(friendlyError(err))) throw err;
      await sleep(retryDelayMs);
      data = await requestLesson(course, topic, notes);
    }
    if (data.reference) keepResearch(key, data.reference);
    lessons[key] = { lesson: data.lesson, savedAt: Date.now(), withNotes: notes !== "" };
    saveLessons();
    rdStatus.textContent = "";
  } catch (err) {
    rdStatus.textContent = friendlyError(err) + " Please try again in a moment.";
  } finally {
    reader.busy = false;
    if (reader.course && reader.course.id === course.id && reader.topic === topic) renderReader();
  }
}

function askTutorTopic(simpler) {
  if (!reader.course) return;
  flushNotes();
  const course = reader.course;
  const topic = reader.topic;
  setMode(courseModes[course.id] || "general");
  showScreen("ai");
  if (aiBusy) return;
  addMessage(simpler ? "Explain " + topic + " in simpler words" : "Teach me " + topic + " (" + courseCode(course) + ")", "user");
  simplerLevel = simpler ? 3 : 1;
  askAI(simpler
    ? "Explain \"" + topic + "\" from " + course.name + " in very simple words, with an everyday analogy, then ask me one short question to check I understood."
    : "Teach me \"" + topic + "\" from " + course.name + " step by step, then ask me one short question to check I understood.");
}

rdTabLesson.addEventListener("click", function () { flushNotes(); reader.tab = "lesson"; renderReader(); });
rdTabNotes.addEventListener("click", function () { flushNotes(); reader.tab = "notes"; renderReader(); });
rdGenerate.addEventListener("click", function () { generateLesson(false); });
rdFill.addEventListener("click", function () { generateLesson(true); });
document.getElementById("reader-back").addEventListener("click", function () {
  flushNotes();
  if (reader.course) showTopics(reader.course);
  else setStudyView("home");
});
rdNotesText.addEventListener("input", function () {
  updateNotesCount();
  updateReaderButtons();
  clearTimeout(notesTimer);
  notesTimer = setTimeout(saveCurrentNotes, 300);
});
document.getElementById("rd-file").addEventListener("click", function () { rdFileInput.click(); });
rdFileInput.addEventListener("change", function () {
  const file = rdFileInput.files && rdFileInput.files[0];
  if (!file) return;
  const fileReader = new FileReader();
  fileReader.onload = function () {
    const added = String(fileReader.result || "").trim();
    if (added) {
      const current = rdNotesText.value.trim();
      rdNotesText.value = ((current ? current + "\n\n" : "") + added).slice(0, maxNotesChars);
      saveCurrentNotes();
      updateNotesCount();
    }
  };
  fileReader.readAsText(file);
  rdFileInput.value = "";
});
rdQuiz.addEventListener("click", function () {
  if (!reader.course) return;
  flushNotes();
  beginGeneratedQuiz({ courseId: reader.course.id, topic: reader.topic });
});
rdQuizNotes.addEventListener("click", function () {
  if (!reader.course) return;
  flushNotes();
  const notes = notesStore[currentKey()] || "";
  if (notes.trim().length < 80) return;
  beginGeneratedQuiz({ courseId: reader.course.id, topic: reader.topic, notes: notes.slice(0, maxNotesChars) });
});
document.getElementById("rd-tutor").addEventListener("click", function () { askTutorTopic(false); });
document.getElementById("rd-simpler").addEventListener("click", function () { askTutorTopic(true); });
window.addEventListener("pagehide", flushNotes);
renderExam();
// ===== BACKUP: export and import all saved data =====
(function () {
  const exportBtn = document.getElementById("backup-export");
  const importBtn = document.getElementById("backup-import");
  const fileInput = document.getElementById("backup-file");
  const msg = document.getElementById("backup-msg");
  if (!exportBtn || !importBtn || !fileInput) return;

  function say(text) { if (msg) msg.textContent = text; }

  exportBtn.addEventListener("click", function () {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("studycore-") === 0) data[k] = localStorage.getItem(k);
      }
    } catch (e) { say("Could not read your saved data."); return; }
    const count = Object.keys(data).length;
    if (count === 0) { say("Nothing to back up yet."); return; }
    const file = { app: "STUDY//CORE", version: 1, savedAt: new Date().toISOString(), data: data };
    const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studycore-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    say("Backup saved (" + count + " items). Keep the file somewhere safe.");
  });

  importBtn.addEventListener("click", function () { fileInput.click(); });

  fileInput.addEventListener("change", function () {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function () {
      let parsed;
      try { parsed = JSON.parse(String(reader.result)); } catch (e) { say("That file is not a valid backup."); return; }
      if (!parsed || parsed.app !== "STUDY//CORE" || !parsed.data || typeof parsed.data !== "object") { say("That file is not a STUDY//CORE backup."); return; }
      const keys = Object.keys(parsed.data).filter(function (k) {
        return k.indexOf("studycore-") === 0 && typeof parsed.data[k] === "string";
      });
      if (keys.length === 0) { say("The backup is empty."); return; }
      if (!confirm("Replace the data on this device with the backup from " + (parsed.savedAt || "").slice(0, 10) + "?")) return;
      try {
        keys.forEach(function (k) { localStorage.setItem(k, parsed.data[k]); });
      } catch (e) { say("Could not save the backup (storage may be full)."); return; }
      say("Backup restored. Reloading...");
      setTimeout(function () { location.reload(); }, 600);
    };
    reader.readAsText(f);
    fileInput.value = "";
  });
})();
// ===== BADGES =====
var badgeBox; // no starting value on purpose: renderProfile also runs at startup

function badgeDefs() {
  const answers = progress.answers || [];
  const quizzes = progress.quizzes || [];
  const sessions = progress.sessions || [];
  const streak = calcStreak(activeDays());
  let studyMinutes = 0;
  sessions.forEach(function (s) { studyMinutes += s.minutes; });
  const mathAnswers = answers.filter(function (a) { return a.course === "get209"; });
  const mathRight = mathAnswers.filter(function (a) { return a.correct; }).length;
  const champ = quizzes.some(function (q) { return q.total >= 10 && q.score / q.total >= 0.9; });
  const owl = sessions.some(function (s) { return typeof s.hour === "number" && (s.hour >= 22 || s.hour < 5); });
  return [
    { id: "first", icon: "🚀", name: "First Step", hint: "Finish your first study session", got: sessions.length >= 1 },
    { id: "owl", icon: "🦉", name: "Night Owl", hint: "Finish a study session between 10pm and 5am", got: owl },
    { id: "streak3", icon: "🔥", name: "3-Day Streak", hint: "Study 3 days in a row", got: streak >= 3 },
    { id: "streak10", icon: "⚡", name: "10-Day Streak", hint: "Study 10 days in a row", got: streak >= 10 },
    { id: "math", icon: "📐", name: "Math Master", hint: "80% right on 30+ Engineering Mathematics answers", got: mathAnswers.length >= 30 && mathRight / mathAnswers.length >= 0.8 },
    { id: "champ", icon: "🏆", name: "CBT Champion", hint: "Score 90%+ on a quiz of 10 or more questions", got: champ },
    { id: "century", icon: "💯", name: "Century", hint: "Answer 100 CBT questions", got: answers.length >= 100 },
    { id: "ten", icon: "⏱️", name: "10 Hour Club", hint: "Study for 10 hours in total", got: studyMinutes >= 600 }
  ];
}

function badgeToast(text) {
  const t = document.createElement("div");
  t.className = "bdg-toast";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 3600);
}

function renderBadges() {
  try {
    const anchor = document.getElementById("reset-progress");
    if (!anchor) return;
    if (!badgeBox || !badgeBox.isConnected) {
      badgeBox = document.createElement("div");
      badgeBox.className = "card";
      anchor.before(badgeBox);
    }
    let store = {};
    try { store = JSON.parse(localStorage.getItem("studycore-badges")) || {}; } catch (e) {}
    if (typeof store !== "object") store = {};

    const defs = badgeDefs();
    const fresh = [];
    defs.forEach(function (b) {
      if (b.got && !store[b.id]) { store[b.id] = dateKey(new Date()); fresh.push(b.id); }
    });
    if (fresh.length > 0) {
      try { localStorage.setItem("studycore-badges", JSON.stringify(store)); } catch (e) {}
      const first = defs.find(function (b) { return b.id === fresh[0]; });
      badgeToast(fresh.length === 1 ? first.icon + " Badge unlocked: " + first.name : "🎉 " + fresh.length + " badges unlocked!");
    }

    badgeBox.innerHTML = "";
    const earned = defs.filter(function (b) { return store[b.id]; }).length;
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "BADGES · " + earned + " / " + defs.length;
    badgeBox.appendChild(label);

    const grid = document.createElement("div");
    grid.className = "bdg-grid";
    defs.forEach(function (b) {
      const tile = document.createElement("div");
      tile.className = "bdg" + (store[b.id] ? " got" : "") + (fresh.indexOf(b.id) !== -1 ? " new" : "");
      const ic = document.createElement("div");
      ic.className = "bdg-ic";
      ic.textContent = b.icon;
      const nm = document.createElement("div");
      nm.className = "bdg-nm";
      nm.textContent = b.name;
      const ht = document.createElement("div");
      ht.className = "bdg-ht";
      ht.textContent = store[b.id] ? "Earned " + store[b.id] : b.hint;
      tile.appendChild(ic);
      tile.appendChild(nm);
      tile.appendChild(ht);
      grid.appendChild(tile);
    });
    badgeBox.appendChild(grid);
  } catch (e) {}
}

renderBadges();
// ===== AMBIENT SOUNDS (made inside the app, no sound files needed) =====
var ambCtx, ambPlaying, ambGain, ambStopper, ambKind;

function ambStop() {
  if (ambStopper) { try { ambStopper(); } catch (e) {} ambStopper = null; }
  ambKind = null;
}

function ambVolumeValue() {
  const slider = document.getElementById("amb-volume");
  return slider ? Number(slider.value) / 100 : 0.4;
}

function ambStart(kind) {
  ambStop();
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  if (!ambCtx) ambCtx = new AC();
  if (ambCtx.state === "suspended") ambCtx.resume();

  // 4 seconds of random noise, played in a loop
  const rate = ambCtx.sampleRate;
  const buf = ambCtx.createBuffer(1, rate * 4, rate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ambCtx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const made = [src];
  let out = src;
  function chain(node) { out.connect(node); out = node; made.push(node); return node; }
  function filter(type, freq) {
    const f = ambCtx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    return f;
  }

  const trim = { rain: 0.9, ocean: 2.2, brown: 2.2, white: 0.25 };
  let lfo = null;
  if (kind === "rain") {
    chain(filter("highpass", 600));
    chain(filter("lowpass", 7000));
  } else if (kind === "brown") {
    chain(filter("lowpass", 380));
  } else if (kind === "ocean") {
    chain(filter("lowpass", 700));
    const wave = chain(ambCtx.createGain());
    wave.gain.value = 0.5;
    lfo = ambCtx.createOscillator();
    lfo.frequency.value = 0.11; // one wave roughly every 9 seconds
    const depth = ambCtx.createGain();
    depth.gain.value = 0.4;
    lfo.connect(depth);
    depth.connect(wave.gain);
    lfo.start();
    made.push(lfo, depth);
  }

  ambGain = ambCtx.createGain();
  ambGain.gain.value = ambVolumeValue() * (trim[kind] || 0.5);
  out.connect(ambGain);
  ambGain.connect(ambCtx.destination);
  src.start();

  const myGain = ambGain;
  ambStopper = function () {
    try { src.stop(); } catch (e) {}
    if (lfo) { try { lfo.stop(); } catch (e) {} }
    made.forEach(function (n) { try { n.disconnect(); } catch (e) {} });
    try { myGain.disconnect(); } catch (e) {}
  };
  ambKind = kind;
  return true;
}

(function addAmbientCard() {
  if (document.getElementById("amb-card")) return;
  const host = document.getElementById("planner-session");
  if (!host) return;

  const card = document.createElement("div");
  card.id = "amb-card";
  card.className = "card";
  const label = document.createElement("div");
  label.className = "label";
  label.textContent = "AMBIENT SOUND";
  card.appendChild(label);

  const row = document.createElement("div");
  row.className = "tabs";
  row.style.flexWrap = "wrap";
  row.style.marginTop = "0";
  const names = [["rain", "🌧 Rain"], ["ocean", "🌊 Ocean"], ["brown", "Brown"], ["white", "White"]];
  const note = document.createElement("p");
  note.className = "small";
  note.textContent = "Tap a sound to play it. Tap it again to stop.";

  function mark() {
    row.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.k === ambKind);
    });
  }

  names.forEach(function (pair) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.k = pair[0];
    b.textContent = pair[1];
    b.addEventListener("click", function () {
      if (ambKind === pair[0]) {
        ambStop();
        note.textContent = "Stopped.";
      } else if (ambStart(pair[0])) {
        note.textContent = "Playing: " + pair[1].replace(/^\S+\s/, "") + ".";
      } else {
        note.textContent = "Your browser can't play sounds here.";
      }
      mark();
    });
    row.appendChild(b);
  });
  card.appendChild(row);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.id = "amb-volume";
  slider.min = "0";
  slider.max = "100";
  slider.value = "40";
  slider.style.width = "100%";
  slider.style.marginTop = "14px";
  slider.style.accentColor = "var(--accent)";
  slider.addEventListener("input", function () {
    if (ambGain && ambKind) {
      const trim = { rain: 0.9, ocean: 2.2, brown: 2.2, white: 0.25 };
      ambGain.gain.value = ambVolumeValue() * (trim[ambKind] || 0.5);
    }
  });
  card.appendChild(slider);
  card.appendChild(note);
  host.appendChild(card);
})();

// ---------- AI camera ----------
var photoData = null;
var photoChip, photoFile, camFile;

function clearPhoto() {
  photoData = null;
  if (photoChip) photoChip.style.display = "none";
  if (photoFile) photoFile.value = "";
  if (camFile) camFile.value = "";
}

function shrinkPhoto(file, done, fail) {
  var url = URL.createObjectURL(file);
  var img = new Image();
  img.onload = function () {
    function make(maxSide, quality) {
      var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", quality).split(",")[1];
    }
    var data = make(2000, 0.88);
    if (data.length > 2400000) data = make(1600, 0.8);
    if (data.length > 2400000) data = make(1280, 0.7);
    URL.revokeObjectURL(url);
    if (data.length > 2400000) { fail("That photo is too large. Try a closer crop."); return; }
    done({ mime: "image/jpeg", data: data });
  };
  img.onerror = function () {
    URL.revokeObjectURL(url);
    fail("Could not read that image. Use a JPG or PNG.");
  };
  img.src = url;
}

(function addAttachments() {
  var row = sendButton.parentNode;
  var menu = document.querySelector(".quick");

  // Styles for the photo chip, the photo in your bubble, and the follow-up buttons
  var css = document.createElement("style");
  css.textContent = [
    ".chat-input .photo-chip { position: absolute; left: 8px; bottom: calc(100% + 8px); display: flex; align-items: center; gap: 8px; margin: 0; padding: 5px 8px 5px 5px; background: var(--card2); border: 1px solid var(--line); border-radius: 12px; font-size: 13px; color: var(--text); box-shadow: 0 6px 20px rgba(0,0,0,.2); }",
    ".chat-input .photo-chip img { width: 40px; height: 40px; object-fit: cover; border-radius: 8px; }",
    ".chat-input .photo-chip button { width: auto; height: auto; padding: 0 4px; background: none; border: 0; border-radius: 0; color: var(--text); font-size: 15px; cursor: pointer; }",
    ".msg-photo { display: block; max-width: 220px; max-height: 220px; border-radius: 8px; margin-bottom: 6px; }",
    ".modes .mode:disabled { display: none; }",
    "html.friend .set-course .sc-mode { display: none; }",
    ".chat-input .quick button[data-quick] { display: none; }",
    ".msg-doc { display: inline-block; margin-bottom: 6px; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px; font-size: 12px; }",
    ".followups { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }",
    ".followups button { width: auto; padding: 6px 12px; font-size: 12px; border-radius: 999px; background: none; border: 1px solid var(--line); color: var(--text); cursor: pointer; }",
    ".followups button:hover { border-color: var(--accent); }",
    ".followups button.top { background: var(--accent); color: var(--onaccent); border-color: var(--accent); font-weight: 700; }"
  ].join("\n");
  document.head.appendChild(css);

  photoFile = document.createElement("input");
  photoFile.type = "file";
  photoFile.accept = "image/*";
  photoFile.style.display = "none";

  camFile = document.createElement("input");
  camFile.type = "file";
  camFile.accept = "image/*";
  camFile.setAttribute("capture", "environment"); // on a phone this opens the camera
  camFile.style.display = "none";

  var textFile = document.createElement("input");
  textFile.type = "file";
  textFile.accept = ".pdf,application/pdf,.docx,.txt,.md,.csv,.json,.js,.py,.c,.cpp,.java,.html,.css,.m,text/plain";
  textFile.style.display = "none";

  photoChip = document.createElement("div");
  photoChip.className = "photo-chip";
  photoChip.style.display = "none";
  var thumb = document.createElement("img");
  var label = document.createElement("span");
  label.textContent = "Photo ready";
  var x = document.createElement("button");
  x.type = "button";
  x.textContent = "✕";
  photoChip.appendChild(thumb);
  photoChip.appendChild(label);
  photoChip.appendChild(x);

  row.appendChild(photoFile);
  row.appendChild(camFile);
  row.appendChild(textFile);
  row.appendChild(photoChip);

  function menuItem(text, input) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.addEventListener("click", function () { input.click(); });
    return b;
  }
  if (menu) {
    menu.insertBefore(menuItem("Add a file", textFile), menu.firstChild);
    menu.insertBefore(menuItem("Choose a photo", photoFile), menu.firstChild);
    menu.insertBefore(menuItem("Take a photo", camFile), menu.firstChild);
  }

  x.addEventListener("click", clearPhoto);
  function onPhoto(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    thumb.style.display = "";
    label.textContent = "Preparing...";
    photoChip.style.display = "flex";
    shrinkPhoto(file, function (p) {
      photoData = p;
      thumb.src = "data:" + p.mime + ";base64," + p.data;
      label.textContent = "Photo ready";
    }, function (msg) {
      clearPhoto();
      addMessage(msg, "ai");
    });
  }
  photoFile.addEventListener("change", function () { onPhoto(photoFile); });
  camFile.addEventListener("change", function () { onPhoto(camFile); });

  function readPdf(f) {
    if (f.size > 4400000) {
      addMessage("That PDF is too big. Use one under about 4 MB, or a few pages.", "ai");
      textFile.value = "";
      return;
    }
    thumb.style.display = "none";
    label.textContent = "Preparing PDF...";
    photoChip.style.display = "flex";
    var r = new FileReader();
    r.onload = function () {
      var data = String(r.result).split(",")[1] || "";
      if (!data) { clearPhoto(); addMessage("Could not read that PDF.", "ai"); return; }
      photoData = { mime: "application/pdf", data: data, name: f.name };
      label.textContent = "📄 " + (f.name.length > 24 ? f.name.slice(0, 21) + "..." : f.name);
      textFile.value = "";
    };
    r.onerror = function () { clearPhoto(); addMessage("Could not read that PDF.", "ai"); };
    r.readAsDataURL(f);
  }

  function loadMammoth(done, fail) {
    if (window.mammoth) { done(); return; }
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js";
    s.onload = done;
    s.onerror = fail;
    document.head.appendChild(s);
  }

  function readDocx(f) {
    if (f.size > 3000000) {
      addMessage("That Word file is too big. Use one under 3 MB.", "ai");
      textFile.value = "";
      return;
    }
    if (!navigator.onLine) {
      addMessage("Reading a Word file needs an internet connection.", "ai");
      textFile.value = "";
      return;
    }
    addMessage("Reading " + f.name + "...", "ai");
    loadMammoth(function () {
      var r = new FileReader();
      r.onload = function () {
        window.mammoth.extractRawText({ arrayBuffer: r.result }).then(function (res) {
          var s = (res.value || "").trim();
          if (!s) {
            addMessage("I found no text in that Word file. If it only holds pictures, send them as photos.", "ai");
            textFile.value = "";
            return;
          }
          var cut = s.length > 10000;
          if (cut) s = s.slice(0, 10000) + "\n[...cut]";
          var old = questionInput.value.trim();
          questionInput.value = (old ? old + "\n\n" : "Summarise this document and explain the key points:\n") + "File: " + f.name + "\n" + s;
          questionInput.dispatchEvent(new Event("input"));
          questionInput.focus();
          textFile.value = "";
          if (cut) addMessage("That file is long, so only the first part was added.", "ai");
        }).catch(function () {
          addMessage("Could not read that Word file. Is it a real .docx?", "ai");
          textFile.value = "";
        });
      };
      r.onerror = function () { addMessage("Could not read that file.", "ai"); textFile.value = ""; };
      r.readAsArrayBuffer(f);
    }, function () {
      addMessage("Could not load the Word reader. Check your internet and try again.", "ai");
      textFile.value = "";
    });
  }

  textFile.addEventListener("change", function () {
    var f = textFile.files && textFile.files[0];
    if (!f) return;
    if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
      readPdf(f);
      return;
    }
    if (/\.docx$/i.test(f.name)) {
      readDocx(f);
      return;
    }
    if (/\.doc$/i.test(f.name)) {
      addMessage("Old .doc files are not supported. In Word, choose Save As and pick .docx, then try again.", "ai");
      textFile.value = "";
      return;
    }
    if (f.size > 200000) {
      addMessage("That file is too big. Use one under 200 KB.", "ai");
      textFile.value = "";
      return;
    }
    var r = new FileReader();
    r.onload = function () {
      var s = String(r.result);
      if (s.length > 8000) s = s.slice(0, 8000) + "\n[...cut]";
      var old = questionInput.value.trim();
      questionInput.value = (old ? old + "\n\n" : "Explain this file:\n") + "File: " + f.name + "\n" + s;
      questionInput.dispatchEvent(new Event("input"));
      questionInput.focus();
      textFile.value = "";
    };
    r.readAsText(f);
  });
})();

// ---------- Follow-up buttons under each AI reply ----------
function addFollowups(box, reply) {
  document.querySelectorAll(".followups").forEach(function (e) { e.remove(); });
  var names = { simpler: "Explain simpler", hint: "Give me a hint", quiz: "Quiz me", example: "Show an example", steps: "Step by step" };
  var s = { simpler: 1, hint: 0, quiz: 1, example: 1, steps: 1 };
  if (reply.indexOf("```") !== -1) { s.steps += 3; s.example += 1; }
  if (/\\\(|\\\[|\$\$/.test(reply)) { s.example += 2; s.quiz += 2; }
  if (reply.length > 900) s.simpler += 3;
  if (/\?\s*$/.test(reply.trim())) s.hint += 4;
  if (reply.indexOf("What I can see") === 0) s.steps += 3;
  if (/step\s*1/i.test(reply)) s.quiz += 1;
  var order = Object.keys(s).sort(function (a, b) { return s[b] - s[a]; });

  var bar = document.createElement("div");
  bar.className = "followups";
  order.forEach(function (kind, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = names[kind];
    if (i === 0) b.className = "top";
    b.addEventListener("click", function () { sendQuick(kind); });
    bar.appendChild(b);
  });
  box.appendChild(bar);
}

// ---------- Tidy the saved question bank (Profile screen) ----------
(function addTidyCard() {
  var host = document.getElementById("profile");
  if (!host || document.getElementById("tidy-card")) return;

  var card = document.createElement("div");
  card.id = "tidy-card";
  card.className = "card";
  var label = document.createElement("div");
  label.className = "label";
  label.textContent = "QUESTION BANK";
  var info = document.createElement("p");
  info.className = "small";
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mini";
  btn.textContent = "TIDY OLD QUESTIONS";
  var msg = document.createElement("p");
  msg.className = "small";
  card.appendChild(label);
  card.appendChild(info);
  card.appendChild(btn);
  card.appendChild(msg);
  host.appendChild(card);

  function looksPlain(q) {
    var all = [q.question].concat(q.options, [q.explanation || ""]).join(" ");
    if (all.indexOf("\\(") !== -1 || all.indexOf("\\[") !== -1 || all.indexOf("$$") !== -1) return false;
    return /sqrt\s*\(|√|\^|\*\*|\bpi\b|\d\s*\/\s*\d|\b[a-z]\s*_\s*\d|\bomega\b|\btheta\b/i.test(all);
  }

  function refresh() {
    var n = aiBank.filter(looksPlain).length;
    info.textContent = aiBank.length + " saved AI questions. " + n + " look like old ones with plain-text maths (sqrt, ^ and the like).";
    btn.disabled = n === 0;
  }

  btn.addEventListener("click", function () {
    var before = aiBank.length;
    var n = aiBank.filter(looksPlain).length;
    if (n === 0) return;
    if (!confirm("Remove " + n + " old question" + (n === 1 ? "" : "s") + "? Fresh ones with proper maths are made when you practise.")) return;
    aiBank = aiBank.filter(function (q) { return !looksPlain(q); });
    saveAiBank();
    msg.textContent = "Removed " + (before - aiBank.length) + ". Kept " + aiBank.length + ".";
    refresh();
    try { renderLaunch(); } catch (e) {}
  });

  var nav = document.querySelector('nav button[data-screen="profile"]');
  if (nav) nav.addEventListener("click", refresh);
  refresh();
})();


// ---------- Your details, Gemini key and courses (Profile screen, and first-run welcome) ----------
(function setupSettings() {
  var PROFILE_KEY = "studycore-profile";
  var COURSES_KEY = "studycore-courses";
  var KEY_KEY = "sc-userkey"; // not saved in backups on purpose
  var MODES = [["general", "General"], ["engineering", "Engineering (calculations)"], ["autocad", "AutoCAD"], ["coding", "Coding"]];
  if (window.WORU_FRIEND) MODES = MODES.slice(0, 1);

  var css = document.createElement("style");
  css.textContent = [
    ".set-card input, .set-card select, .set-card textarea, #welcome input, #welcome select, #welcome textarea { width: 100%; box-sizing: border-box; margin: 4px 0 10px; padding: 11px 12px; background: var(--card2); border: 1px solid var(--line); border-radius: 10px; color: var(--text); font: inherit; font-size: 15px; }",
    ".set-card textarea, #welcome textarea { min-height: 84px; resize: vertical; }",
    ".set-course { padding: 10px; margin: 8px 0; border: 1px solid var(--line); border-radius: 12px; }",
    ".set-course .row2 { display: flex; gap: 8px; }",
    ".set-course .row2 input:first-child { flex: 0 0 38%; }",
    ".set-btns { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 8px; }",
    ".set-msg { min-height: 1.2em; }",
    "#welcome { position: fixed; inset: 0; z-index: 200; overflow: auto; background: var(--bg); padding: 28px 16px 70px; }",
    "#welcome .inner { max-width: 560px; margin: 0 auto; }",
    "#welcome h1 { margin: 0 0 6px; }",
    "#welcome .primary { width: 100%; margin-top: 10px; }"
  ].join("\n");
  document.head.appendChild(css);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function slug(s) {
    var v = String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
    return v || "c" + Date.now();
  }
  function codeOf(c) { return c ? String(c.name).split(" · ")[0] : ""; }
  function titleOf(c) { return c ? String(c.name).split(" · ").slice(1).join(" · ") : ""; }

  function courseRow(c) {
    var row = el("div", "set-course");
    row.dataset.id = c && c.id ? c.id : "";
    var top = el("div", "row2");
    var code = el("input", "sc-code"); code.placeholder = "Code, e.g. PHA201"; code.value = codeOf(c);
    var title = el("input", "sc-title"); title.placeholder = "Course title"; title.value = titleOf(c);
    top.appendChild(code); top.appendChild(title);
    var mode = el("select", "sc-mode");
    MODES.forEach(function (m) {
      var o = el("option", "", m[1]); o.value = m[0]; mode.appendChild(o);
    });
    mode.value = (c && (c.mode || courseModes[c.id])) || "general";
    var topics = el("textarea", "sc-topics");
    topics.placeholder = "Topics, one per line";
    topics.value = c && Array.isArray(c.topics) ? c.topics.join("\n") : "";
    var del = el("button", "mini", "REMOVE COURSE"); del.type = "button";
    del.addEventListener("click", function () { row.remove(); });
    row.appendChild(top); row.appendChild(mode); row.appendChild(topics); row.appendChild(del);
    return row;
  }

  function collectCourses(list) {
    var out = [];
    var used = {};
    list.querySelectorAll(".set-course").forEach(function (row) {
      var code = row.querySelector(".sc-code").value.trim();
      var title = row.querySelector(".sc-title").value.trim();
      if (!code && !title) return;
      var topics = row.querySelector(".sc-topics").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      var base = row.dataset.id || slug(code || title);
      var id = base;
      var n = 2;
      while (used[id]) { id = base + n; n++; }
      used[id] = true;
      out.push({ id: id, name: title ? code + " · " + title : code, topics: topics.length ? topics : ["General revision"], mode: row.querySelector(".sc-mode").value });
    });
    return out;
  }

  // Builds the whole form into "box". "after" runs when the person taps Save.
  function buildForm(box, firstRun) {
    var p = scProfile();

    box.appendChild(el("div", "label", "YOU"));
    var name = el("input"); name.placeholder = "Your first name"; name.value = p.name; name.autocomplete = "off";
    var field = el("input"); field.placeholder = "What you study, e.g. Pharmacy, 300 level"; field.value = p.field;
    box.appendChild(name); box.appendChild(field);

    box.appendChild(el("div", "label", "GEMINI KEY (FREE)"));
    var keyNote = el("p", "small", "The AI needs your own free Google Gemini key. It stays on this device and is only sent with your questions.");
    var link = el("a", "", "Get a free key: aistudio.google.com/apikey");
    link.href = "https://aistudio.google.com/apikey"; link.target = "_blank"; link.rel = "noopener";
    link.style.display = "block"; link.style.margin = "4px 0 8px";
    var key = el("input"); key.type = "password"; key.autocomplete = "off"; key.spellcheck = false;
    key.placeholder = scGet(KEY_KEY) ? "Key saved (ends " + scGet(KEY_KEY).slice(-4) + "). Paste a new one to replace it." : "Paste your key here";
    var keyMsg = el("p", "small set-msg");
    var keyBtns = el("div", "set-btns");
    var testBtn = el("button", "mini", "SAVE AND TEST KEY"); testBtn.type = "button";
    var rmBtn = el("button", "mini", "REMOVE KEY"); rmBtn.type = "button";
    keyBtns.appendChild(testBtn); keyBtns.appendChild(rmBtn);
    box.appendChild(keyNote); box.appendChild(link); box.appendChild(key); box.appendChild(keyBtns); box.appendChild(keyMsg);

    function saveKeyIfTyped() {
      var v = key.value.trim();
      if (v === "") return true;
      if (v.length < 20 || /\s/.test(v)) { keyMsg.textContent = "That does not look like a full key. Copy the whole key."; return false; }
      try { localStorage.setItem(KEY_KEY, v); } catch (e) {}
      key.value = "";
      key.placeholder = "Key saved (ends " + v.slice(-4) + "). Paste a new one to replace it.";
      return true;
    }
    testBtn.addEventListener("click", function () {
      if (!saveKeyIfTyped()) return;
      if (!scGet(KEY_KEY)) { keyMsg.textContent = "Paste your key first."; return; }
      keyMsg.textContent = "Testing...";
      fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ mode: "general", messages: [{ role: "user", text: "Reply with the single word OK." }] })
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) { keyMsg.textContent = res.ok && res.d.reply ? "Your key works." : "That did not work: " + (res.d.error || "unknown error"); })
        .catch(function () { keyMsg.textContent = "Could not reach the AI. Check your internet."; });
    });
    rmBtn.addEventListener("click", function () {
      try { localStorage.removeItem(KEY_KEY); } catch (e) {}
      key.placeholder = "Paste your key here";
      keyMsg.textContent = "Key removed from this device.";
    });

    box.appendChild(el("div", "label", "YOUR COURSES"));
    box.appendChild(el("p", "small", "Add each course and its topics, one topic per line. The mode shapes how the tutor helps."));
    var list = el("div");
    var current = courses.length > 0 ? courses : [];
    current.forEach(function (c) { list.appendChild(courseRow(c)); });
    if (current.length === 0) list.appendChild(courseRow(null));
    var addBtn = el("button", "mini", "+ ADD COURSE"); addBtn.type = "button";
    addBtn.addEventListener("click", function () { list.appendChild(courseRow(null)); });
    box.appendChild(list); box.appendChild(addBtn);

    var msg = el("p", "small set-msg");
    var save = el("button", "primary", firstRun ? "SAVE AND START" : "SAVE");
    save.type = "button";
    box.appendChild(save); box.appendChild(msg);

    save.addEventListener("click", function () {
      var n = name.value.trim();
      if (firstRun && n === "") { msg.textContent = "Please type your name."; return; }
      if (!saveKeyIfTyped()) return;
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: n, field: field.value.trim() })); } catch (e) {}
      var list2 = collectCourses(list);
      try {
        if (list2.length > 0) localStorage.setItem(COURSES_KEY, JSON.stringify(list2));
        else localStorage.removeItem(COURSES_KEY);
      } catch (e) {}
      msg.textContent = "Saved. Reloading...";
      setTimeout(function () { location.reload(); }, 300);
    });
  }

  // Profile screen: label with your name, and a Settings card near the top
  var host = document.getElementById("profile");
  var prof = scProfile();
  if (host) {
    var lab = host.querySelector(".label");
    if (lab && prof.name) lab.textContent = prof.name.toUpperCase() + (prof.field ? " · " + prof.field.toUpperCase() : "");
    else if (lab && window.WORU_FRIEND) lab.textContent = "YOUR PROFILE";
    if (!document.getElementById("settings-card")) {
      var card = el("div", "card set-card");
      card.id = "settings-card";
      var details = document.createElement("details");
      var sum = document.createElement("summary");
      sum.textContent = "SETTINGS: name, Gemini key, courses";
      sum.style.cursor = "pointer"; sum.style.fontWeight = "700";
      var inner = el("div");
      details.appendChild(sum); details.appendChild(inner);
      card.appendChild(details);
      buildForm(inner, false);
      var h1 = host.querySelector("h1");
      if (h1) h1.after(card); else host.appendChild(card);
    }
  }

  // First run for a shared copy: a welcome screen, until a name is saved
  if (window.WORU_FRIEND && !prof.name) {
    var w = el("div");
    w.id = "welcome";
    var inner2 = el("div", "inner");
    inner2.appendChild(el("h1", "", "Welcome to " + ((window.BRAND && window.BRAND.name) || "WORU")));
    inner2.appendChild(el("p", "small", "Set up once. You can change everything later in Profile, Settings."));
    buildForm(inner2, true);
    w.appendChild(inner2);
    document.body.appendChild(w);
  }
})();


// ---------- Saved chats: your tutor conversations are kept, and can be reopened and searched ----------
(function savedChats() {
  var KEY = "studycore-chats"; // part of backups too
  var MAX_CHATS = 40;
  var MAX_LOG = 80;
  var currentId = null;
  var chatLog = [];
  var restoring = false;
  var chats = load();

  function valid(c) { return c && typeof c.id === "string" && Array.isArray(c.log) && Array.isArray(c.history); }
  function load() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(a) ? a.filter(valid) : [];
    } catch (e) { return []; }
  }
  function persist() {
    for (;;) {
      try { localStorage.setItem(KEY, JSON.stringify(chats)); return; }
      catch (e) { if (chats.length <= 1) return; chats.pop(); } // storage full: drop the oldest chat
    }
  }
  function save() {
    if (chatLog.length === 0) return;
    var firstUser = chatLog.filter(function (l) { return l.who === "user"; })[0];
    var title = (firstUser ? firstUser.text : "Chat").replace(/\s+/g, " ").trim().slice(0, 60) || "Chat";
    if (!currentId) currentId = "c" + Date.now();
    var rec = chats.filter(function (c) { return c.id === currentId; })[0];
    if (!rec) { rec = { id: currentId }; chats.unshift(rec); }
    rec.title = title;
    rec.mode = chatMode;
    rec.updated = Date.now();
    rec.history = chatHistory.slice(-20);
    rec.log = chatLog.slice(-MAX_LOG);
    chats.sort(function (a, b) { return b.updated - a.updated; });
    if (chats.length > MAX_CHATS) chats.length = MAX_CHATS;
    persist();
  }

  // Keep a copy of what is shown: what you send, and what the tutor answers
  var baseAdd = addMessage;
  addMessage = function (text, who) {
    var d = baseAdd(text, who);
    if (who === "user" && !restoring) chatLog.push({ who: "user", text: String(text) });
    return d;
  };
  var baseRender = renderReply;
  renderReply = function (box, reply) {
    baseRender(box, reply);
    if (!restoring) {
      chatLog.push({ who: "ai", text: reply });
      setTimeout(save, 0); // after askAI has added the exchange to chatHistory
    }
  };
  window.noteAttachment = function (label) {
    for (var i = chatLog.length - 1; i >= 0; i--) {
      if (chatLog[i].who === "user") { chatLog[i].attach = label; return; }
    }
  };

  function show(rec) {
    restoring = true;
    currentId = rec.id;
    chatLog = rec.log.slice();
    chatHistory = rec.history.slice();
    messagesBox.innerHTML = "";
    var lastAi = null;
    var lastText = "";
    chatLog.forEach(function (l) {
      var d = document.createElement("div");
      d.className = "msg " + (l.who === "user" ? "user" : "ai");
      messagesBox.appendChild(d);
      if (l.who === "user") {
        if (l.attach) {
          var tag = document.createElement("div");
          tag.className = "msg-doc";
          tag.textContent = l.attach;
          d.appendChild(tag);
        }
        d.appendChild(document.createTextNode(l.text));
      } else {
        baseRender(d, l.text);
        if (window.woruAddListen) window.woruAddListen(d, l.text);
        lastAi = d;
        lastText = l.text;
      }
    });
    if (lastAi && chatLog[chatLog.length - 1].who === "ai") addFollowups(lastAi, lastText);
    if (rec.mode && modeNotes[rec.mode]) setMode(rec.mode);
    simplerLevel = 1;
    updateQuick();
    restoring = false;
    if (messagesBox.lastElementChild) messagesBox.lastElementChild.scrollIntoView({ block: "end" });
  }

  // Controls above the conversation
  var css = document.createElement("style");
  css.textContent = [
    ".chat-tools { display: flex; gap: 8px; margin: 6px 0 10px; }",
    ".chat-tools button { width: auto; padding: 6px 12px; font-size: 12px; border-radius: 999px; background: none; border: 1px solid var(--line); color: var(--text); cursor: pointer; }",
    ".chat-tools button:hover { border-color: var(--accent); }",
    "#chat-history { display: none; margin-bottom: 14px; }",
    "#chat-history.open { display: block; }",
    "#chat-history input { width: 100%; box-sizing: border-box; padding: 10px 12px; margin-bottom: 8px; background: var(--card2); border: 1px solid var(--line); border-radius: 10px; color: var(--text); font: inherit; font-size: 15px; }",
    ".ch-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; margin: 6px 0; background: var(--card); border: 1px solid var(--line); border-radius: 12px; cursor: pointer; }",
    ".ch-item:hover { border-color: var(--accent); }",
    ".ch-item .info { flex: 1; min-width: 0; }",
    ".ch-item .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
    ".ch-item .d { font-size: 11px; opacity: .65; margin-top: 2px; }",
    ".ch-item .del { width: auto; padding: 0 6px; background: none; border: 0; color: var(--text); cursor: pointer; font-size: 15px; }"
  ].join("\n");
  document.head.appendChild(css);

  var bar = document.createElement("div");
  bar.className = "chat-tools";
  var newBtn = document.createElement("button");
  newBtn.type = "button";
  newBtn.textContent = "+ New chat";
  var histBtn = document.createElement("button");
  histBtn.type = "button";
  histBtn.textContent = "History";
  bar.appendChild(newBtn);
  bar.appendChild(histBtn);

  var panel = document.createElement("div");
  panel.id = "chat-history";
  var search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Search your chats";
  var list = document.createElement("div");
  panel.appendChild(search);
  panel.appendChild(list);

  messagesBox.before(bar);
  messagesBox.before(panel);

  function when(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  function renderList() {
    var q = search.value.trim().toLowerCase();
    list.innerHTML = "";
    var shown = chats.filter(function (c) {
      if (!q) return true;
      if (c.title.toLowerCase().indexOf(q) !== -1) return true;
      return c.log.some(function (l) { return l.text.toLowerCase().indexOf(q) !== -1; });
    });
    if (shown.length === 0) {
      var p = document.createElement("p");
      p.className = "small";
      p.textContent = chats.length === 0 ? "No saved chats yet. Ask the tutor something and it will appear here." : "No chat matches that.";
      list.appendChild(p);
      return;
    }
    shown.forEach(function (c) {
      var row = document.createElement("div");
      row.className = "ch-item";
      var info = document.createElement("div");
      info.className = "info";
      var t = document.createElement("div");
      t.className = "t";
      t.textContent = c.title;
      var d = document.createElement("div");
      d.className = "d";
      d.textContent = when(c.updated) + " · " + (c.mode || "general").toUpperCase();
      info.appendChild(t);
      info.appendChild(d);
      var del = document.createElement("button");
      del.type = "button";
      del.className = "del";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Delete chat");
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!confirm("Delete this chat?")) return;
        chats = chats.filter(function (x) { return x.id !== c.id; });
        persist();
        if (c.id === currentId) newChat();
        renderList();
      });
      row.addEventListener("click", function () {
        if (aiBusy) { alert("Wait for the answer to finish first."); return; }
        show(c);
        panel.classList.remove("open");
      });
      row.appendChild(info);
      row.appendChild(del);
      list.appendChild(row);
    });
  }
  function newChat() {
    if (aiBusy) { alert("Wait for the answer to finish first."); return; }
    currentId = null;
    chatLog = [];
    chatHistory = [];
    messagesBox.innerHTML = "";
    simplerLevel = 1;
    if (typeof clearPhoto === "function") clearPhoto();
    updateQuick();
    panel.classList.remove("open");
  }
  newBtn.addEventListener("click", newChat);
  histBtn.addEventListener("click", function () {
    var open = !panel.classList.contains("open");
    panel.classList.toggle("open", open);
    if (open) { search.value = ""; renderList(); }
  });
  search.addEventListener("input", renderList);

  // Reopen the last conversation when the app starts
  if (chats.length > 0) show(chats[0]);
  window.woruRedrawChat = function () {
    var r = chats.filter(function (c) { return c.id === currentId; })[0];
    if (r) show(r);
  };
})();

// ===== REVISION PILE: wrong answers come back until they stick =====
(function revisionPile() {
  var KEY = "studycore-review";
  var GAPS = [1, 2, 4, 7, 14]; // days to wait after each correct answer; a 6th correct answer graduates the card
  var MAX_CARDS = 300;
  var cards = load();
  var added = 0;
  var graduated = 0;

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        Object.keys(saved).forEach(function (k) { if (!validQuestion(saved[k].q)) delete saved[k]; });
        return saved;
      }
    } catch (e) {}
    return {};
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(cards)); } catch (e) {} }
  function keyOf(q) { return q.course + "|" + q.topic + "|" + q.question; }
  function plusDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return dateKey(d); }
  function dueList() {
    var today = dateKey(new Date());
    return Object.keys(cards).map(function (k) { return cards[k]; })
      .filter(function (c) { return c.due <= today; })
      .sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : a.box - b.box; });
  }
  function total() { return Object.keys(cards).length; }

  // Every answer in any quiz passes through here.
  var baseRecord = recordAnswer;
  recordAnswer = function (q, correct, ms) {
    baseRecord(q, correct, ms);
    try {
      if (!validQuestion(q)) return;
      var k = keyOf(q);
      if (!correct) {
        if (!cards[k]) added++;
        cards[k] = {
          q: { course: q.course, topic: q.topic, subtopic: q.subtopic || "", question: q.question, options: q.options, answer: q.answer, explanation: q.explanation || "" },
          box: 0, due: dateKey(new Date()), lapses: ((cards[k] && cards[k].lapses) || 0) + 1
        };
        var keys = Object.keys(cards);
        if (keys.length > MAX_CARDS) {
          keys.sort(function (a, b) { return cards[a].due < cards[b].due ? -1 : 1; });
          delete cards[keys[keys.length - 1] === k ? keys[0] : keys[keys.length - 1]];
        }
      } else if (cards[k]) {
        var c = cards[k];
        if (c.box >= GAPS.length) { delete cards[k]; graduated++; }
        else { c.due = plusDays(GAPS[c.box]); c.box++; }
      }
      persist();
    } catch (e) {}
  };

  // Tell the student what happened to the pile when a quiz ends.
  var baseResult = showCbtResult;
  showCbtResult = function (auto) {
    baseResult(auto);
    var line = document.getElementById("cr-line");
    if (line && (added || graduated)) {
      var bits = [];
      if (added) bits.push(added + " added to your revision pile");
      if (graduated) bits.push(graduated + " mastered and cleared");
      line.textContent += " " + bits.join(", ") + ".";
    }
    added = 0; graduated = 0;
    renderCard();
  };

  // ----- the card on the Home screen -----
  var card = null, title, sub, goBtn, allBtn;
  function build() {
    var weak = document.getElementById("h-weak");
    if (!weak || !weak.parentNode) return;
    card = document.createElement("div");
    card.className = "card";
    card.id = "h-review";
    var label = document.createElement("div");
    label.className = "label";
    label.textContent = "REVISION PILE";
    title = document.createElement("h2");
    sub = document.createElement("p");
    sub.className = "small";
    goBtn = document.createElement("button");
    goBtn.className = "primary";
    allBtn = document.createElement("button");
    allBtn.className = "mini";
    allBtn.textContent = "PRACTISE THE WHOLE PILE ANYWAY";
    card.appendChild(label); card.appendChild(title); card.appendChild(sub); card.appendChild(goBtn); card.appendChild(allBtn);
    weak.parentNode.parentNode.insertBefore(card, weak.parentNode);
    goBtn.addEventListener("click", function () { start(dueList()); });
    allBtn.addEventListener("click", function () {
      start(Object.keys(cards).map(function (k) { return cards[k]; }));
    });
  }

  function nextDueText() {
    var soonest = null;
    Object.keys(cards).forEach(function (k) { if (!soonest || cards[k].due < soonest) soonest = cards[k].due; });
    if (!soonest) return "";
    var days = Math.round((new Date(soonest + "T00:00:00") - new Date(dateKey(new Date()) + "T00:00:00")) / 86400000);
    return days <= 1 ? "Next ones are due tomorrow." : "Next ones are due in " + days + " days.";
  }

  function renderCard() {
    if (!card) build();
    if (!card) return;
    var n = total();
    var due = dueList().length;
    if (n === 0) {
      title.textContent = "Nothing to revise";
      sub.textContent = "Questions you get wrong in a CBT quiz are saved here, and come back after 1, 2, 4, 7 and 14 days until you know them.";
      goBtn.classList.add("hidden");
      allBtn.classList.add("hidden");
      return;
    }
    if (due > 0) {
      title.textContent = due + " question" + (due === 1 ? "" : "s") + " to revise today";
      sub.textContent = n + " in your pile in total. Get one right again and it moves further away. Miss it and it starts over.";
      goBtn.textContent = "REVISE " + Math.min(due, 20) + " NOW";
      goBtn.classList.remove("hidden");
      allBtn.classList.toggle("hidden", n === due);
    } else {
      title.textContent = "All caught up";
      sub.textContent = n + " in your pile. " + nextDueText();
      goBtn.classList.add("hidden");
      allBtn.classList.remove("hidden");
    }
  }

  function start(list) {
    if (list.length === 0) return;
    var pick = list.slice(0, 20).map(function (c) { return c.q; });
    showScreen("study");
    startCbt(
      { courseId: null, topic: null, label: "Revision pile", saved: true },
      shuffle(pick),
      { note: "Revision. Questions you got wrong before." }
    );
  }

  window.revisionDue = function () { return dueList().length; };
  window.revisionStart = function () { start(dueList()); };
  var baseHome = renderHome;
  renderHome = function () { baseHome.apply(this, arguments); renderCard(); };
  renderCard();
})();

// ===== QUIZ FROM YOUR NOTES: paste, or add a photo / PDF / Word file =====
(function notesQuiz() {
  var home = document.getElementById("study-home");
  var anchor = home && home.querySelector(".sec-label");
  if (!home || !anchor) return;
  var MAX = 12000;

  var css = document.createElement("style");
  css.textContent = [
    "#nq-card textarea, #nq-card select, #nq-card input[type=text] { width: 100%; box-sizing: border-box; background: var(--card2); border: 1px solid var(--line); border-radius: 10px; color: var(--text); font: inherit; font-size: 15px; padding: 10px; margin: 6px 0; }",
    "#nq-card textarea { min-height: 120px; resize: vertical; }",
    "#nq-card .nq-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 4px 0 8px; }",
    "#nq-card .nq-count { font-size: 12px; opacity: .7; margin: 0 0 6px; }"
  ].join("\n");
  document.head.appendChild(css);

  var card = document.createElement("div");
  card.className = "card";
  card.id = "nq-card";
  card.innerHTML =
    '<div class="label">QUIZ FROM YOUR NOTES</div>' +
    '<h2>Turn your notes into a quiz</h2>' +
    '<p class="small">Questions come only from what you give it. Snap your notebook, add a PDF or Word file, or paste text.</p>' +
    '<select id="nq-course"></select>' +
    '<input type="text" id="nq-topic" placeholder="Topic name (for example: Ohm\'s law)" maxlength="80">' +
    '<textarea id="nq-text" placeholder="Paste your notes here, or add them below."></textarea>' +
    '<p class="nq-count" id="nq-count"></p>' +
    '<div class="nq-row"><button class="mini" id="nq-photo">📷 PHOTO</button><button class="mini" id="nq-file">📄 PDF / WORD / TEXT</button><button class="mini" id="nq-clear">CLEAR</button></div>' +
    '<p class="small" id="nq-status"></p>' +
    '<button class="primary" id="nq-go">MAKE QUIZ FROM MY NOTES</button>' +
    '<input type="file" id="nq-photo-in" accept="image/*" multiple hidden>' +
    '<input type="file" id="nq-file-in" accept=".pdf,.docx,.txt,.md,application/pdf,text/plain" multiple hidden>';
  anchor.parentNode.insertBefore(card, anchor);

  var sel = card.querySelector("#nq-course");
  courses.forEach(function (c) {
    var o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    sel.appendChild(o);
  });
  var topic = card.querySelector("#nq-topic");
  var text = card.querySelector("#nq-text");
  var count = card.querySelector("#nq-count");
  var status = card.querySelector("#nq-status");
  var go = card.querySelector("#nq-go");
  var busy = 0;

  function say(t) { status.textContent = t; }
  function refresh() {
    var n = text.value.trim().length;
    count.textContent = n === 0 ? "" : n + " of " + MAX + " characters" + (n < 80 ? " (add a little more)" : "");
  }
  text.addEventListener("input", refresh);

  function add(chunk) {
    var old = text.value.trim();
    var merged = (old ? old + "\n\n" : "") + chunk.trim();
    if (merged.length > MAX) { merged = merged.slice(0, MAX); say("That was a lot of text, so it was cut at " + MAX + " characters."); }
    text.value = merged;
    refresh();
  }

  // Photos and PDFs are read by the AI tutor and turned into plain text, which you can check and fix.
  function transcribe(img, label) {
    busy++;
    say("Reading " + label + "...");
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, img.mime === "application/pdf" ? 80000 : 50000);
    var ask = "Copy out ALL the text in this " + (img.mime === "application/pdf" ? "document" : "photo of notes") +
      " as plain text, in reading order. Keep formulas, numbers and units exactly. Write maths as plain text such as V = IR. " +
      "Do not explain, summarise or add anything. If part is unreadable, write [unclear] for it.";
    return fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ mode: "general", messages: [{ role: "user", text: ask }], image: img }),
      signal: controller.signal
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) {
        if (!res.ok || !d.reply) throw new Error(d.error || "The AI could not read that.");
        add(d.reply);
        say("Added " + label + ". Check the text, then make your quiz.");
      });
    }).catch(function (err) {
      say(err.name === "AbortError" ? "Reading took too long. Try a closer, clearer photo." :
        err instanceof TypeError ? "Could not reach the AI. Check your internet." : err.message);
    }).then(function () { clearTimeout(timer); busy--; });
  }

  function loadMammothLib(ok, fail) {
    if (window.mammoth) { ok(); return; }
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js";
    s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  }

  function handlePhoto(f) {
    shrinkPhoto(f, function (p) { transcribe(p, "your photo"); }, function (m) { say(m); });
  }
  function handlePdf(f) {
    if (f.size > 4400000) { say("That PDF is too big. Use one under about 4 MB, or a few pages."); return; }
    var r = new FileReader();
    r.onload = function () {
      var data = String(r.result).split(",")[1] || "";
      if (!data) { say("Could not read that PDF."); return; }
      transcribe({ mime: "application/pdf", data: data, name: f.name }, f.name);
    };
    r.onerror = function () { say("Could not read that PDF."); };
    r.readAsDataURL(f);
  }
  function handleDocx(f) {
    if (f.size > 3000000) { say("That Word file is too big. Use one under 3 MB."); return; }
    if (!navigator.onLine) { say("Reading a Word file needs internet."); return; }
    say("Reading " + f.name + "...");
    loadMammothLib(function () {
      var r = new FileReader();
      r.onload = function () {
        window.mammoth.extractRawText({ arrayBuffer: r.result }).then(function (res) {
          var s = (res.value || "").trim();
          if (!s) { say("I found no text in that Word file. If it only holds pictures, add them as photos."); return; }
          add(s); say("Added " + f.name + ".");
        }).catch(function () { say("Could not read that Word file. Is it a real .docx?"); });
      };
      r.onerror = function () { say("Could not read that file."); };
      r.readAsArrayBuffer(f);
    }, function () { say("Could not load the Word reader. Check your internet."); });
  }
  function handleText(f) {
    if (f.size > 200000) { say("That file is too big. Use one under 200 KB."); return; }
    var r = new FileReader();
    r.onload = function () { add(String(r.result)); say("Added " + f.name + "."); };
    r.onerror = function () { say("Could not read that file."); };
    r.readAsText(f);
  }

  var photoIn = card.querySelector("#nq-photo-in");
  var fileIn = card.querySelector("#nq-file-in");
  card.querySelector("#nq-photo").addEventListener("click", function () { photoIn.click(); });
  card.querySelector("#nq-file").addEventListener("click", function () { fileIn.click(); });
  photoIn.addEventListener("change", function () {
    Array.prototype.slice.call(photoIn.files || [], 0, 4).forEach(handlePhoto);
    photoIn.value = "";
  });
  fileIn.addEventListener("change", function () {
    Array.prototype.slice.call(fileIn.files || [], 0, 3).forEach(function (f) {
      if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") handlePdf(f);
      else if (/\.docx$/i.test(f.name)) handleDocx(f);
      else if (/\.doc$/i.test(f.name)) say("Old .doc files are not supported. In Word, choose Save As, pick .docx, then try again.");
      else handleText(f);
    });
    fileIn.value = "";
  });
  card.querySelector("#nq-clear").addEventListener("click", function () { text.value = ""; say(""); refresh(); });

  go.addEventListener("click", function () {
    var notes = text.value.trim();
    if (busy > 0) { say("Still reading your file. Wait a moment."); return; }
    if (notes.length < 80) { say("Add a bit more first: at least a few sentences of notes."); return; }
    if (genBusy || (cbt.active && !cbt.submitted)) { say("Finish or close the quiz you have open first."); return; }
    say("Making your quiz from your notes. Usually 20 to 40 seconds...");
    beginGeneratedQuiz({ courseId: sel.value, topic: topic.value.trim() || "My notes", notes: notes.slice(0, MAX) });
  });

  // quiz progress messages also show inside this card, and the buttons lock while it works
  var baseStatus = setGenStatus;
  setGenStatus = function (t) { baseStatus(t); if (t || status.textContent.indexOf("Making your quiz") === 0) say(t); };
  var baseButtons = setGenButtons;
  setGenButtons = function (d) { baseButtons(d); go.disabled = d; };
  refresh();
})();

// ===== TODAY'S PLAN: what to study today, worked out from your exam date, weak topics and timetable =====
(function dailyPlan() {
  var anchor = document.getElementById("h-next");
  if (!anchor || !anchor.parentNode) return;

  var css = document.createElement("style");
  css.textContent = [
    "#h-plan .pl-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); }",
    "#h-plan .pl-item:first-of-type { border-top: 0; }",
    "#h-plan .pl-ico { font-size: 20px; width: 26px; text-align: center; }",
    "#h-plan .pl-txt { flex: 1; min-width: 0; }",
    "#h-plan .pl-title { font-size: 15px; line-height: 1.3; }",
    "#h-plan .pl-sub { font-size: 12px; opacity: .7; margin-top: 2px; }",
    "#h-plan .pl-item.done .pl-title { text-decoration: line-through; opacity: .55; }",
    "#h-plan .pl-item button { flex: none; }"
  ].join("\n");
  document.head.appendChild(css);

  var card = document.createElement("div");
  card.className = "card";
  card.id = "h-plan";
  var label = document.createElement("div");
  label.className = "label";
  label.textContent = "TODAY'S PLAN";
  var head = document.createElement("h2");
  var sub = document.createElement("p");
  sub.className = "small";
  var list = document.createElement("div");
  card.appendChild(label); card.appendChild(head); card.appendChild(sub); card.appendChild(list);
  anchor.parentNode.insertBefore(card, anchor);

  function today() { return dateKey(new Date()); }
  function sessionsToday() { return progress.sessions.filter(function (s) { return s.date === today(); }); }
  function minutesToday() { return sessionsToday().reduce(function (a, s) { return a + s.minutes; }, 0); }
  function answersToday(courseId, topic) {
    return progress.answers.filter(function (a) { return a.date === today() && a.course === courseId && a.topic === topic; }).length;
  }
  function studiedToday(courseId, minMinutes) {
    return sessionsToday().some(function (s) { return s.courseId === courseId && s.minutes >= minMinutes; });
  }
  function courseOf(id) { return courses.find(function (c) { return c.id === id; }); }
  function code(id) { var c = courseOf(id); return c ? courseCode(c) : id; }

  function weakTopics() {
    var stats = {};
    progress.answers.forEach(function (a) {
      var k = a.course + "|" + a.topic;
      if (!stats[k]) stats[k] = { course: a.course, topic: a.topic, tries: 0, right: 0 };
      stats[k].tries++;
      if (a.correct) stats[k].right++;
    });
    return Object.keys(stats).map(function (k) { return stats[k]; })
      .filter(function (t) { return t.tries >= 2 && t.right / t.tries < 0.7 && courseOf(t.course); })
      .sort(function (a, b) { return a.right / a.tries - b.right / b.tries; });
  }

  // the course you have studied least over the last 7 days
  function neglectedCourse(skip) {
    var since = new Date(); since.setDate(since.getDate() - 7);
    var from = dateKey(since);
    var load = {};
    courses.forEach(function (c) { load[c.id] = 0; });
    progress.sessions.forEach(function (s) { if (s.date >= from && load[s.courseId] !== undefined) load[s.courseId] += s.minutes; });
    progress.answers.forEach(function (a) { if (a.date >= from && load[a.course] !== undefined) load[a.course] += 0.5; });
    var pool = courses.filter(function (c) { return skip.indexOf(c.id) === -1 && c.topics && c.topics.length; });
    pool.sort(function (a, b) { return load[a.id] - load[b.id]; });
    return pool[0] || null;
  }

  function build() {
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var exam = loadExam();
    var daysLeft = exam ? Math.ceil((exam.getTime() - Date.now()) / 86400000) : null;
    var examSoon = daysLeft !== null && daysLeft > 0;
    var budget = dailyTargetMinutes;
    if (examSoon && daysLeft <= 3) budget = 180;
    else if (examSoon && daysLeft <= 14) budget = 150;

    var items = [];
    var used = {};

    var due = window.revisionDue ? window.revisionDue() : 0;
    if (due > 0) {
      items.push({
        icon: "🔁", title: "Revise " + due + " question" + (due === 1 ? "" : "s") + " you got wrong",
        sub: "Revision pile", mins: Math.min(15, Math.max(5, Math.ceil(due * 0.7))),
        go: "REVISE", act: function () { window.revisionStart(); }, done: false
      });
    }

    timetable.filter(function (e) { return e.day === now.getDay() && timeToMinutes(e.end) > nowMin; })
      .sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); })
      .slice(0, 3).forEach(function (e) {
        var mins = Math.max(10, timeToMinutes(e.end) - timeToMinutes(e.start));
        used[e.courseId] = true;
        items.push({
          icon: "📅", title: code(e.courseId) + " · " + e.topic,
          sub: "On your timetable, " + e.start + " to " + e.end, mins: mins,
          go: "START", act: function () { prepareSession(e.courseId, e.topic, mins); },
          done: studiedToday(e.courseId, Math.min(10, mins))
        });
      });

    weakTopics().slice(0, examSoon && daysLeft <= 14 ? 3 : 2).forEach(function (t) {
      var pct = Math.round(t.right / t.tries * 100);
      items.push({
        icon: "🎯", title: "Practise " + t.topic,
        sub: code(t.course) + " · weak spot, " + pct + "% right", mins: 15,
        go: "QUIZ", act: function () { practiseTopic(t.course, t.topic); },
        done: answersToday(t.course, t.topic) >= 5
      });
    });

    var fresh = neglectedCourse(Object.keys(used));
    if (fresh) {
      var day = Math.floor(Date.now() / 86400000);
      var topic = fresh.topics[day % fresh.topics.length];
      items.push({
        icon: "📖", title: code(fresh.id) + " · " + topic,
        sub: "You have not touched this course much this week", mins: 30,
        go: "STUDY", act: function () { prepareSession(fresh.id, topic, 30); },
        done: studiedToday(fresh.id, 10)
      });
    }

    // fit the plan to today's time: always keep the first three, then add while there is room
    var kept = [], total = 0;
    items.forEach(function (it, i) {
      if (i < 3 || total + it.mins <= budget + 10) { kept.push(it); total += it.mins; }
    });
    return { items: kept, total: total, budget: budget, daysLeft: examSoon ? daysLeft : null };
  }

  function render() {
    var p = build();
    list.innerHTML = "";
    var doneCount = p.items.filter(function (i) { return i.done; }).length;
    var studied = minutesToday();
    if (p.items.length === 0) {
      head.textContent = "Nothing urgent today";
      sub.textContent = "Start a study session from the Planner, or take a quiz.";
      return;
    }
    head.textContent = doneCount === p.items.length ? "All done for today" : doneCount + " of " + p.items.length + " done";
    sub.textContent = (p.daysLeft !== null ? "Exams in " + p.daysLeft + " day" + (p.daysLeft === 1 ? "" : "s") + ". " : "") +
      "About " + p.total + " min planned. You have studied " + studied + " min today.";
    p.items.forEach(function (it) {
      var row = document.createElement("div");
      row.className = "pl-item" + (it.done ? " done" : "");
      var ico = document.createElement("div"); ico.className = "pl-ico"; ico.textContent = it.done ? "✅" : it.icon;
      var txt = document.createElement("div"); txt.className = "pl-txt";
      var t = document.createElement("div"); t.className = "pl-title"; t.textContent = it.title;
      var s = document.createElement("div"); s.className = "pl-sub"; s.textContent = it.sub + " · about " + it.mins + " min";
      txt.appendChild(t); txt.appendChild(s);
      row.appendChild(ico); row.appendChild(txt);
      if (!it.done) {
        var b = document.createElement("button");
        b.className = "mini"; b.textContent = it.go;
        b.addEventListener("click", it.act);
        row.appendChild(b);
      }
      list.appendChild(row);
    });
  }

  var baseHome2 = renderHome;
  renderHome = function () { baseHome2.apply(this, arguments); render(); };
  render();
})();

// ===== VOICE: dictate your questions, and have answers read aloud =====
(function voice() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var synth = window.speechSynthesis;
  var composer = sendButton && sendButton.parentNode;
  var AUTO_KEY = "sc-autoread";
  function getAuto() { try { return localStorage.getItem(AUTO_KEY) === "1"; } catch (e) { return false; } }
  function setAuto(on) { try { localStorage.setItem(AUTO_KEY, on ? "1" : "0"); } catch (e) {} }

  var css = document.createElement("style");
  css.textContent = [
    "#mic-btn { flex: none; width: 36px; height: 36px; padding: 0; border-radius: 50%; border: 1px solid var(--line); background: var(--card); color: var(--text); font-size: 17px; line-height: 1; cursor: pointer; }",
    "#mic-btn.on { background: #d9534f; border-color: #d9534f; color: #fff; animation: micpulse 1.2s infinite ease-in-out; }",
    "@keyframes micpulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(217,83,79,.5); } 50% { box-shadow: 0 0 0 8px rgba(217,83,79,0); } }",
    "@media (prefers-reduced-motion: reduce) { #mic-btn.on { animation: none; } }",
    ".speak-row { margin-top: 6px; }",
    ".speak-row button { width: auto; padding: 4px 10px; font-size: 12px; border-radius: 999px; background: none; border: 1px solid var(--line); color: var(--text); cursor: pointer; }",
    ".speak-row button.on { border-color: var(--accent); color: var(--accent); }"
  ].join("\n");
  document.head.appendChild(css);

  // ---------- turning an answer into something that sounds right when spoken ----------
  var GREEK = { alpha: "alpha", beta: "beta", gamma: "gamma", delta: "delta", Delta: "delta", epsilon: "epsilon", theta: "theta", lambda: "lambda", mu: "mu", pi: "pi", rho: "rho", sigma: "sigma", tau: "tau", phi: "phi", omega: "omega", Omega: "ohms", omicron: "omicron" };
  function speakMath(m) {
    var s = m;
    s = s.replace(/\^\{?\s*2\s*\}?/g, " squared ").replace(/\^\{?\s*3\s*\}?/g, " cubed ")
         .replace(/\^\{([^{}]*)\}/g, " to the power $1 ").replace(/\^(\w)/g, " to the power $1 ")
         .replace(/_\{([^{}]*)\}/g, " $1 ").replace(/_(\w)/g, " $1 ");
    for (var i = 0; i < 3; i++) {
      s = s.replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, " $1 over $2 ")
           .replace(/\\sqrt\s*\{([^{}]*)\}/g, " square root of $1 ")
           .replace(/\\(?:text|mathrm|mathbf|operatorname)\s*\{([^{}]*)\}/g, " $1 ");
    }
    s = s.replace(/\\left|\\right/g, "")
         .replace(/\\times|\\cdot/g, " times ").replace(/\\div/g, " divided by ").replace(/\\pm/g, " plus or minus ")
         .replace(/\\approx/g, " is approximately ").replace(/\\leq?|\\le\b/g, " is less than or equal to ")
         .replace(/\\geq?|\\ge\b/g, " is greater than or equal to ").replace(/\\neq/g, " is not equal to ")
         .replace(/\\(?:rightarrow|to)\b/g, " gives ").replace(/\\infty/g, " infinity ")
         .replace(/\\sum/g, " sum of ").replace(/\\int/g, " integral of ").replace(/\\partial/g, " partial ")
         .replace(/\\circ/g, " degrees ").replace(/\\%/g, " percent ")
         .replace(/\\([A-Za-z]+)/g, function (all, name) { return GREEK[name] ? " " + GREEK[name] + " " : " "; })
         .replace(/[{}]/g, " ").replace(/=/g, " equals ").replace(/\+/g, " plus ")
         .replace(/(\s)-(\s?\d|\s?[a-zA-Z])/g, "$1 minus $2").replace(/\s+/g, " ");
    return " " + s.trim() + " ";
  }
  function speakable(reply) {
    var t = String(reply || "");
    t = t.replace(/```[\s\S]*?```/g, " (code skipped) ");
    t = t.replace(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g, function (all, a, b, c) { return speakMath(a || b || c || ""); });
    t = t.replace(/\*\*|__|`/g, "").replace(/^\s*#{1,6}\s*/gm, "").replace(/^\s*[-*•]\s+/gm, "").replace(/^\s*\d+[.)]\s+/gm, "");
    t = t.replace(/https?:\/\/\S+/g, " link ").replace(/[ \t]+/g, " ");
    return t.trim();
  }
  window.woruSpeakable = speakable;

  function chunks(text) {
    var out = [];
    (text.match(/[^.!?\n:;]+[.!?:;]*/g) || [text]).forEach(function (piece) {
      piece = piece.trim();
      while (piece.length > 200) {
        var cut = piece.lastIndexOf(" ", 200);
        if (cut < 60) cut = 200;
        out.push(piece.slice(0, cut).trim());
        piece = piece.slice(cut).trim();
      }
      if (piece) out.push(piece);
    });
    return out;
  }

  // ---------- read aloud ----------
  var speaking = null; // the button that is currently playing
  function pickVoice() {
    var vs = synth.getVoices ? synth.getVoices() : [];
    var order = ["en-NG", "en-GB", "en-US", "en"];
    for (var i = 0; i < order.length; i++) {
      var v = vs.filter(function (x) { return x.lang && x.lang.replace("_", "-").indexOf(order[i]) === 0; })[0];
      if (v) return v;
    }
    return null;
  }
  function stopSpeaking() {
    if (!synth) return;
    synth.cancel();
    if (speaking) { speaking.classList.remove("on"); speaking.textContent = "🔊 LISTEN"; speaking = null; }
  }
  function speak(reply, btn) {
    if (!synth) return;
    var wasThis = speaking === btn;
    stopSpeaking();
    if (wasThis) return;
    var parts = chunks(speakable(reply));
    if (parts.length === 0) return;
    speaking = btn;
    if (btn) { btn.classList.add("on"); btn.textContent = "⏹ STOP"; }
    var voice = pickVoice();
    parts.forEach(function (p, i) {
      var u = new SpeechSynthesisUtterance(p);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = "en-GB"; }
      u.rate = 1;
      if (i === parts.length - 1) u.onend = u.onerror = function () { if (speaking === btn) stopSpeaking(); };
      synth.speak(u);
    });
  }

  if (synth) {
    function addListen(box, reply) {
      var row = document.createElement("div");
      row.className = "speak-row";
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "🔊 LISTEN";
      b.addEventListener("click", function () { try { speak(reply, b); } catch (e) { stopSpeaking(); } });
      row.appendChild(b);
      box.appendChild(row);
      return b;
    }
    // reopened chats call this directly, so old answers get the button too (without speaking)
    window.woruAddListen = addListen;
    if (window.woruRedrawChat) window.woruRedrawChat();
    var baseRender = renderReply;
    renderReply = function (box, reply) {
      baseRender(box, reply);
      var b = addListen(box, reply);
      if (getAuto() && box.isConnected) { try { speak(reply, b); } catch (e) {} }
    };
    window.addEventListener("pagehide", function () { synth.cancel(); });
    if (synth.addEventListener) synth.addEventListener("voiceschanged", function () {});

    // auto-read switch in the bar above the chat
    var bar = document.querySelector(".chat-tools");
    if (bar) {
      var auto = document.createElement("button");
      auto.type = "button";
      function paint() { auto.textContent = "🔊 Auto-read: " + (getAuto() ? "on" : "off"); }
      paint();
      auto.addEventListener("click", function () {
        setAuto(!getAuto());
        paint();
        if (!getAuto()) stopSpeaking();
      });
      bar.appendChild(auto);
    }
  }

  // ---------- dictation ----------
  if (SR && composer) {
    var mic = document.createElement("button");
    mic.id = "mic-btn";
    mic.type = "button";
    mic.setAttribute("aria-label", "Speak your question");
    mic.textContent = "🎤";
    composer.insertBefore(mic, sendButton);

    var rec = null, listening = false, base = "", finalText = "", lang = "en-NG", triedFallback = false;

    function note(t) { try { badgeToast(t); } catch (e) {} }
    function stopListening() {
      listening = false;
      mic.classList.remove("on");
      mic.textContent = "🎤";
      questionInput.placeholder = "Message your tutor";
      try { if (rec) rec.stop(); } catch (e) {}
    }
    function begin() {
      rec = new SR();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = function (ev) {
        var interim = "";
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          var r = ev.results[i];
          if (r.isFinal) finalText += r[0].transcript + " ";
          else interim += r[0].transcript;
        }
        questionInput.value = (base ? base + " " : "") + (finalText + interim).replace(/\s+/g, " ").trim();
        questionInput.dispatchEvent(new Event("input"));
      };
      rec.onerror = function (ev) {
        var e = ev && ev.error;
        if (e === "language-not-supported" && !triedFallback) { triedFallback = true; lang = "en-US"; try { rec.abort(); } catch (x) {} setTimeout(function () { if (listening) begin(); }, 150); return; }
        if (e === "not-allowed" || e === "service-not-allowed") note("Allow the microphone for this site in your browser settings.");
        else if (e === "network") note("Voice typing needs an internet connection.");
        else if (e === "audio-capture") note("No microphone found.");
        if (e !== "no-speech" && e !== "aborted") stopListening();
      };
      rec.onend = function () {
        // some phones stop after a pause: keep listening until the person taps the mic again
        if (listening) { try { rec.start(); } catch (x) { stopListening(); } }
      };
      try { rec.start(); } catch (x) { stopListening(); }
    }
    mic.addEventListener("click", function () {
      if (listening) { stopListening(); return; }
      if (synth) stopSpeaking();
      base = questionInput.value.trim();
      finalText = "";
      listening = true;
      mic.classList.add("on");
      mic.textContent = "⏹";
      questionInput.placeholder = "Listening... speak now";
      begin();
    });
    // sending a message ends dictation
    sendButton.addEventListener("click", function () { if (listening) stopListening(); }, true);
  }
})();