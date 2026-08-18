const SOUND_SOURCES = {
  move: "/sounds/move.mp3",
  capture: "/sounds/capture.mp3",
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

export function playMoveSound(isCapture = false) {
  playSound(
    isCapture
      ? "capture"
      : "move"
  );
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
