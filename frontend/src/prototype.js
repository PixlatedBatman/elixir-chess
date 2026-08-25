import "./board/pieceLayer.css";
import "./prototype.css";

import { Chess } from "chess.js";

import {
  PieceLayer,
  preloadPieces,
} from "./board/pieceLayer";

const RESERVE_COSTS = {
  P: 1,
  B: 3,
  N: 3,
  R: 5,
  Q: 9,
};

const SCENARIOS = {
  ruyLopez: {
    label: "Ruy Lopez (both castles)",
    fen: null,
    moves: [
      "e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6",
      "O-O", "Be7", "Re1", "b5", "Bb3", "d6", "c3", "O-O",
      "h3", "Nb8", "d4", "Nbd7",
    ],
  },
  captures: {
    label: "Capture storm",
    fen: null,
    moves: [
      "e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6",
      "Nf3", "Bg4", "Be2", "Bxf3", "Bxf3", "c6",
    ],
  },
  enPassant: {
    label: "En passant",
    fen: "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w - f6 0 3",
    moves: ["exf6"],
  },
  promotion: {
    label: "Promotion",
    fen: "8/4P3/8/8/8/8/8/4K2k w - - 0 1",
    moves: ["e8=Q"],
  },
};

const shell =
  document.getElementById("board-shell");

const layer =
  new PieceLayer(shell, {
    orientation: "w",
    animationMs: 190,
  });

preloadPieces();

const state = {
  game: new Chess(),
  history: [],
  cursor: -1,
  autoplayTimer: null,
  scenario: "ruyLopez",
  drag: null,
  selected: null,
  reserveCode: null,
  elixir: 9,
};

// ---------------- RENDER ----------------

function refreshHighlights({ legal = [], captures = [], selected = null } = {}) {
  const step =
    state.history[state.cursor] || null;

  const checkSquare =
    state.game.inCheck()
      ? findKing(state.game.turn())
      : null;

  layer.setHighlights({
    lastMove: step?.squares || [],
    selected,
    legal,
    captures,
    check: checkSquare,
  });
}

function findKing(color) {
  for (const row of state.game.board()) {
    for (const piece of row) {
      if (piece?.type === "k" && piece.color === color) {
        return piece.square;
      }
    }
  }

  return null;
}

function refreshStatus() {
  document.getElementById("status-turn").textContent =
    state.game.turn() === "w" ? "White" : "Black";

  document.getElementById("status-ply").textContent =
    `${state.cursor + 1} / ${state.history.length}`;

  document.getElementById("status-elixir").textContent =
    String(state.elixir);

  document.getElementById("status-check").textContent =
    state.game.isCheckmate()
      ? "checkmate"
      : state.game.inCheck()
        ? "check"
        : "—";
}

function commit(step, { animate = true } = {}) {
  state.history = state.history.slice(0, state.cursor + 1);
  state.history.push(step);
  state.cursor = state.history.length - 1;

  layer.setPosition(step.fen, {
    move: step.move,
    animate,
  });

  state.selected = null;
  state.reserveCode = null;

  refreshHighlights();
  refreshStatus();
  renderReserve();
}

// ---------------- MOVE PLUMBING ----------------

// Translates a chess.js move into the shape the layer animates: the extra
// rook leg for castling, and the off-target capture square for en passant.
function toLayerMove(result) {
  const move = {
    type: "move",
    from: result.from,
    to: result.to,
  };

  if (result.flags.includes("e")) {
    move.captureSquare =
      `${result.to[0]}${result.from[1]}`;
  }

  if (result.flags.includes("k")) {
    const rank = result.color === "w" ? "1" : "8";
    move.rook = { from: `h${rank}`, to: `f${rank}` };
  }

  if (result.flags.includes("q")) {
    const rank = result.color === "w" ? "1" : "8";
    move.rook = { from: `a${rank}`, to: `d${rank}` };
  }

  if (result.promotion) {
    move.promotion = result.promotion;
  }

  return move;
}

function playMove(notationOrObject) {
  let result = null;

  try {
    result = state.game.move(notationOrObject);
  } catch {
    return false;
  }

  if (!result) {
    return false;
  }

  commit({
    fen: state.game.fen(),
    move: toLayerMove(result),
    squares: [result.from, result.to],
    label: result.san,
  });

  return true;
}

