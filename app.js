const buttons = document.querySelectorAll("nav button");
const screens = document.querySelectorAll(".screen");

buttons.forEach(function (button) {
  button.addEventListener("click", function () {
    screens.forEach(function (s) { s.classList.remove("active"); });
    buttons.forEach(function (b) { b.classList.remove("active"); });
    document.getElementById(button.dataset.screen).classList.add("active");
    button.classList.add("active");
  });// Your courses and topics. To change anything, edit the names below and save.
// Pattern for one course:
//   { id: "short-id", name: "CODE · Title", topics: ["Topic 1", "Topic 2"] }
// Put a comma after each course except the last one.
// The topics are a first draft: compare them with your lecturer's course outline and edit.

const courses = [
  {
    id: "get201",
    name: "GET201 · Applied Electricity I",
    topics: [
      "Electric Charge and Electric Field",
      "Current, Voltage and Resistance",
      "Ohm's Law",
      "Resistors in Series and Parallel",
      "Kirchhoff's Laws",
      "Power and Electrical Energy",
      "Network Theorems (Superposition, Thevenin, Norton)",
      "Capacitors and Inductors",
      "Magnetism and Electromagnetic Induction",
      "AC Fundamentals (RMS, Phasors)",
      "Single-Phase AC Circuits (RLC)",
      "Power in AC Circuits"
    ]
  },
  {
    id: "get203",
    name: "GET203 · Engineering Graphics & Solid Modelling II",
    topics: [
      "Orthographic Projection",
      "Isometric and Oblique Drawing",
      "Sectional Views",
      "Auxiliary Views",
      "Dimensioning and Tolerancing",
      "AutoCAD Basics (Commands, Layers, Object Snaps)",
      "2D Drawing and Editing in AutoCAD",
      "3D Solid Modelling (Extrude, Revolve)",
      "Assembly Drawings",
      "Intersection and Development of Surfaces"
    ]
  },
  {
    id: "get205",
    name: "GET205 · Fundamental Fluid Mechanics",
    topics: [
      "Fluid Properties (Density, Viscosity, Surface Tension)",
      "Fluid Statics and Pressure",
      "Manometers",
      "Forces on Submerged Surfaces",
      "Buoyancy and Stability",
      "Fluid Kinematics",
      "Continuity Equation",
      "Bernoulli's Equation",
      "Momentum Equation",
      "Flow in Pipes (Laminar, Turbulent, Losses)",
      "Dimensional Analysis"
    ]
  },
  {
    id: "get207",
    name: "GET207 · Applied Mechanics",
    topics: [
      "Force Systems and Resultants",
      "Equilibrium of Particles",
      "Free Body Diagrams",
      "Equilibrium of Rigid Bodies",
      "Friction",
      "Centroids and Moments of Inertia",
      "Trusses and Frames",
      "Kinematics of Particles",
      "Kinetics (Newton's Laws)",
      "Work, Energy and Power",
      "Impulse and Momentum"
    ]
  },
  {
    id: "get209",
    name: "GET209 · Engineering Mathematics I",
    topics: [
      "Functions and Graphs",
      "Limits and Continuity",
      "Differentiation",
      "Applications of Differentiation",
      "Integration",
      "Applications of Integration",
      "Complex Numbers",
      "Matrices and Determinants",
      "Vectors",
      "Sequences and Series",
      "Permutations and Combinations",
      "First-Order Differential Equations"
    ]
  },
  {
    id: "get211",
    name: "GET211 · Computing & Software Engineering",
    topics: [
      "Introduction to Computing and Computer Systems",
      "Algorithms and Flowcharts",
      "Programming Fundamentals (Variables, Data Types)",
      "Control Structures (Decisions and Loops)",
      "Functions",
      "Lists and Arrays",
      "Debugging and Testing",
      "Software Development Life Cycle",
      "Software Design and Documentation",
      "Version Control Basics"
    ]
  },
  {
    id: "ent211",
    name: "ENT211 · Entrepreneurship and Innovation",
    topics: [
      "Meaning and Types of Entrepreneurship",
      "Opportunity Identification",
      "Business Idea Generation",
      "Market Research",
      "Writing a Business Plan",
      "Financing a Business",
      "Business Registration and Law",
      "Marketing Basics",
      "Creativity and Innovation",
      "Entrepreneurial Ethics"
    ]
  }
];
});
const hour = new Date().getHours();
let greeting = "Good evening";
if (hour < 12) {
  greeting = "Good morning";
} else if (hour < 17) {
  greeting = "Good afternoon";
}
document.getElementById("greeting").textContent = greeting + ", Joseph";
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
  coding: "Programming help: hints first, full code when you ask."
};
const modeNote = document.getElementById("mode-note");
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
  div.textContent = text;
  messagesBox.appendChild(div);
  div.scrollIntoView({ behavior: "smooth", block: "end" });
  return div;
}

function showAIError(message, text) {
  const div = document.createElement("div");
  div.className = "msg ai error";
  const label = document.createElement("span");
  label.textContent = message + " ";
  const retry = document.createElement("button");
  retry.className = "retry";
  retry.textContent = "RETRY";
  retry.addEventListener("click", function () {
    div.remove();
    askAI(text);
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

async function askAI(text) {
  if (aiBusy) return;
  if (!navigator.onLine) {
    showAIError("AI requires an internet connection.", text);
    return;
  }

  aiBusy = true;
  sendButton.disabled = true;
  updateQuick();
    const thinking = addMessage("", "ai");
  thinking.classList.add("thinking");
  thinking.innerHTML = '<span class="dots"><i></i><i></i><i></i></span><span class="think-label">THINKING</span>';
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 30000);

  try {
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ mode: chatMode, messages: chatHistory.concat([{ role: "user", text: text }]) }),
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
    chatHistory.push({ role: "user", text: text });
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
    showAIError(message, text);
  } finally {
    clearTimeout(timer);
    aiBusy = false;
    sendButton.disabled = false;
    updateQuick();
  }
}

function sendQuestion() {
  const text = questionInput.value.trim();
  if (text === "" || aiBusy) return;
  addMessage(text, "user");
  questionInput.value = "";
  simplerLevel = 1;
  askAI(text);
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
  streakEl.textContent = streak + " DAY STREAK" + (streak > 0 ? " 🔥" : "");

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
  homeText("h-streak", streak > 0
    ? "🔥 " + streak + " day streak"
    : "Study for a minute or finish a quiz to start a streak.");
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

function renderExam() {
  const count = document.getElementById("h-exam-count");
  if (!count) return;
  const label = document.getElementById("h-exam-label");
  const dateLine = document.getElementById("h-exam-date");
  const edit = document.getElementById("h-exam-edit");
  const exam = loadExam();
  edit.textContent = exam ? "CHANGE DATE" : "SET DATE";
  if (!exam) {
    label.textContent = "SEMESTER EXAMS";
    count.textContent = "Set your exam date";
    dateLine.textContent = "Then you will see exactly how many days, hours and minutes are left.";
    return;
  }
  const ms = exam.getTime() - Date.now();
  const when = exam.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) +
    " · " + pad(exam.getHours()) + ":" + pad(exam.getMinutes());
  if (ms > 0) {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    label.textContent = "EXAMS START IN";
    count.textContent = days + "d " + pad(hours) + "h " + pad(minutes) + "m";
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