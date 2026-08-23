import {
  appState,
} from "./state";

import {
  setFen,
  getTurn,
  tryMove,
  getLegalMoves,
  getHypotheticalMoves,
  getFen,
  getBoard,
  placeReserve,
} from "./game";

import {
  createBoard,
  renderReserve,
} from "./render";

import {
  canPlaceReserve,
  getReserveSquares,
} from "../../shared/variantRules.js";

import {
  submitMove,
  submitReserve,
  getMoveSoundKey,
} from "./api";

import {
  playMoveSound,
} from "./sound";

const PIECE_VALUES = {
  p: 1,
  b: 3,
  n: 3,
  r: 5,
  q: 9,
};

const RESERVE_COSTS = {
  P: 1,
  B: 3,
  N: 3,
  R: 5,
  Q: 9,
};

let onRerenderCallback = null;

export function setOnRerenderCallback(
  callback
) {
  onRerenderCallback = callback;
}

// ---------------- DRAG STATE ----------------

// let draggedPiece = null;
// let draggedFrom = null;

// let floatingPiece = null;

let activePointerId = null;

// ---------------- INIT ----------------

export function initializeInteractions(
  boardElement,
  reserveElement
) {

    boardElement.addEventListener(
    "click",
    handleBoardClick
    );

  reserveElement.addEventListener(
    "click",
    handleBoardClick
    );

  boardElement.addEventListener(
    "contextmenu",
    handleContextMenu
  );

  reserveElement.addEventListener(
    "contextmenu",
    handleContextMenu
  );

  boardElement.addEventListener(
    "pointerdown",
    startDragging
  );

  reserveElement.addEventListener(
    "pointerdown",
    startDragging
  );

  document.addEventListener(
    "pointermove",
    moveDraggingPiece
  );

  document.addEventListener(
    "pointerup",
    stopDragging
  );

  document.addEventListener(
    "pointercancel",
    cancelDragging
  );
}

function handleContextMenu(event) {
  event.preventDefault();

  if (appState.premove) {
    appState.premove = null;
    rerender();
  }
}

// ---------------- START DRAG ----------------

function startDragging(event) {

  if (
    activePointerId !== null &&
    activePointerId !== event.pointerId
  ) {
    return;
  }

  const piece =
    event.target.closest(".piece");

  if (!piece) return;

  if (appState.gameOver) {
    return;
  }

  event.preventDefault();

  const reservePieceCode =
    piece.dataset.reserve;

  if (reservePieceCode) {
    startReserveDragging(
      piece,
      reservePieceCode,
      event
    );

    return;
  }

  const pieceCode =
    piece.dataset.piece;

  const from =
    piece.dataset.from;

  const pieceColor =
    pieceCode[0];

  if (!canControlPiece(pieceColor)) {
    return;
  }

  const legalMoves = isMyTurn()
    ? getLegalMoves(from)
    : getHypotheticalMoves(from, pieceColor);

  appState.selectedSquare = from;

  appState.legalMoves =
    legalMoves.map(
      move => move.to
    );

  if (legalMoves.length === 0) {
    return;
  }

  activePointerId =
    event.pointerId;

  appState.draggedPiece = pieceCode;
  appState.draggedFrom = from;
  appState.selectedSource = from;

  // floating piece
  appState.floatingPiece =
    document.createElement("img");

  appState.floatingPiece.src = piece.src;

  appState.floatingPiece.classList.add(
    "floating-piece"
  );

  document.body.appendChild(
    appState.floatingPiece
  );

  moveFloatingPiece(
    event.clientX,
    event.clientY
  );

  rerender();
}

function startReserveDragging(
  piece,
  pieceCode,
  event
) {

  const pieceColor =
    pieceCode[0];

  if (!canControlPiece(pieceColor)) {
    return;
  }

  if (isMyTurn() && !canAffordReserve(pieceCode)) {
    appState.statusMessage =
      "Not enough Elixir";
    rerender();
    return;
  }

  activePointerId =
    event.pointerId;

  appState.draggedPiece =
    pieceCode;

  appState.draggedFrom =
    `reserve:${pieceCode}`;

  appState.selectedSource =
    `reserve:${pieceCode}`;

  appState.selectedSquare =
    null;

  appState.legalMoves =
    getReserveSquares(
      pieceColor,
      getBoard()
    );

  appState.floatingPiece =
    document.createElement("img");

  appState.floatingPiece.src =
    piece.src;

  appState.floatingPiece.classList.add(
    "floating-piece"
  );

  document.body.appendChild(
    appState.floatingPiece
  );

  moveFloatingPiece(
    event.clientX,
    event.clientY
  );

  rerender();
}

