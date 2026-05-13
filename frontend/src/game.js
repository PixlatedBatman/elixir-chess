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
