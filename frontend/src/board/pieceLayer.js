const FILES = "abcdefgh";

export const DEFAULT_PIECE_THEME =
  "https://chessboardjs.com/img/chesspieces/wikipedia/";

export const PIECE_CODES = [
  "wK", "wQ", "wR", "wB", "wN", "wP",
  "bK", "bQ", "bR", "bB", "bN", "bP",
];

// Highlight/square class names are injectable so the layer can emit the
// game's existing CSS hooks instead of its own.
export const DEFAULT_CLASS_NAMES = {
  square: "pl-square",
  light: "light",
  dark: "dark",
  coordinate: "pl-coordinate",
  rank: "pl-coordinate-rank",
  file: "pl-coordinate-file",
  lastMove: "pl-last-move",
  selected: "pl-selected",
  legal: "pl-legal",
  capture: "pl-capture",
  premove: "pl-premove",
  check: "pl-check",
};

// ---------------- POSITION HELPERS ----------------

export function parseFen(fen) {
  const placement =
    String(fen).split(" ")[0];

  const position =
    new Map();

  placement.split("/").forEach(
    (rankRow, rowIndex) => {
      const rank =
        8 - rowIndex;

      let file = 0;

      for (const character of rankRow) {
        if (character >= "1" && character <= "8") {
          file += Number(character);
          continue;
        }

        const color =
          character === character.toUpperCase()
            ? "w"
            : "b";

        position.set(
          `${FILES[file]}${rank}`,
          `${color}${character.toUpperCase()}`
        );

        file += 1;
      }
    }
  );

  return position;
}

function gridPosition(square, orientation) {
  const file =
    FILES.indexOf(square[0]);

  const rank =
    Number(square[1]);

  return orientation === "b"
    ? {
        col: 7 - file,
        row: rank - 1,
      }
    : {
        col: file,
        row: 8 - rank,
      };
}

function squareDistance(a, b) {
  const fileDelta =
    Math.abs(
      FILES.indexOf(a[0]) -
      FILES.indexOf(b[0])
    );

  const rankDelta =
    Math.abs(
      Number(a[1]) -
      Number(b[1])
    );

  return Math.max(fileDelta, rankDelta);
}

export function preloadPieces(
  theme = DEFAULT_PIECE_THEME
) {
  for (const code of PIECE_CODES) {
    const image = new Image();
    image.src = `${theme}${code}.png`;
  }
}

// ---------------- PIECE LAYER ----------------

export class PieceLayer {

  constructor(container, options = {}) {
    this.container = container;
    this.orientation = options.orientation || "w";
    this.pieceTheme = options.pieceTheme || DEFAULT_PIECE_THEME;
    this.animationMs = options.animationMs ?? 190;

    this.classes = {
      ...DEFAULT_CLASS_NAMES,
      ...options.classNames,
    };

    this.pieces = new Map();
    this.position = new Map();
    this.squares = new Map();
    this.nextPieceId = 1;

    this.container.classList.add("board-shell");
    this.container.style.setProperty(
      "--pl-duration",
      `${this.animationMs}ms`
    );

    this.squareLayer =
      document.createElement("div");

    this.squareLayer.className = "square-layer";

    this.pieceLayer =
      document.createElement("div");

    this.pieceLayer.className = "piece-layer";

    this.container.append(
      this.squareLayer,
      this.pieceLayer
    );

    this.buildSquares();
  }

  // ---------------- STATIC SQUARE LAYER ----------------