// ---------------- MOVE ----------------

function moveDraggingPiece(event) {

  if (
    activePointerId !== null &&
    event.pointerId !== activePointerId
  ) {
    return;
  }

  if (!appState.floatingPiece) return;

  event.preventDefault();

  moveFloatingPiece(
    event.clientX,
    event.clientY
  );
}

function moveFloatingPiece(x, y) {

  appState.floatingPiece.style.left =
    `${x - 40}px`;

  appState.floatingPiece.style.top =
    `${y - 40}px`;
}

// ---------------- STOP DRAG ----------------

async function stopDragging(event) {

  if (
    activePointerId !== null &&
    event.pointerId !== activePointerId
  ) {
    return;
  }

  if (!appState.draggedPiece) {
    activePointerId = null;
    return;
  }

  event.preventDefault();

  const element =
    document.elementFromPoint(
      event.clientX,
      event.clientY
    );

  const square =
    element?.closest(".square");

  // dropped nowhere
  if (!square) {
    if (
      appState.draggedFrom?.startsWith(
        "reserve:"
      )
    ) {
      finishTapSelection();
    } else {
      cleanupDrag();
    }

    rerender();
    return;
  }

  const target =
    square.dataset.square;

  if (
    appState.draggedFrom?.startsWith(
      "reserve:"
    )
  ) {
    if (isMyTurn()) {
      const legal =
        canPlaceReserve(
          appState.fen,
          appState.draggedPiece,
          target
        );

      if (legal) {
        await commitReserve(
          appState.draggedPiece,
          target
        );
      }
    } else {
      appState.premove = {
        type: "reserve",
        pieceCode:
          appState.draggedPiece,
        target,
      };
    }

    cleanupDrag();
    rerender();
    return;
  }

  // same square cancel
  if (target === appState.draggedFrom) {
    finishTapSelection();
    rerender();
    return;
  }

  if (isMyTurn()) {
    await commitMove(
      appState.draggedFrom,
      target
    );
  } else {
    appState.premove = {
      type: "move",
      from: appState.draggedFrom,
      to: target,
    };
  }

  cleanupDrag();

  rerender();
}

// ---------------- HELPERS ----------------

function cancelDragging(event) {
  if (
    activePointerId !== null &&
    event.pointerId !== activePointerId
  ) {
    return;
  }

  cleanupDrag();
  rerender();
}

function finishTapSelection() {
  if (appState.floatingPiece) {
    appState.floatingPiece.remove();
  }

  appState.floatingPiece = null;
  appState.draggedPiece = null;
  appState.draggedFrom = null;
  activePointerId = null;
}

function cleanupDrag() {

  if (appState.floatingPiece) {
    appState.floatingPiece.remove();
  }

  appState.floatingPiece = null;

  appState.draggedPiece = null;
  appState.draggedFrom = null;

  appState.selectedSource = null;

  appState.selectedSquare = null;

  appState.legalMoves = [];

  activePointerId = null;
}

function canAffordReserve(pieceCode) {
  if (!appState.online) {
    return true;
  }

  const color =
    pieceCode[0];

  const cost =
    RESERVE_COSTS[pieceCode[1]] ||
    Number.POSITIVE_INFINITY;

  return appState.elixir?.[color] >= cost;
}

function canControlPiece(color) {
  if (!appState.online) {
    return color === getTurn();
  }

  return appState.playerColor === color;
}

function isMyTurn() {
  if (!appState.online) {
    return true;
  }

  return appState.playerColor === getTurn();
}

async function commitMove(from, to) {
  const move =
    tryMove(
      from,
      to
    );

  if (!move) {
    return false;
  }

  const role =
    appState.playerColor ||
    getTurn();

  const isCapture =
    Boolean(move.captured);

  const rollbackSnapshot = {
    fen: appState.fen,
    lastMove: appState.lastMove,
    elixir: appState.elixir
      ? { ...appState.elixir }
      : null,
    score: appState.score
      ? { ...appState.score }
      : null,
    moveHistory: appState.moveHistory
      ? [...appState.moveHistory]
      : [],
    clockTurn: appState.clockTurn,
  };

  const turnNumber =
    Number(appState.fen.split(" ")[5]) || 1;

  appState.fen = getFen();
  appState.lastMove = {
    type: "move",
    squares: [
      from,
      to,
    ],
  };

  appState.moveHistory = [
    ...(appState.moveHistory || []),
    {
      color: role,
      turnNumber,
      notation: move.san,
      type: "move",
      from: move.from,
      to: move.to,
    },
  ];

  if (appState.elixir && role) {
    appState.elixir = {
      ...appState.elixir,
      [role]:
        (appState.elixir[role] ?? 3) + 1,
    };
  }

  if (appState.score && role && move.captured) {
    appState.score = {
      ...appState.score,
      [role]:
        (appState.score[role] ?? 0) +
        (PIECE_VALUES[move.captured.toLowerCase()] || 0),
    };
  }

  appState.clockTurn = getTurn();

  playMoveSound(isCapture);

  appState.lastSoundKey =
    getMoveSoundKey(
      appState.lastMove,
      appState.score
    );

  rerender();

  if (!appState.online) {
    return true;
  }

  try {
    const success =
      await submitMove(
        from,
        to
      );

    if (!success) {
      rollbackState(rollbackSnapshot);
      return false;
    }

    return true;
  } catch {
    rollbackState(rollbackSnapshot);
    return false;
  }
}

