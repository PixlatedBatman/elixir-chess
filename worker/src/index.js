import { Chess } from "chess.js";

import {
  canPlaceReserve,
  getReserveSquares,
} from "../../shared/variantRules.js";

const INITIAL_ELIXIR = 3;
const MOVE_ELIXIR_GAIN = 1;

const PIECE_VALUES = {
  p: 1,
  b: 3,
  n: 3,
  r: 5,
  q: 7,
};

const RESERVE_COSTS = {
  P: 1,
  B: 3,
  N: 3,
  R: 5,
  Q: 7,
};

const allowedOrigins = new Set([
  "https://elixirchess.karthikkashyap.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function isAllowedOrigin(request) {
  const origin =
    request.headers.get("Origin");

  return !origin ||
    allowedOrigins.has(origin);
}

function getCorsHeaders(request) {
  const origin =
    request.headers.get("Origin");

  const allowedOrigin =
    allowedOrigins.has(origin)
      ? origin
      : "https://elixirchess.karthikkashyap.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: getCorsHeaders(request),
      });
    }

    const url =
      new URL(request.url);

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    const [
      api,
      resource,
      roomId,
    ] = parts;

    if (
      api === "api" &&
      resource === "rooms" &&
      !roomId &&
      request.method === "POST"
    ) {
      const createdRoomId =
        createRoomId();

      const id =
        env.GAME_ROOM.idFromName(
          createdRoomId
        );

      const room =
        env.GAME_ROOM.get(id);

      await room.fetch(
        new Request(
          `${url.origin}/api/rooms/${createdRoomId}/create`,
          {
            method: "POST",
            headers: request.headers,
          }
        )
      );

      return json(
        {
          roomId: createdRoomId,
        },
        200,
        request
      );
    }

    if (
      api !== "api" ||
      resource !== "rooms" ||
      !roomId
    ) {
      return json(
        {
          error: "Unknown API route",
        },
        404,
        request
      );
    }

    const id =
      env.GAME_ROOM.idFromName(
        roomId
      );

    const room =
      env.GAME_ROOM.get(id);

    return room.fetch(request);
  },
};

