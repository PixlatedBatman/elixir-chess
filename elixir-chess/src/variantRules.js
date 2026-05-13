import { Chess } from "chess.js";

// ---------------- RESERVE DEPLOYMENT ----------------

export function getReserveSquares(
  color,
  board
) {

  const legalSquares = [];

  // white -> ranks 1 and 2
  // black -> ranks 7 and 8

  const rows =
    color === "w"
      ? [7, 6]
      : [0, 1];

  for (const row of rows) {

    for (let col = 0; col < 8; col++) {

      // must be empty
      if (board[row][col] !== null) {
        continue;
      }

      const file =
        "abcdefgh"[col];

      const rank =
        8 - row;

      legalSquares.push(
        `${file}${rank}`
      );
    }
  }

  return legalSquares;
}

// ---------------- RESERVE LEGALITY ----------------

export function canPlaceReserve(
  fen,
  pieceCode,
  target
) {

  const game =
    new Chess(fen);

  const color =
    pieceCode[0];

  const board =
    game.board();

  // ---------------- TARGET IN ZONE ----------------

  const legalSquares =
    getReserveSquares(
      color,
      board
    );

  if (
    !legalSquares.includes(
      target
    )
  ) {
    return false;
  }

  // ---------------- PLACE PIECE ----------------

  game.put(
    {
      type:
        pieceCode[1]
          .toLowerCase(),

      color,
    },
    target
  );

  // ---------------- KING SAFETY ----------------

  return !game.inCheck();
}