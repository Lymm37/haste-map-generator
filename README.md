# Haste Map Generator

Browser-based map generator and predictor for Haste shard runs. Predicts biome variants, paths, fragment modifiers, and items for a given seed.

[Online Version](https://lymm37.github.io/haste-map-generator)

## Installation / Locally Hosting

If you prefer to run this tool locally instead of using the web version, assuming you have Node installed:

1. Clone the repository

```bash
git clone https://github.com/Lymm37/haste-map-generator.git
cd haste-map-generator
```

2. Run a minimal local server, with Node:

```bash
npx serve
```

or with Python:
```bash
python -m http.server
```

3. Open `http://localhost:3000` (Node) or `http://localhost:8000` (Python) in your browser.

## What The App Predicts

- Path layout, with node types (normal, challenge, shop, rest stop)
- Biomes and biome variants
- Fragment modifiers
- Shop items (including rerolls)
- Challenge items
- Rest stop exchange items
- Items obtained from fragment modifiers
- Some encounters

## Controls

- Seed and shard selection
- Time Trial toggle
- Disaster Level for shard 10
- Obstacle, modifier, and item rarity settings (for both the menu and player upgrades)
- Challenge completion tier (for item selection)
- Reroll counts can be changed in each shop independently
- Advanced encounter requirement settings options (still often does not predict encounters correctly though)
- Ability to load a shard and seed from the scanned QR code (note that as a bug on the game's part, this QR code does not include whether the shard is in time trial mode, so you will need to check that yourself)

## Issues

- Encounter selection prediction is still unreliable and should be treated as approximate.
- Advanced encounter requirement controls exist for debugging and partial parity work, not because every encounter rule is fully solved yet.
- Other details of level generation, like which types of obstacles generate, are not implemented.

## Notes

- This was originally created as a utility for mod development, but expanded in scope a bit, and now I think it should be useful for players who want to plan out a run for a specific seed.
- *This project is not associated with Landfall and all game assets belong to them.*
