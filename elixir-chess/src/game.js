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