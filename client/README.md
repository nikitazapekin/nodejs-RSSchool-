# Live Quiz Game — Client

A React frontend for the real-time multiplayer quiz game. This client is fully implemented and connects to the WebSocket server on `ws://localhost:3000`.

## Tech Stack

- React 18, TypeScript, Vite
- Custom `useWebSocket` hook for WebSocket communication

## Running

```bash
npm install
npm run dev     # development with hot reload (http://localhost:5173)
npm run build   # production build
```

## Screens

### Login
- Name and password form for registration / login
- Sends `reg` command, receives `reg` response with player `index`

### Role Selection
- "Create Game (Host)" or "Join Game (Player)"

### Create Game (Host)
- Add questions dynamically: question text, 4 options, correct answer (radio), time limit
- **Import Questions** — load questions from a JSON file
- **Export Questions** — save current questions to a JSON file
- Sends `create_game` command, receives `game_created` with `gameId` and 6-character room `code`

### Join Game (Player)
- Enter 6-character room code
- Sends `join_game`, receives `game_joined`

### Lobby
- Displays room code (for sharing) and connected player list
- Host sees "Start Game" button
- Listens for `player_joined` and `update_players` broadcasts

### Game Play
- Displays question text, 4 answer options, countdown timer bar
- **Player view**: clickable answer buttons, disabled after answering
- **Host view**: read-only question display (host cannot answer)
- Timer bar changes color: green > yellow > red
- Sends `answer` command, receives `answer_accepted`

### Question Result
- Shows correct answer (highlighted green)
- Per-player results: answered / correct / wrong / no answer, points earned
- Current leaderboard sorted by total score

### Final Results
- Final scoreboard with ranks
- Medals for top 3 players
- "Return to Menu" button

## WebSocket Protocol

All messages use `{ type, data, id: 0 }` JSON format. The client expects the server to implement the following responses:

| Client sends | Server responds |
|---|---|
| `reg` | `reg` (personal) |
| `create_game` | `game_created` (personal) |
| `join_game` | `game_joined` (personal) + `player_joined` (broadcast) + `update_players` (broadcast) |
| `start_game` | `question` (broadcast) |
| `answer` | `answer_accepted` (personal) |
| — (timer expires / all answered) | `question_result` (broadcast) → `question` (broadcast) or `game_finished` (broadcast) |

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── Login.tsx           # Registration / login form
│   │   ├── RoleSelection.tsx   # Host vs Player choice
│   │   ├── CreateGame.tsx      # Question editor + import/export
│   │   ├── JoinGame.tsx        # Room code input
│   │   ├── Lobby.tsx           # Waiting room with player list
│   │   ├── GamePlay.tsx        # Question display + answer buttons
│   │   ├── QuestionResult.tsx  # Per-question results
│   │   └── FinalResults.tsx    # Final scoreboard
│   ├── hooks/
│   │   └── useWebSocket.ts     # WebSocket connection hook (auto-reconnect)
│   ├── types.ts                # All TypeScript interfaces
│   ├── App.tsx                 # Main component + message routing
│   ├── index.css               # Global styles
│   └── main.tsx                # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```
