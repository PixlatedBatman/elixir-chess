import { Chess } from "chess.js";

import "./board/pieceLayer.css";
import "./board/boardTheme.css";

import {
  PieceLayer,
} from "./board/pieceLayer";

const PIECE_THEME =
  "https://chessboardjs.com/img/chesspieces/wikipedia/";

const RESERVE_COSTS = {
  P: 1,
  B: 3,
  N: 3,
  R: 5,
  Q: 9,
};

// `?noanim` falls back to the original rebuild-every-frame board so the two
// can be compared side by side without a rebuild.
const ANIMATION_ENABLED =
  !new URLSearchParams(
    window.location.search
  ).has("noanim");

// Emit the class names the existing stylesheet already targets, so the
// animated board is visually identical to the legacy one.
const LEGACY_CLASS_NAMES = {
  square: "square",
  coordinate: "board-coordinate",
  rank: "rank-coordinate",
  file: "file-coordinate",
  lastMove: "last-move",
  selected: "selected-square",
  legal: "legal-move",
  capture: "legal-capture",
  premove: "premove-square",
  check: "king-in-check",
};

let layer = null;
let layerContainer = null;
let lastPaintedFen = null;
let pendingMove = null;
let shouldSnap = false;

export function getBoardLayer() {
  return layer;
}

// Lets the optimistic-move path hand over the details reconciliation cannot
// infer on its own (currently just promotion). Consumed by the next paint.
export function setPendingMove(move) {
  pendingMove = move;
}

// Suppresses animation for the next paint. Used for history jumps, where
// sliding every piece across the board at once would just look chaotic.
export function requestSnap() {
  shouldSnap = true;
}

export function createBoard(
  boardElement,
  fen,
  draggedFrom = null,
  selectedSquare = null,
  legalMoves = [],
  orientation = "w",
  lastMove = null,
  premove = null
) {

  if (!ANIMATION_ENABLED) {
    createBoardLegacy(
      boardElement,
      fen,
      draggedFrom,
      selectedSquare,
      legalMoves,
      orientation,
      lastMove,
      premove
    );

    return;
  }

  if (layerContainer !== boardElement) {
    boardElement.innerHTML = "";

    layer =
      new PieceLayer(boardElement, {
        orientation,
        pieceTheme: PIECE_THEME,
        classNames: LEGACY_CLASS_NAMES,
      });

    layerContainer = boardElement;
    lastPaintedFen = null;
  }

  layer.setOrientation(orientation);

  const tempGame =
    new Chess(fen);

  const board =
    tempGame.board();

  const checkedKingSquare =
    tempGame.inCheck()
      ? getKingSquare(
          board,
          tempGame.turn()
        )
      : null;

  const legal = [];
  const captures = [];

  for (const target of legalMoves || []) {
    if (isOccupied(board, target)) {
      captures.push(target);
    } else {
      legal.push(target);
    }
  }

  // Only reconcile when the position actually changed. Selection and
  // highlight-only rerenders stay class toggles, and a piece being dragged
  // never gets yanked back under the cursor.
  if (fen !== lastPaintedFen) {
    layer.setPosition(fen, {
      move: pendingMove,
      animate: !shouldSnap,
    });

    lastPaintedFen = fen;
  }

  pendingMove = null;
  shouldSnap = false;

  layer.setHighlights({
    lastMove: lastMove?.squares || [],
    selected: selectedSquare,
    legal,
    captures,
    premove: getPremoveSquares(premove),
    check: checkedKingSquare,
  });
}

function getPremoveSquares(premove) {
  if (!premove) {
    return [];
  }

  if (premove.type === "reserve") {
    return [premove.target];
  }

  return [
    premove.from,
    premove.to,
  ].filter(Boolean);
}

function isOccupied(board, square) {
  const file =
    square.charCodeAt(0) - 97;

  const rank =
    8 - Number(square[1]);

  return Boolean(
    board[rank]?.[file]
  );
}

// ---------------- LEGACY BOARD ----------------

