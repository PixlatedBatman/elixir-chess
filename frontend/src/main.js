import "./style.css";

import {
  getFen,
} from "./game";

import {
  createRoom,
  findOrCreateMatch,
  getRoomId,
  getRoomStatus,
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

import {
  initializeSound,
} from "./sound";

document.querySelector("#app").innerHTML = `
  <div class="page">

    <div id="home-view"
        class="home-wrapper">
      <section class="screen-panel home-panel">
        <h1>Elixir Chess</h1>
        <p class="byline">Made by Karthik Kashyap</p>

        <div class="actions home-actions">
          <button id="create-game"
              type="button">
            Create Game
          </button>

          <button id="join-game-home"
              type="button">
            Join Game
          </button>

          <button id="join-existing-home"
              type="button">
            Join Existing Room
          </button>

          <button id="rules-button"
              type="button">
            Rules
          </button>

          <button id="contact-button"
              type="button">
            Contact
          </button>
        </div>

        <form id="existing-room-form"
            class="room-entry hidden">
          <label for="existing-room-input">Room number</label>

          <div class="room-entry-row">
            <input id="existing-room-input"
                name="room"
                autocomplete="off"
                inputmode="text"
                placeholder="Enter room number" />

            <button type="submit">Enter</button>
          </div>

          <p id="existing-room-message"
              class="form-message"></p>
        </form>

        <div id="contact-panel"
            class="info-panel hidden">
          <h2>Contact</h2>
          <p>This game is vibe coded and can hence have a lot of bugs. If you find any or if you would like to give any suggestions, feel free to mail me at <a href="mailto:elixirchess@karthikkashyap.com">elixirchess@karthikkashyap.com</a>.</p>
        </div>
      </section>

      <footer class="home-screen-footer">
        <button id="changelog-button"
            type="button"
            class="changelog-link-button">
          Changelog
        </button>
      </footer>
    </div>

    <section id="rules-view"
        class="screen-panel rules-page hidden">
      <div class="rules-header">
        <div>
          <h1>Rules</h1>
          <p class="byline">Elixir Chess rulebook</p>
        </div>

        <button id="rules-home-button"
            type="button"
            class="secondary-button compact-button">
          Home
        </button>
      </div>

      <div class="rules-section">
        <h2>Standard Chess</h2>
        <p>Elixir Chess uses normal chess rules for piece movement, turns, check, checkmate, castling, en passant, and promotion. If you make a pawn promotion, it promotes to a queen.</p>
      </div>

      <div class="rules-section">
        <h2>Elixir</h2>
        <p>Both players start with 3 Elixir. On your turn, you choose one action: make a normal chess move, or spend Elixir to place one reserve piece.</p>
        <p>A normal move gives you 1 Elixir after the move is made. Placing a reserve piece costs Elixir and uses your turn, but it does not give you Elixir back.</p>
      </div>

      <div class="rules-section">
        <h2>Reserve Pieces</h2>
        <p>Reserve Pieces are extra pieces that you can summon onto the board instead of moving a piece that is already in play. They give you a way to rebuild attacks, defend your king, or create new threats when you have saved enough Elixir.</p>
        <p>Each player has access to reserve Queens, Rooks, Bishops, Knights, and Pawns of their own color. You can only place your own color's reserve pieces, and only when it is your turn.</p>
      </div>

      <div class="rules-section">
        <h2>Reserve Costs</h2>
        <p>Pawn costs 1 Elixir. Bishop costs 3 Elixir. Knight costs 3 Elixir. Rook costs 5 Elixir. Queen costs 9 Elixir.</p>
      </div>

      <div class="rules-section">
        <h2>Reserve Placement</h2>
        <p>White reserve pieces may be placed only on empty squares in ranks 1 and 2. Black reserve pieces may be placed only on empty squares in ranks 7 and 8.</p>
        <p>A reserve placement is legal only if the target square is empty, inside your reserve zone, and the placement does not leave your own king in check.</p>
      </div>

      <div class="rules-section">
        <h2>Captures and Score</h2>
        <p>Captures follow normal chess rules. When you capture a piece, your score increases by that piece's value: Pawn 1, Bishop 3, Knight 3, Rook 5, and Queen 9.</p>
      </div>

      <div class="rules-section">
        <h2>Draws and Resignation</h2>
        <p>A player may resign to end the game immediately. A player may also offer a draw; the game ends as a draw only if the opponent accepts it.</p>
      </div>
    </section>

    <section id="changelog-view"
        class="screen-panel changelog-page hidden">
      <div class="rules-header">
        <div>
          <h1>Changelog</h1>
          <p class="byline">Project updates & release notes</p>
        </div>

        <button id="changelog-home-button"
            type="button"
            class="secondary-button compact-button">
          Home
        </button>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.6</h2>
          <span class="changelog-date">August 22, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>UI Symmetry & Player HUDs:</strong> Symmetrical player HUD cards combining 15-minute blitz clocks, Elixir counters, and capture scores above a centered board.</li>
          <li><strong>Horizontal Move History:</strong> Horizontal scrolling move ribbon with custom chevron scroll buttons and hidden scrollbar.</li>
          <li><strong>Interactive Modals:</strong> Modal popup dialogs for Resignation confirmation, Draw offers, and Game Over (displaying winner, reason, and a continue button to review the board).</li>
          <li><strong>Home Screen & Changelog:</strong> Highlighted all home action buttons with gold theme and added a dedicated Changelog page accessible from the bottom of the screen.</li>
          <li><strong>Balance, Contact & License:</strong> Queen piece value updated to 9, board rank/file coordinates added, dedicated contact email at <code>elixirchess@karthikkashyap.com</code>, and added MIT license documentation.</li>
        </ul>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.5</h2>
          <span class="changelog-date">August 18, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>Sound Effects:</strong> Added dedicated audio module and sound effects for normal moves, captures, checkmate/timeout, and victory.</li>
          <li><strong>Rules Subpage:</strong> Added dedicated rules subpage with detailed variant rules, improved piece capture interactions, and removed mobile image drag popups.</li>
        </ul>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.4</h2>
          <span class="changelog-date">June 29, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>Matchmaking & Home Info:</strong> Added home page info panels, online matchmaking system with room code lobbies, and web app favicon metadata.</li>
        </ul>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.3</h2>
          <span class="changelog-date">May 25, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>Score & Navigation:</strong> Added home navigation button and live material capture score tracking on the game page.</li>
        </ul>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.2</h2>
          <span class="changelog-date">May 25, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>Mobile Support:</strong> Added touch gesture support and responsive layout scaling for mobile screens.</li>
        </ul>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.1</h2>
          <span class="changelog-date">May 24, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>Elixir System & Game Actions:</strong> Added resign and draw actions, initial functional implementation of the Elixir resource system, and red square visual indicators for attacks and check.</li>
        </ul>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.0</h2>
          <span class="changelog-date">May 13, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>Multiplayer Foundation:</strong> Added WebSocket multiplayer support with Cloudflare Workers backend and custom domain configuration.</li>
          <li><strong>Reserve Mechanics:</strong> Implemented reserve piece deployment system (Queens, Rooks, Bishops, Knights, Pawns) and board orientation inversion for Black.</li>
          <li><strong>Chess Engine:</strong> Working chess rule validation model and initial variant architecture.</li>
        </ul>
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
        <button id="lobby-home-button"
            type="button"
            class="secondary-button">
          Home
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

      <div class="players-panel">
        <div id="white-player-hud"
            class="player-hud">
          <div class="player-details">
            <span class="player-label">White</span>
            <span id="white-elixir"
                class="player-stats"></span>
          </div>

          <div id="white-clock"
              class="clock"></div>
        </div>

        <div id="black-player-hud"
            class="player-hud">
          <div class="player-details">
            <span class="player-label">Black</span>
            <span id="black-elixir"
                class="player-stats"></span>
          </div>

          <div id="black-clock"
              class="clock"></div>
        </div>
      </div>

      <div class="board-wrap">
        <div id="board"
            class="board"></div>
      </div>

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
          class="modal-backdrop hidden">
        <div class="draw-offer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="draw-offer-text">
          <span id="draw-offer-text"></span>

          <div class="modal-actions">
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
        </div>
      </div>

      <div id="resign-confirm-modal"
          class="modal-backdrop hidden">
        <div class="resign-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resign-dialog-title">
          <h2 id="resign-dialog-title">Resign Game?</h2>
          <p>Are you sure you want to resign? This will end the game and count as a loss.</p>

          <div class="modal-actions">
            <button id="confirm-resign"
                type="button"
                class="danger-button">
              Resign
            </button>

            <button id="cancel-resign"
                type="button"
                class="secondary-button">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div id="reserve"
          class="reserve"></div>

      <div id="game-over"
          class="modal-backdrop hidden">
        <div class="game-over-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-over-title">
          <h2 id="game-over-title">Game Over</h2>

          <div class="game-over-content">
            <p id="game-over-winner"
                class="game-over-winner"></p>
            <p id="game-over-reason"
                class="game-over-reason"></p>
          </div>

          <div class="modal-actions">
            <button id="game-over-continue"
                type="button">
              Continue
            </button>
          </div>
        </div>
      </div>

      <div class="history-panel">
        <h2>Moves</h2>

        <button id="history-scroll-left"
            type="button"
            class="history-scroll-btn"
            aria-label="Scroll moves left">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div id="move-history"
            class="move-history"></div>

        <button id="history-scroll-right"
            type="button"
            class="history-scroll-btn"
            aria-label="Scroll moves right">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </section>

  </div>
`;

const homeView =
  document.getElementById("home-view");

const lobbyView =
  document.getElementById("lobby-view");

const rulesView =
  document.getElementById("rules-view");

const changelogView =
  document.getElementById("changelog-view");

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

const whitePlayerHudElement =
  document.getElementById("white-player-hud");

const blackPlayerHudElement =
  document.getElementById("black-player-hud");

const whiteElixirElement =
  document.getElementById("white-elixir");

const blackElixirElement =
  document.getElementById("black-elixir");

const whiteClockElement =
  document.getElementById("white-clock");

const blackClockElement =
  document.getElementById("black-clock");

const moveHistoryElement =
  document.getElementById("move-history");

const historyScrollLeftButton =
  document.getElementById("history-scroll-left");

const historyScrollRightButton =
  document.getElementById("history-scroll-right");

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

const resignConfirmModalElement =
  document.getElementById("resign-confirm-modal");

const confirmResignButton =
  document.getElementById("confirm-resign");

const cancelResignButton =
  document.getElementById("cancel-resign");

const gameOverElement =
  document.getElementById("game-over");

const gameOverWinnerElement =
  document.getElementById("game-over-winner");

const gameOverReasonElement =
  document.getElementById("game-over-reason");

const gameOverContinueButton =
  document.getElementById("game-over-continue");

let gameOverDismissed = false;
let lastSeenGameOverKey = null;

const existingRoomForm =
  document.getElementById("existing-room-form");

const existingRoomInput =
  document.getElementById("existing-room-input");

const existingRoomMessage =
  document.getElementById("existing-room-message");

const contactPanel =
  document.getElementById("contact-panel");

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

initializeSound();

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
    joinOpenGame
  );

