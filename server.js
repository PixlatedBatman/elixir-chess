import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";

import {
  canPlaceReserve,
} from "./shared/variantRules.js";

const __dirname =
  path.dirname(
    fileURLToPath(import.meta.url)
  );

const distDir =
  path.join(
    __dirname,
    "frontend",
    "dist"
  );

const rooms =
  new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

const server =
  http.createServer(
    async (request, response) => {
      try {
        if (request.url.startsWith("/api/")) {
          await handleApi(
            request,
            response
          );

          return;
        }

        await serveStatic(
          request,
          response
        );
      } catch (error) {
        sendJson(
          response,
          500,
          {
            error:
              error.message ||
              "Server error",
          }
        );
      }
    }
  );

const port =
  Number(process.env.PORT || 3000);

server.listen(
  port,
  () => {
    console.log(
      `Elixir Chess server listening on http://localhost:${port}`
    );
  }
);

async function handleApi(
  request,
  response
) {
  const url =
    new URL(
      request.url,
      `http://${request.headers.host}`
    );

  const parts =
    url.pathname
      .split("/")
      .filter(Boolean);

  const [
    api,
    resource,
    roomId,
    action,
  ] = parts;

  if (
    api !== "api" ||
    resource !== "rooms" ||
    !roomId
  ) {
    sendJson(
      response,
      404,
      {
        error: "Unknown API route",
      }
    );

    return;
  }

  const room =
    getRoom(roomId);

  if (
    request.method === "GET" &&
    action === "events"
  ) {
    handleEvents(
      room,
      url,
      response
    );

    return;
  }

  if (request.method !== "POST") {
    sendJson(
      response,
      405,
      {
        error: "Method not allowed",
      }
    );

    return;
  }

  const body =
    await readJson(request);

  if (action === "join") {
    const role =
      assignRole(
        room,
        body.playerId
      );

    sendJson(
      response,
      200,
      serializeRoom(
        room,
        role
      )
    );

    broadcastRoom(room);
    return;
  }

  if (action === "move") {
    handleMove(
      room,
      body,
      response
    );

    return;
  }

  if (action === "reserve") {
    handleReserve(
      room,
      body,
      response
    );

    return;
  }

  sendJson(
    response,
    404,
    {
      error: "Unknown room action",
    }
  );
}

function handleMove(
  room,
  body,
  response
) {
  const role =
    getRole(
      room,
      body.playerId
    );

  if (role !== room.game.turn()) {
    sendJson(
      response,
      403,
      {
        error: "It is not your turn",
      }
    );

    return;
  }

  const move =
    room.game.move(
      {
        from: body.from,
        to: body.to,
        promotion: "q",
      }
    );

  if (!move) {
    sendJson(
      response,
      400,
      {
        error: "Illegal move",
      }
    );

    return;
  }

  room.lastMove = {
    type: "move",
    squares: [
      move.from,
      move.to,
    ],
  };

  sendJson(
    response,
    200,
    serializeRoom(
      room,
      role
    )
  );

  broadcastRoom(room);
}

function handleReserve(
  room,
  body,
  response
) {
  const role =
    getRole(
      room,
      body.playerId
    );

  if (role !== room.game.turn()) {
    sendJson(
      response,
      403,
      {
        error: "It is not your turn",
      }
    );

    return;
  }

  if (
    !body.pieceCode ||
    body.pieceCode[0] !== role
  ) {
    sendJson(
      response,
      403,
      {
        error: "That reserve piece is not yours",
      }
    );

    return;
  }

  const legal =
    canPlaceReserve(
      room.game.fen(),
      body.pieceCode,
      body.target
    );

  if (!legal) {
    sendJson(
      response,
      400,
      {
        error: "Illegal reserve placement",
      }
    );

    return;
  }

  const placed =
    room.game.put(
      {
        type:
          body.pieceCode[1]
            .toLowerCase(),
        color: role,
      },
      body.target
    );

  if (!placed) {
    sendJson(
      response,
      400,
      {
        error: "Could not place reserve piece",
      }
    );

    return;
  }

  finishReserveTurn(
    room.game
  );

  room.lastMove = {
    type: "reserve",
    squares: [
      body.target,
    ],
  };

  sendJson(
    response,
    200,
    serializeRoom(
      room,
      role
    )
  );

  broadcastRoom(room);
}

