export const appState = {

  fen: null,

  reservePieces: [
    "wQ",
    "wR",
    "wB",
    "wN",
    "wP",
    ],

  draggedPiece: null,

  draggedFrom: null,

  floatingPiece: null,

  selectedSquare: null,

  legalMoves: [],

  selectedSource: null,

  draggingReserve: null,
  dragImage: null,

  online: false,
  roomId: null,
  playerId: null,
  playerColor: null,
  players: {
    w: null,
    b: null,
  },
  statusMessage: "",

};