export class GameRoom {
  constructor(ctx) {
    this.ctx = ctx;
    this.clients = new Set();
  }

  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: getCorsHeaders(request),
      });
    }

    const url =
      new URL(request.url);

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    const action =
      parts[3];

    if (
      request.method === "GET" &&
      action === "ws"
    ) {
      return this.handleWebSocket(
        request,
        url
      );
    }

    if (request.method !== "POST") {
      return json(
        {
          error: "Method not allowed",
        },
        405,
        request
      );
    }

    if (action === "create") {
      return this.handleCreate(request);
    }

    const body =
      await request.json();

    if (action === "join") {
      return this.handleJoin(
        body,
        request
      );
    }

    if (action === "move") {
      return this.handleMove(
        body,
        request
      );
    }

    if (action === "reserve") {
      return this.handleReserve(
        body,
        request
      );
    }

    if (action === "resign") {
      return this.handleResign(
        body,
        request
      );
    }

    if (action === "draw") {
      return this.handleDraw(
        body,
        request
      );
    }

    return json(
      {
        error: "Unknown room action",
      },
      404,
      request
    );
  }

  async handleCreate(request) {
    const state =
      await this.getState();

    state.created = true;
    state.fen = new Chess().fen();
    state.players = {
      w: null,
      b: null,
      player1: null,
      player2: null,
    };
    state.lastMove = null;
    state.gameOver = null;
    state.drawOffer = null;
    state.elixir = {
      w: INITIAL_ELIXIR,
      b: INITIAL_ELIXIR,
    };
    state.score = {
      w: 0,
      b: 0,
    };

    await this.saveState(state);

    return json(
      {
        ok: true,
      },
      200,
      request
    );
  }

  async handleJoin(
    body,
    request
  ) {
    const state =
      await this.getState();

    if (!state.created) {
      return json(
        {
          error: "Room not found",
        },
        404,
        request
      );
    }

    let role =
      assignRole(
        state,
        body.playerId
      );

    if (
      state.players.player1 &&
      state.players.player2 &&
      (!state.players.w || !state.players.b)
    ) {
      assignRandomColors(state);
      role =
        getRole(
          state,
          body.playerId
        );
    }

    await this.saveState(state);

    const payload =
      serializeState(
        state,
        role
      );

    this.broadcast(state);

    return json(
      payload,
      200,
      request
    );
  }

  async handleMove(
    body,
    request
  ) {
    const state =
      await this.getState();

    const role =
      getRole(
        state,
        body.playerId
      );

    if (state.gameOver) {
      return json(
        {
          error: "Game is over",
        },
        400,
        request
      );
    }

    const game =
      new Chess(state.fen);

    if (role !== game.turn()) {
      return json(
        {
          error: "It is not your turn",
        },
        403,
        request
      );
    }

    const move =
      game.move({
        from: body.from,
        to: body.to,
        promotion: "q",
      });

    if (!move) {
      return json(
        {
          error: "Illegal move",
        },
        400,
        request
      );
    }

    state.fen = game.fen();
    state.lastMove = {
      type: "move",
      squares: [
        move.from,
        move.to,
      ],
    };
    state.drawOffer = null;
    state.elixir = normalizeElixir(state.elixir);
    state.elixir[role] += MOVE_ELIXIR_GAIN;
    state.score = normalizeScore(state.score);

    if (move.captured) {
      state.score[role] +=
        PIECE_VALUES[move.captured] || 0;
    }
    updateGameOver(state);

    await this.saveState(state);

    this.broadcast(state);

    return json(
      serializeState(
        state,
        role
      ),
      200,
      request
    );
  }

  async handleReserve(
    body,
    request
  ) {
    const state =
      await this.getState();

    const role =
      getRole(
        state,
        body.playerId
      );

    if (state.gameOver) {
      return json(
        {
          error: "Game is over",
        },
        400,
        request
      );
    }

    const game =
      new Chess(state.fen);

    if (role !== game.turn()) {
      return json(
        {
          error: "It is not your turn",
        },
        403,
        request
      );
    }

    if (
      !body.pieceCode ||
      body.pieceCode[0] !== role
    ) {
      return json(
        {
          error: "That reserve piece is not yours",
        },
        403,
        request
      );
    }

    const cost =
      getReserveCost(body.pieceCode);

    state.elixir =
      normalizeElixir(state.elixir);

    if (state.elixir[role] < cost) {
      return json(
        {
          error: "Not enough Elixir",
        },
        400,
        request
      );
    }

    const legal =
      canPlaceReserve(
        state.fen,
        body.pieceCode,
        body.target
      );

    if (!legal) {
      return json(
        {
          error: "Illegal reserve placement",
        },
        400,
        request
      );
    }

    const placed =
      game.put(
        {
          type:
            body.pieceCode[1]
              .toLowerCase(),
          color: role,
        },
        body.target
      );

    if (!placed) {
      return json(
        {
          error: "Could not place reserve piece",
        },
        400,
        request
      );
    }

    finishReserveTurn(game);

    state.fen = game.fen();
    state.lastMove = {
      type: "reserve",
      squares: [
        body.target,
      ],
    };
    state.drawOffer = null;
    state.elixir = normalizeElixir(state.elixir);
    state.elixir[role] -= cost;
    updateGameOver(state);

    await this.saveState(state);

    this.broadcast(state);

    return json(
      serializeState(
        state,
        role
      ),
      200,
      request
    );
  }


  async handleResign(
    body,
    request
  ) {
    const state =
      await this.getState();

    const role =
      getRole(
        state,
        body.playerId
      );

    if (
      role !== "w" &&
      role !== "b"
    ) {
      return json(
        {
          error: "Only players can resign",
        },
        403,
        request
      );
    }

    if (state.gameOver) {
      return json(
        serializeState(
          state,
          role
        ),
        200,
        request
      );
    }

    state.gameOver = {
      reason: "resignation",
      winner: oppositeColor(role),
    };
    state.drawOffer = null;

    await this.saveState(state);

    this.broadcast(state);

    return json(
      serializeState(
        state,
        role
      ),
      200,
      request
    );
  }

  async handleDraw(
    body,
    request
  ) {
    const state =
      await this.getState();

    const role =
      getRole(
        state,
        body.playerId
      );

    if (
      role !== "w" &&
      role !== "b"
    ) {
      return json(
        {
          error: "Only players can offer a draw",
        },
        403,
        request
      );
    }

    if (state.gameOver) {
      return json(
        serializeState(
          state,
          role
        ),
        200,
        request
      );
    }

    if (body.response === "accept") {
      if (state.drawOffer !== oppositeColor(role)) {
        return json(
          {
            error: "No draw offer to accept",
          },
          400,
          request
        );
      }

      state.gameOver = {
        reason: "draw",
        winner: null,
      };
      state.drawOffer = null;
    } else if (body.response === "decline") {
      if (state.drawOffer !== oppositeColor(role)) {
        return json(
          {
            error: "No draw offer to decline",
          },
          400,
          request
        );
      }

      state.drawOffer = null;
    } else {
      state.drawOffer = role;
    }

    await this.saveState(state);

    this.broadcast(state);

    return json(
      serializeState(
        state,
        role
      ),
      200,
      request
    );
  }

  async handleWebSocket(
    request,
    url
  ) {
    if (!isAllowedOrigin(request)) {
      return json(
        {
          error: "Origin not allowed",
        },
        403,
        request
      );
    }

    if (
      request.headers.get("Upgrade")?.toLowerCase() !==
      "websocket"
    ) {
      return json(
        {
          error: "Expected WebSocket upgrade",
        },
        426,
        request
      );
    }

    const playerId =
      url.searchParams.get("playerId");

    const pair =
      new WebSocketPair();

    const [clientSocket, serverSocket] =
      Object.values(pair);

    serverSocket.accept();

    const client = {
      playerId,
      socket: serverSocket,
    };

    this.clients.add(client);

    serverSocket.addEventListener(
      "close",
      () => {
        this.clients.delete(client);
      }
    );

    serverSocket.addEventListener(
      "error",
      () => {
        this.clients.delete(client);
      }
    );

    const state =
      await this.getState();

    sendSocketState(
      client,
      serializeState(
        state,
        getRole(
          state,
          playerId
        )
      )
    );

    return new Response(null, {
      status: 101,
      webSocket: clientSocket,
    });
  }

  async getState() {
    const stored =
      await this.ctx.storage.get([
        "created",
        "fen",
        "players",
        "lastMove",
        "gameOver",
        "drawOffer",
        "elixir",
        "score",
      ]);

    return {
      created:
        stored.get("created") ||
        false,
      fen:
        stored.get("fen") ||
        new Chess().fen(),
      players:
        normalizePlayers(
          stored.get("players")
        ),
      lastMove:
        stored.get("lastMove") ||
        null,
      gameOver:
        stored.get("gameOver") ||
        null,
      drawOffer:
        stored.get("drawOffer") ||
        null,
      elixir:
        normalizeElixir(
          stored.get("elixir")
        ),
      score:
        normalizeScore(
          stored.get("score")
        ),
    };
  }

  async saveState(state) {
    await this.ctx.storage.put({
      created: state.created,
      fen: state.fen,
      players: state.players,
      lastMove: state.lastMove,
      gameOver: state.gameOver,
      drawOffer: state.drawOffer,
      elixir: normalizeElixir(state.elixir),
      score: normalizeScore(state.score),
    });
  }

  broadcast(state) {
    for (const client of this.clients) {
      const sent =
        sendSocketState(
          client,
          serializeState(
            state,
            getRole(
              state,
              client.playerId
            )
          )
        );

      if (!sent) {
        this.clients.delete(client);
      }
    }
  }
}

