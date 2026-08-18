# Elixir Chess

A playable online chess variant where each turn can be either a normal chess move or a reserve-piece placement paid for with Elixir.

## Game Rules

Elixir Chess follows normal chess rules for movement, turns, check, checkmate, castling, en passant, and promotion. Pawn promotion currently promotes to a queen.

On your turn, choose one action:

- Move an existing piece normally.
- Spend Elixir to place a reserve piece.

## Elixir

- Each player starts with 3 Elixir.
- A normal board move gives the moving player +1 Elixir.
- Placing a reserve piece costs Elixir and uses the turn.
- Reserve placements do not give +1 Elixir.
- Both players can see both Elixir balances.
- The backend owns Elixir balances and validates reserve purchases.

Reserve costs:

- Pawn: 1
- Bishop: 3
- Knight: 3
- Rook: 5
- Queen: 9

## Reserve Pieces

Reserve Pieces are extra pieces a player can summon onto the board instead of moving a piece already in play.

Available reserve pieces:

- Queen
- Rook
- Bishop
- Knight
- Pawn

Placement rules:

- Reserve pieces must be your own color.
- Reserve pieces can only be placed on empty squares.
- White may place reserves on ranks 1 and 2.
- Black may place reserves on ranks 7 and 8.
- A placement may give check, give checkmate, or block check.
- A placement is illegal if it leaves your own king in check.
- Once placed, reserve pieces behave like normal pieces.

## Score

Score is the total material value of pieces captured by each player. The backend calculates score and broadcasts both players' scores.

Captured piece values:

- Pawn: 1
- Bishop: 3
- Knight: 3
- Rook: 5
- Queen: 9

## Multiplayer

The game supports online rooms through a Cloudflare Worker backend and Durable Object room state.

Home screen actions:

- Create Game: creates a new room and opens its lobby.
- Join Game: finds an open match or creates one.
- Join Existing Room: joins a specific room number.
- Rules: opens the dedicated rulebook page.
- Contact: shows contact information.

Room behavior:

- The first unique player joins as Player 1.
- The second unique player joins as Player 2.
- When both players are present, colors are randomly assigned.
- Later visitors spectate.
- The backend owns legal moves, reserve placements, Elixir, score, resignations, draw offers, draw acceptance, color assignment, and game-over state.

## Interaction

- Pieces can be dragged and dropped.
- Pieces can also be selected and placed by clicking/tapping.
- Click/tap movement supports captures.
- Reserve pieces can be selected or dragged onto legal reserve squares.
- Legal moves, captures, selected squares, the last move, and check are highlighted.
- Piece images disable browser-native drag behavior to avoid mobile image popups where possible.

## Sounds

Sound files live in `frontend/public/sounds/`.

Current sounds:

- `move.mp3`: normal moves, reserve placements, and checks
- `capture.mp3`: captures
- `victory.mp3`: winner, and both players in a draw
- `game_over.mp3`: losing player

Browsers require a user interaction before audio can play, so sounds unlock after the first click or tap.

## Architecture

Frontend:

- Vite
- Vanilla JavaScript
- CSS
- `chess.js` for local board state, legal move highlighting, and immediate UI feedback

Backend:

- Cloudflare Worker
- Durable Objects for room state
- WebSockets for live updates
- `chess.js` for authoritative move validation

Shared logic:

- Reserve placement rules live in `shared/variantRules.js`.
- Custom variant rules should stay outside `chess.js` internals.

Important files:

- `frontend/src/main.js`: UI layout and view routing
- `frontend/src/interaction.js`: board and reserve interactions
- `frontend/src/render.js`: board and reserve rendering
- `frontend/src/api.js`: room API, WebSocket updates, server-state application
- `frontend/src/sound.js`: sound loading and playback
- `frontend/src/state.js`: client state
- `shared/variantRules.js`: reserve placement rules
- `worker/src/index.js`: production multiplayer backend
- `server.js`: local Node static/API server

## Development

Install dependencies:

```bash
npm install
```

Run the frontend dev server:

```bash
npm run dev
```

Build the frontend:

```bash
npm run build
```

Serve the built frontend with the local Node server:

```bash
npm start
```

Run the Worker locally:

```bash
npm run worker:dev
```

Deploy the Worker:

```bash
npm run worker:deploy
```