document
  .getElementById("join-existing-home")
  .addEventListener(
    "click",
    showExistingRoomForm
  );

document
  .getElementById("rules-button")
  .addEventListener(
    "click",
    goToRules
  );

document
  .getElementById("contact-button")
  .addEventListener(
    "click",
    () => toggleHomePanel(contactPanel)
  );

existingRoomForm.addEventListener(
  "submit",
  joinExistingRoom
);

document
  .getElementById("lobby-home-button")
  .addEventListener(
    "click",
    goHome
  );

document
  .getElementById("rules-home-button")
  .addEventListener(
    "click",
    goHome
  );

document
  .getElementById("changelog-button")
  ?.addEventListener(
    "click",
    goToChangelog
  );

document
  .getElementById("changelog-home-button")
  ?.addEventListener(
    "click",
    goHome
  );

offerDrawButton.addEventListener(
  "click",
  offerDraw
);

resignButton.addEventListener(
  "click",
  () => {
    resignConfirmModalElement.classList.remove("hidden");
  }
);

confirmResignButton.addEventListener(
  "click",
  async () => {
    resignConfirmModalElement.classList.add("hidden");
    await submitResign();
    renderApp();
  }
);

cancelResignButton.addEventListener(
  "click",
  () => {
    resignConfirmModalElement.classList.add("hidden");
  }
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

historyScrollLeftButton.addEventListener(
  "click",
  () => {
    moveHistoryElement.scrollBy({
      left: -120,
      behavior: "smooth",
    });
  }
);

historyScrollRightButton.addEventListener(
  "click",
  () => {
    moveHistoryElement.scrollBy({
      left: 120,
      behavior: "smooth",
    });
  }
);

gameOverContinueButton.addEventListener(
  "click",
  () => {
    gameOverDismissed = true;
    gameOverElement.classList.add("hidden");
  }
);

renderApp();

window.setInterval(
  renderClocks,
  1000
);

if (appState.roomId) {
  connectRoom();
}

function goHome() {
  window.location.href =
    window.location.pathname;
}

function goToRules() {
  window.location.href =
    `${window.location.pathname}?rules=1`;
}

function goToChangelog() {
  window.location.href =
    `${window.location.pathname}?changelog=1`;
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

async function respondToDraw(response) {
  await submitDraw(response);
  renderApp();
}

async function joinOpenGame() {
  try {
    const room =
      await findOrCreateMatch();

    goToRoom(
      room.roomId
    );
  } catch {
    window.alert(
      "Could not find a game. Please try again."
    );
  }
}

function showExistingRoomForm() {
  existingRoomForm.classList.toggle(
    "hidden"
  );

  contactPanel.classList.add(
    "hidden"
  );

  clearExistingRoomMessage();

  if (!existingRoomForm.classList.contains("hidden")) {
    existingRoomInput.focus();
  }
}

function toggleHomePanel(panel) {
  const shouldShow =
    panel.classList.contains("hidden");

  existingRoomForm.classList.add(
    "hidden"
  );

  contactPanel.classList.add(
    "hidden"
  );

  if (shouldShow) {
    panel.classList.remove(
      "hidden"
    );
  }
}

async function joinExistingRoom(event) {
  event.preventDefault();

  const roomId =
    existingRoomInput.value.trim();

  clearExistingRoomMessage();

  if (!roomId) {
    showExistingRoomMessage(
      "Enter a room number."
    );

    return;
  }

  try {
    const status =
      await getRoomStatus(roomId);

    if (!status.exists) {
      showExistingRoomMessage(
        "Invalid room number."
      );

      return;
    }

    goToRoom(roomId);
  } catch {
    showExistingRoomMessage(
      "Could not check that room. Please try again."
    );
  }
}

function showExistingRoomMessage(message) {
  existingRoomMessage.textContent =
    message;
}

function clearExistingRoomMessage() {
  existingRoomMessage.textContent =
    "";
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
  const showingRules =
    new URLSearchParams(
      window.location.search
    ).has("rules");

  const showingChangelog =
    new URLSearchParams(
      window.location.search
    ).has("changelog");

  const hasRoom =
    Boolean(appState.roomId);

  const gameReady =
    Boolean(
      appState.players.w &&
      appState.players.b
    );

  homeView.classList.toggle(
    "hidden",
    showingRules || showingChangelog || hasRoom
  );

  rulesView.classList.toggle(
    "hidden",
    !showingRules
  );

  changelogView.classList.toggle(
    "hidden",
    !showingChangelog
  );

  lobbyView.classList.toggle(
    "hidden",
    showingRules || showingChangelog || !hasRoom || gameReady
  );

  gameView.classList.toggle(
    "hidden",
    showingRules || showingChangelog || !hasRoom || !gameReady
  );

  if (showingRules || showingChangelog || !hasRoom) {
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
  renderClocks();
  renderMoveHistory();
  renderGameOver();
}

function renderElixir() {
  whiteElixirElement.textContent =
    `Elixir: ${appState.elixir?.w ?? 0} | Score: ${appState.score?.w ?? 0}`;

  blackElixirElement.textContent =
    `Elixir: ${appState.elixir?.b ?? 0} | Score: ${appState.score?.b ?? 0}`;

  whitePlayerHudElement.classList.toggle(
    "mine",
    appState.playerColor === "w"
  );

  blackPlayerHudElement.classList.toggle(
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

function renderClocks() {
  if (
    !whiteClockElement ||
    !blackClockElement
  ) {
    return;
  }

  const clocks =
    getDisplayClocks();

  whiteClockElement.textContent =
    formatClock(clocks.w);

  blackClockElement.textContent =
    formatClock(clocks.b);

  whiteClockElement.classList.toggle(
    "active",
    appState.clockTurn === "w" &&
    !appState.gameOver
  );

  blackClockElement.classList.toggle(
    "active",
    appState.clockTurn === "b" &&
    !appState.gameOver
  );
}

function getDisplayClocks() {
  const clocks = {
    w: appState.clocks?.w ?? 15 * 60 * 1000,
    b: appState.clocks?.b ?? 15 * 60 * 1000,
  };

  if (
    appState.gameOver ||
    !appState.clockUpdatedAt ||
    (
      appState.clockTurn !== "w" &&
      appState.clockTurn !== "b"
    )
  ) {
    return clocks;
  }

  const elapsed =
    Date.now() -
    appState.clockUpdatedAt;

  return {
    ...clocks,
    [appState.clockTurn]:
      Math.max(
        0,
        clocks[appState.clockTurn] - elapsed
      ),
  };
}

function formatClock(milliseconds) {
  const totalSeconds =
    Math.max(
      0,
      Math.ceil(milliseconds / 1000)
    );

  const minutes =
    Math.floor(totalSeconds / 60);

  const seconds =
    totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function renderMoveHistory() {
  if (!moveHistoryElement) {
    return;
  }

  const moves =
    appState.moveHistory || [];

  if (moves.length === 0) {
    moveHistoryElement.innerHTML =
      `<div class="history-empty">No moves yet</div>`;
    return;
  }

  const rows =
    new Map();

  for (const move of moves) {
    if (!rows.has(move.turnNumber)) {
      rows.set(
        move.turnNumber,
        {
          w: "",
          b: "",
        }
      );
    }

    rows.get(move.turnNumber)[move.color] =
      move.notation;
  }

  moveHistoryElement.innerHTML =
    Array.from(rows.entries())
      .map(([turnNumber, row]) => `
        <div class="history-item">
          <span class="history-turn">${turnNumber}.</span>
          <span class="white-move">${row.w || ""}</span>
          ${row.b ? `<span class="black-move">${row.b}</span>` : ""}
        </div>
      `)
      .join("");

  moveHistoryElement.scrollLeft =
    moveHistoryElement.scrollWidth;
}

function renderGameOver() {
  if (!appState.gameOver) {
    gameOverDismissed = false;
    lastSeenGameOverKey = null;
    gameOverElement.classList.add("hidden");
    return;
  }

  const currentKey =
    `${appState.gameOver.reason}:${appState.gameOver.winner}`;

  if (lastSeenGameOverKey !== currentKey) {
    lastSeenGameOverKey = currentKey;
    gameOverDismissed = false;
  }

  gameOverElement.classList.toggle(
    "hidden",
    gameOverDismissed
  );

  if (gameOverDismissed) {
    return;
  }

  const { winnerText, reasonText } =
    getGameOverDetails(appState.gameOver);

  if (gameOverWinnerElement) {
    gameOverWinnerElement.textContent = winnerText;
  }

  if (gameOverReasonElement) {
    gameOverReasonElement.textContent = reasonText;
  }
}

function getGameOverDetails(gameOver) {
  if (gameOver.reason === "draw") {
    return {
      winnerText: "Draw",
      reasonText: "The game ended in a draw.",
    };
  }

  const winner =
    gameOver.winner === "w"
      ? "White"
      : "Black";

  let reason = "by checkmate";
  if (gameOver.reason === "resignation") {
    reason = "by resignation";
  } else if (gameOver.reason === "timeout") {
    reason = "on time";
  }

  return {
    winnerText: `${winner} Won!`,
    reasonText: `Won ${reason}.`,
  };
}
