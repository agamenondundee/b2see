# Art assets

The game renders **placeholder graphics** for every sprite until real art is
dropped in here. Nothing breaks while this folder is empty — placeholders are
labelled rectangles drawn in code.

## Adding real sprites

1. Export a PNG sprite sheet and place it in this folder.
2. Open [`../src/sprites.manifest.js`](../src/sprites.manifest.js) and update the
   matching entry's `src`, `frameWidth`, and `frameHeight`.

Frames are read left-to-right, top-to-bottom. The `draw(..., frame)` index
selects which cell to blit.

## Expected sheets

| File                     | Key          | Frame size | Frames used                     |
| ------------------------ | ------------ | ---------- | ------------------------------- |
| `player.png`             | `player`     | 40×56      | 0 = facing right, 1 = left      |
| `paper.png`              | `paper`      | 16×10      | 0                               |
| `house_subscriber.png`   | `house-sub`  | 96×96      | 0                               |
| `house_plain.png`        | `house-plain`| 96×96      | 0                               |
| `mailbox.png`            | `mailbox`    | 22×22      | 0                               |
| `car.png`                | `car`        | 48×80      | 0                               |
| `cone.png`               | `cone`       | 28×32      | 0                               |
| `bundle.png`             | `bundle`     | 28×24      | 0                               |

Sizes are suggestions — the renderer scales each sheet to the entity's draw
size, so close-enough proportions are fine.
