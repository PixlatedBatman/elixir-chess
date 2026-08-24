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
- Each player's balance is shown as a segmented bar in their HUD, which fills as Elixir is earned and drains when a reserve piece is bought.
- Elixir is not capped. The bar is scaled to 10, one past the most expensive purchase, and anything beyond that fills the bar completely and switches to a brighter "surplus" style while the number keeps counting.

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

## Board Animation

Pieces slide between squares instead of being redrawn in place. The board is two stacked layers: a static 64-square grid that is built once, and a piece layer where every piece is an absolutely positioned element moved with a CSS `transform`. Because the piece elements are never destroyed, a move is just a change of transform, which the browser animates.

Positions use percentage translates that resolve against the piece's own box, so one square is `100%`. The board needs no pixel maths and survives resizing without recalculation.

### Feature flag

Animation is on by default. Add `?noanim` to the URL to fall back to the original board, which rebuilt all 64 squares and every piece on each render:

```
http://localhost:5173/?room=1234&noanim
```

Both boards emit the same CSS class names, so they look identical and can be compared side by side.

The flag lives in `frontend/src/render.js`:

```js
const ANIMATION_ENABLED =
  !new URLSearchParams(
    window.location.search
  ).has("noanim");
```

It is read once when the module loads, so changing the URL requires a page reload.

To change it:

- **Make animation opt-in instead of opt-out:** drop the `!` and use a positive parameter name, e.g. `.has("anim")`.
- **Force one path always:** replace the expression with `true` or `false`.
- **Remove the flag entirely:** set it to `true`, then delete `createBoardLegacy` from `render.js` and the `elementFromPoint` fallback in `resolveDropSquare` in `frontend/src/interaction.js`. Nothing else depends on it.

### Motion settings

- **Duration** defaults to 190ms, set by `--pl-duration` on the board element. Override it in CSS, pass `animationMs` when constructing the layer, or call `setAnimationDuration()` at runtime.
- **Piece size** is `--pl-piece-size` (80% in game, matching the original piece sizing).
- **Reduced motion** is respected automatically via `prefers-reduced-motion`. Adding the `pl-reduced-motion` class to the board forces it on. Moves still apply instantly; only the animation is skipped.

Reserve placements play a summon animation rather than a slide, for both the placing player and the opponent. Captures fade out, promotions swap the sprite on arrival, and castling slides the king and rook together.

Stepping one move through the history animates. Larger jumps (`Home`, `End`, clicking a distant move) snap instead, since sliding every piece at once is unreadable.

### Elixir bar

The HUD Elixir bar animates its width when a balance changes, and flashes only when Elixir is *gained*, so it reacts to earning rather than to unrelated rerenders. Segment dividers make it countable at a glance, and the numeric value sits outside the track so it stays readable whatever the fill level.

The display ceiling is `ELIXIR_BAR_MAX` in `frontend/src/main.js`. Change it if reserve costs change.

### Ambient background

The menu screens have a layer of slowly drifting piece silhouettes behind them. They are font glyphs rather than images, so nothing is downloaded and they scale cleanly at any size. Each one gets a randomised size, speed, drift and a negative animation delay, so the field is already in motion on the first frame instead of starting empty.

A piece keeps its column for the whole session, drifting only about 100px sideways, so placement is **stratified rather than uniformly random**: the width is split into one band per piece and each piece is jittered inside its own band. Purely random placement reliably leaves whole columns of the screen permanently empty. Bands are shuffled so a piece's column does not track its glyph type, and starting heights are spread the same way so pieces trickle upward instead of arriving in clumps.

The number of pieces scales with viewport width (`AMBIENT_SPACING`, clamped between `AMBIENT_MIN_COUNT` and `AMBIENT_MAX_COUNT`), because the bands stretch with the viewport and a fixed count leaves wide screens sparse. The count is decided at load; bands are in `vw`, so coverage stays even if the window is later resized.

The layer is `pointer-events: none` and never intercepts input. It is hidden entirely while a game is in progress, so it cannot compete with the real pieces on the board.

Tune the field with `AMBIENT_GLYPHS` and the spacing constants in `frontend/src/main.js`, and the motion itself with the `ambient-rise` keyframes in `frontend/src/style.css`.

Under `prefers-reduced-motion` the glyphs are not created at all, and the layer is also hidden in CSS as a fallback.

### Prototype page

`frontend/prototype.html` is a development-only lab for the piece layer, with scenario playback, a duration slider, a reduced-motion toggle, and castling, en passant, promotion and summon cases. Run `npm run dev` and open `/prototype.html`. Vite only bundles `index.html`, so this page is never included in a production build. Its own styling is scaffolding and is not the game's UI.

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
- `frontend/src/render.js`: board and reserve rendering, animation feature flag
- `frontend/src/board/pieceLayer.js`: animated piece layer, square grid, hit testing
- `frontend/src/board/pieceLayer.css`: piece layer and animation styles
- `frontend/src/board/boardTheme.css`: adapts the piece layer to the game's board
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

- Future economy system planned

## License

The source code of Elixir Chess is licensed under the MIT License.

Elixir Chess, its name, branding, and associated artwork are not necessarily licensed under the MIT License.
