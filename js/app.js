/* Farma Tests — simulador de examen estático
   Asignaturas en data/subjects.json; un banco JSON por asignatura.
   Sin dependencias, sin build. Funciona en GitHub Pages. */

const CONFIG = {
  examSize: 55, // nº de preguntas por examen (el real)
  // Reparto objetivo por dificultad. Se ajusta si no hay suficientes de un nivel.
  mix: { facil: 0.4, medio: 0.35, dificil: 0.25 },
};

// Estado de la sesión de examen en curso
const state = {
  bank: [], // todas las preguntas cargadas
  exam: [], // las 55 (o las que sean) de este examen
  current: 0, // índice de pregunta visible
  answers: [], // respuesta elegida por pregunta (índice de opción o null)
  immediate: true, // feedback inmediato
  showDifficulty: true, // mostrar chip de dificultad
  showTema: true, // mostrar chip de tema
};

/* ---------- utilidades ---------- */

const $ = (sel) => document.querySelector(sel);
const KEYS = ["A", "B", "C", "D", "E", "F"];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function show(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  $(screenId).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- asignaturas (selector + persistencia) ---------- */

const LS_SUBJECT = "farmaTests:subject"; // clave localStorage
let subjects = []; // [{id, nombre, archivo}]
let activeSubject = null; // id de la asignatura activa

// Carga el manifiesto, monta las pestañas y restaura la última elegida.
async function initSubjects() {
  try {
    const res = await fetch("data/subjects.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    subjects = (await res.json()).asignaturas || [];
  } catch (err) {
    $("#bank-info").innerHTML =
      `<strong>No se pudo cargar la lista de asignaturas.</strong> (${err.message})`;
    return;
  }
  if (subjects.length === 0) {
    $("#bank-info").textContent = "No hay asignaturas configuradas.";
    return;
  }

  // Restaura la asignatura guardada si sigue existiendo; si no, la primera.
  const saved = localStorage.getItem(LS_SUBJECT);
  const initial = subjects.some((s) => s.id === saved) ? saved : subjects[0].id;
  renderSubjectTabs();
  await selectSubject(initial);
}

function renderSubjectTabs() {
  const wrap = $("#subject-tabs");
  wrap.innerHTML = "";
  // Una sola asignatura: no hace falta selector.
  if (subjects.length < 2) {
    wrap.classList.add("hidden");
    return;
  }
  wrap.classList.remove("hidden");
  for (const s of subjects) {
    const btn = document.createElement("button");
    btn.className = "subject-tab" + (s.id === activeSubject ? " active" : "");
    btn.textContent = s.nombre;
    btn.dataset.id = s.id;
    btn.setAttribute("role", "tab");
    btn.addEventListener("click", () => selectSubject(s.id));
    wrap.appendChild(btn);
  }
}

async function selectSubject(id) {
  activeSubject = id;
  localStorage.setItem(LS_SUBJECT, id); // persiste entre recargas
  $("#subject-tabs")
    .querySelectorAll(".subject-tab")
    .forEach((b) => b.classList.toggle("active", b.dataset.id === id));
  const subj = subjects.find((s) => s.id === id);
  await loadBank(subj.archivo);
}

/* ---------- carga del banco ---------- */

async function loadBank(archivo) {
  $("#btn-start").disabled = true;
  $("#bank-info").textContent = "Cargando banco de preguntas…";
  try {
    const res = await fetch("data/" + archivo, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    state.bank = (data.preguntas || []).filter(validQuestion);
  } catch (err) {
    state.bank = [];
    $("#bank-info").innerHTML =
      `<strong>No se pudo cargar el banco de preguntas.</strong><br>` +
      `Revisa <code>data/${archivo}</code>. (${err.message})`;
    return;
  }
  renderBankInfo();
}

function validQuestion(q) {
  return (
    q &&
    typeof q.enunciado === "string" &&
    Array.isArray(q.opciones) &&
    q.opciones.length >= 2 &&
    Number.isInteger(q.correcta) &&
    q.correcta >= 0 &&
    q.correcta < q.opciones.length
  );
}

function countByDifficulty() {
  const c = { facil: 0, medio: 0, dificil: 0, otras: 0 };
  for (const q of state.bank) {
    if (c[q.dificultad] !== undefined) c[q.dificultad]++;
    else c.otras++;
  }
  return c;
}

function renderBankInfo() {
  const total = state.bank.length;
  const c = countByDifficulty();
  const startBtn = $("#btn-start");

  if (total === 0) {
    $("#bank-info").innerHTML =
      `El banco de esta asignatura está vacío todavía.`;
    startBtn.disabled = true;
    return;
  }

  const enough = total >= CONFIG.examSize;
  $("#bank-info").innerHTML =
    `<strong>${total}</strong> preguntas en el banco · ` +
    `🟢 ${c.facil} fáciles · 🟡 ${c.medio} medias · 🔴 ${c.dificil} difíciles` +
    (c.otras ? ` · ${c.otras} sin nivel` : "") +
    (enough
      ? ""
      : `<br><span class="muted">Hay menos de ${CONFIG.examSize}; el examen usará las ${total} disponibles.</span>`);
  startBtn.disabled = false;
}

/* ---------- generación del examen ---------- */

function buildExam() {
  const size = Math.min(CONFIG.examSize, state.bank.length);

  // Agrupar por dificultad
  const buckets = { facil: [], medio: [], dificil: [], otras: [] };
  for (const q of state.bank) {
    (buckets[q.dificultad] !== undefined ? buckets[q.dificultad] : buckets.otras).push(q);
  }
  for (const k in buckets) buckets[k] = shuffle(buckets[k]);

  // Cupos objetivo por nivel
  const quota = {
    facil: Math.round(size * CONFIG.mix.facil),
    medio: Math.round(size * CONFIG.mix.medio),
    dificil: Math.round(size * CONFIG.mix.dificil),
  };

  const picked = [];
  const takeFrom = (level, n) => {
    for (let i = 0; i < n && buckets[level].length; i++) picked.push(buckets[level].pop());
  };
  takeFrom("facil", quota.facil);
  takeFrom("medio", quota.medio);
  takeFrom("dificil", quota.dificil);

  // Rellenar hasta `size` con lo que quede (incluye "otras")
  const rest = shuffle([...buckets.facil, ...buckets.medio, ...buckets.dificil, ...buckets.otras]);
  while (picked.length < size && rest.length) picked.push(rest.pop());

  state.exam = shuffle(picked).map((q) => prepareQuestion(q));
  state.answers = new Array(state.exam.length).fill(null);
  state.current = 0;
}

// Prepara una pregunta para el examen: opcionalmente baraja opciones
// recalculando el índice correcto, sin mutar el banco original.
function prepareQuestion(q) {
  const shuffleOpts = $("#opt-shuffle").checked;
  let opciones = q.opciones.map((texto, idx) => ({ texto, esCorrecta: idx === q.correcta }));
  if (shuffleOpts) opciones = shuffle(opciones);
  const correcta = opciones.findIndex((o) => o.esCorrecta);
  return {
    id: q.id,
    tema: q.tema || "",
    dificultad: q.dificultad || "otras",
    enunciado: q.enunciado,
    opciones,
    correcta,
    explicacion: q.explicacion || "",
  };
}

/* ---------- render de pregunta ---------- */

function renderQuestion() {
  const i = state.current;
  const q = state.exam[i];
  const answered = state.answers[i];
  const showFeedback = state.immediate && answered !== null;

  const diffClass =
    state.showDifficulty && ["facil", "medio", "dificil"].includes(q.dificultad)
      ? q.dificultad
      : "";
  const showTema = state.showTema && q.tema;

  const answersHtml = q.opciones
    .map((opt, idx) => {
      let cls = "answer";
      if (answered === idx) cls += " selected";
      if (showFeedback) {
        cls += " locked";
        if (idx === q.correcta) cls += " correct";
        else if (idx === answered) cls += " wrong";
      }
      return `<div class="${cls}" data-idx="${idx}">
        <span class="key">${KEYS[idx]}</span>
        <span class="atext">${escapeHtml(opt.texto)}</span>
      </div>`;
    })
    .join("");

  let explanationHtml = "";
  if (showFeedback) {
    const correct = answered === q.correcta;
    explanationHtml = `<div class="explanation ${correct ? "good" : "bad"}">
      <div class="verdict">${correct ? "✅ Correcto" : "❌ Incorrecto"}</div>
      ${
        correct
          ? ""
          : `<div class="ri-line">Respuesta correcta: <strong>${KEYS[q.correcta]}.</strong> ${escapeHtml(q.opciones[q.correcta].texto)}</div>`
      }
      ${q.explicacion ? `<div>${escapeHtml(q.explicacion)}</div>` : ""}
    </div>`;
  }

  $("#question-card").innerHTML = `
    <div class="q-meta">
      <span class="chip">Pregunta ${i + 1}/${state.exam.length}</span>
      ${diffClass ? `<span class="chip ${diffClass}">${q.dificultad}</span>` : ""}
      ${showTema ? `<span class="chip">${escapeHtml(q.tema)}</span>` : ""}
    </div>
    <div class="q-text">${escapeHtml(q.enunciado)}</div>
    <div class="answers">${answersHtml}</div>
    ${explanationHtml}
  `;

  // Listeners de respuesta
  $("#question-card")
    .querySelectorAll(".answer")
    .forEach((el) => {
      if (showFeedback) return; // bloqueado tras responder en modo inmediato
      el.addEventListener("click", () => selectAnswer(parseInt(el.dataset.idx, 10)));
    });

  updateProgress();
}

function selectAnswer(idx) {
  state.answers[state.current] = idx;
  if (state.immediate) renderQuestion(); // muestra feedback y bloquea
  else updateNav();
}

function updateProgress() {
  const i = state.current;
  const total = state.exam.length;
  $("#progress-fill").style.width = `${((i + 1) / total) * 100}%`;
  $("#progress-text").textContent = `Pregunta ${i + 1} de ${total}`;

  if (state.immediate) {
    const answered = state.answers.filter((a) => a !== null).length;
    const right = state.exam.reduce(
      (acc, q, k) => acc + (state.answers[k] === q.correcta ? 1 : 0),
      0
    );
    $("#score-live").textContent = `Aciertos: ${right}/${answered}`;
  } else {
    const answered = state.answers.filter((a) => a !== null).length;
    $("#score-live").textContent = `Respondidas: ${answered}/${total}`;
  }
  updateNav();
}

function updateNav() {
  const i = state.current;
  const last = i === state.exam.length - 1;
  $("#btn-prev").disabled = i === 0;
  $("#btn-next").classList.toggle("hidden", last);
  $("#btn-finish").classList.toggle("hidden", !last);
}

/* ---------- resultados ---------- */

function finishExam() {
  const total = state.exam.length;
  const right = state.exam.reduce(
    (acc, q, k) => acc + (state.answers[k] === q.correcta ? 1 : 0),
    0
  );
  const blank = state.answers.filter((a) => a === null).length;
  const wrong = total - right - blank;
  const pct = Math.round((right / total) * 100);

  // Nota sobre 10 con penalización: cada 3 fallos restan 1 acierto.
  // Los no contestados (en blanco) no penalizan.
  const neto = Math.max(0, right - wrong / 3);
  const nota = (neto / total) * 10;
  const notaFmt = nota.toFixed(2).replace(".", ",");
  const notaClass = nota >= 5 ? "good" : "bad";

  $("#result-summary").innerHTML = `
    <div class="big-score ${notaClass}">${notaFmt}<span class="nota-max"> / 10</span></div>
    <div>${pct}% de aciertos · ${right} de ${total} correctas</div>
    <div class="score-bd">
      <span>✅ ${right} aciertos</span>
      <span>❌ ${wrong} fallos</span>
      <span>⬜ ${blank} en blanco</span>
    </div>
    <div class="nota-detalle muted">
      Nota = (${right} − ${wrong}/3) / ${total} × 10 · cada 3 fallos restan 1 acierto
    </div>
  `;
  $("#review-list").classList.add("hidden");
  $("#review-list").innerHTML = "";
  show("#screen-result");
}

function renderReview() {
  const html = state.exam
    .map((q, k) => {
      const ans = state.answers[k];
      const correct = ans === q.correcta;
      const cls = ans === null ? "" : correct ? "ok" : "bad";
      const yourLine =
        ans === null
          ? `<div class="ri-line muted">Sin responder</div>`
          : correct
          ? `<div class="ri-line ri-correct">✅ ${KEYS[ans]}. ${escapeHtml(q.opciones[ans].texto)}</div>`
          : `<div class="ri-line ri-yours">❌ Tu respuesta: ${KEYS[ans]}. ${escapeHtml(q.opciones[ans].texto)}</div>`;
      const correctLine =
        correct
          ? ""
          : `<div class="ri-line ri-correct">Correcta: ${KEYS[q.correcta]}. ${escapeHtml(q.opciones[q.correcta].texto)}</div>`;
      return `<div class="review-item ${cls}">
        <div class="ri-q">${k + 1}. ${escapeHtml(q.enunciado)}</div>
        ${yourLine}
        ${correctLine}
        ${q.explicacion ? `<div class="ri-line muted">${escapeHtml(q.explicacion)}</div>` : ""}
      </div>`;
    })
    .join("");
  $("#review-list").innerHTML = html;
  $("#review-list").classList.remove("hidden");
}

/* ---------- helpers ---------- */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- arranque y eventos ---------- */

function startExam() {
  state.immediate = $("#opt-immediate").checked;
  state.showDifficulty = $("#opt-show-difficulty").checked;
  state.showTema = $("#opt-show-tema").checked;
  buildExam();
  if (state.exam.length === 0) return;
  show("#screen-exam");
  renderQuestion();
}

document.addEventListener("DOMContentLoaded", () => {
  $("#exam-size-label").textContent = CONFIG.examSize;
  initSubjects();

  $("#btn-start").addEventListener("click", startExam);
  $("#btn-restart").addEventListener("click", () => show("#screen-start"));
  $("#btn-quit").addEventListener("click", () => {
    if (confirm("¿Salir del examen? Perderás el progreso actual.")) {
      show("#screen-start");
    }
  });
  $("#btn-review").addEventListener("click", renderReview);

  $("#btn-prev").addEventListener("click", () => {
    if (state.current > 0) {
      state.current--;
      renderQuestion();
    }
  });
  $("#btn-next").addEventListener("click", () => {
    if (state.current < state.exam.length - 1) {
      state.current++;
      renderQuestion();
    }
  });
  $("#btn-finish").addEventListener("click", finishExam);
});
