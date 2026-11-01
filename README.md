# DiceFlip

A playful two-dice classic with animated 3D dice, clear results, and a rolling session history.

**Play:** https://fernandohmachado8.github.io/DiceFlip/

## How to play

Roll two six-sided dice and add their values:

- **9–12:** win.
- **8:** draw.
- **2–7:** miss. Try again.

Click **Roll the dice** or press **Space** outside another control. Focused buttons also support Enter and Space. Each completed roll updates your win count, win rate, best consecutive-win streak, and the last eight results. A draw or miss breaks the streak.

**Reset session** clears the current stats and history, including safely canceling a roll in progress. Refreshing the page also starts a new session. No accounts, storage, tracking, or stakes.

## What was completed

- Replaced the original uneven random intervals with unbiased Web Crypto rejection sampling.
- Defined the missing exactly-eight result as a draw.
- Built six actual CSS 3D faces per die, with correct pips and opposite faces totaling seven.
- Added repeatable tumble animation and reduced-motion support.
- Prevented overlapping rolls and stale results after reset.
- Added responsive layouts, keyboard controls, accessible result announcements, and original local artwork.

Ten of the 36 equally likely ordered pairs win, five draw, and 21 miss. Each roll is independent; prior results do not change the next roll's chance.

## Run locally

Native JavaScript modules require HTTP. With Python installed:

```sh
python -m http.server 8000
```

Open http://localhost:8000. No build or dependency installation is needed.

## Checks

With Node.js installed:

```sh
npm test
npm run check
```

The native Node suite checks every dice combination, random-source boundaries and rejected values, strict face validation, immutable session updates, streak rules, and the history limit.

Browser QA checklist: dice animation and visible face values, repeated rolls, disabled roll control while moving, keyboard roll, reset during animation, history limit, all result states, instructions, mobile layouts, and reduced-motion behavior.

## Files

- `index.html`, `styles.css`: the table, layout, and instructions.
- `script.js`: interaction and session rendering.
- `game.js`: independent random and game logic.
- `dice.js`, `dice.css`: the reusable 3D dice renderer.
- `tests/game.test.mjs`: pure logic tests.

All runtime assets are local. The original 2024 code and SVG dice are preserved in Git history.

## Publish

GitHub Pages serves the root of `main`: Settings → Pages → Deploy from a branch → main → / (root). Pushes deploy automatically, and relative URLs support the `/DiceFlip/` project path.

A project by Fernando Machado.
