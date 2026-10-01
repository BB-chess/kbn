# KBN vs K

Practise the bishop and knight mate. Play the king, bishop and knight, or the lone king. The other side answers with the perfect move from a distance-to-mate tablebase.

## Running it

The page loads the tablebase with `fetch`, so serve the folder rather than opening `index.html` as a local file.

On Windows, `start.bat` starts a static server on port 5173 and opens the browser. That script needs Node.

Any other static server is fine. Paths are relative, so the folder can live in a subdirectory, including on GitHub Pages.

## Using it

- **Role.** Attack with the bishop and knight, or defend with the lone king. White always has the minor pieces. Your side is at the bottom.
- **Distance from mate.** A random legal position, or a chosen mate in N once the tablebase has loaded.
- **Moves.** Click, drag, or type a move such as `e1d2`.
- **Judgement.** After your move the page compares it with the tablebase: best, inaccuracy, mistake, or blunder.
- **Undo** takes back your move and the reply. **Back** and **Forward** step one ply; Forward plays the tablebase move.
- **Hint** marks the piece the tablebase would move. **Auto-play** plays the line out.
- Mating corners for the bishop's colour are marked. The 50-move count is shown. Stalemate, threefold repetition, the 50-move rule, and insufficient material end as draws.
- **Install app**, when the browser offers it, keeps a copy that runs offline.

## Tablebase

`tb/kbnk-dtm.bin.gz` is the full king, bishop and knight versus king table. White has the minor pieces; Black has the lone king. The page decompresses the gzip in the browser. If that file is missing it uses `tb/kbnk-dtm.bin`.

Each position is one byte:

| Value | Meaning |
| --- | --- |
| 0–252 | Plies to mate with both sides perfect. 0 means Black is checkmated. |
| 254 | Draw |
| 255 | Illegal |

White-to-move wins are an odd number of plies. Mate in N moves is 2N−1 plies.

Rebuild the table with Node:

```
node tools/gen-dtm-tb.mjs
```

That writes `tb/kbnk-dtm.bin` (32 MiB). To play out a sample of positions and check that mate arrives on the stated move:

```
node tools/verify-play.mjs
```

## Pieces

The piece images are the Cburnett set by Colin M. L. Burnett, used under the GNU GPL.
