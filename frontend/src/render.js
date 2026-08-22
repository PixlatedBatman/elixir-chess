import { Chess } from "chess.js";

const PIECE_THEME =
  "https://chessboardjs.com/img/chesspieces/wikipedia/";

const RESERVE_COSTS = {
  P: 1,
  B: 3,
  N: 3,
  R: 5,
  Q: 9,
};

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
