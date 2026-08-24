import "./style.css";

import {
  getFen,
  getPositionAtHistoryIndex,
} from "./game";

import {
  createRoom,
  findOrCreateMatch,
  getRoomId,
  getRoomStatus,
  joinRoom,
  submitDraw,
  submitResign,
  submitRematch,
  subscribeToRoom,
} from "./api";

import {
  appState,
} from "./state";

import {
  createBoard,
  renderReserve,
  requestSnap,
} from "./render";

import {
  initializeInteractions,
  setOnRerenderCallback,
} from "./interaction";

import {
  initializeSound,
  playLowTimeSound,
} from "./sound";

// Declared up here rather than beside their functions: both are read during
// module evaluation, and `const` is not hoisted.

// The backend does not cap Elixir, so the bar needs a display ceiling. A
// Queen at 9 is the most expensive purchase, making 10 the point past which
// more Elixir buys nothing new -- anything beyond it reads as "surplus".
const ELIXIR_BAR_MAX = 10;

const lastElixir = {
  w: null,
  b: null,
};

// Drifting piece silhouettes behind the menu screens. Font glyphs rather than
// images, so there is nothing to download and they scale cleanly. Each one
// gets its own size, speed, drift and a negative delay so the field is already
// in motion on the first frame instead of starting empty.
const AMBIENT_GLYPHS = [
  "♚",
  "♛",
  "♜",
  "♝",
  "♞",
  "♟",
];

// One piece per this many pixels of viewport width. A fixed count leaves wide
// screens visibly sparse, since the bands stretch with the viewport.
const AMBIENT_SPACING = 58;
const AMBIENT_MIN_COUNT = 18;
const AMBIENT_MAX_COUNT = 34;

// `left` positions a glyph's left edge, so the usable span is not symmetric:
// starting slightly left of zero pushes a piece *into* view, while starting
// near 100vw pushes it out of view entirely. Hence the early right-hand stop.
const AMBIENT_SPAN_START = -5;
const AMBIENT_SPAN_WIDTH = 102;

