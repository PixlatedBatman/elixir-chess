const SOUND_SOURCES = {
  move: "/sounds/move.mp3",
  capture: "/sounds/capture.mp3",
  check: "/sounds/move-check.mp3",
  castle: "/sounds/castle.mp3",
  illegal: "/sounds/illegal.mp3",
  lowTime: "/sounds/thirtyseconds.mp3",
  victory: "/sounds/victory.mp3",
  gameOver: "/sounds/game_over.mp3",
};

const sounds =
  Object.fromEntries(
    Object.entries(SOUND_SOURCES).map(
      ([name, source]) => [
        name,
        new Audio(source),
      ]
    )
  );

let unlocked = false;

for (const sound of Object.values(sounds)) {
  sound.preload = "auto";
}

export function initializeSound() {
  const unlock = () => {
    unlocked = true;

    document.removeEventListener(
      "pointerdown",
      unlock
    );
  };

  document.addEventListener(
    "pointerdown",
    unlock,
    {
      once: true,
    }
  );
}

export function playMoveSound(options = {}) {
  const opts =
    typeof options === "boolean"
      ? { isCapture: options }
      : options;

  if (opts.isCheck) {
    playSound("check");
  } else if (opts.isCastle) {
    playSound("castle");
  } else if (opts.isCapture) {
    playSound("capture");
  } else {
    playSound("move");
  }
}

export function playIllegalSound() {
  playSound("illegal");
}

export function playLowTimeSound() {
  playSound("lowTime");
}

export function playGameOverSound(
  gameOver,
  playerColor
) {
  if (!gameOver) {
    return;
  }

  if (
    gameOver.reason === "draw" ||
    gameOver.winner === playerColor
  ) {
    playSound("victory");
    return;
  }

  if (
    playerColor === "w" ||
    playerColor === "b"
  ) {
    playSound("gameOver");
  }
}

function playSound(name) {
  if (!unlocked) {
    return;
  }

  const sound =
    sounds[name];

  if (!sound) {
    return;
  }

  sound.currentTime = 0;

  sound.play().catch(
    () => {}
  );
}
