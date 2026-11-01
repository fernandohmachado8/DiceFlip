// Six divides this range exactly, so accepted values have no modulo bias.
const UINT32_LIMIT = 2 ** 32;
const ACCEPTED_LIMIT = UINT32_LIMIT - (UINT32_LIMIT % 6);
const HISTORY_LIMIT = 8;

function defaultCryptoGetter() {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
}

export function randomDie(nextUint32 = defaultCryptoGetter) {
  if (typeof nextUint32 !== "function") {
    throw new TypeError("The random source must be a function.");
  }
  while (true) {
    const value = nextUint32();
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_LIMIT) {
      throw new RangeError(
        "The random source must return an unsigned 32-bit integer.",
      );
    }
    if (value < ACCEPTED_LIMIT) return (value % 6) + 1;
  }
}

export function rollDice() {
  return [randomDie(), randomDie()];
}

export function evaluateRoll(dice) {
  if (!Array.isArray(dice) || dice.length !== 2) {
    throw new TypeError("A roll must contain exactly two dice.");
  }
  for (const face of dice) {
    if (!Number.isInteger(face) || face < 1 || face > 6) {
      throw new RangeError("Each die must be an integer from one to six.");
    }
  }
  const total = dice[0] + dice[1];
  return { total, outcome: total > 8 ? "win" : total === 8 ? "draw" : "loss" };
}

export function createSession() {
  return {
    rolls: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
    history: [],
  };
}

// Return a new state without mutating either the previous state or input dice.
export function recordRoll(session, dice) {
  const { total, outcome } = evaluateRoll(dice);
  const rolls = session.rolls + 1;
  const currentStreak = outcome === "win" ? session.currentStreak + 1 : 0;
  return {
    rolls,
    wins: session.wins + Number(outcome === "win"),
    draws: session.draws + Number(outcome === "draw"),
    losses: session.losses + Number(outcome === "loss"),
    currentStreak,
    bestStreak: Math.max(session.bestStreak, currentStreak),
    history: [
      { id: rolls, dice: [...dice], total, outcome },
      ...session.history,
    ].slice(0, HISTORY_LIMIT),
  };
}
