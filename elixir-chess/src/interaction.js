import {
  appState,
} from "./state";

import {
  getTurn,
  tryMove,
  getLegalMoves,
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
} from "./variantRules";

// ---------------- DRAG STATE ----------------

// let draggedPiece = null;
// let draggedFrom = null;

// let floatingPiece = null;

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

  // mouse down
  boardElement.addEventListener(
    "mousedown",
    startDragging
  );

  reserveElement.addEventListener(
    "mousedown",
    startDragging
  );

  // mouse move
  document.addEventListener(
    "mousemove",
    moveDraggingPiece
  );

  // mouse up
  document.addEventListener(
    "mouseup",
    stopDragging
  );
}

// ---------------- START DRAG ----------------

function startDragging(event) {

  const piece =
    event.target.closest(".piece");

  if (!piece) return;

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

  // wrong turn
  if (pieceColor !== getTurn()) {
    return;
  }

  // no legal moves
  const legalMoves =
    getLegalMoves(from);

  appState.selectedSquare = from;

    appState.legalMoves =
    legalMoves.map(
        move => move.to
    );

  if (legalMoves.length === 0) {
    return;
  }

  appState.draggedPiece = pieceCode;
  appState.draggedFrom = from;

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

  if (pieceColor !== getTurn()) {
    return;
  }

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

  if (!appState.floatingPiece) return;

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

function stopDragging(event) {

  if (!appState.draggedPiece) return;

  const element =
    document.elementFromPoint(
      event.clientX,
      event.clientY
    );

  const square =
    element?.closest(".square");

  // dropped nowhere
  if (!square) {
    cleanupDrag();
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

    const legal =
      canPlaceReserve(
        appState.fen,
        appState.draggedPiece,
        target
      );

    if (legal) {
      placeReserve(
        appState.draggedPiece,
        target
      );

      appState.fen = getFen();
    }

    cleanupDrag();
    rerender();
    return;
  }

  // same square cancel
  if (target === appState.draggedFrom) {
    cleanupDrag();
    rerender();
    return;
  }

  const move =
    tryMove(
      appState.draggedFrom,
      target
    );

    if (move) {
        appState.fen = getFen();
    }

  cleanupDrag();

  rerender();
}

// ---------------- HELPERS ----------------

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
}

function rerender() {

  const boardElement =
    document.getElementById("board");

  createBoard(
    boardElement,
    appState.fen,
    appState.draggedFrom,
    appState.selectedSquare,
    appState.legalMoves
  );

  const reserveElement =
    document.getElementById("reserve");

    renderReserve(
    reserveElement,
    appState.reservePieces,
    appState.selectedSource
  );
}

function handleBoardClick(event) {

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

    if (pieceCode[0] !== getTurn()) {
      return;
    }

    appState.selectedSource =
      `reserve:${pieceCode}`;

    appState.selectedSquare =
      null;

    const board =
      getBoard();

    const color =
      pieceCode[0];

    appState.legalMoves =
      getReserveSquares(
        color,
        board
      );

    rerender();

    return;
  }

  // ---------------- BOARD CLICK ----------------

  const square =
    event.target.closest(".square");

  if (!square) return;

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

    // wrong turn
    if (piece.color !== getTurn()) {
      return;
    }

    const legalMoves =
      getLegalMoves(coordinate);

    if (legalMoves.length === 0) {
      return;
    }

    appState.selectedSource =
      coordinate;

    appState.selectedSquare =
      coordinate;

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

    const legal =
      canPlaceReserve(
        appState.fen,
        pieceCode,
        coordinate
      );

    if (legal) {

      placeReserve(
        pieceCode,
        coordinate
      );

      appState.fen =
        getFen();
    }

    appState.selectedSource =
      null;

    appState.selectedSquare =
      null;

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

    const move =
      tryMove(
        appState.selectedSource,
        coordinate
      );

    if (move) {

      appState.fen =
        getFen();
    }
  }

  // clear selection
  appState.selectedSource =
    null;

  appState.selectedSquare =
    null;

  appState.legalMoves = [];

  rerender();
}