async function commitReserve(
  pieceCode,
  target
) {
  const role =
    pieceCode[0];

  const cost =
    RESERVE_COSTS[pieceCode[1]] ||
    Number.POSITIVE_INFINITY;

  if (
    appState.elixir &&
    (appState.elixir[role] ?? 0) < cost
  ) {
    appState.statusMessage =
      "Not enough Elixir";
    rerender();
    return false;
  }

  const legal =
    canPlaceReserve(
      appState.fen,
      pieceCode,
      target
    );

  if (!legal) {
    return false;
  }

  const rollbackSnapshot = {
    fen: appState.fen,
    lastMove: appState.lastMove,
    elixir: appState.elixir
      ? { ...appState.elixir }
      : null,
    score: appState.score
      ? { ...appState.score }
      : null,
    moveHistory: appState.moveHistory
      ? [...appState.moveHistory]
      : [],
    clockTurn: appState.clockTurn,
  };

  const turnNumber =
    Number(appState.fen.split(" ")[5]) || 1;

  const placed =
    placeReserve(
      pieceCode,
      target
    );

  if (!placed) {
    return false;
  }

  appState.fen = getFen();
  appState.lastMove = {
    type: "reserve",
    squares: [
      target,
    ],
  };

  appState.moveHistory = [
    ...(appState.moveHistory || []),
    {
      color: role,
      turnNumber,
      notation: `${pieceCode?.[1] || "P"}@${target}`,
      type: "reserve",
      to: target,
    },
  ];

  if (appState.elixir) {
    appState.elixir = {
      ...appState.elixir,
      [role]:
        (appState.elixir[role] ?? 3) - cost,
    };
  }

  appState.clockTurn = getTurn();

  playMoveSound(false);

  appState.lastSoundKey =
    getMoveSoundKey(
      appState.lastMove,
      appState.score
    );

  rerender();

  if (!appState.online) {
    return true;
  }

  try {
    const success =
      await submitReserve(
        pieceCode,
        target
      );

    if (!success) {
      rollbackState(rollbackSnapshot);
      return false;
    }

    return true;
  } catch {
    rollbackState(rollbackSnapshot);
    return false;
  }
}

function rollbackState(snapshot) {
  if (!snapshot) {
    return;
  }

  appState.fen = snapshot.fen;
  setFen(snapshot.fen);
  appState.lastMove = snapshot.lastMove;
  appState.elixir = snapshot.elixir;
  appState.score = snapshot.score;
  appState.moveHistory = snapshot.moveHistory;
  appState.clockTurn = snapshot.clockTurn;
  appState.statusMessage =
    "Move rejected by server";

  rerender();
}

function rerender() {
  const boardElement =
    document.getElementById("board");

  if (boardElement) {
    createBoard(
      boardElement,
      appState.fen,
      appState.draggedFrom,
      appState.selectedSquare,
      appState.legalMoves,
      appState.boardOrientation,
      appState.lastMove,
      appState.premove
    );
  }

  const reserveElement =
    document.getElementById("reserve");

  if (reserveElement) {
    renderReserve(
      reserveElement,
      appState.reservePieces,
      appState.selectedSource,
      appState.elixir,
      appState.playerColor
    );
  }

  const statusElement =
    document.getElementById("status");

  if (statusElement) {
    statusElement.textContent =
      appState.statusMessage;
  }

  onRerenderCallback?.();
}