function createBoardLegacy(
  boardElement,
  fen,
  draggedFrom,
  selectedSquare,
  legalMoves,
  orientation,
  lastMove,
  premove
) {

  boardElement.innerHTML = "";

  const tempGame =
    new Chess(fen);

  const board =
    tempGame.board();

  const checkedKingSquare =
    tempGame.inCheck()
      ? getKingSquare(
          board,
          tempGame.turn()
        )
      : null;

  const rowIndexes =
    orientation === "b"
      ? [7, 6, 5, 4, 3, 2, 1, 0]
      : [0, 1, 2, 3, 4, 5, 6, 7];

  const colIndexes =
    orientation === "b"
      ? [7, 6, 5, 4, 3, 2, 1, 0]
      : [0, 1, 2, 3, 4, 5, 6, 7];

  for (const [rowPosition, row] of rowIndexes.entries()) {

    for (const [colPosition, col] of colIndexes.entries()) {

      const square =
        document.createElement("div");

      square.classList.add("square");

      if ((row + col) % 2 === 0) {
        square.classList.add("light");
      } else {
        square.classList.add("dark");
      }

      const file =
        "abcdefgh"[col];

      const rank =
        8 - row;

      const coordinate =
        `${file}${rank}`;

      square.dataset.square =
        coordinate;

      if (colPosition === 0) {
        const rankLabel =
          document.createElement("span");

        rankLabel.classList.add(
          "board-coordinate",
          "rank-coordinate"
        );

        rankLabel.textContent =
          String(8 - rowPosition);

        square.appendChild(rankLabel);
      }

      if (rowPosition === 7) {
        const fileLabel =
          document.createElement("span");

        fileLabel.classList.add(
          "board-coordinate",
          "file-coordinate"
        );

        fileLabel.textContent =
          "abcdefgh"[colPosition];

        square.appendChild(fileLabel);
      }

      // selected square
      if (
        coordinate === selectedSquare
      ) {
        square.classList.add(
          "selected-square"
        );
      }

      const piece =
        board[row][col];

      // legal move highlight
      if (
        legalMoves.includes(
          coordinate
        )
      ) {
        square.classList.add(
          piece
            ? "legal-capture"
            : "legal-move"
        );
      }

      if (
        lastMove?.squares?.includes(
          coordinate
        )
      ) {
        square.classList.add(
          "last-move"
        );
      }

      if (
        premove &&
        ((premove.type === "move" &&
          (coordinate === premove.from ||
            coordinate === premove.to)) ||
          (premove.type === "reserve" &&
            coordinate === premove.target))
      ) {
        square.classList.add(
          "premove-square"
        );
      }

      if (coordinate === checkedKingSquare) {
        square.classList.add(
          "king-in-check"
        );
      }

      if (
        piece &&
        coordinate !== draggedFrom
      ) {

        const code =
          piece.color +
          piece.type.toUpperCase();

        const img =
          document.createElement("img");

        img.src =
          `${PIECE_THEME}${code}.png`;

        img.classList.add("piece");
        img.draggable = false;

        img.dataset.piece =
          code;

        img.dataset.from =
          coordinate;

        square.appendChild(img);
      }

      boardElement.appendChild(
        square
      );
    }
  }
}

function getKingSquare(board, color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece =
        board[row][col];

      if (
        piece?.type === "k" &&
        piece.color === color
      ) {
        const file =
          "abcdefgh"[col];

        const rank =
          8 - row;

        return `${file}${rank}`;
      }
    }
  }

  return null;
}

export function renderReserve(
  reserveElement,
  reservePieces,
  selectedSource,
  elixir = null,
  playerColor = null
) {

  reserveElement.innerHTML = "";

  reservePieces.forEach(
    (pieceCode) => {

      const item =
        document.createElement("div");

      item.classList.add(
        "reserve-item"
      );

      const cost =
        RESERVE_COSTS[pieceCode[1]];

      const affordable =
        !playerColor ||
        pieceCode[0] !== playerColor ||
        elixir?.[playerColor] >= cost;

      if (!affordable) {
        item.classList.add(
          "unaffordable"
        );
      }

      const img =
        document.createElement("img");

      img.src =
        `${PIECE_THEME}${pieceCode}.png`;

      img.classList.add("piece");

      img.draggable = false;

      img.dataset.reserve =
        pieceCode;

      const label =
        document.createElement("span");

      label.classList.add(
        "reserve-cost"
      );

      label.textContent =
        `${cost} Elixir`;

      // selected reserve highlight
      if (
        selectedSource ===
        `reserve:${pieceCode}`
      ) {
        img.classList.add(
          "selected-reserve"
        );
      }

      item.appendChild(img);
      item.appendChild(label);

      reserveElement.appendChild(
        item
      );
    }
  );
}
