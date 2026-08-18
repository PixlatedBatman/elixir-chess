import {
  appState,
} from "./state";

import {
  setFen,
} from "./game";

import {
  playGameOverSound,
  playMoveSound,
} from "./sound";

const DEFAULT_API_BASE_URL =
  "https://api.elixirchess.karthikkashyap.com";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  DEFAULT_API_BASE_URL;

export function getRoomId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get("room");
}

export async function createRoom() {
  const response =
    await fetch(
      `${API_BASE_URL}/api/rooms`,
      {
        method: "POST",
      }
    );

  if (!response.ok) {
    throw new Error(
      "Could not create room"
    );
  }

  return response.json();
}

export async function findOrCreateMatch() {
  const response =
    await fetch(
      `${API_BASE_URL}/api/matchmake`,
      {
        method: "POST",
      }
    );

  if (!response.ok) {
    throw new Error(
      "Could not find a game"
    );
  }

  return response.json();
}

export async function getRoomStatus(roomId) {
  const response =
    await fetch(
      `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/status`
    );

  if (!response.ok) {
    return {
      exists: false,
    };
  }

  return response.json();
}

export function getPlayerId() {
  const storageKey =
    "elixir-chess-player-id";

  let playerId =
    localStorage.getItem(
      storageKey
    );

  if (!playerId) {
    playerId =
      crypto.randomUUID();

    localStorage.setItem(
      storageKey,
      playerId
    );
  }

  return playerId;
}

export async function joinRoom() {
  appState.roomId =
    getRoomId();

  if (!appState.roomId) {
    throw new Error(
      "No room selected"
    );
  }

  appState.playerId =
    getPlayerId();

  const response =
    await fetch(
      `${API_BASE_URL}/api/rooms/${appState.roomId}/join`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId:
            appState.playerId,
        }),
      }
    );

  if (!response.ok) {
    throw new Error(
      "Could not join room"
    );
  }

  const payload =
    await response.json();

  applyServerState(payload);

  return payload;
}

