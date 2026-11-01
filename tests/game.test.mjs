import assert from "node:assert/strict";
import test from "node:test";
import {
  randomDie,
  rollDice,
  evaluateRoll,
  createSession,
  recordRoll,
} from "../game.js";

test("each accepted six-value block maps once to every die face", () => {
  for (const start of [0, 6, 120, 4294967286]) {
    const faces = Array.from({ length: 6 }, (_, index) =>
      randomDie(() => start + index),
    );
    assert.deepEqual(faces, [1, 2, 3, 4, 5, 6]);
  }
});

test("the largest accepted value is valid, while all four biased tail values are rejected", () => {
  assert.equal(
    randomDie(() => 4294967291),
    6,
  );
  const values = [4294967292, 4294967293, 4294967294, 4294967295, 4];
  let calls = 0;
  assert.equal(
    randomDie(() => values[calls++]),
    5,
  );
  assert.equal(calls, 5);
});

test("invalid random sources fail explicitly", () => {
  assert.throws(() => randomDie(null), TypeError);
  for (const invalid of [-1, 2 ** 32, 1.5, NaN, Infinity, "2", undefined]) {
    assert.throws(() => randomDie(() => invalid), RangeError);
  }
});

test("the browser-compatible default random source produces two valid dice", () => {
  // Range validation is deterministic; do not test fairness with flaky sampling.
  for (let index = 0; index < 20; index += 1) {
    const dice = rollDice();
    assert.equal(dice.length, 2);
    dice.forEach((face) =>
      assert.ok(Number.isInteger(face) && face >= 1 && face <= 6),
    );
  }
});

test("all 36 ordered rolls have the correct total, symmetry, and outcome counts", () => {
  const counts = { win: 0, draw: 0, loss: 0 };
  for (let first = 1; first <= 6; first += 1) {
    for (let second = 1; second <= 6; second += 1) {
      const result = evaluateRoll([first, second]);
      assert.equal(result.total, first + second);
      assert.equal(
        result.outcome,
        first + second > 8 ? "win" : first + second === 8 ? "draw" : "loss",
      );
      assert.deepEqual(result, evaluateRoll([second, first]));
      counts[result.outcome] += 1;
    }
  }
  assert.deepEqual(counts, { win: 10, draw: 5, loss: 21 });
});

test("eight is always a draw, including after a winning roll", () => {
  const winner = recordRoll(createSession(), [6, 6]);
  const drawn = recordRoll(winner, [2, 6]);
  assert.equal(drawn.history[0].outcome, "draw");
  assert.equal(drawn.history[0].total, 8);
  assert.equal(drawn.wins, 1);
  assert.equal(drawn.draws, 1);
  assert.equal(drawn.losses, 0);
});

test("a roll must contain exactly two valid integer faces", () => {
  for (const invalid of [null, undefined, {}, "12", [], [1], [1, 2, 3]]) {
    assert.throws(() => evaluateRoll(invalid), TypeError);
  }
  for (const face of [0, 7, -1, 1.5, NaN, Infinity, "1", undefined]) {
    assert.throws(() => evaluateRoll([face, 1]), RangeError);
    assert.throws(() => evaluateRoll([1, face]), RangeError);
  }
  assert.throws(() => evaluateRoll(new Array(2)), RangeError);
});

test("new sessions are independent and start without fabricated rolls", () => {
  const first = createSession();
  const second = createSession();
  assert.deepEqual(first, {
    rolls: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
    history: [],
  });
  assert.notEqual(first, second);
  assert.notEqual(first.history, second.history);
});

test("wins extend a streak, draws and losses break it, and the best streak survives", () => {
  let session = createSession();
  for (const dice of [
    [6, 3],
    [5, 5],
    [4, 4],
    [6, 6],
    [1, 1],
  ]) {
    session = recordRoll(session, dice);
  }
  assert.deepEqual(
    {
      rolls: session.rolls,
      wins: session.wins,
      draws: session.draws,
      losses: session.losses,
      currentStreak: session.currentStreak,
      bestStreak: session.bestStreak,
    },
    { rolls: 5, wins: 3, draws: 1, losses: 1, currentStreak: 0, bestStreak: 2 },
  );
});

test("recording is immutable and copies the provided dice", () => {
  const initial = createSession();
  Object.freeze(initial.history);
  Object.freeze(initial);
  const dice = [6, 4];
  const first = recordRoll(initial, dice);
  dice[0] = 1;
  assert.deepEqual(initial, createSession());
  assert.deepEqual(first.history[0].dice, [6, 4]);
  Object.freeze(first.history[0].dice);
  Object.freeze(first.history[0]);
  Object.freeze(first.history);
  Object.freeze(first);
  const second = recordRoll(first, [1, 1]);
  assert.notEqual(first, second);
  assert.notEqual(first.history, second.history);
  assert.equal(first.rolls, 1);
  assert.equal(first.history.length, 1);
  assert.equal(second.rolls, 2);
});

test("history retains the latest eight rolls in descending order without truncating totals", () => {
  let session = createSession();
  for (let index = 0; index < 12; index += 1) {
    session = recordRoll(session, index % 2 ? [2, 6] : [6, 6]);
  }
  assert.equal(session.history.length, 8);
  assert.deepEqual(
    session.history.map((roll) => roll.id),
    [12, 11, 10, 9, 8, 7, 6, 5],
  );
  assert.equal(session.rolls, 12);
  assert.equal(session.wins, 6);
  assert.equal(session.draws, 6);
  assert.equal(session.losses, 0);
  assert.deepEqual(session.history[0], {
    id: 12,
    dice: [2, 6],
    total: 8,
    outcome: "draw",
  });
});

test("invalid dice cannot mutate an existing session", () => {
  const session = recordRoll(createSession(), [3, 6]);
  const snapshot = structuredClone(session);
  assert.throws(() => recordRoll(session, [8, 3]), RangeError);
  assert.deepEqual(session, snapshot);
});