function summonReserve(code, square) {
  const cost =
    RESERVE_COSTS[code[1]];

  if (state.elixir < cost) {
    flashMessage("Not enough Elixir");
    return false;
  }

  const placed =
    state.game.put(
      {
        type: code[1].toLowerCase(),
        color: code[0],
      },
      square
    );

  if (!placed) {
    return false;
  }

  // Same turn-flip trick the real game uses for reserve placement.
  const parts = state.game.fen().split(" ");
  const turn = parts[1];
  parts[1] = turn === "w" ? "b" : "w";
  parts[3] = "-";

  if (turn === "b") {
    parts[5] = String(Number(parts[5]) + 1);
  }

  state.game.load(parts.join(" "));
  state.elixir -= cost;

  commit({
    fen: state.game.fen(),
    move: { type: "reserve", code, to: square },
    squares: [square],
    label: `${code[1]}@${square}`,
  });

  return true;
}

// ---------------- HISTORY SCRUB ----------------

// Single steps animate. Jumps snap — matching what the real app should do
// for Home/End and for clicking a distant move chip.
function goToCursor(index, { animate }) {
  const clamped =
    Math.max(-1, Math.min(index, state.history.length - 1));

  if (clamped === state.cursor) {
    return;
  }

  state.cursor = clamped;

  const step =
    state.history[clamped];

  const fen =
    step?.fen || (SCENARIOS[state.scenario].fen ?? new Chess().fen());

  state.game.load(fen);

  layer.setPosition(fen, { animate });

  refreshHighlights();
  refreshStatus();
}

// ---------------- DRAG + CLICK INPUT ----------------

// One listener on the shell. No per-piece listeners, no floating clone,
// no `elementFromPoint`.
shell.addEventListener("pointerdown", (event) => {
  const square =
    layer.squareFromPoint(event.clientX, event.clientY);

  if (!square) {
    return;
  }

  event.preventDefault();

  if (state.reserveCode) {
    summonReserve(state.reserveCode, square);
    return;
  }

  if (state.selected && state.selected !== square) {
    if (playMove({ from: state.selected, to: square, promotion: "q" })) {
      return;
    }
  }

  const entry =
    layer.getPiece(square);

  if (!entry || entry.code[0] !== state.game.turn()) {
    state.selected = null;
    refreshHighlights();
    return;
  }

  const moves =
    state.game.moves({ square, verbose: true });

  state.selected = square;

  refreshHighlights({
    selected: square,
    legal: moves.filter(m => !m.captured).map(m => m.to),
    captures: moves.filter(m => m.captured).map(m => m.to),
  });

  if (moves.length === 0) {
    return;
  }

  state.drag = {
    entry,
    from: square,
    pointerId: event.pointerId,
    moved: false,
    legal: moves.map(m => m.to),
  };

  layer.beginDrag(entry);
  layer.dragTo(entry, event.clientX, event.clientY);
});

window.addEventListener("pointermove", (event) => {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }

  state.drag.moved = true;
  layer.dragTo(state.drag.entry, event.clientX, event.clientY);
});

window.addEventListener("pointerup", (event) => {
  const drag = state.drag;

  if (!drag || event.pointerId !== drag.pointerId) {
    return;
  }

  state.drag = null;
  layer.endDrag(drag.entry);

  if (!drag.moved) {
    return;
  }

  const target =
    layer.squareFromPoint(event.clientX, event.clientY);

  if (!target || target === drag.from) {
    return;
  }

  playMove({ from: drag.from, to: target, promotion: "q" });
});

// ---------------- RESERVE TRAY ----------------

function renderReserve() {
  const tray =
    document.getElementById("reserve-tray");

  tray.innerHTML = "";

  const color = state.game.turn();

  for (const type of ["Q", "R", "B", "N", "P"]) {
    const code = `${color}${type}`;
    const cost = RESERVE_COSTS[type];

    const item =
      document.createElement("button");

    item.type = "button";
    item.className = "reserve-chip";

    item.classList.toggle("affordable", state.elixir >= cost);
    item.classList.toggle("selected", state.reserveCode === code);

    item.innerHTML = `
      <span class="reserve-art"
          style="background-image:url('https://chessboardjs.com/img/chesspieces/wikipedia/${code}.png')"></span>
      <span class="reserve-cost">${cost}</span>
    `;

    item.addEventListener("click", () => {
      state.reserveCode =
        state.reserveCode === code ? null : code;

      state.selected = null;
      refreshHighlights();
      renderReserve();
    });

    tray.append(item);
  }
}