export function subscribeToRoom(
  onUpdate
) {
  let socket = null;
  let reconnectTimer = null;
  let closedByClient = false;

  const connect = () => {
    socket =
      new WebSocket(
        `${getWebSocketBaseUrl()}/api/rooms/${appState.roomId}/ws?playerId=${encodeURIComponent(appState.playerId)}`
      );

    socket.addEventListener(
      "message",
      (event) => {
        const payload =
          JSON.parse(event.data);

        applyServerState(payload);

        onUpdate?.(payload);
      }
    );

    socket.addEventListener(
      "close",
      () => {
        if (closedByClient) {
          return;
        }

        appState.statusMessage =
          "Connection interrupted. Reconnecting...";

        onUpdate?.();

        reconnectTimer =
          window.setTimeout(
            connect,
            1000
          );
      }
    );

    socket.addEventListener(
      "error",
      () => {
        socket.close();
      }
    );
  };

  connect();

  return {
    close() {
      closedByClient = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}

function getWebSocketBaseUrl() {
  if (API_BASE_URL.startsWith("https://")) {
    return API_BASE_URL.replace(
      "https://",
      "wss://"
    );
  }

  if (API_BASE_URL.startsWith("http://")) {
    return API_BASE_URL.replace(
      "http://",
      "ws://"
    );
  }

  return window.location.protocol === "https:"
    ? `wss://${window.location.host}`
    : `ws://${window.location.host}`;
}

export async function submitMove(
  from,
  to
) {
  return postRoomAction(
    "move",
    {
      from,
      to,
    }
  );
}

export async function submitReserve(
  pieceCode,
  target
) {
  return postRoomAction(
    "reserve",
    {
      pieceCode,
      target,
    }
  );
}

export async function submitResign() {
  return postRoomAction(
    "resign",
    {}
  );
}

export async function submitDraw(
  response = null
) {
  return postRoomAction(
    "draw",
    response
      ? { response }
      : {}
  );
}

function applyServerState(payload) {
  const previousState = {
    gameOver:
      appState.gameOver,
    lastMove:
      appState.lastMove,
    score:
      appState.score,
    hasReceivedServerState:
      appState.hasReceivedServerState,
  };

  appState.online = true;
  appState.fen = payload.fen;
  appState.playerColor =
    payload.role;
  appState.players =
    payload.players;
  appState.drawOffer =
    payload.drawOffer || null;
  appState.gameOver =
    payload.gameOver || null;
  appState.elixir =
    payload.elixir ||
    {
      w: 3,
      b: 3,
    };
  appState.score =
    payload.score ||
    {
      w: 0,
      b: 0,
    };
  appState.lastMove =
    payload.lastMove || null;
  appState.boardOrientation =
    payload.role === "b"
      ? "b"
      : "w";
  appState.reservePieces =
    getReservePieces(
      getReserveColor(payload)
    );

  setFen(payload.fen);

  appState.statusMessage =
    getStatusMessage(payload);

  playSoundsForServerState(
    previousState,
    payload
  );

  appState.hasReceivedServerState = true;
}

function playSoundsForServerState(
  previousState,
  payload
) {
  if (
    !previousState.hasReceivedServerState
  ) {
    appState.lastSoundKey =
      getGameOverSoundKey(
        payload.gameOver
      ) ||
      getMoveSoundKey(
        payload.lastMove,
        payload.score
      );

    return;
  }

  const gameOverSoundKey =
    getGameOverSoundKey(
      payload.gameOver
    );

  if (
    gameOverSoundKey &&
    gameOverSoundKey !== appState.lastSoundKey
  ) {
    appState.lastSoundKey =
      gameOverSoundKey;

    playGameOverSound(
      payload.gameOver,
      payload.role
    );

    return;
  }

  const moveSoundKey =
    getMoveSoundKey(
      payload.lastMove,
      payload.score
    );

  if (
    moveSoundKey &&
    moveSoundKey !== appState.lastSoundKey
  ) {
    appState.lastSoundKey =
      moveSoundKey;

    playMoveSound(
      didScoreIncrease(
        previousState.score,
        payload.score
      )
    );
  }
}

function getGameOverSoundKey(gameOver) {
  if (!gameOver) {
    return null;
  }

  return [
    "game-over",
    gameOver.reason,
    gameOver.winner || "draw",
  ].join(":");
}

function getMoveSoundKey(
  lastMove,
  score
) {
  if (!lastMove) {
    return null;
  }

  return [
    "move",
    lastMove.type,
    ...(lastMove.squares || []),
    score?.w ?? 0,
    score?.b ?? 0,
  ].join(":");
}

function didScoreIncrease(
  previousScore,
  nextScore
) {
  return (
    (nextScore?.w ?? 0) >
      (previousScore?.w ?? 0) ||
    (nextScore?.b ?? 0) >
      (previousScore?.b ?? 0)
  );
}

function getReserveColor(payload) {
  if (
    payload.role === "w" ||
    payload.role === "b"
  ) {
    return payload.role;
  }

  return payload.turn;
}

function getReservePieces(color) {
  return [
    `${color}Q`,
    `${color}R`,
    `${color}B`,
    `${color}N`,
    `${color}P`,
  ];
}

async function postRoomAction(
  action,
  data
) {
  const response =
    await fetch(
      `${API_BASE_URL}/api/rooms/${appState.roomId}/${action}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId:
            appState.playerId,
          ...data,
        }),
      }
    );

  const payload =
    await response.json();

  if (!response.ok) {
    appState.statusMessage =
      payload.error ||
      "Action rejected";

    return false;
  }

  applyServerState(payload);

  return true;
}

function getStatusMessage(payload) {
  if (payload.gameOver) {
    return getGameOverMessage(
      payload.gameOver
    );
  }

  if (payload.role === "spectator") {
    return "Spectating this room";
  }

  if (payload.role !== "w" && payload.role !== "b") {
    return "Waiting for Player 2.";
  }

  const label =
    payload.role === "w"
      ? "White"
      : "Black";

  const waitingFor =
    !payload.players.player1
      ? "Player 1"
      : !payload.players.player2
        ? "Player 2"
        : null;

  if (waitingFor) {
    return `${label} player. Waiting for ${waitingFor}.`;
  }

  if (payload.drawOffer) {
    const offerLabel =
      payload.drawOffer === "w"
        ? "White"
        : "Black";

    return `${offerLabel} offered a draw.`;
  }

  const turnLabel =
    payload.turn === "w"
      ? "White"
      : "Black";

  return `${label} player. ${turnLabel} to move.`;
}

function getGameOverMessage(gameOver) {
  if (gameOver.reason === "draw") {
    return "Game over. Draw.";
  }

  const winner =
    gameOver.winner === "w"
      ? "White"
      : "Black";

  if (gameOver.reason === "resignation") {
    return `Game over. ${winner} won by resignation.`;
  }

  return `Game over. ${winner} won by checkmate.`;
}