function handleEvents(
  room,
  url,
  response
) {
  const playerId =
    url.searchParams.get("playerId");

  response.writeHead(
    200,
    {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    }
  );

  const client = {
    playerId,
    response,
  };

  room.clients.add(client);

  writeEvent(
    client,
    serializeRoom(
      room,
      getRole(room, playerId)
    )
  );

  const heartbeat =
    setInterval(
      () => {
        response.write(": keep-alive\n\n");
      },
      25000
    );

  response.on(
    "close",
    () => {
      clearInterval(heartbeat);
      room.clients.delete(client);
    }
  );
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(
      roomId,
      {
        id: roomId,
        game: new Chess(),
        players: {
          w: null,
          b: null,
        },
        lastMove: null,
        clients: new Set(),
      }
    );
  }

  return rooms.get(roomId);
}

function assignRole(
  room,
  playerId
) {
  if (!playerId) {
    return "spectator";
  }

  if (room.players.w === playerId) {
    return "w";
  }

  if (room.players.b === playerId) {
    return "b";
  }

  if (!room.players.w) {
    room.players.w = playerId;
    return "w";
  }

  if (!room.players.b) {
    room.players.b = playerId;
    return "b";
  }

  return "spectator";
}

function getRole(
  room,
  playerId
) {
  if (room.players.w === playerId) {
    return "w";
  }

  if (room.players.b === playerId) {
    return "b";
  }

  return "spectator";
}

function serializeRoom(
  room,
  role
) {
  return {
    roomId: room.id,
    fen: room.game.fen(),
    turn: room.game.turn(),
    role,
    players: {
      w: Boolean(room.players.w),
      b: Boolean(room.players.b),
    },
    lastMove: room.lastMove,
  };
}

function broadcastRoom(room) {
  for (const client of room.clients) {
    writeEvent(
      client,
      serializeRoom(
        room,
        getRole(
          room,
          client.playerId
        )
      )
    );
  }
}

function writeEvent(
  client,
  payload
) {
  client.response.write(
    `event: state\ndata: ${JSON.stringify(payload)}\n\n`
  );
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

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(
    Buffer
      .concat(chunks)
      .toString("utf8")
  );
}

async function serveStatic(
  request,
  response
) {
  const url =
    new URL(
      request.url,
      `http://${request.headers.host}`
    );

  const requestedPath =
    url.pathname === "/"
      ? "/index.html"
      : url.pathname;

  const filePath =
    path.normalize(
      path.join(
        distDir,
        requestedPath
      )
    );

  if (!filePath.startsWith(distDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content =
      await fs.readFile(filePath);

    response.writeHead(
      200,
      {
        "Content-Type":
          mimeTypes[path.extname(filePath)] ||
          "application/octet-stream",
      }
    );

    response.end(content);
  } catch {
    const indexPath =
      path.join(distDir, "index.html");

    try {
      const content =
        await fs.readFile(indexPath);

      response.writeHead(
        200,
        {
          "Content-Type":
            mimeTypes[".html"],
        }
      );

      response.end(content);
    } catch {
      response.writeHead(
        404,
        {
          "Content-Type":
            "text/plain; charset=utf-8",
        }
      );

      response.end(
        "Build the client first with npm run build."
      );
    }
  }
}

function sendJson(
  response,
  status,
  payload
) {
  response.writeHead(
    status,
    {
      "Content-Type": "application/json; charset=utf-8",
    }
  );

  response.end(
    JSON.stringify(payload)
  );
}
