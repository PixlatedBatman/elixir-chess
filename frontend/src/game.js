import { Chess } from "chess.js";

export const game = new Chess();

export function getBoard() {
  return game.board();
}

export function getTurn() {
  return game.turn();
}

export function tryMove(from, to) {
  return game.move({
    from,
    to,
    promotion: "q",
  });
}

export function getLegalMoves(square) {
  return game.moves({
    square,
    verbose: true,
  });
}

export function getHypotheticalMoves(square, color) {
  try {
    const currentFen = game.fen();
    const fenParts = currentFen.split(" ");

    let moves = [];

    if (fenParts[1] !== color) {
      fenParts[1] = color;
      fenParts[3] = "-";

      const tempGame =
        new Chess(fenParts.join(" "));

      moves = tempGame.moves({
        square,
        verbose: true,
      });
    } else {
      moves = game.moves({
        square,
        verbose: true,
      });
    }

    // Pawn diagonal premove exception:
    // A pawn can premove diagonally forward-left and forward-right
    // in anticipation of an opponent piece moving to that square.
    const piece = game.get(square);
    if (piece && piece.type === "p" && piece.color === color) {
      const file = square.charCodeAt(0) - 97;
      const rank = parseInt(square[1]);
      const forwardRank = color === "w" ? rank + 1 : rank - 1;

      if (forwardRank >= 1 && forwardRank <= 8) {
        const diagonalFiles = [file - 1, file + 1].filter(
          f => f >= 0 && f <= 7
        );

        for (const df of diagonalFiles) {
          const targetSquare = `${String.fromCharCode(97 + df)}${forwardRank}`;
          if (!moves.some(m => m.to === targetSquare)) {
            moves.push({
              from: square,
              to: targetSquare,
              color,
              piece: "p",
              flags: "c",
            });
          }
        }
      }
    }

    return moves;
  } catch {
    return [];
  }
}

export function getFen() {
  return game.fen();
}

export function setFen(fen) {
  game.load(fen);
}

export function placeReserve(pieceCode, target) {
  const color =
    pieceCode[0];

  const placed =
    game.put(
      {
        type:
          pieceCode[1]
            .toLowerCase(),

        color,
      },
      target
    );

  if (!placed) {
    return false;
  }

  finishReserveTurn();

  return true;
}

function finishReserveTurn() {
  const fenParts =
    game.fen().split(" ");

  const currentTurn =
    fenParts[1];

  fenParts[1] =
    currentTurn === "w"
      ? "b"
      : "w";

  fenParts[3] = "-";

  if (currentTurn === "b") {
    fenParts[5] =
      String(
        Number(fenParts[5]) + 1
      );
  }

  game.load(
    fenParts.join(" ")
  );
}