function assignRole(
  state,
  playerId
) {
  if (!playerId) {
    return "spectator";
  }

  state.players =
    normalizePlayers(state.players);

  if (state.players.w === playerId) {
    return "w";
  }

  if (state.players.b === playerId) {
    return "b";
  }

  if (state.players.player1 === playerId) {
    return getRole(
      state,
      playerId
    );
  }

  if (state.players.player2 === playerId) {
    return getRole(
      state,
      playerId
    );
  }

  if (!state.players.player1) {
    state.players.player1 = playerId;
    return "pending";
  }

  if (!state.players.player2) {
    state.players.player2 = playerId;
    return "pending";
  }

  return "spectator";
}

function getRole(
  state,
  playerId
) {
  if (state.players.w === playerId) {
    return "w";
  }

  if (state.players.b === playerId) {
    return "b";
  }

  if (
    state.players.player1 === playerId ||
    state.players.player2 === playerId
  ) {
    return "pending";
  }

  return "spectator";
}

function serializeState(
  state,
  role
) {
  const game =
    new Chess(state.fen);

  return {
    fen: state.fen,
    turn: game.turn(),
    role,
    players: {
      w: Boolean(state.players.w),
      b: Boolean(state.players.b),
      player1: Boolean(state.players.player1),
      player2: Boolean(state.players.player2),
    },
    drawOffer: state.drawOffer,
    gameOver: state.gameOver,
    elixir: normalizeElixir(state.elixir),
    score: normalizeScore(state.score),
    lastMove: state.lastMove,
  };
}

