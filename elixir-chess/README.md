# Elixir Chess

## Project Goal

A custom chess variant where players can either:

1. Move an existing piece normally
2. Deploy reserve pieces onto the board

Future goal:

- Online multiplayer
- Currency/economy system
- Hosted website

---

## Variant Rules

- Each turn:
  - make a normal chess move
    OR
  - deploy a reserve piece

- Reserve pieces:
  - Queen
  - Rook
  - Bishop
  - Knight
  - Pawn

- Infinite reserve for now

- Reserve pieces:
  - can only be placed on empty squares
  - can only be placed on:
    - ranks 1-2 for white
    - ranks 7-8 for black

- Reserve placement:
  - may give check
  - may give checkmate
  - may block check
  - must not leave own king in check

- Once deployed:
  - reserve pieces become normal pieces
  - reserve rooks may castle

- Checkmate:
  - occurs only if:
    - no legal board move exists
      AND
    - no legal reserve placement exists

---

## Current Architecture

Frontend:

- Vite
- Vanilla JS
- CSS

Server:

- Node HTTP server
- Authoritative room state
- Server-Sent Events for live updates
- No extra realtime dependency yet

Chess engine:

- chess.js

Current rendering:

- partially custom board rendering
- chessboard.js being phased out

Important:

- browser native drag-and-drop should NOT be used
- interactions should be state-driven

Main files:

- server.js
- game.js
- state.js
- render.js
- interaction.js
- variantRules.js
- api.js

---

## Multiplayer Development

Build and run the hosted version locally:

```bash
npm run build
npm start
```

Then open:

```text
http://localhost:3000
```

The app creates a `?room=` URL automatically. Share that exact URL in another browser or private window:

- first unique player joins as white
- second unique player joins as black
- later visitors spectate

The server owns legal moves and reserve placements. The browser still uses chess.js locally for highlighting and immediate UI state.

---

## Current Working Features

- Board rendering
- Legal chess moves
- Turn enforcement
- Highlight legal moves
- Piece movement
- Reserve piece display
- Reserve legality checks

---

## Current Broken Feature

Reserve piece dragging:

- reserve pieces should visually attach to cursor
- like normal chess dragging
- current implementation does not work correctly

Need:

- custom floating drag layer
- NOT browser drag-and-drop

---

## Engineering Decisions

- chess.js is used as:
  - move validator
  - legality engine

- Variant logic lives separately in:
  - variantRules.js

- Custom rules should NOT modify chess.js internals

- Future multiplayer:
  - likely Socket.IO
  - authoritative server

- Future economy system planned
