export const appState = {

  fen: null,

  reservePieces: [
    "wQ",
    "wR",
    "wB",
    "wN",
    "wP",
    ],

  boardOrientation: "w",
  lastMove: null,

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
    player1: null,
    player2: null,
  },
  drawOffer: null,
  gameOver: null,
  elixir: {
    w: 3,
    b: 3,
  },
  score: {
    w: 0,
    b: 0,
  },
  statusMessage: "",

  hasReceivedServerState: false,
  lastSoundKey: null,

};
