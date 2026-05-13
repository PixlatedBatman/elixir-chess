import "./style.css";

import {
  getFen,
} from "./game";

import {
  joinRoom,
  subscribeToRoom,
} from "./api";

import {
  appState,
} from "./state";

import {
  createBoard,
  renderReserve,
} from "./render";

import {
  initializeInteractions,
} from "./interaction";

document.querySelector("#app").innerHTML = `
  <div class="page">

    <div class="game-bar">
      <div>
        <strong>Elixir Chess</strong>
        <span id="room-label"></span>
      </div>

      <div id="status"
          class="status"></div>
    </div>

    <div id="board"
        class="board"></div>

    <div id="reserve"
        class="reserve"></div>

  </div>
`;

const boardElement =
  document.getElementById("board");

appState.fen = getFen();

// initial render
createBoard(
  boardElement,
  appState.fen
);

const reserveElement =
  document.getElementById("reserve");

const statusElement =
  document.getElementById("status");

const roomLabelElement =
  document.getElementById("room-label");

renderReserve(
  reserveElement,
  appState.reservePieces,
  appState.selectedSource
);

// interactions
initializeInteractions(
  boardElement,
  reserveElement
);

function rerenderApp() {
  createBoard(
    boardElement,
    appState.fen,
    appState.draggedFrom,
    appState.selectedSquare,
    appState.legalMoves
  );

  renderReserve(
    reserveElement,
    appState.reservePieces,
    appState.selectedSource
  );

  statusElement.textContent =
    appState.statusMessage;

  roomLabelElement.textContent =
    appState.roomId
      ? `Room ${appState.roomId}`
      : "";
}

joinRoom()
  .then(() => {
    rerenderApp();

    subscribeToRoom(
      rerenderApp
    );
  })
  .catch(() => {
    appState.online = false;
    appState.statusMessage =
      "Local board only. Start the Node server for multiplayer.";

    rerenderApp();
  });
