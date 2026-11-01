# Openboard Chess

Openboard is an original, local-first chess app. It is not affiliated with Chess.com.

## Run it

On Windows, double-click `start-openboard.bat`. It locates Node.js and npm even when `npm` is not on `PATH`, runs the install with Windows Command Prompt as npm's script shell, starts the local online-room server if it is not already running, and waits for the website before opening `http://127.0.0.1:5173/`. The website and room server run in separate windows; stop them with Ctrl+C in their windows. Node.js with npm must be installed.

## Publish as a website with GitHub Pages

The prepared `Openboard-GitHub-Pages` folder is a separate, ready-to-publish copy of the source project. With GitHub Desktop, choose **File → Add Local Repository**, select that folder, then click **Publish repository**. After publishing, open the repository's **Settings → Pages** and set the build and deployment source to **GitHub Actions**. The included workflow builds and deploys automatically whenever you push to `main`; GitHub displays the website URL under **Settings → Pages**.

Gameplay, saved settings, custom pieces, and the computer opponent run in each visitor's browser. GitHub Pages is static hosting, so friend-online rooms also need the separately hosted WebSocket service described below.

For a standalone Windows x64 desktop installer, double-click `build-openboard-desktop.bat`. The installer is written to `release/Openboard Chess Setup 1.0.0.exe`; the installed game does not require Node.js. The first installer is about 350 MB because it includes Electron and the full Stockfish engine. It is not code-signed, so Windows may show its standard unknown-publisher warning. Building it requires internet access to download packaging tools.

Run `npm run test:custom-chess` to check custom move generation, captures, attacks, mirroring, undo, and promotion.

The page also opens directly from `index.html`, but browser security can prevent Web Workers from running on `file://`; use the local server or desktop build for the worker-based opponent.

## Friend games

The Windows app launcher starts the room server automatically. Otherwise start it with `start-openboard-online-server.bat` or `npm run online-server`; it listens on port 3001. Use the **Online** tab to browse open public rooms, create a public game, or switch to **Friend invite** to create/join a private room by code. Everyone must use the same reachable room-server URL. The server applies and validates every move using chess.js before relaying it; room state is in memory and rooms expire after 30 minutes. To play over the public internet, host the Node server on an internet-accessible machine and enter its secure `wss://` URL (configure `OPENBOARD_PORT` and optionally `OPENBOARD_ALLOWED_ORIGINS`); the bat launcher is for local testing. GitHub Pages does not host this server: the Online URL field intentionally starts blank on non-local websites until you enter your hosted server URL.

Online rooms currently support two players in standard chess only. The public browser lists rooms on the selected server; it is not a global directory across unrelated servers. Clocks, draw offers, account login, friends lists, ranked matchmaking, persistent game history, and automatic reconnect are not implemented.

### Deploy online rooms for GitHub Pages

The repository includes a Render Blueprint in `render.yaml`. After publishing this folder to GitHub:

1. In Render, create a **Blueprint** and connect the GitHub repository. Render reads `render.yaml` and deploys the Node room server from `server/`.
2. Wait for the service to become live. Open `https://YOUR-SERVICE.onrender.com/health`; it should return JSON with `"ok": true`.
3. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables**, add the repository variable `OPENBOARD_SERVER_URL`, and set it to `wss://YOUR-SERVICE.onrender.com/ws` (use the actual hostname Render assigned).
4. Push a commit to `main`, or run **Actions → Deploy Openboard to GitHub Pages → Run workflow**. The build embeds the URL, and the Online tab will use it automatically. Visitors can still override the URL in that field; their choice is saved in their browser.
5. In **Settings → Pages**, choose **GitHub Actions** as the deployment source if it is not already selected.

The Blueprint permits WebSocket connections from `*.github.io` origins. For a custom Pages domain, add its exact origin (for example `https://chess.example.com`) to the Render service's `OPENBOARD_ALLOWED_ORIGINS` environment variable, separated from other entries with commas. The server supports exact origins and `*` wildcards in origin patterns.

The Blueprint uses Render's free instance. It may sleep when idle, so the first connection after inactivity can take a while; online rooms are held in memory and disappear when the server restarts or sleeps. Use an always-on host if you need reliable persistent availability. GitHub Pages cannot run the WebSocket server itself.

Run `npm run test:online` to test public room listing, private-room exclusion, and joining a listed game.

## Current features