document.querySelector("#app").innerHTML = `
  <div class="page">

    <div id="ambient"
        class="ambient-layer"
        aria-hidden="true"></div>

    <div id="home-view"
        class="home-wrapper">
      <section class="screen-panel home-panel">
        <h1>Elixir Chess</h1>
        <p class="byline">Made by Karthik Kashyap</p>

        <div class="actions home-actions">
          <button id="play-online-button"
              type="button">
            Play Online
          </button>

          <button id="play-friend-button"
              type="button">
            Play with a Friend
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

        <div id="friend-panel"
            class="info-panel friend-panel hidden">
          <h2>Play with a Friend</h2>
          <button id="create-private-room-btn"
              type="button"
              class="friend-create-btn">
            Create Private Room
          </button>

          <div class="friend-divider">
            <span>or enter room code</span>
          </div>

          <form id="existing-room-form"
              class="room-entry friend-room-form">
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
        </div>

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

      <div class="rules-section">
        <h2>Premoves</h2>
        <p>You can queue a piece move or a reserve piece placement while it is your opponent's turn. Pawns may also be premoved to diagonal squares in anticipation of an opponent piece moving there. Your queued premove will be highlighted in blue and will execute automatically the instant your opponent finishes their turn, provided the move remains legal. If the move is no longer legal or you have insufficient Elixir, the premove is safely cancelled. You can cancel a premove at any time by right-clicking or tapping an empty square.</p>
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
          <h2>Update v1.9</h2>
          <span class="changelog-date">August 24, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>Home Menu Redesign:</strong> Streamlined the home screen into a clean 4-button menu (Play Online, Play with a Friend, Rules, Contact) with an expandable private friend room panel and custom room code entry.</li>
          <li><strong>Interactive Move History:</strong> Clickable move chips, ribbon navigation buttons, and keyboard arrow navigation (<code>←</code>/<code>→</code>/<code>Home</code>/<code>End</code>) to review past board positions with smooth return to live play.</li>
          <li><strong>Audio Overhaul:</strong> Added distinct sound effects for Check, Castling, Illegal moves / failed premoves, and a 30-second low-time warning.</li>
          <li><strong>Play Again & Rematch Popup:</strong> In-place transition replacing Offer Draw and Resign with Play Again on game over, complete with an interactive Accept/Decline rematch popup and automatic color swapping.</li>
          <li><strong>Pawn Diagonal Premoves:</strong> Pawns can now queue diagonal premoves into empty squares in anticipation of enemy piece movements.</li>
          <li><strong>Clock & Matchmaking Fixes:</strong> Clocks accurately freeze at the exact moment of resignation/draw/checkmate, and private friend rooms are strictly isolated from public matchmaking.</li>
        </ul>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.8.1 (Bug Fix)</h2>
          <span class="changelog-date">August 23, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>UI Bug Fix:</strong> Fixed an issue where move dots and capture highlights lingered after moving; they now clear instantly at 0ms with immediate turn status updates.</li>
        </ul>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.8</h2>
          <span class="changelog-date">August 23, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>Optimistic Moves & 0ms Latency:</strong> Immediate client-side move and reserve execution with instant board updates, sound triggers, and HUD synchronization, supported by automatic server rollback protection.</li>
          <li><strong>Premove System:</strong> Queue piece moves and reserve piece drops during your opponent's turn, auto-executing instantly at 0ms when the opponent moves with subtle blue square highlights tailored for light and dark squares.</li>
        </ul>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.7</h2>
          <span class="changelog-date">August 22, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>Resignation Confirmation Popup:</strong> Replaced native browser confirmation dialog with an in-game modal popup featuring custom Resign and Cancel actions.</li>
          <li><strong>Mobile Viewport Fit:</strong> Optimized mobile vertical spacing and scaling so the board, HUDs, action buttons, and move history ribbon fit seamlessly without cutting off.</li>
        </ul>
      </div>

      <div class="changelog-entry">
        <div class="changelog-entry-header">
          <h2>Update v1.6</h2>
          <span class="changelog-date">August 22, 2026</span>
        </div>
        <ul class="changelog-list">
          <li><strong>UI Symmetry & Player HUDs:</strong> Symmetrical player HUD cards combining 15-minute blitz clocks, Elixir counters, and capture scores above a centered board.</li>
          <li><strong>Horizontal Move History:</strong> Horizontal scrolling move ribbon with custom chevron scroll buttons and hidden scrollbar.</li>
          <li><strong>Game Over & Draw Popups:</strong> Modal popup dialogs for Draw offers and Game Over (displaying winner, reason, and a continue button to review the board).</li>
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
            <div class="player-top">
              <span class="player-label">White</span>
              <span id="white-score"
                  class="player-score"></span>
            </div>

            <div class="elixir-row">
              <div id="white-elixir"
                  class="elixir-bar"
                  role="img">
                <div id="white-elixir-fill"
                    class="elixir-fill"></div>
              </div>

              <span id="white-elixir-value"
                  class="elixir-value"></span>
            </div>
          </div>

          <div id="white-clock"
              class="clock"></div>
        </div>

        <div id="black-player-hud"
            class="player-hud">
          <div class="player-details">
            <div class="player-top">
              <span class="player-label">Black</span>
              <span id="black-score"
                  class="player-score"></span>
            </div>

            <div class="elixir-row">
              <div id="black-elixir"
                  class="elixir-bar"
                  role="img">
                <div id="black-elixir-fill"
                    class="elixir-fill"></div>
              </div>

              <span id="black-elixir-value"
                  class="elixir-value"></span>
            </div>
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

        <button id="play-again"
            type="button"
            class="play-again-btn hidden">
          Play Again
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

      <div id="rematch-offer"
          class="modal-backdrop hidden">
        <div class="draw-offer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rematch-offer-text">
          <span id="rematch-offer-text">Opponent offered a rematch!</span>

          <div class="modal-actions">
            <button id="accept-rematch"
                type="button">
              Accept Rematch
            </button>

            <button id="decline-rematch"
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

const whiteElixirFillElement =
  document.getElementById("white-elixir-fill");

const blackElixirFillElement =
  document.getElementById("black-elixir-fill");

const whiteElixirValueElement =
  document.getElementById("white-elixir-value");

const blackElixirValueElement =
  document.getElementById("black-elixir-value");

const whiteScoreElement =
  document.getElementById("white-score");

const blackScoreElement =
  document.getElementById("black-score");

const ambientElement =
  document.getElementById("ambient");

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

const playAgainButton =
  document.getElementById("play-again");

const drawOfferElement =
  document.getElementById("draw-offer");

const drawOfferTextElement =
  document.getElementById("draw-offer-text");

const acceptDrawButton =
  document.getElementById("accept-draw");

const declineDrawButton =
  document.getElementById("decline-draw");

const rematchOfferElement =
  document.getElementById("rematch-offer");

const rematchOfferTextElement =
  document.getElementById("rematch-offer-text");

const acceptRematchButton =
  document.getElementById("accept-rematch");

const declineRematchButton =
  document.getElementById("decline-rematch");

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

const friendPanel =
  document.getElementById("friend-panel");

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

setOnRerenderCallback(
  renderGame
);

initializeSound();

buildAmbient();

document
  .getElementById("play-online-button")
  ?.addEventListener(
    "click",
    joinOpenGame
  );

document
  .getElementById("play-friend-button")
  ?.addEventListener(
    "click",
    () => toggleHomePanel(friendPanel)
  );

document
  .getElementById("create-private-room-btn")
  ?.addEventListener(
    "click",
    createGame
  );

document
  .getElementById("rules-button")
  ?.addEventListener(
    "click",
    goToRules
  );

document
  .getElementById("contact-button")
  ?.addEventListener(
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

playAgainButton.addEventListener(
  "click",
  async () => {
    playAgainButton.disabled = true;
    playAgainButton.textContent = "Waiting for Opponent...";
    await submitRematch();
    renderApp();
  }
);

acceptRematchButton.addEventListener(
  "click",
  async () => {
    rematchOfferElement.classList.add("hidden");
    await submitRematch("accept");
    renderApp();
  }
);

declineRematchButton.addEventListener(
  "click",
  async () => {
    rematchOfferElement.classList.add("hidden");
    await submitRematch("decline");
    renderApp();
  }
);

homeButton.addEventListener(
  "click",
  goHome
);

historyScrollLeftButton.addEventListener(
  "click",
  () => {
    const moves = appState.moveHistory || [];
    if (moves.length === 0) {
      moveHistoryElement.scrollBy({
        left: -120,
        behavior: "smooth",
      });
      return;
    }

    const currentIndex =
      appState.selectedHistoryIndex === null
        ? moves.length - 1
        : appState.selectedHistoryIndex;

    if (currentIndex > 0) {
      goToHistoryIndex(currentIndex - 1);
    } else {
      goToHistoryIndex(-1);
    }
  }
);

historyScrollRightButton.addEventListener(
  "click",
  () => {
    const moves = appState.moveHistory || [];
    if (moves.length === 0) {
      moveHistoryElement.scrollBy({
        left: 120,
        behavior: "smooth",
      });
      return;
    }

    const currentIndex =
      appState.selectedHistoryIndex === null
        ? moves.length - 1
        : appState.selectedHistoryIndex;

    if (currentIndex < moves.length - 1) {
      goToHistoryIndex(currentIndex + 1);
    } else {
      goToHistoryIndex(null);
    }
  }
);

moveHistoryElement.addEventListener(
  "click",
  (event) => {
    const moveBtn = event.target.closest("[data-history-index]");
    if (moveBtn) {
      goToHistoryIndex(
        Number(moveBtn.dataset.historyIndex)
      );
    }
  }
);

window.addEventListener("keydown", (event) => {
  if (
    event.target.tagName === "INPUT" ||
    event.target.tagName === "TEXTAREA" ||
    !appState.roomId
  ) {
    return;
  }

  const moves = appState.moveHistory || [];
  if (moves.length === 0) {
    return;
  }

  const currentIndex =
    appState.selectedHistoryIndex === null
      ? moves.length - 1
      : appState.selectedHistoryIndex;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (currentIndex > 0) {
      goToHistoryIndex(currentIndex - 1);
    } else {
      goToHistoryIndex(-1);
    }
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    if (currentIndex < moves.length - 1) {
      goToHistoryIndex(currentIndex + 1);
    } else {
      goToHistoryIndex(null);
    }
  } else if (event.key === "Home") {
    event.preventDefault();
    goToHistoryIndex(-1);
  } else if (event.key === "End") {
    event.preventDefault();
    goToHistoryIndex(null);
  }
});

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

function buildAmbient() {
  if (!ambientElement) {
    return;
  }

  const prefersReducedMotion =
    window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  if (prefersReducedMotion) {
    return;
  }

  const random =
    (min, max) => min + Math.random() * (max - min);

  // A piece's column is fixed for the whole session -- it only drifts by a
  // little over 100px horizontally -- so uniform random placement is not good
  // enough. With this few pieces it reliably leaves whole columns of the
  // screen permanently empty. Instead give each piece its own vertical band
  // and jitter it inside that band: still irregular, but guaranteed to cover
  // the full width. Bands are shuffled so column does not track glyph type.
  const count =
    Math.min(
      AMBIENT_MAX_COUNT,
      Math.max(
        AMBIENT_MIN_COUNT,
        Math.round(window.innerWidth / AMBIENT_SPACING)
      )
    );

  const bands =
    shuffle([...Array(count).keys()]);

  const bandWidth =
    AMBIENT_SPAN_WIDTH / count;

  const fragment =
    document.createDocumentFragment();

  for (let index = 0; index < count; index++) {
    const piece =
      document.createElement("span");

    piece.className = "ambient-piece";

    piece.textContent =
      AMBIENT_GLYPHS[index % AMBIENT_GLYPHS.length];

    const left =
      AMBIENT_SPAN_START +
      bands[index] * bandWidth +
      random(0, bandWidth);

    const duration =
      random(38, 74);

    // Spread the starting heights the same way, so pieces trickle up the
    // screen instead of arriving in clumps. Keyed on `index` while the column
    // comes from the shuffled band, which keeps height and column independent.
    const phase =
      (index + random(0, 1)) / count;

    piece.style.setProperty("--ambient-left", `${left}vw`);
    piece.style.setProperty("--ambient-size", `${random(26, 92)}px`);
    piece.style.setProperty("--ambient-duration", `${duration}s`);
    piece.style.setProperty("--ambient-delay", `${-phase * duration}s`);
    piece.style.setProperty("--ambient-drift", `${random(-110, 110)}px`);
    piece.style.setProperty("--ambient-spin", `${random(-50, 50)}deg`);
    piece.style.setProperty("--ambient-peak", `${random(0.05, 0.12)}`);

    fragment.append(piece);
  }

  ambientElement.append(fragment);
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j =
      Math.floor(Math.random() * (i + 1));

    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
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

function toggleHomePanel(panel) {
  const shouldShow =
    panel.classList.contains("hidden");

  friendPanel.classList.add(
    "hidden"
  );

  contactPanel.classList.add(
    "hidden"
  );

  if (shouldShow) {
    panel.classList.remove(
      "hidden"
    );

    if (panel === friendPanel) {
      clearExistingRoomMessage();
      existingRoomInput.focus();
    }
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

  const showingGame =
    !(showingRules || showingChangelog || !hasRoom || !gameReady);

  gameView.classList.toggle(
    "hidden",
    !showingGame
  );

  // The board needs full attention, and drifting silhouettes behind it would
  // compete with the real pieces.
  ambientElement?.classList.toggle(
    "hidden",
    showingGame
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
  const isViewingHistory =
    appState.selectedHistoryIndex !== null &&
    appState.selectedHistoryIndex < (appState.moveHistory?.length ?? 0) - 1;

  let displayFen = appState.fen;
  let displayLastMove = appState.lastMove;

  if (appState.selectedHistoryIndex !== null) {
    const historical = getPositionAtHistoryIndex(
      appState.moveHistory,
      appState.selectedHistoryIndex
    );
    displayFen = historical.fen;
    displayLastMove = historical.lastMove;
  }

  createBoard(
    boardElement,
    displayFen,
    isViewingHistory ? null : appState.draggedFrom,
    isViewingHistory ? null : appState.selectedSquare,
    isViewingHistory ? [] : appState.legalMoves,
    appState.boardOrientation,
    displayLastMove,
    isViewingHistory ? null : appState.premove
  );

  renderReserve(
    reserveElement,
    appState.reservePieces,
    isViewingHistory ? null : appState.selectedSource,
    appState.elixir,
    appState.playerColor
  );

  statusElement.textContent =
    isViewingHistory
      ? `Viewing move ${appState.selectedHistoryIndex === -1 ? "start" : (appState.moveHistory?.[appState.selectedHistoryIndex]?.turnNumber ? `${appState.moveHistory[appState.selectedHistoryIndex].turnNumber}.${appState.moveHistory[appState.selectedHistoryIndex].color === "w" ? "" : ".."}${appState.moveHistory[appState.selectedHistoryIndex].notation}` : appState.selectedHistoryIndex + 1)}`
      : appState.statusMessage;

  renderElixir();

  roomLabelElement.textContent =
    `Room ${appState.roomId}`;

  renderDrawControls();
  renderClocks();
  renderMoveHistory();
  renderGameOver();
}

function renderElixir() {
  renderElixirSide(
    "w",
    whiteElixirElement,
    whiteElixirFillElement,
    whiteElixirValueElement,
    whiteScoreElement
  );

  renderElixirSide(
    "b",
    blackElixirElement,
    blackElixirFillElement,
    blackElixirValueElement,
    blackScoreElement
  );

  whitePlayerHudElement.classList.toggle(
    "mine",
    appState.playerColor === "w"
  );

  blackPlayerHudElement.classList.toggle(
    "mine",
    appState.playerColor === "b"
  );
}

function renderElixirSide(
  role,
  barElement,
  fillElement,
  valueElement,
  scoreElement
) {
  const elixir =
    appState.elixir?.[role] ?? 0;

  const score =
    appState.score?.[role] ?? 0;

  const filled =
    Math.min(elixir, ELIXIR_BAR_MAX);

  fillElement.style.width =
    `${(filled / ELIXIR_BAR_MAX) * 100}%`;

  valueElement.textContent =
    String(elixir);

  scoreElement.textContent =
    score > 0
      ? `+${score}`
      : "";

  barElement.setAttribute(
    "aria-label",
    `${role === "w" ? "White" : "Black"} Elixir ${elixir}`
  );

  barElement.classList.toggle(
    "surplus",
    elixir > ELIXIR_BAR_MAX
  );

  // Flash only on a gain, so the bar reacts to earning Elixir rather than to
  // every unrelated rerender.
  const previous =
    lastElixir[role];

  if (previous !== null && elixir > previous) {
    pulseElixir(barElement);
  }

  lastElixir[role] = elixir;
}

function pulseElixir(barElement) {
  barElement.classList.remove("gained");

  // Force a reflow so the animation restarts on consecutive gains.
  void barElement.offsetWidth;

  barElement.classList.add("gained");

  window.setTimeout(
    () => barElement.classList.remove("gained"),
    600
  );
}

function renderDrawControls() {
  const isPlayer =
    appState.playerColor === "w" ||
    appState.playerColor === "b";

  const gameOver =
    Boolean(appState.gameOver);

  if (gameOver) {
    offerDrawButton.classList.add("hidden");
    resignButton.classList.add("hidden");

    if (isPlayer) {
      playAgainButton.classList.remove("hidden");
      const opponentRole = appState.playerColor === "w" ? "b" : "w";

      if (appState.rematchOffer === appState.playerColor) {
        playAgainButton.textContent = "Waiting for Opponent...";
        playAgainButton.disabled = true;
      } else if (appState.rematchOffer === opponentRole) {
        playAgainButton.textContent = "Accept Rematch";
        playAgainButton.disabled = false;
      } else {
        playAgainButton.textContent = "Play Again";
        playAgainButton.disabled = false;
      }
    } else {
      playAgainButton.classList.add("hidden");
    }
  } else {
    playAgainButton.classList.add("hidden");

    if (isPlayer) {
      offerDrawButton.classList.remove("hidden");
      resignButton.classList.remove("hidden");

      offerDrawButton.disabled =
        appState.drawOffer === appState.playerColor;

      resignButton.disabled = false;
    } else {
      offerDrawButton.classList.add("hidden");
      resignButton.classList.add("hidden");
    }
  }

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

  const hasIncomingRematchOffer =
    isPlayer &&
    gameOver &&
    appState.rematchOffer &&
    appState.rematchOffer !== appState.playerColor;

  rematchOfferElement.classList.toggle(
    "hidden",
    !hasIncomingRematchOffer
  );

  if (hasIncomingRematchOffer) {
    const offerLabel =
      appState.rematchOffer === "w"
        ? "White"
        : "Black";

    rematchOfferTextElement.textContent =
      `${offerLabel} offered a rematch!`;
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

  whiteClockElement.classList.toggle(
    "low-time",
    clocks.w <= 30000 && !appState.gameOver
  );

  blackClockElement.classList.toggle(
    "low-time",
    clocks.b <= 30000 && !appState.gameOver
  );

  if (
    !appState.gameOver &&
    (appState.playerColor === "w" || appState.playerColor === "b") &&
    appState.clockTurn === appState.playerColor &&
    !appState.hasPlayedLowTimeWarning
  ) {
    const myTime = clocks[appState.playerColor];
    if (myTime > 0 && myTime <= 30000) {
      appState.hasPlayedLowTimeWarning = true;
      playLowTimeSound();
    }
  }
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

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!rows.has(move.turnNumber)) {
      rows.set(
        move.turnNumber,
        {
          w: null,
          b: null,
        }
      );
    }

    rows.get(move.turnNumber)[move.color] = {
      notation: move.notation,
      index: i,
    };
  }

  const activeIdx =
    appState.selectedHistoryIndex === null
      ? moves.length - 1
      : appState.selectedHistoryIndex;

  moveHistoryElement.innerHTML =
    Array.from(rows.entries())
      .map(([turnNumber, row]) => `
        <div class="history-item">
          <span class="history-turn">${turnNumber}.</span>
          ${
            row.w
              ? `<button type="button" class="history-move white-move ${row.w.index === activeIdx ? "active-move" : ""}" data-history-index="${row.w.index}">${row.w.notation}</button>`
              : ""
          }
          ${
            row.b
              ? `<button type="button" class="history-move black-move ${row.b.index === activeIdx ? "active-move" : ""}" data-history-index="${row.b.index}">${row.b.notation}</button>`
              : ""
          }
        </div>
      `)
      .join("");

  const activeMoveBtn =
    moveHistoryElement.querySelector(".active-move");

  if (activeMoveBtn) {
    activeMoveBtn.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  } else if (appState.selectedHistoryIndex === null) {
    moveHistoryElement.scrollLeft =
      moveHistoryElement.scrollWidth;
  }
}

function goToHistoryIndex(index) {
  const moves = appState.moveHistory || [];
  if (moves.length === 0) {
    return;
  }

  const previousIndex = resolveHistoryIndex();

  if (index === null || index >= moves.length - 1) {
    appState.selectedHistoryIndex = null;
  } else {
    appState.selectedHistoryIndex = Math.max(-1, index);
  }

  // Stepping one ply animates. Jumping further would slide every piece at
  // once, so snap instead.
  if (Math.abs(resolveHistoryIndex() - previousIndex) > 1) {
    requestSnap();
  }

  renderApp();
}

function resolveHistoryIndex() {
  const moves = appState.moveHistory || [];

  return appState.selectedHistoryIndex === null
    ? moves.length - 1
    : appState.selectedHistoryIndex;
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
