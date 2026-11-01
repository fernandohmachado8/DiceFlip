// Six real CSS planes. Each visible face has the same value as the game result.
const FACE_ROTATIONS = {
  1: [0, 0],
  2: [0, -90],
  3: [-90, 0],
  4: [90, 0],
  5: [0, 90],
  6: [0, 180],
};

const PIPS = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function validateValue(value) {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new RangeError("A die value must be an integer from 1 to 6.");
  }
}

function transform(x, y, lift = 0, lean = 0) {
  // The two final rotations orient the requested face toward the viewer.
  // The earlier rotations add the same small presentation tilt to every value.
  return `translateY(${lift}px) rotateZ(${lean}deg) rotateX(-18deg) rotateY(-24deg) rotateX(${x}deg) rotateY(${y}deg)`;
}

function restingTransform(value) {
  return transform(...FACE_ROTATIONS[value]);
}

/**
 * Mount decorative dice inside an element whose accessible label is owned by
 * the application. Returns set(value), roll(value, options), and cancel().
 * A canceled roll resolves normally and restores the last settled face.
 */
export function mountDie(container, { value = 1, tone = "ivory" } = {}) {
  if (!container || container.nodeType !== 1) {
    throw new TypeError("mountDie requires an HTML element.");
  }
  validateValue(value);
  if (tone !== "ivory" && tone !== "coral") {
    throw new RangeError("Die tone must be ivory or coral.");
  }

  const document = container.ownerDocument;
  const cube = document.createElement("span");
  cube.className = `die-cube die-tone-${tone}`;
  cube.setAttribute("aria-hidden", "true");
  container.classList.add("die-scene");

  for (let faceValue = 1; faceValue <= 6; faceValue += 1) {
    const face = document.createElement("span");
    face.className = `die-face die-face-${faceValue}`;
    for (const position of PIPS[faceValue]) {
      const pip = document.createElement("span");
      pip.className = "die-pip";
      pip.style.gridRow = String(Math.ceil(position / 3));
      pip.style.gridColumn = String(((position - 1) % 3) + 1);
      face.append(pip);
    }
    cube.append(face);
  }

  container.append(cube);
  let currentValue = value;
  let active = null;
  cube.style.transform = restingTransform(currentValue);

  function cancel() {
    if (!active) return;
    const canceled = active;
    active = null;
    canceled.animation.cancel();
    cube.style.transform = restingTransform(currentValue);
    canceled.resolve();
  }

  function set(nextValue) {
    validateValue(nextValue);
    cancel();
    currentValue = nextValue;
    cube.style.transform = restingTransform(currentValue);
  }

  function roll(nextValue, { duration = 950, reducedMotion = false } = {}) {
    validateValue(nextValue);
    if (!Number.isFinite(duration) || duration < 0) {
      throw new RangeError(
        "Roll duration must be a finite nonnegative number.",
      );
    }
    cancel();

    const prefersReducedMotion = globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (
      reducedMotion ||
      prefersReducedMotion ||
      duration === 0 ||
      !cube.animate
    ) {
      set(nextValue);
      return Promise.resolve();
    }

    const [startX, startY] = FACE_ROTATIONS[currentValue];
    const [targetX, targetY] = FACE_ROTATIONS[nextValue];
    const finalTransform = restingTransform(nextValue);
    const keyframes = [
      { transform: transform(startX, startY), offset: 0 },
      {
        transform: transform(targetX + 290, targetY + 175, -18, -7),
        offset: 0.38,
      },
      {
        transform: transform(targetX + 650, targetY + 325, -5, 3),
        offset: 0.8,
      },
      { transform: transform(targetX + 720, targetY + 360), offset: 1 },
    ];

    return new Promise((resolve) => {
      const animation = cube.animate(keyframes, {
        duration,
        easing: "cubic-bezier(.2,.65,.3,1)",
        fill: "forwards",
      });
      const rollState = { animation, resolve };
      active = rollState;
      animation.finished.then(
        () => {
          if (active !== rollState) return;
          currentValue = nextValue;
          cube.style.transform = finalTransform;
          active = null;
          animation.cancel();
          resolve();
        },
        () => {
          if (active !== rollState) return;
          active = null;
          cube.style.transform = restingTransform(currentValue);
          resolve();
        },
      );
    });
  }

  return { set, roll, cancel };
}