- Legal chess, move notation, promotion, check, and draw detection via chess.js.
- Editable custom rules for no-draw games and configurable pawn, knight, bishop, rook, and queen movement. Each standard piece's movement can be assigned to White, Black, or both sides, with separate movesets per side; select multiple standard movement patterns to make compound movers such as rook-knights.
- Custom game pieces are created and named in Custom Piece Studio, then selected in Custom Rules to replace a non-king piece type for both sides or one side. The rules dialog only assigns saved Studio pieces; it no longer has a second piece editor.
- Custom settings persist locally and apply to both player moves and bot move generation on the next game.
- Sixty-three original opponent profiles with varied Stockfish skill/time presets and style labels; displayed strength is explicitly not Elo.
- Stockfish 19 full, single-threaded WebAssembly in a Web Worker for orthodox games, plus a separate MAX ENGINE profile that removes skill limits; custom-movement games remain on the rules-aware local search.
- A local Custom Piece Studio with a clickable relative-square movement editor, step/slide/leap preview, per-vector move/capture/attack behavior, mirroring, rotation, range, undo/redo, a blocker sandbox, and persistent JSON import/export. Saved non-royal definitions can be added to full games and use their Studio movement rules directly.
- Click-to-move and drag-and-drop, legal-move indicators, move history, undo/redo, board flip, and both playing colors.
- Opening and move notes for both sides, with curated opening-name/theme recognition and Book, Best, Excellent, Good, Great, Brilliant, Inaccuracy, Mistake, or Blunder tags in the move list.
- Optional clocks, board and interface color themes, supplied local MP3 sound effects, per-event previews and controls, and saved preferences.
- A mate-in-one puzzle, FEN and PGN loading, PGN export, and a basic analysis suggestion.

## Engine and rating notes

Orthodox games use Stockfish.js 19 full WebAssembly. Regular opponent profiles set Stockfish's supported `Skill Level` option and use different time limits; these settings are not calibrated ratings. MAX ENGINE uses the full build at Skill Level 20 with no Elo limiter, 256 MB hash, and up to 30 seconds per move, subject to the device's performance. The full single-threaded WebAssembly network is about 94 MB and is requested only when the engine is started. It avoids requiring cross-origin-isolation headers, but will take time and bandwidth to download. Search depth, node count, and nodes per second are shown while it thinks.

The Stockfish engine is distributed under GPL-3.0. Its license is copied alongside the engine in production builds at `dist/stockfish/Copying.txt`; the corresponding Stockfish.js source is available from the [Stockfish.js 19.0.1 release](https://github.com/nmrugg/stockfish.js/tree/v19.0.1).

Bot profiles have not been calibrated through match testing, so no profile is presented as having a verified Elo rating. The profiles are engine skill/time presets, not adaptive player models. Opening names and plans use curated common lines plus a general first-move classifier, so offbeat positions still receive a useful family label and plan without being misrepresented as a known book variation. Move grades use a quick, shallow local search so moves on either side can be annotated immediately; they are estimates, not official ratings or full Stockfish analysis. Custom-movement games use the app's separate, less capable variant search, not Stockfish.

The Stockfish build requests a WebAssembly file matching its worker script name (`stockfish-19-single.wasm`); the build ships this exact sibling asset in development and production.

The chess.js rules library and Stockfish engine are bundled locally. Google web fonts are optional and require internet access; the app falls back to local system fonts when offline. There is no backend, online matchmaking, cloud account, synced game archive, multi-principal-variation analysis, or curated puzzle collection yet.

Full games support Studio step, slide, and leap movement; per-vector move, capture, and attack behavior; mirroring; jumping; range; and optional promotion. Royal custom pieces and custom king movement remain unsupported so standard check and castling rules stay reliable. A Studio piece replaces a non-king starting piece type for either or both sides. Variant bot turns use the rules-aware local search fallback instead of the standard-chess worker. With no-draw rules enabled, stalemate is a loss for the side with no legal moves.

## Sound files

The sound manifest maps `move-self.mp3`, `move-opponent.mp3`, `capture.mp3`, `move-check.mp3`, `castle.mp3`, `promote.mp3`, `game-start.mp3`, `tenseconds.mp3`, and `premove.mp3` to their corresponding move, capture, check, castle, promotion, start, clock-warning, and selection events. The settings dialog provides master/effects volume, mute, event toggles, and previews. Browser verification confirmed that all nine available previews started and ended; game-start, player/opponent moves, capture, check, castling, promotion, and the clock warning also played through their game-event routes. Volume, mute, and event-toggle changes persisted and were restored after testing. `game-end.webm` was not browser-decodable in the tested browser; there are no dedicated playable assets for checkmate, victory, defeat, draw, or puzzle outcomes, so those events are reported as unavailable instead of receiving substitute sounds.