export async function executePremove() {
  if (!appState.premove || appState.gameOver) {
    return;
  }

  const premove = appState.premove;
  appState.premove = null;

  if (premove.type === "move") {
    const legalMoves = getLegalMoves(premove.from);
    const isLegal = legalMoves.some(
      move => move.to === premove.to
    );

    if (isLegal) {
      await commitMove(
        premove.from,
        premove.to
      );
    } else {
      rerender();
    }
  } else if (premove.type === "reserve") {
    const cost =
      RESERVE_COSTS[premove.pieceCode[1]] ||
      Number.POSITIVE_INFINITY;

    const hasElixir =
      (appState.elixir?.[appState.playerColor] ?? 0) >= cost;

    const isLegal =
      canPlaceReserve(
        appState.fen,
        premove.pieceCode,
        premove.target
      );

    if (hasElixir && isLegal) {
      await commitReserve(
        premove.pieceCode,
        premove.target
      );
    } else {
      rerender();
    }
  }
}

async function handleBoardClick(event) {
  if (appState.gameOver) {
    return;
  }

  // ignore clicks during drag
  if (appState.draggedPiece) {
    return;
  }

  // ---------------- RESERVE CLICK ----------------

  const reservePiece =
    event.target.closest(
      "[data-reserve]"
    );

  if (reservePiece) {
    const pieceCode =
      reservePiece.dataset.reserve;

    if (!canControlPiece(pieceCode[0])) {
      return;
    }

    if (isMyTurn() && !canAffordReserve(pieceCode)) {
      appState.statusMessage =
        "Not enough Elixir";
      rerender();
      return;
    }

    appState.selectedSource =
      `reserve:${pieceCode}`;

    appState.selectedSquare =
      null;

    appState.legalMoves =
      getReserveSquares(
        pieceCode[0],
        getBoard()
      );

    rerender();
    return;
  }

  // ---------------- BOARD CLICK ----------------

  const square =
    event.target.closest(".square");

  if (!square) {
    if (appState.premove) {
      appState.premove = null;
      rerender();
    }
    return;
  }

  const coordinate =
    square.dataset.square;

  const board =
    getBoard();

  // coordinate -> board indices
  const file =
    coordinate.charCodeAt(0) - 97;

  const rank =
    8 - parseInt(coordinate[1]);

  const piece =
    board[rank][file];

  // ---------------- CLICK BOARD PIECE ----------------

  if (piece) {
    const pieceCode =
      piece.color +
      piece.type.toUpperCase();

    if (
      appState.selectedSource &&
      appState.legalMoves.includes(
        coordinate
      ) &&
      appState.selectedSource !== coordinate
    ) {
      if (isMyTurn()) {
        await commitMove(
          appState.selectedSource,
          coordinate
        );
      } else {
        appState.premove = {
          type: "move",
          from: appState.selectedSource,
          to: coordinate,
        };
      }

      appState.selectedSource = null;
      appState.selectedSquare = null;
      appState.legalMoves = [];
      rerender();
      return;
    }

    if (!canControlPiece(piece.color)) {
      if (appState.premove) {
        appState.premove = null;
        rerender();
      }
      return;
    }

    const legalMoves = isMyTurn()
      ? getLegalMoves(coordinate)
      : getHypotheticalMoves(coordinate, piece.color);

    if (legalMoves.length === 0) {
      return;
    }

    appState.selectedSource = coordinate;
    appState.selectedSquare = coordinate;
    appState.legalMoves =
      legalMoves.map(
        move => move.to
      );

    rerender();
    return;
  }

  // ---------------- CLICK TARGET ----------------

  // reserve placement
  if (
    appState.selectedSource?.startsWith(
      "reserve:"
    )
  ) {
    const pieceCode =
      appState.selectedSource
        .split(":")[1];

    if (isMyTurn()) {
      const legal =
        canPlaceReserve(
          appState.fen,
          pieceCode,
          coordinate
        );

      if (legal) {
        await commitReserve(
          pieceCode,
          coordinate
        );
      }
    } else {
      appState.premove = {
        type: "reserve",
        pieceCode,
        target: coordinate,
      };
    }

    appState.selectedSource = null;
    appState.selectedSquare = null;
    appState.legalMoves = [];
    rerender();
    return;
  }

  // normal board move
  if (
    appState.selectedSource &&
    appState.legalMoves.includes(
      coordinate
    )
  ) {
    if (isMyTurn()) {
      await commitMove(
        appState.selectedSource,
        coordinate
      );
    } else {
      appState.premove = {
        type: "move",
        from: appState.selectedSource,
        to: coordinate,
      };
    }
  } else if (appState.premove) {
    appState.premove = null;
  }

  // clear selection
  appState.selectedSource = null;
  appState.selectedSquare = null;
  appState.legalMoves = [];
  rerender();
}
