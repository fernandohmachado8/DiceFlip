import { rollDice, createSession, recordRoll } from "./game.js";
import { mountDie } from "./dice.js";

const $ = (selector) => document.querySelector(selector);
const rollButton = $("#roll-button");
const resetButton = $("#reset-button");
const dialog = $("#help-dialog");
const firstContainer = $("#die-one");
const secondContainer = $("#die-two");
const firstDie = mountDie(firstContainer, { value: 1, tone: "ivory" });
const secondDie = mountDie(secondContainer, { value: 6, tone: "coral" });
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let session = createSession();
let phase = "ready";
let transaction = 0;

const pipPositions = {
  1: [[12, 12]],
  2: [
    [7, 7],
    [17, 17],
  ],
  3: [
    [7, 7],
    [12, 12],
    [17, 17],
  ],
  4: [
    [7, 7],
    [17, 7],
    [7, 17],
    [17, 17],
  ],
  5: [
    [7, 7],
    [17, 7],
    [12, 12],
    [7, 17],
    [17, 17],
  ],
  6: [
    [7, 6.5],
    [17, 6.5],
    [7, 12],
    [17, 12],
    [7, 17.5],
    [17, 17.5],
  ],
};
const outcomeNames = { win: "Win", draw: "Draw", loss: "Miss" };

