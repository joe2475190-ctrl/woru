const buttons = document.querySelectorAll("nav button");
const screens = document.querySelectorAll(".screen");

buttons.forEach(function (button) {
  button.addEventListener("click", function () {
    screens.forEach(function (s) { s.classList.remove("active"); });
    buttons.forEach(function (b) { b.classList.remove("active"); });
    document.getElementById(button.dataset.screen).classList.add("active");
    button.classList.add("active");
  });

  button.classList.add("active");
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
  const thinking = addMessage("Thinking...", "ai");
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
const courseList = document.getElementById("course-list");
const topicView = document.getElementById("topic-view");
const courseTitle = document.getElementById("course-title");
const topicList = document.getElementById("topic-list");

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

function showTopics(course) {
  courseList.classList.add("hidden");
  topicView.classList.remove("hidden");
  courseTitle.textContent = course.name;
  topicList.innerHTML = "";
  course.topics.forEach(function (topic) {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = topic;
    topicList.appendChild(div);
  });
}

document.getElementById("back").addEventListener("click", function () {
  topicView.classList.add("hidden");
  courseList.classList.remove("hidden");
});

showCourses();
const startCbt = document.getElementById("start-cbt");
const quiz = document.getElementById("quiz");
const quizProgress = document.getElementById("quiz-progress");
const quizQuestion = document.getElementById("quiz-question");
const quizOptions = document.getElementById("quiz-options");
const quizFeedback = document.getElementById("quiz-feedback");
const quizNext = document.getElementById("quiz-next");

let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let answered = false;
const cbtCourse = document.getElementById("cbt-course");

function fillCbtCourses() {
  cbtCourse.innerHTML = "";
  const all = document.createElement("option");
  all.value = "all";
  all.textContent = "All courses (" + questions.length + ")";
  cbtCourse.appendChild(all);
  courses.forEach(function (course) {
    const count = questions.filter(function (q) { return q.course === course.id; }).length;
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name + " (" + count + ")";
    cbtCourse.appendChild(option);
  });
}
fillCbtCourses();

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

function startQuiz() {
  const chosen = cbtCourse.value;
  const pool = chosen === "all" ? questions : questions.filter(function (q) { return q.course === chosen; });
  if (pool.length === 0) {
    alert("No questions for this course yet.");
    return;
  }
  beginQuiz(pool);
}

function beginQuiz(pool) {
  quizQuestions = shuffle(pool);
  quizIndex = 0;
  quizScore = 0;
  courseList.classList.add("hidden");
  topicView.classList.add("hidden");
  startCbt.classList.add("hidden");
  cbtCourse.classList.add("hidden");
  quiz.classList.remove("hidden");
  showQuestion();
}

function showQuestion() {
  const q = quizQuestions[quizIndex];
  answered = false;
  quizProgress.textContent = "QUESTION " + (quizIndex + 1) + " OF " + quizQuestions.length;
  quizQuestion.textContent = q.question;
  quizFeedback.textContent = "";
  quizNext.classList.add("hidden");
  quizOptions.innerHTML = "";
  q.options.forEach(function (option, i) {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = option;
    div.addEventListener("click", function () { chooseOption(i, div); });
    quizOptions.appendChild(div);
  });
}

function chooseOption(i, div) {
  if (answered) return;
  answered = true;
  const q = quizQuestions[quizIndex];
  recordAnswer(q, i === q.answer);
  if (i === q.answer) {
    quizScore++;
    div.classList.add("correct");
    quizFeedback.textContent = "Correct. " + q.explanation;
  } else {
    div.classList.add("wrong");
    quizOptions.children[q.answer].classList.add("correct");
    quizFeedback.textContent = "Not quite. " + q.explanation;
  }
  quizNext.textContent = quizIndex === quizQuestions.length - 1 ? "FINISH" : "NEXT";
  quizNext.classList.remove("hidden");
}

function showResult() {
  recordQuiz(quizScore, quizQuestions.length);
  quizProgress.textContent = "RESULT";
  quizQuestion.textContent = "You scored " + quizScore + " out of " + quizQuestions.length;
  quizOptions.innerHTML = "";
  quizFeedback.textContent = "";
  quizNext.textContent = "BACK TO STUDY";
  quizNext.classList.remove("hidden");
}

function exitQuiz() {
  quiz.classList.add("hidden");
  courseList.classList.remove("hidden");
  cbtCourse.classList.remove("hidden");
  startCbt.classList.remove("hidden");
}

quizNext.addEventListener("click", function () {
  if (quizIndex >= quizQuestions.length) {
    exitQuiz();
    return;
  }
  quizIndex++;
  if (quizIndex < quizQuestions.length) {
    showQuestion();
  } else {
    showResult();
  }
});

startCbt.addEventListener("click", startQuiz);

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
  if (id === "planner" && !sessionLive.classList.contains("hidden")) {
    showPlannerView("session");
  }
}

function openSessionStudy() {
  if (!sessionCourseObj) return;
  showScreen("study");
  exitQuiz();
  showTopics(sessionCourseObj);
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

function recordAnswer(q, correct) {
  progress.answers.push({ date: dateKey(new Date()), course: q.course, topic: q.topic, correct: correct });
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
    exitQuiz();
    showTopics(course);
  });
}

document.querySelectorAll("[data-go]").forEach(function (b) {
  b.addEventListener("click", function () {
    const go = b.dataset.go;
    if (go === "cbt") {
      showScreen("study");
      startQuiz();
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
  const pool = questions.filter(function (q) { return q.course === courseId && q.topic === topic; });
  if (pool.length === 0) {
    alert("No saved questions for this topic yet.");
    return;
  }
  showScreen("study");
  beginQuiz(pool);
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

setInterval(renderHome, 60000);