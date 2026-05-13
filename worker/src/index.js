import { Chess } from "chess.js";

import {
  canPlaceReserve,
} from "../../shared/variantRules.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
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
      api !== "api" ||
      resource !== "rooms" ||
      !roomId
    ) {
      return json(
        {
          error: "Unknown API route",
        },
        404
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
        headers: corsHeaders,
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
      action === "events"
    ) {
      return this.handleEvents(
        request,
        url
      );
    }

    if (request.method !== "POST") {
      return json(
        {
          error: "Method not allowed",
        },
        405
      );
    }

    const body =
      await request.json();

    if (action === "join") {
      return this.handleJoin(body);
    }

    if (action === "move") {
      return this.handleMove(body);
    }

    if (action === "reserve") {
      return this.handleReserve(body);
    }

    return json(
      {
        error: "Unknown room action",
      },
      404
    );
  }

  async handleJoin(body) {
    const state =
      await this.getState();

    const role =
      assignRole(
        state,
        body.playerId
      );

    await this.saveState(state);

    const payload =
      serializeState(
        state,
        role
      );

    this.broadcast(state);

    return json(payload);
  }

  async handleMove(body) {
    const state =
      await this.getState();

    const role =
      getRole(
        state,
        body.playerId
      );

    const game =
      new Chess(state.fen);

    if (role !== game.turn()) {
      return json(
        {
          error: "It is not your turn",
        },
        403
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
        400
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

    await this.saveState(state);

    this.broadcast(state);

    return json(
      serializeState(
        state,
        role
      )
    );
  }

  async handleReserve(body) {
    const state =
      await this.getState();

    const role =
      getRole(
        state,
        body.playerId
      );

    const game =
      new Chess(state.fen);

    if (role !== game.turn()) {
      return json(
        {
          error: "It is not your turn",
        },
        403
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
        403
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
        400
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
        400
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

    await this.saveState(state);

    this.broadcast(state);

    return json(
      serializeState(
        state,
        role
      )
    );
  }

  async handleEvents(
    request,
    url
  ) {
    const playerId =
      url.searchParams.get("playerId");

    const stream =
      new TransformStream();

    const writer =
      stream.writable.getWriter();

    const client = {
      playerId,
      writer,
    };

    this.clients.add(client);

    const state =
      await this.getState();

    await writeEvent(
      client,
      serializeState(
        state,
        getRole(
          state,
          playerId
        )
      )
    );

    const heartbeat =
      setInterval(
        () => {
          writer.write(
            encode(": keep-alive\n\n")
          );
        },
        25000
      );

    request.signal.addEventListener(
      "abort",
      () => {
        clearInterval(heartbeat);
        this.clients.delete(client);
        writer.close().catch(() => {});
      },
      {
        once: true,
      }
    );

    return new Response(
      stream.readable,
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }

  closeClient(client, heartbeat) {
      clearInterval(heartbeat);
      this.clients.delete(client);
      writer.close().catch(() => {});
  }

  async getState() {
    const stored =
      await this.ctx.storage.get([
        "fen",
        "players",
        "lastMove",
      ]);

    return {
      fen:
        stored.get("fen") ||
        new Chess().fen(),
      players:
        stored.get("players") ||
        {
          w: null,
          b: null,
        },
      lastMove:
        stored.get("lastMove") ||
        null,
    };
  }

  async saveState(state) {
    await this.ctx.storage.put({
      fen: state.fen,
      players: state.players,
      lastMove: state.lastMove,
    });
  }

  broadcast(state) {
    for (const client of this.clients) {
      writeEvent(
        client,
        serializeState(
          state,
          getRole(
            state,
            client.playerId
          )
        )
      ).catch(() => {
        this.clients.delete(client);
      });
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

  if (state.players.w === playerId) {
    return "w";
  }

  if (state.players.b === playerId) {
    return "b";
  }

  if (!state.players.w) {
    state.players.w = playerId;
    return "w";
  }

  if (!state.players.b) {
    state.players.b = playerId;
    return "b";
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
    },
    lastMove: state.lastMove,
  };
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

function json(
  payload,
  status = 200
) {
  return new Response(
    JSON.stringify(payload),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}

function writeEvent(
  client,
  payload
) {
  return client.writer.write(
    encode(
      `event: state\ndata: ${JSON.stringify(payload)}\n\n`
    )
  );
}

function encode(value) {
  return new TextEncoder()
    .encode(value);
}
