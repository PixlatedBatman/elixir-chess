import { Chess } from "chess.js";
import "./style.css";

const game = new Chess();

const PIECE_THEME =
  "https://chessboardjs.com/img/chesspieces/wikipedia/";

const app = document.querySelector("#app");

// ---------------- STATE ----------------

const reservePieces = [
  "wQ",
  "wR",
  "wB",
  "wN",
];

let draggedPiece = null;
let draggedFrom = null;
let floatingPiece = null;
let heldReservePiece = null;
let floatingReservePiece = null;

// ---------------- UI ----------------

app.innerHTML = `
  <div class="page">

    <div id="board" class="board"></div>

    <div id="reserve" class="reserve"></div>

  </div>
`;

const boardElement = document.getElementById("board");
const reserveElement = document.getElementById("reserve");

// ---------------- RENDER BOARD ----------------

function renderBoard() {
  boardElement.innerHTML = "";

  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      const square = document.createElement("div");

      square.classList.add("square");

      if ((row + col) % 2 === 0) {
        square.classList.add("light");
      } else {
        square.classList.add("dark");
      }

      const file = "abcdefgh"[col];
      const rank = 8 - row;

      const coordinate = `${file}${rank}`;

      square.dataset.square = coordinate;

      square.addEventListener("click", () => {
        tryPlaceReserveOnSquare(coordinate);
      });

      const piece = board[row][col];

      if (piece) {
        const code =
          piece.color + piece.type.toUpperCase();

        const img = createPieceImage(code);

        img.dataset.from = coordinate;

        square.appendChild(img);
      }

      boardElement.appendChild(square);
    }
  }
}

// ---------------- RENDER RESERVE ----------------

function renderReserve() {
  reserveElement.innerHTML = "";

  reservePieces.forEach((pieceCode) => {

    const img = createPieceImage(pieceCode);

    img.dataset.reserve = "true";

    // reserve pieces use click placement
    img.addEventListener("click", (event) => {

        // already holding one
        if (heldReservePiece) return;

        heldReservePiece = pieceCode;

        floatingReservePiece = document.createElement("img");

        floatingReservePiece.src = img.src;

        floatingReservePiece.classList.add("floating-piece");

        document.body.appendChild(floatingReservePiece);

        moveFloatingPiece(event.clientX, event.clientY);
        });

    reserveElement.appendChild(img);
  });
}

// ---------------- CREATE PIECE ----------------

function createPieceImage(code) {
  const img = document.createElement("img");

  img.src = `${PIECE_THEME}${code}.png`;

  img.classList.add("piece");

  img.draggable = false;

  img.dataset.piece = code;

  img.addEventListener("mousedown", startDragging);

  return img;
}

// ---------------- DRAG START ----------------

function startDragging(event) {
  if (event.target.dataset.reserve === "true") {
      return;
    }

  const pieceCode = event.target.dataset.piece;

  const from =
    event.target.dataset.from !== undefined
      ? event.target.dataset.from
      : null;

  // ---------------- TURN CHECK ----------------

  // only applies to board pieces
  if (from !== "reserve") {

  const pieceColor = pieceCode[0];

  // prevent dragging opponent pieces
  if (pieceColor !== game.turn()) {
    return;
  }

  // prevent dragging pieces with no legal moves
  const legalMoves = game.moves({
    square: from,
    verbose: true,
  });

  if (legalMoves.length === 0) {
    return;
  }
}

  draggedPiece = pieceCode;

  draggedFrom = from;

  floatingPiece = document.createElement("img");

  floatingPiece.src = event.target.src;

  floatingPiece.classList.add("floating-piece");
  event.target.style.opacity = "0";

  document.body.appendChild(floatingPiece);

  moveFloatingPiece(event.clientX, event.clientY);
}

// ---------------- MOVE FLOATING PIECE ----------------

document.addEventListener("mousemove", (event) => {
    if (floatingPiece) {
    moveFloatingPiece(event.clientX, event.clientY);
    }

    if (floatingReservePiece) {
    moveFloatingPiece(
        event.clientX,
        event.clientY,
        floatingReservePiece
    );
    }
});

function moveFloatingPiece(x, y, piece = floatingPiece) {
  if (!piece) return;

  piece.style.left = `${x - 40}px`;
  piece.style.top = `${y - 40}px`;
}

// ---------------- DROP ----------------

document.addEventListener("mouseup", (event) => {
  if (!draggedPiece) return;

  const element = document.elementFromPoint(
    event.clientX,
    event.clientY
  );

  const square = element?.closest(".square");

  let moved = false;

  if (square) {
    const target = square.dataset.square;

    if (target === draggedFrom) {

    renderBoard();
    renderReserve();

    cleanupDrag();

    return;
    }

    const move = game.move({
      from: draggedFrom,
      to: target,
      promotion: "q",
    });

    if (move !== null) {
      moved = true;
    }
  }

  cleanupDrag();

  // rerender either way
  renderBoard();
  renderReserve();
});

// ---------------- CLEANUP ----------------

function cleanupDrag() {
  if (floatingPiece) {
    floatingPiece.remove();
  }

  document.querySelectorAll(".piece").forEach((piece) => {
    piece.style.opacity = "1";
    });

  floatingPiece = null;
  draggedPiece = null;
  draggedFrom = null;
}

// initial render
renderBoard();
renderReserve();

function tryPlaceReserveOnSquare(coordinate) {
  if (!heldReservePiece) return;

  if (game.get(coordinate) !== null) return;

  game.put(
    {
      type: heldReservePiece[1].toLowerCase(),
      color: heldReservePiece[0],
    },
    coordinate
  );

  heldReservePiece = null;

  if (floatingReservePiece) {
    floatingReservePiece.remove();
    floatingReservePiece = null;
  }

  renderBoard();
}