// ---------------- CONTROLS ----------------

function loadScenario(key) {
  stopAutoplay();

  state.scenario = key;

  const scenario = SCENARIOS[key];

  state.game =
    scenario.fen ? new Chess(scenario.fen) : new Chess();

  state.history = [];
  state.cursor = -1;
  state.selected = null;
  state.reserveCode = null;
  state.elixir = 9;

  layer.setPosition(state.game.fen(), { animate: false });

  refreshHighlights();
  refreshStatus();
  renderReserve();
}

function stepScenarioForward() {
  const scenario =
    SCENARIOS[state.scenario];

  const next =
    scenario.moves[state.cursor + 1];

  if (!next) {
    return false;
  }

  if (state.cursor + 1 < state.history.length) {
    goToCursor(state.cursor + 1, { animate: true });
    return true;
  }

  return playMove(next);
}

function startAutoplay(interval) {
  stopAutoplay();

  state.autoplayTimer =
    window.setInterval(
      () => {
        if (!stepScenarioForward()) {
          stopAutoplay();
        }
      },
      interval
    );
}

function stopAutoplay() {
  window.clearInterval(state.autoplayTimer);
  state.autoplayTimer = null;
}

function flashMessage(text) {
  const element =
    document.getElementById("message");

  element.textContent = text;
  element.classList.add("visible");

  window.setTimeout(
    () => element.classList.remove("visible"),
    1400
  );
}

function randomMove() {
  const moves =
    state.game.moves({ verbose: true });

  if (moves.length === 0) {
    return;
  }

  const pick =
    moves[Math.floor(Math.random() * moves.length)];

  playMove({
    from: pick.from,
    to: pick.to,
    promotion: "q",
  });
}

document.getElementById("scenario-select")
  .addEventListener("change", (event) => loadScenario(event.target.value));

document.getElementById("btn-play")
  .addEventListener("click", () => startAutoplay(900));

document.getElementById("btn-stop")
  .addEventListener("click", stopAutoplay);

document.getElementById("btn-step")
  .addEventListener("click", () => {
    stopAutoplay();
    stepScenarioForward();
  });

document.getElementById("btn-back")
  .addEventListener("click", () => {
    stopAutoplay();
    goToCursor(state.cursor - 1, { animate: true });
  });

document.getElementById("btn-start")
  .addEventListener("click", () => {
    stopAutoplay();
    goToCursor(-1, { animate: false });
  });

document.getElementById("btn-end")
  .addEventListener("click", () => {
    stopAutoplay();
    goToCursor(state.history.length - 1, { animate: false });
  });

document.getElementById("btn-random")
  .addEventListener("click", () => {
    stopAutoplay();
    randomMove();
  });

// Fires four moves back to back with no gap. Proves a retarget mid-flight
// glides from wherever the piece currently is instead of stacking up.
document.getElementById("btn-rapid")
  .addEventListener("click", () => {
    stopAutoplay();

    for (let i = 0; i < 4; i++) {
      window.setTimeout(randomMove, i * 45);
    }
  });

document.getElementById("btn-flip")
  .addEventListener("click", () => {
    layer.setOrientation(layer.orientation === "w" ? "b" : "w");
    refreshHighlights();
  });

document.getElementById("speed-range")
  .addEventListener("input", (event) => {
    const value = Number(event.target.value);

    layer.setAnimationDuration(value);

    document.getElementById("speed-value").textContent = `${value}ms`;
  });

document.getElementById("reduced-motion")
  .addEventListener("change", (event) => {
    shell.classList.toggle("pl-reduced-motion", event.target.checked);
  });

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    stopAutoplay();
    goToCursor(state.cursor - 1, { animate: true });
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    stopAutoplay();
    stepScenarioForward();
  } else if (event.key === "Home") {
    event.preventDefault();
    goToCursor(-1, { animate: false });
  } else if (event.key === "End") {
    event.preventDefault();
    goToCursor(state.history.length - 1, { animate: false });
  }
});

const scenarioSelect =
  document.getElementById("scenario-select");

scenarioSelect.innerHTML =
  Object.entries(SCENARIOS)
    .map(([key, value]) => `<option value="${key}">${value.label}</option>`)
    .join("");

loadScenario("ruyLopez");
