# Mateo & Bros

**Mateo & Bros** is a retro-inspired 2D platformer that pays homage to Super Mario Bros. It runs entirely in the browser with plain HTML, CSS, and a single JavaScript file that renders everything on `<canvas>`. You guide brothers Mateo, Nick, and Vas across ten handcrafted stages filled with coins, whimsical enemies, and nautical souvenirs that celebrate their travels.

## Key features

- 100% vanilla web stack: `index.html` hosts the canvas while `main.js` contains the entire game loop—no build tools or dependencies.
- Three playable brothers with unique sprites, outfits, and expressions. The story rotates through them automatically, but you can switch instantly with `1`, `2`, or `3`.
- Ten linear levels built from ASCII tilemaps (`X`) and decorated with parallax backgrounds, waves, fireflies, meteors, and other ambient details.
- Collectibles include coins, question blocks, breakable bricks when you are big, and three souvenirs (helm, anchor, compass) hidden in each level.
- Diverse enemies—crabs, bats, rolling armadillos, floating jellyfish, and UFOs—plus stomp combos for bonus points.
- Synthy Web Audio soundtrack, pause toggle that mutes the music, and per-level scorecards that wrap each stage with quick stats.

## Controls

- Left / Right arrows: move the active brother.
- Up arrow or `Space`: jump while on the ground.
- `Space`, `Enter`, or any arrow: start from the menu, continue after winning, or restart after a Game Over.
- `1`, `2`, `3`: switch to Mateo, Nick, or Vas whenever you want to change style.
- `P`: pause or resume; also toggles the background music.

## Game flow

1. **Interactive title screen** – shows the cover art (`mateo & bros 2.png`), instructions, and an animated harbor. Press `Space`, `Enter`, or an arrow to begin.
2. **Gameplay** – the camera follows the player across the world (`worldWidth` comes from the tilemap). Reach the flag pole without losing all three lives. Collect coins (+10), souvenirs (+100), and growth capsules to become "Big" so you can survive an extra hit and smash bricks.
3. **Intermission screens**  
   - Touching the flag triggers an animation, a fanfare, and stat cards with souvenirs, score, and coin totals. `Space` advances to the next brother or, after level 10, to the finale.  
   - Losing every life shows the `GAME OVER` screen with your score and a restart prompt.
4. **Grand finale** – clearing the tenth level triggers a celebratory screen that thanks the player and offers to restart from Mateo.

## Collectibles, power-ups, and scoring

- **Coins** – float in midair, award 10 points, and burst into golden particles when collected.
- **Question blocks** – hit them from below to summon coins or a star capsule (`growth`) that pops out of a bubble, grants the Big form, and adds 50 points.
- **Bricks** – serve as short platforms. Only Big brothers can shatter them into debris.
- **Souvenirs** – three per level. Picking one up gives 100 points, shows "Souvenir collected!", and lights up its HUD icon.
- **Lives** – you start with three hearts. Taking damage while small removes a life and respawns you at the start; when big, you shrink first. There are no extra lives, so protect those capsules.
- **Combos** – chaining stomps builds `stompCombo`, which increases points and fills a temporary combo meter.

## Enemies and hazards

- **Crabs** – patrol the ground with tiny sine-wave hops and can be stomped.
- **Bats** – glide on oscillating paths and dive toward the player, rewarding higher rebound jumps when stomped.
- **Armadillos** – armored sprinters that bounce you away; stomps do not defeat them, and some roll after hitting walls.
- **Jellyfish** – float above the sea with smooth vertical motion and horizontal limits.
- **UFOs** – hover in the space level and enable aerial combos.
- **Ambient critters** – fish, fireflies, embers, meteors, and distant ships reinforce the mood but cannot hurt you.

## HUD and presentation

- **Score widgets** – display the current score, collected coins, `Level N/10 - Brother`, and the power state (`Big` or `Small`).
- **Progress bar** – shows how close you are to the flag.
- **Animated hearts** – indicate remaining lives in the top-right corner.
- **Souvenir icons** – a vertical row highlights which collectibles are still missing.
- **Speech bubbles** – each brother has signature phrases ("NO COMPA", "MA DAI", "MIERDA") that appear when hit.
- **Audio polish** – minimalist beeps for jumps, coins, combos, and fanfares on victory screens.

## Levels and themes

The game ships with ten level definitions inside `levelConfigs`. Each entry declares the tilemap, blocks, coins, souvenirs, enemies, background layers, and optional tuning values like `gravityScale` or `playerSpeed`. The brother order (`levelOrder`) loops Mateo -> Nick -> Vas throughout the campaign.

| Level | Brother | Theme | Highlights |
| --- | --- | --- | --- |
| 1 | Mateo | Coastal forest | Introduces crabs, bats, and the first souvenir trio. |
| 2 | Nick | Sunset desert | Tiered ledges, roaming bats, and midair blocks. |
| 3 | Vas | Turquoise bay | Parallax waves, fish schools, and higher jumps. |
| 4 | Mateo | Firefly jungle | New "X" formations, armadillos, and glowing fireflies. |
| 5 | Nick | Noctilucent sea | Lighter gravity (0.9), jellyfish, and sparkling clouds. |
| 6 | Vas | Clay canyon | Twin armadillo patrols and rougher terrain. |
| 7 | Mateo | Volcanic slopes | Red palette with drifting embers and double brick stacks. |
| 8 | Nick | Frozen ridge | Cool tones, crystal sparks, and wide platform gaps. |
| 9 | Vas | Orbital journey | Reduced gravity (0.65), helmet on, UFOs, and meteors. |
| 10 | Mateo | Violet dusk finale | Slightly heavier gravity (1.05) with a final stats screen to wrap the adventure. |

## Project structure

```
Mateo & Bros/
|-- index.html          # Declares the 800x400 canvas and loads main.js
|-- main.js             # Core logic, levels, rendering, and audio
|-- mateo & bros 2.png  # Cover art displayed on the menu
|-- mateo & bros.jpg    # Extra artwork (currently unused)
`-- README.md
```

## How to run

1. Clone or download the folder.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari). Double-clicking the file is enough.
3. (Optional) If you prefer a local server, run from the project directory:

   ```bash
   python3 -m http.server 8080
   ```

   Then browse to `http://localhost:8080`.
4. The first interaction (pressing `Space`, etc.) resumes the `AudioContext` so the background music can start, which matches modern browser policies.

## Quick customization

- **Levels** – edit `levelConfigs` in `main.js`. Each object contains `levelData` (ASCII map), `questionBlocks`, `bricks`, `coins`, `souvenirs`, `enemies`, background props, and optional tuning like `gravityScale`, `helmet`, or `playerSpeed`.
- **Brother order** – adjust `levelOrder` to decide who stars in each stage or duplicate a favorite.
- **Sprites** – every entry in `characters` defines a palette, accessories, and phrases. Modify colors to create new skins without touching rendering code.
- **Assets** – replace `mateo & bros 2.png` with your own art (keeping the same name) or update the file paths in `main.js`.

## Credits

Game, art, and code by Vasyl Pavlyuchok. Mateo & Bros is a non-commercial learning project meant to capture an 8-bit vibe while practicing plain-JavaScript game development.
