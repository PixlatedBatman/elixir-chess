import { Chess } from "chess.js";

const PIECE_THEME =
  "https://chessboardjs.com/img/chesspieces/wikipedia/";

export function createBoard(
  boardElement,
  fen,
  draggedFrom = null,
  selectedSquare = null,
  legalMoves = [],
  orientation = "w",
  lastMove = null
) {

  boardElement.innerHTML = "";

  const tempGame =
    new Chess(fen);

  const board =
    tempGame.board();

  const rowIndexes =
    orientation === "b"
      ? [7, 6, 5, 4, 3, 2, 1, 0]
      : [0, 1, 2, 3, 4, 5, 6, 7];

  const colIndexes =
    orientation === "b"
      ? [7, 6, 5, 4, 3, 2, 1, 0]
      : [0, 1, 2, 3, 4, 5, 6, 7];

  for (const row of rowIndexes) {

    for (const col of colIndexes) {

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

      // selected square
      if (
        coordinate === selectedSquare
      ) {
        square.classList.add(
          "selected-square"
        );
      }

      // legal move highlight
      if (
        legalMoves.includes(
          coordinate
        )
      ) {
        square.classList.add(
          "legal-move"
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

      const piece =
        board[row][col];

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

export function renderReserve(
  reserveElement,
  reservePieces,
  selectedSource
) {

  reserveElement.innerHTML = "";

  reservePieces.forEach(
    (pieceCode) => {

      const img =
        document.createElement("img");

      img.src =
        `${PIECE_THEME}${pieceCode}.png`;

      img.classList.add("piece");

      img.draggable = false;

      img.dataset.reserve =
        pieceCode;

      // selected reserve highlight
      if (
        selectedSource ===
        `reserve:${pieceCode}`
      ) {
        img.classList.add(
          "selected-reserve"
        );
      }

      reserveElement.appendChild(
        img
      );
    }
  );
}
