import "./style.css";

import {
  getFen,
} from "./game";

import {
  createRoom,
  getRoomId,
  joinRoom,
  submitDraw,
  submitResign,
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

    <section id="home-view"
        class="screen-panel">
      <h1>Elixir Chess</h1>
      <p class="byline">Made by Karthik Kashyap</p>

      <div class="actions">
        <button id="create-game"
            type="button">
          Create Game
        </button>

        <button id="join-game-home"
            type="button"
            class="secondary-button">
          Join Game
        </button>
      </div>
    </section>

    <section id="lobby-view"
        class="screen-panel hidden">
      <h1>Lobby</h1>

      <p id="lobby-room"
          class="room-code"></p>

      <p id="lobby-status"
          class="lobby-status"></p>

      <div class="player-list">
        <div id="white-player"
            class="player-slot"></div>

        <div id="black-player"
            class="player-slot"></div>
      </div>

      <div class="actions">
        <button id="join-game-lobby"
            type="button"
            class="secondary-button">
          Join Game
        </button>
      </div>
    </section>

    <section id="game-view"
        class="game-view hidden">
      <div class="game-bar">
        <div>
          <strong>Elixir Chess</strong>
          <span id="room-label"></span>
        </div>

        <div class="game-bar-actions">
          <div id="status"
              class="status"></div>

          <button id="home-button"
              type="button"
              class="secondary-button compact-button">
            Home
          </button>
        </div>
      </div>

      <div class="elixir-panel">
        <div id="white-elixir"
            class="elixir-balance"></div>

        <div id="black-elixir"
            class="elixir-balance"></div>
      </div>

      <div id="board"
          class="board"></div>

      <div class="game-actions">
        <button id="offer-draw"
            type="button"
            class="secondary-button">
          Offer Draw
        </button>

        <button id="resign-game"
            type="button"
            class="danger-button">
          Resign
        </button>
      </div>

      <div id="draw-offer"
          class="draw-offer hidden">
        <span id="draw-offer-text"></span>

        <button id="accept-draw"
            type="button">
          Accept Draw
        </button>

        <button id="decline-draw"
            type="button"
            class="secondary-button">
          Decline
        </button>
      </div>

      <div id="reserve"
          class="reserve"></div>

      <div id="game-over"
          class="game-over hidden">
        <h2>Game Over</h2>
        <p id="game-over-text"></p>
      </div>
    </section>

  </div>
`;

const homeView =
  document.getElementById("home-view");

const lobbyView =
  document.getElementById("lobby-view");

const gameView =
  document.getElementById("game-view");

const boardElement =
  document.getElementById("board");

const reserveElement =
  document.getElementById("reserve");

const statusElement =
  document.getElementById("status");

const homeButton =
  document.getElementById("home-button");

const roomLabelElement =
  document.getElementById("room-label");

const lobbyRoomElement =
  document.getElementById("lobby-room");

const lobbyStatusElement =
  document.getElementById("lobby-status");

const whitePlayerElement =
  document.getElementById("white-player");

const blackPlayerElement =
  document.getElementById("black-player");

const whiteElixirElement =
  document.getElementById("white-elixir");

const blackElixirElement =
  document.getElementById("black-elixir");

const offerDrawButton =
  document.getElementById("offer-draw");

const resignButton =
  document.getElementById("resign-game");

const drawOfferElement =
  document.getElementById("draw-offer");

const drawOfferTextElement =
  document.getElementById("draw-offer-text");

const acceptDrawButton =
  document.getElementById("accept-draw");

const declineDrawButton =
  document.getElementById("decline-draw");

const gameOverElement =
  document.getElementById("game-over");

const gameOverTextElement =
  document.getElementById("game-over-text");

appState.fen = getFen();
appState.roomId = getRoomId();

createBoard(
  boardElement,
  appState.fen,
  appState.draggedFrom,
  appState.selectedSquare,
  appState.legalMoves,
  appState.boardOrientation,
  appState.lastMove
);

renderReserve(
  reserveElement,
  appState.reservePieces,
  appState.selectedSource,
  appState.elixir,
  appState.playerColor
);

initializeInteractions(
  boardElement,
  reserveElement
);

document
  .getElementById("create-game")
  .addEventListener(
    "click",
    createGame
  );

document
  .getElementById("join-game-home")
  .addEventListener(
    "click",
    askForRoom
  );

document
  .getElementById("join-game-lobby")
  .addEventListener(
    "click",
    askForRoom
  );

offerDrawButton.addEventListener(
  "click",
  offerDraw
);

resignButton.addEventListener(
  "click",
  resignGame
);

acceptDrawButton.addEventListener(
  "click",
  () => respondToDraw("accept")
);

declineDrawButton.addEventListener(
  "click",
  () => respondToDraw("decline")
);

homeButton.addEventListener(
  "click",
  goHome
);

renderApp();

if (appState.roomId) {
  connectRoom();
}

function goHome() {
  window.location.href =
    window.location.pathname;
}

async function createGame() {
  try {
    const room =
      await createRoom();

    goToRoom(
      room.roomId
    );
  } catch {
    window.alert(
      "Could not create a game. Please try again."
    );
  }
}

async function offerDraw() {
  await submitDraw();
  renderApp();
}

async function resignGame() {
  const confirmed =
    window.confirm(
      "Resign this game?"
    );

  if (!confirmed) {
    return;
  }

  await submitResign();
  renderApp();
}

async function respondToDraw(response) {
  await submitDraw(response);
  renderApp();
}

function askForRoom() {
  const roomId =
    window.prompt(
      "Enter room number"
    );

  if (!roomId) {
    return;
  }

  goToRoom(
    roomId.trim()
  );
}

function goToRoom(roomId) {
  if (!roomId) {
    return;
  }

  window.location.href =
    `${window.location.pathname}?room=${encodeURIComponent(roomId)}`;
}

function connectRoom() {
  joinRoom()
    .then(() => {
      renderApp();

      subscribeToRoom(
        renderApp
      );
    })
    .catch(() => {
      appState.online = false;
      appState.statusMessage =
        "Could not connect to the game server.";

      renderApp();
    });
}

function renderApp() {
  const hasRoom =
    Boolean(appState.roomId);

  const gameReady =
    Boolean(
      appState.players.w &&
      appState.players.b
    );

  homeView.classList.toggle(
    "hidden",
    hasRoom
  );

  lobbyView.classList.toggle(
    "hidden",
    !hasRoom || gameReady
  );

  gameView.classList.toggle(
    "hidden",
    !hasRoom || !gameReady
  );

  if (!hasRoom) {
    return;
  }

  renderLobby();

  if (!gameReady) {
    return;
  }

  renderGame();
}

function renderLobby() {
  lobbyRoomElement.textContent =
    `Room ${appState.roomId}`;

  lobbyStatusElement.textContent =
    appState.statusMessage ||
    "Joining room...";

  whitePlayerElement.textContent =
    appState.players.player1
      ? "Player 1 joined"
      : "Waiting for Player 1";

  blackPlayerElement.textContent =
    appState.players.player2
      ? "Player 2 joined"
      : "Waiting for Player 2";

  whitePlayerElement.classList.toggle(
    "occupied",
    Boolean(appState.players.player1)
  );

  blackPlayerElement.classList.toggle(
    "occupied",
    Boolean(appState.players.player2)
  );
}

function renderGame() {
  createBoard(
    boardElement,
    appState.fen,
    appState.draggedFrom,
    appState.selectedSquare,
    appState.legalMoves,
    appState.boardOrientation,
    appState.lastMove
  );

  renderReserve(
    reserveElement,
    appState.reservePieces,
    appState.selectedSource,
    appState.elixir,
    appState.playerColor
  );

  statusElement.textContent =
    appState.statusMessage;

  renderElixir();

  roomLabelElement.textContent =
    `Room ${appState.roomId}`;

  renderDrawControls();
  renderGameOver();
}

function renderElixir() {
  whiteElixirElement.textContent =
    `White Elixir: ${appState.elixir?.w ?? 0} | Score: ${appState.score?.w ?? 0}`;

  blackElixirElement.textContent =
    `Black Elixir: ${appState.elixir?.b ?? 0} | Score: ${appState.score?.b ?? 0}`;

  whiteElixirElement.classList.toggle(
    "mine",
    appState.playerColor === "w"
  );

  blackElixirElement.classList.toggle(
    "mine",
    appState.playerColor === "b"
  );
}

function renderDrawControls() {
  const isPlayer =
    appState.playerColor === "w" ||
    appState.playerColor === "b";

  const gameOver =
    Boolean(appState.gameOver);

  offerDrawButton.disabled =
    !isPlayer || gameOver ||
    appState.drawOffer === appState.playerColor;

  resignButton.disabled =
    !isPlayer || gameOver;

  const hasIncomingOffer =
    isPlayer &&
    appState.drawOffer &&
    appState.drawOffer !== appState.playerColor &&
    !gameOver;

  drawOfferElement.classList.toggle(
    "hidden",
    !hasIncomingOffer
  );

  if (hasIncomingOffer) {
    const offerLabel =
      appState.drawOffer === "w"
        ? "White"
        : "Black";

    drawOfferTextElement.textContent =
      `${offerLabel} offered a draw.`;
  }
}

function renderGameOver() {
  gameOverElement.classList.toggle(
    "hidden",
    !appState.gameOver
  );

  if (!appState.gameOver) {
    return;
  }

  gameOverTextElement.textContent =
    getGameOverText(
      appState.gameOver
    );
}

function getGameOverText(gameOver) {
  if (gameOver.reason === "draw") {
    return "The game ended in a draw.";
  }

  const winner =
    gameOver.winner === "w"
      ? "White"
      : "Black";

  if (gameOver.reason === "resignation") {
    return `${winner} won by resignation.`;
  }

  return `${winner} won by checkmate.`;
}