  // Built exactly once per orientation. Highlights only ever toggle classes,
  // so nothing in here is destroyed while a piece is mid-flight.
  buildSquares() {
    this.squareLayer.innerHTML = "";
    this.squares.clear();

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const file =
          this.orientation === "b"
            ? 7 - col
            : col;

        const rank =
          this.orientation === "b"
            ? row + 1
            : 8 - row;

        const coordinate =
          `${FILES[file]}${rank}`;

        const square =
          document.createElement("div");

        // a1 (file 0, rank 1) must be dark, so even sums are light.
        square.className = [
          this.classes.square,
          (file + rank) % 2 === 0
            ? this.classes.light
            : this.classes.dark,
        ].join(" ");

        square.dataset.square = coordinate;

        if (col === 0) {
          square.append(
            this.buildCoordinate("rank", String(rank))
          );
        }

        if (row === 7) {
          square.append(
            this.buildCoordinate("file", FILES[file])
          );
        }

        this.squareLayer.append(square);
        this.squares.set(coordinate, square);
      }
    }
  }

  buildCoordinate(kind, text) {
    const label =
      document.createElement("span");

    label.className = [
      this.classes.coordinate,
      kind === "rank"
        ? this.classes.rank
        : this.classes.file,
    ].join(" ");

    label.textContent = text;

    return label;
  }

  setOrientation(orientation) {
    if (orientation === this.orientation) {
      return;
    }

    this.orientation = orientation;

    this.buildSquares();

    for (const entry of this.pieces.values()) {
      this.paintTransform(entry, { animate: true });
    }
  }

  // ---------------- TRANSFORMS ----------------

  // Percentage translate resolves against the piece's own box, which is
  // exactly one square wide. So a move is "translate(3 squares right)"
  // and the whole thing survives resize with no JS recalculation.
  paintTransform(entry, { animate = true } = {}) {
    const { col, row } =
      gridPosition(entry.square, this.orientation);

    if (!animate) {
      entry.element.style.transition = "none";
    }

    entry.element.style.transform =
      `translate(${col * 100}%, ${row * 100}%)`;

    if (!animate) {
      void entry.element.offsetWidth;
      entry.element.style.transition = "";
    }
  }

  // Outer element owns grid position (translate); inner art owns visual
  // pops (scale/glow). Keeping them apart means drag scaling, summon pops
  // and capture shrinks never fight the positioning transform.
  createPiece(code, square) {
    const element =
      document.createElement("div");

    element.className = "pl-piece";

    const art =
      document.createElement("div");

    art.className = "pl-piece-art";

    art.style.backgroundImage =
      `url("${this.pieceTheme}${code}.png")`;

    element.append(art);

    const entry = {
      id: this.nextPieceId++,
      code,
      square,
      element,
      art,
    };

    this.pieceLayer.append(element);
    this.paintTransform(entry, { animate: false });
    this.pieces.set(square, entry);

    return entry;
  }

  setPieceCode(entry, code) {
    entry.code = code;

    entry.art.style.backgroundImage =
      `url("${this.pieceTheme}${code}.png")`;
  }

  relocate(entry, square, { lift = false, animate = true } = {}) {
    if (!entry) {
      return;
    }

    if (this.pieces.get(entry.square) === entry) {
      this.pieces.delete(entry.square);
    }

    entry.square = square;
    this.pieces.set(square, entry);

    if (lift) {
      entry.element.classList.add("pl-moving");

      window.clearTimeout(entry.liftTimer);

      entry.liftTimer =
        window.setTimeout(
          () => entry.element.classList.remove("pl-moving"),
          this.animationMs
        );
    }

    this.paintTransform(entry, { animate });
  }

  removePiece(entry, { fade = true } = {}) {
    if (!entry) {
      return;
    }

    if (this.pieces.get(entry.square) === entry) {
      this.pieces.delete(entry.square);
    }

    if (!fade) {
      entry.element.remove();
      return;
    }

    entry.element.classList.add("pl-captured");

    window.setTimeout(
      () => entry.element.remove(),
      this.animationMs + 80
    );
  }

  summon(code, square) {
    const existing =
      this.pieces.get(square);

    if (existing) {
      this.removePiece(existing, { fade: false });
    }

    const entry =
      this.createPiece(code, square);

    entry.element.classList.add("pl-summoned");

    window.setTimeout(
      () => entry.element.classList.remove("pl-summoned"),
      520
    );

    return entry;
  }

  // ---------------- APPLYING POSITIONS ----------------

  // `move` is optional. When present and consistent with what the layer
  // currently holds, the exact piece is animated. Otherwise we reconcile
  // against the FEN, matching each orphaned piece to the nearest same-coded
  // target square -- which covers castling, en passant and plain moves.
  setPosition(fen, { move = null, animate = true } = {}) {
    const target =
      parseFen(fen);

    if (animate && move && this.canApplyMove(move)) {
      this.applyMove(move);
    } else {
      this.reconcile(target, { animate });
    }

    this.position = target;
  }

  canApplyMove(move) {
    if (!move) {
      return false;
    }

    if (move.type === "reserve") {
      return Boolean(move.code && move.to);
    }

    return Boolean(
      move.from &&
      move.to &&
      this.pieces.has(move.from)
    );
  }

  applyMove(move) {
    if (move.type === "reserve") {
      this.summon(move.code, move.to);
      return;
    }

    const entry =
      this.pieces.get(move.from);

    // En passant puts the captured pawn on neither `from` nor `to`.
    const captureSquare =
      move.captureSquare ||
      (this.pieces.has(move.to) ? move.to : null);

    if (captureSquare) {
      this.removePiece(
        this.pieces.get(captureSquare),
        { fade: true }
      );
    }

    this.relocate(entry, move.to, { lift: true });

    // Castling moves two pieces on one turn.
    if (move.rook) {
      this.relocate(
        this.pieces.get(move.rook.from),
        move.rook.to
      );
    }

    // Promotion slides the pawn, then swaps the sprite on arrival.
    if (move.promotion) {
      const promoted =
        `${entry.code[0]}${move.promotion.toUpperCase()}`;

      window.setTimeout(
        () => {
          this.setPieceCode(entry, promoted);

          entry.element.classList.add("pl-promoted");

          window.setTimeout(
            () => entry.element.classList.remove("pl-promoted"),
            360
          );
        },
        this.animationMs
      );
    }
  }

  reconcile(target, { animate = true } = {}) {
    const orphans = [];

    for (const [square, entry] of [...this.pieces.entries()]) {
      if (target.get(square) !== entry.code) {
        this.pieces.delete(square);
        orphans.push(entry);
      }
    }

    for (const [square, code] of target.entries()) {
      if (this.pieces.get(square)?.code === code) {
        continue;
      }

      let bestIndex = -1;
      let bestDistance = Infinity;

      for (let i = 0; i < orphans.length; i++) {
        if (orphans[i].code !== code) {
          continue;
        }

        const distance =
          squareDistance(orphans[i].square, square);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }

      if (bestIndex === -1) {
        this.createPiece(code, square);
        continue;
      }

      const [entry] =
        orphans.splice(bestIndex, 1);

      entry.square = square;
      this.pieces.set(square, entry);
      this.paintTransform(entry, { animate });
    }

    for (const entry of orphans) {
      this.removePiece(entry, { fade: animate });
    }
  }

  // ---------------- HIGHLIGHTS ----------------

  setHighlights({
    lastMove = [],
    selected = null,
    legal = [],
    captures = [],
    premove = [],
    check = null,
  } = {}) {
    for (const [coordinate, square] of this.squares.entries()) {
      square.classList.toggle(
        this.classes.lastMove,
        lastMove.includes(coordinate)
      );

      square.classList.toggle(
        this.classes.selected,
        coordinate === selected
      );

      square.classList.toggle(
        this.classes.legal,
        legal.includes(coordinate)
      );

      square.classList.toggle(
        this.classes.capture,
        captures.includes(coordinate)
      );

      square.classList.toggle(
        this.classes.premove,
        premove.includes(coordinate)
      );

      square.classList.toggle(
        this.classes.check,
        coordinate === check
      );
    }
  }

  // ---------------- HIT TESTING ----------------

  // The piece layer is fully `pointer-events: none`, so there is no
  // `elementFromPoint` ambiguity and no per-piece listeners. One listener
  // on the shell plus this is the entire input surface.
  squareFromPoint(clientX, clientY) {
    const rect =
      this.container.getBoundingClientRect();

    const size =
      rect.width / 8;

    const col =
      Math.floor((clientX - rect.left) / size);

    const row =
      Math.floor((clientY - rect.top) / size);

    if (col < 0 || col > 7 || row < 0 || row > 7) {
      return null;
    }

    const file =
      this.orientation === "b"
        ? 7 - col
        : col;

    const rank =
      this.orientation === "b"
        ? row + 1
        : 8 - row;

    return `${FILES[file]}${rank}`;
  }

  getPiece(square) {
    return this.pieces.get(square) || null;
  }

  // ---------------- DRAG ----------------

  beginDrag(entry) {
    entry.element.classList.add("pl-dragging");
  }

  dragTo(entry, clientX, clientY) {
    const rect =
      this.container.getBoundingClientRect();

    const size =
      rect.width / 8;

    const x =
      clientX - rect.left - size / 2;

    const y =
      clientY - rect.top - size / 2;

    entry.element.style.transform =
      `translate(${x}px, ${y}px)`;
  }

  // `returnHome` glides the piece back to its own square, for a rejected or
  // cancelled drop. On an accepted drop the caller skips it and lets the new
  // position repaint instead, so the piece continues from where it was let go.
  endDrag(entry, { returnHome = true } = {}) {
    if (!entry) {
      return;
    }

    entry.element.classList.remove("pl-dragging");

    if (returnHome) {
      this.paintTransform(entry, { animate: true });
    }
  }

  setAnimationDuration(milliseconds) {
    this.animationMs = milliseconds;

    this.container.style.setProperty(
      "--pl-duration",
      `${milliseconds}ms`
    );
  }
}