function normalizeElixir(elixir) {
  return {
    w: Number.isFinite(elixir?.w)
      ? elixir.w
      : INITIAL_ELIXIR,
    b: Number.isFinite(elixir?.b)
      ? elixir.b
      : INITIAL_ELIXIR,
  };
}

function normalizeScore(score) {
  return {
    w: Number.isFinite(score?.w)
      ? score.w
      : 0,
    b: Number.isFinite(score?.b)
      ? score.b
      : 0,
  };
}

function normalizePlayers(players) {
  return {
    w: players?.w || null,
    b: players?.b || null,
    player1: players?.player1 || players?.w || null,
    player2: players?.player2 || players?.b || null,
  };
}

function assignRandomColors(state) {
  const player1White =
    crypto.getRandomValues(
      new Uint8Array(1)
    )[0] < 128;

  state.players.w =
    player1White
      ? state.players.player1
      : state.players.player2;

  state.players.b =
    player1White
      ? state.players.player2
      : state.players.player1;
}

function updateGameOver(state) {
  const game =
    new Chess(state.fen);

  if (
    game.isCheckmate() &&
    !hasLegalReservePlacement(
      state.fen,
      game.turn(),
      normalizeElixir(state.elixir)[game.turn()]
    )
  ) {
    state.gameOver = {
      reason: "checkmate",
      winner: oppositeColor(game.turn()),
    };

    return;
  }

  if (game.isDraw()) {
    state.gameOver = {
      reason: "draw",
      winner: null,
    };
  }
}

function oppositeColor(color) {
  return color === "w"
    ? "b"
    : "w";
}

function hasLegalReservePlacement(fen, color, elixir) {
  const game =
    new Chess(fen);

  const squares =
    getReserveSquares(
      color,
      game.board()
    );

  const pieces = [
    "Q",
    "R",
    "B",
    "N",
    "P",
  ];

  return pieces.some((piece) =>
    RESERVE_COSTS[piece] <= elixir &&
    squares.some((square) =>
      canPlaceReserve(
        fen,
        `${color}${piece}`,
        square
      )
    )
  );
}

function getReserveCost(pieceCode) {
  return RESERVE_COSTS[pieceCode?.[1]] ||
    Number.POSITIVE_INFINITY;
}

function finishReserveTurn(game) {
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

function createRoomId() {
  return crypto.randomUUID()
    .slice(0, 8);
}

function json(
  payload,
  status = 200,
  request = new Request("https://elixirchess.karthikkashyap.com")
) {
  return new Response(
    JSON.stringify(payload),
    {
      status,
      headers: {
        ...getCorsHeaders(request),
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}

function sendSocketState(
  client,
  payload
) {
  try {
    client.socket.send(
      JSON.stringify(payload)
    );

    return true;
  } catch {
    return false;
  }
}