function announce(message) {
  $("#game-announcement").textContent = message;
}
function formatNumber(number) {
  return String(number).padStart(2, "0");
}
function miniDie(value, coral = false) {
  const pips = pipPositions[value]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5"/>`)
    .join("");
  return `<svg class="mini-die${coral ? " coral" : ""}" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="5" fill="none" stroke="currentColor" stroke-width="1"/><g fill="currentColor">${pips}</g></svg>`;
}
function renderSession() {
  $("#roll-count").textContent = formatNumber(session.rolls);
  $("#win-count").textContent = formatNumber(session.wins);
  $("#best-streak").textContent = formatNumber(session.bestStreak);
  $("#win-rate").textContent = session.rolls
    ? `${Math.round((session.wins / session.rolls) * 100)}%`
    : "—";
  for (const kind of ["wins", "draws", "losses"]) {
    $(`#${kind}-bar`).style.width =
      `${session.rolls ? (session[kind] / session.rolls) * 100 : 0}%`;
    $(`#legend-${kind}`).textContent = session[kind];
  }
  $("#history-empty").hidden = session.rolls !== 0;
  $("#history-list").hidden = session.rolls === 0;
  $("#history-list").innerHTML = session.history
    .map(
      (roll) => `
    <li class="history-item" aria-label="Roll ${roll.id}: ${roll.dice[0]} and ${roll.dice[1]}, total ${roll.total}. ${outcomeNames[roll.outcome]}.">
      <span class="history-index">${formatNumber(roll.id)}</span>
      ${miniDie(roll.dice[0])}<span class="history-plus" aria-hidden="true">+</span>${miniDie(roll.dice[1], true)}
      <span class="history-equals" aria-hidden="true">=</span><span class="history-total">${roll.total}</span>
      <span class="history-outcome ${roll.outcome}">${outcomeNames[roll.outcome]}</span>
    </li>`,
    )
    .join("");
  resetButton.disabled = session.rolls === 0 && phase !== "rolling";
}
function renderResult(roll) {
  $("#result-row").dataset.outcome = roll.outcome;
  $("#total").textContent = roll.total;
  $("#face-one").textContent = roll.dice[0];
  $("#face-two").textContent = roll.dice[1];
  firstContainer.setAttribute("aria-label", `First die: ${roll.dice[0]}`);
  secondContainer.setAttribute("aria-label", `Second die: ${roll.dice[1]}`);
  firstContainer.dataset.value = roll.dice[0];
  secondContainer.dataset.value = roll.dice[1];
  const copy = {
    win: {
      kicker: "A LITTLE LUCK ON YOUR SIDE",
      title: "That’s a win.",
      description:
        session.currentStreak > 1
          ? `${session.currentStreak} wins in a row. Look at you go.`
          : roll.total === 12
            ? "Double six. A rather lovely way to start something."
            : "Nine or more. You’ve found your lucky moment.",
      symbol: "✳",
    },
    draw: {
      kicker: "MEET YOU IN THE MIDDLE",
      title: "Perfectly in between.",
      description: "Exactly eight is a draw. Another roll, another chance.",
      symbol: "=",
    },
    loss: {
      kicker: "A FRESH CHANCE IS WAITING",
      title: "Not this time.",
      description: "The dice have other plans. Nine or more takes the win.",
      symbol: "↻",
    },
  }[roll.outcome];
  $("#result-kicker").textContent = copy.kicker;
  $("#result-title").textContent = copy.title;
  $("#result-description").textContent = copy.description;
  $("#result-symbol").textContent = copy.symbol;
  $("#table-note").textContent =
    roll.outcome === "win"
      ? "A little luck looks good on you."
      : "A fresh chance, every time.";
}
function setRolling(rolling) {
  rollButton.disabled = rolling;
  $("#roll-button-label").textContent = rolling
    ? "A little suspense…"
    : "Roll the dice";
  $("#result-row").setAttribute("aria-busy", String(rolling));
  $("#dice-table").setAttribute("aria-busy", String(rolling));
  resetButton.disabled = session.rolls === 0 && !rolling;
}
async function performRoll() {
  if (phase === "rolling" || dialog.open) return;
  const currentTransaction = ++transaction;
  const restoreFocus = document.activeElement === rollButton;
  phase = "rolling";
  setRolling(true);
  $("#result-row").dataset.outcome = "rolling";
  $("#total").textContent = "…";
  $("#result-kicker").textContent = "A LITTLE SUSPENSE";
  $("#result-title").textContent = "Let’s see what lands.";
  $("#result-description").textContent = "Two dice. One fresh possibility.";
  $("#result-symbol").textContent = "↻";
  $("#table-note").textContent = "Good things are in motion.";
  firstContainer.setAttribute("aria-label", "First die rolling");
  secondContainer.setAttribute("aria-label", "Second die rolling");
  announce("Rolling both dice.");
  try {
    // Generate the actual outcome once. Animation never changes the result.
    const faces = rollDice();
    await Promise.all([
      firstDie.roll(faces[0], {
        duration: 1000,
        reducedMotion: reducedMotion.matches,
      }),
      secondDie.roll(faces[1], {
        duration: 1130,
        reducedMotion: reducedMotion.matches,
      }),
    ]);
    if (currentTransaction !== transaction) return;
    session = recordRoll(session, faces);
    phase = "ready";
    renderResult(session.history[0]);
    renderSession();
    announce(
      `You rolled ${faces[0]} and ${faces[1]}. Total ${session.history[0].total}. ${outcomeNames[session.history[0].outcome]}. ${session.wins} wins in ${session.rolls} rolls.`,
    );
  } catch (error) {
    if (currentTransaction !== transaction) return;
    firstDie.cancel();
    secondDie.cancel();
    phase = "ready";
    if (session.history.length) {
      firstDie.set(session.history[0].dice[0]);
      secondDie.set(session.history[0].dice[1]);
      renderResult(session.history[0]);
    } else {
      firstDie.set(1);
      secondDie.set(6);
      setReadyResult();
    }
    $("#result-title").textContent = "Let’s try that again.";
    $("#result-description").textContent =
      "The roll couldn’t finish. Try again in a current browser.";
    announce("The roll could not finish. Please try again.");
    console.error("DiceFlip could not complete the roll.", error);
  } finally {
    if (currentTransaction === transaction) {
      setRolling(false);
      if (
        restoreFocus &&
        (document.activeElement === document.body ||
          document.activeElement === rollButton)
      )
        rollButton.focus({ preventScroll: true });
    }
  }
}
function setReadyResult() {
  $("#result-row").dataset.outcome = "ready";
  $("#total").textContent = "—";
  $("#face-one").textContent = "—";
  $("#face-two").textContent = "—";
  $("#result-kicker").textContent = "THE NEXT ROLL IS YOURS";
  $("#result-title").textContent = "Feeling a little lucky?";
  $("#result-description").textContent =
    "Nine or more wins. Eight is a draw. The rest? A good excuse to roll again.";
  $("#result-symbol").textContent = "↗";
  $("#table-note").textContent = "A fresh chance, every time.";
  firstContainer.setAttribute("aria-label", "First die, preview showing one");
  secondContainer.setAttribute("aria-label", "Second die, preview showing six");
  delete firstContainer.dataset.value;
  delete secondContainer.dataset.value;
}
function resetSession() {
  // Invalidate pending completion before canceling animations, so a late Promise
  // cannot restore cleared results or append a roll to the new session.
  transaction += 1;
  firstDie.cancel();
  secondDie.cancel();
  firstDie.set(1);
  secondDie.set(6);
  session = createSession();
  phase = "ready";
  setRolling(false);
  setReadyResult();
  renderSession();
  rollButton.focus({ preventScroll: true });
  announce("Session reset. Zero rolls. Ready for a fresh start.");
}
rollButton.addEventListener("click", performRoll);
resetButton.addEventListener("click", resetSession);
$("#help-open").addEventListener("click", () => dialog.showModal());
document.addEventListener("keydown", (event) => {
  if (
    event.code !== "Space" ||
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    dialog.open
  )
    return;
  if (
    event.target instanceof HTMLElement &&
    (event.target.isContentEditable ||
      event.target.closest("button, a, input, textarea, select"))
  )
    return;
  event.preventDefault();
  performRoll();
});
renderSession();
