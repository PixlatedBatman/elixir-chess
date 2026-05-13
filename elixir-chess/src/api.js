import {
  appState,
} from "./state";

import {
  setFen,
} from "./game";

export function getRoomId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  let roomId =
    params.get("room");

  if (!roomId) {
    roomId =
      crypto.randomUUID()
        .slice(0, 8);

    params.set(
      "room",
      roomId
    );

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params}`
    );
  }

  return roomId;
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

  appState.playerId =
    getPlayerId();

  const response =
    await fetch(
      `/api/rooms/${appState.roomId}/join`,
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
  const events =
    new EventSource(
      `/api/rooms/${appState.roomId}/events?playerId=${appState.playerId}`
    );

  events.addEventListener(
    "state",
    (event) => {
      const payload =
        JSON.parse(event.data);

      applyServerState(payload);

      onUpdate?.(payload);
    }
  );

  events.addEventListener(
    "error",
    () => {
      appState.statusMessage =
        "Connection interrupted. Reconnecting...";

      onUpdate?.();
    }
  );

  return events;
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

function applyServerState(payload) {
  appState.online = true;
  appState.fen = payload.fen;
  appState.playerColor =
    payload.role;
  appState.players =
    payload.players;

  setFen(payload.fen);

  appState.statusMessage =
    getStatusMessage(payload);
}

async function postRoomAction(
  action,
  data
) {
  const response =
    await fetch(
      `/api/rooms/${appState.roomId}/${action}`,
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
  if (payload.role === "spectator") {
    return "Spectating this room";
  }

  const label =
    payload.role === "w"
      ? "White"
      : "Black";

  const turnLabel =
    payload.turn === "w"
      ? "White"
      : "Black";

  return `${label} player. ${turnLabel} to move.`;
}
