import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  AnswerData,
  CreateGameData,
  Game,
  JoinGameData,
  Player,
  Question,
  RegData,
  StartGameData,
  User,
  WSMessage,
} from './types.js';

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
const BASE_POINTS = 1000;
const ROOM_CODE_LENGTH = 6;
const RESULTS_DELAY_MS = 3000;
const ROOM_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const usersByName = new Map<string, User>();
const usersById = new Map<string, User>();
const gamesById = new Map<string, Game>();
const gamesByCode = new Map<string, Game>();
const socketToUserId = new WeakMap<WebSocket, string>();

const wss = new WebSocketServer({ port: PORT });

wss.on('listening', () => {
  console.log(`WebSocket server is running at ws://localhost:${PORT}`);
});

wss.on('connection', (ws) => {
  ws.on('message', (rawMessage) => {
    handleIncomingMessage(ws, rawMessage.toString());
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

function handleIncomingMessage(ws: WebSocket, rawMessage: string): void {
  let message: WSMessage;

  try {
    message = JSON.parse(rawMessage) as WSMessage;
  } catch {
    sendError(ws, 'Invalid JSON payload');
    return;
  }

  if (!isObject(message) || typeof message.type !== 'string') {
    sendError(ws, 'Invalid message format');
    return;
  }

  try {
    switch (message.type) {
      case 'reg':
        handleRegistration(ws, message.data);
        break;
      case 'create_game':
        handleCreateGame(ws, message.data);
        break;
      case 'join_game':
        handleJoinGame(ws, message.data);
        break;
      case 'start_game':
        handleStartGame(ws, message.data);
        break;
      case 'answer':
        handleAnswer(ws, message.data);
        break;
      default:
        sendError(ws, `Unknown message type: ${message.type}`);
    }
  } catch (error) {
    console.error('Unexpected server error:', error);
    sendError(ws, 'Internal server error');
  }
}

function handleRegistration(ws: WebSocket, data: unknown): void {
  if (!isRegData(data)) {
    send(ws, 'reg', {
      name: '',
      index: '',
      error: true,
      errorText: 'Invalid registration payload',
    });
    return;
  }

  const name = data.name.trim();
  const password = data.password.trim();

  if (!name || !password) {
    send(ws, 'reg', {
      name,
      index: '',
      error: true,
      errorText: 'Name and password are required',
    });
    return;
  }

  const existingUser = usersByName.get(name);

  if (existingUser && existingUser.password !== password) {
    send(ws, 'reg', {
      name,
      index: existingUser.index,
      error: true,
      errorText: 'Invalid password',
    });
    return;
  }

  const user = existingUser ?? {
    name,
    password,
    index: randomUUID(),
  };

  if (existingUser?.ws && existingUser.ws !== ws) {
    const previousSocket = existingUser.ws;
    existingUser.ws = ws;
    socketToUserId.set(ws, existingUser.index);
    previousSocket.close();
  } else {
    user.ws = ws;
    socketToUserId.set(ws, user.index);
  }

  usersByName.set(user.name, user);
  usersById.set(user.index, user);

  send(ws, 'reg', {
    name: user.name,
    index: user.index,
    error: false,
    errorText: '',
  });
}

function handleCreateGame(ws: WebSocket, data: unknown): void {
  const user = getAuthenticatedUser(ws);
  if (!user) {
    sendError(ws, 'Please register before creating a game');
    return;
  }

  if (!isCreateGameData(data)) {
    sendError(ws, 'Invalid create_game payload');
    return;
  }

  const validationError = validateQuestions(data.questions);
  if (validationError) {
    sendError(ws, validationError);
    return;
  }

  const game: Game = {
    id: randomUUID(),
    code: generateRoomCode(),
    hostId: user.index,
    questions: cloneQuestions(data.questions),
    players: [],
    currentQuestion: -1,
    status: 'waiting',
    playerAnswers: new Map(),
  };

  gamesById.set(game.id, game);
  gamesByCode.set(game.code, game);

  send(ws, 'game_created', {
    gameId: game.id,
    code: game.code,
  });
}

function handleJoinGame(ws: WebSocket, data: unknown): void {
  const user = getAuthenticatedUser(ws);
  if (!user) {
    sendError(ws, 'Please register before joining a game');
    return;
  }

  if (!isJoinGameData(data)) {
    sendError(ws, 'Invalid join_game payload');
    return;
  }

  const code = data.code.trim().toUpperCase();
  const game = gamesByCode.get(code);

  if (!game) {
    sendError(ws, 'Game not found');
    return;
  }

  if (game.status !== 'waiting') {
    sendError(ws, 'Game already started');
    return;
  }

  if (game.hostId === user.index) {
    sendError(ws, 'Host cannot join their own game as a player');
    return;
  }

  const existingPlayer = game.players.find((player) => player.index === user.index);

  if (!existingPlayer) {
    const player: Player = {
      name: user.name,
      index: user.index,
      score: 0,
    };

    game.players.push(player);
  }

  send(ws, 'game_joined', {
    gameId: game.id,
  });

  if (!existingPlayer) {
    broadcastToGame(game, 'player_joined', {
      playerName: user.name,
      playerCount: game.players.length,
    });
  }

  broadcastPlayers(game);
}

function handleStartGame(ws: WebSocket, data: unknown): void {
  const user = getAuthenticatedUser(ws);
  if (!user) {
    sendError(ws, 'Please register before starting a game');
    return;
  }

  if (!isStartGameData(data)) {
    sendError(ws, 'Invalid start_game payload');
    return;
  }

  const game = gamesById.get(data.gameId);

  if (!game) {
    sendError(ws, 'Game not found');
    return;
  }

  if (game.hostId !== user.index) {
    sendError(ws, 'Only the host can start the game');
    return;
  }

  if (game.status !== 'waiting') {
    sendError(ws, 'Game has already started');
    return;
  }

  if (game.players.length === 0) {
    sendError(ws, 'At least one player is required to start the game');
    return;
  }

  game.status = 'in_progress';
  sendNextQuestion(game);
}

function handleAnswer(ws: WebSocket, data: unknown): void {
  const user = getAuthenticatedUser(ws);
  if (!user) {
    sendError(ws, 'Please register before answering');
    return;
  }

  if (!isAnswerData(data)) {
    sendError(ws, 'Invalid answer payload');
    return;
  }

  const game = gamesById.get(data.gameId);

  if (!game) {
    sendError(ws, 'Game not found');
    return;
  }

  if (game.status !== 'in_progress') {
    sendError(ws, 'Game is not in progress');
    return;
  }

  if (game.hostId === user.index) {
    sendError(ws, 'Host cannot submit answers');
    return;
  }

  if (game.currentQuestion !== data.questionIndex) {
    sendError(ws, 'Answer is for the wrong question');
    return;
  }

  if (!Number.isInteger(data.answerIndex) || data.answerIndex < 0 || data.answerIndex > 3) {
    sendError(ws, 'Answer index must be between 0 and 3');
    return;
  }

  const player = game.players.find((candidate) => candidate.index === user.index);
  if (!player) {
    sendError(ws, 'You are not part of this game');
    return;
  }

  if (game.playerAnswers.has(user.index)) {
    sendError(ws, 'Answer already submitted');
    return;
  }

  if (game.questionStartTime === undefined) {
    sendError(ws, 'Question is not active');
    return;
  }

  const currentQuestion = game.questions[game.currentQuestion];
  const timeLimitMs = currentQuestion.timeLimitSec * 1000;
  const now = Date.now();

  if (now > game.questionStartTime + timeLimitMs) {
    sendError(ws, 'Time is up for this question');
    return;
  }

  game.playerAnswers.set(user.index, {
    answerIndex: data.answerIndex,
    timestamp: now,
  });

  send(ws, 'answer_accepted', {
    questionIndex: data.questionIndex,
  });

  maybeResolveQuestionEarly(game);
}

function sendNextQuestion(game: Game): void {
  clearTransitionTimer(game);

  const nextQuestionIndex = game.currentQuestion + 1;

  if (nextQuestionIndex >= game.questions.length) {
    finishGame(game);
    return;
  }

  const question = game.questions[nextQuestionIndex];

  game.currentQuestion = nextQuestionIndex;
  game.playerAnswers.clear();
  game.questionStartTime = Date.now();

  clearQuestionTimer(game);
  game.questionTimer = setTimeout(() => {
    finalizeQuestion(game.id, nextQuestionIndex);
  }, question.timeLimitSec * 1000);

  broadcastToGame(game, 'question', {
    questionNumber: nextQuestionIndex + 1,
    totalQuestions: game.questions.length,
    text: question.text,
    options: [...question.options],
    timeLimitSec: question.timeLimitSec,
  });
}

function finalizeQuestion(gameId: string, questionIndex: number): void {
  const game = gamesById.get(gameId);

  if (!game || game.status !== 'in_progress' || game.currentQuestion !== questionIndex) {
    return;
  }

  if (game.questionStartTime === undefined) {
    return;
  }

  const question = game.questions[questionIndex];
  const questionStartTime = game.questionStartTime;
  const timeLimitMs = question.timeLimitSec * 1000;

  clearQuestionTimer(game);
  game.questionStartTime = undefined;

  const playerResults = game.players.map((player) => {
    const answer = game.playerAnswers.get(player.index);
    const answered = answer !== undefined;
    const correct = answered && answer.answerIndex === question.correctIndex;
    let pointsEarned = 0;

    if (correct && answer) {
      pointsEarned = Math.round(
        BASE_POINTS *
          (Math.max(0, timeLimitMs - (answer.timestamp - questionStartTime)) / timeLimitMs),
      );
    }

    player.score += pointsEarned;

    return {
      name: player.name,
      answered,
      correct,
      pointsEarned,
      totalScore: player.score,
    };
  });

  game.playerAnswers.clear();

  broadcastToGame(game, 'question_result', {
    questionIndex,
    correctIndex: question.correctIndex,
    playerResults,
  });

  const isLastQuestion = questionIndex >= game.questions.length - 1;
  game.transitionTimer = setTimeout(() => {
    game.transitionTimer = undefined;

    if (game.status !== 'in_progress') {
      return;
    }

    if (isLastQuestion) {
      finishGame(game);
      return;
    }

    sendNextQuestion(game);
  }, RESULTS_DELAY_MS);
}

function finishGame(game: Game): void {
  if (game.status === 'finished') {
    return;
  }

  clearQuestionTimer(game);
  clearTransitionTimer(game);

  game.status = 'finished';

  const sortedPlayers = [...game.players].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.name.localeCompare(right.name);
  });

  const scoreboard: Array<{ name: string; score: number; rank: number }> = [];
  let previousScore: number | undefined;
  let previousRank = 0;

  sortedPlayers.forEach((player, index) => {
    const rank = previousScore === player.score ? previousRank : index + 1;

    scoreboard.push({
      name: player.name,
      score: player.score,
      rank,
    });

    previousScore = player.score;
    previousRank = rank;
  });

  broadcastToGame(game, 'game_finished', {
    scoreboard,
  });
}

function handleDisconnect(ws: WebSocket): void {
  const userId = socketToUserId.get(ws);

  if (!userId) {
    return;
  }

  const user = usersById.get(userId);
  socketToUserId.delete(ws);

  if (!user || user.ws !== ws) {
    return;
  }

  user.ws = undefined;

  for (const game of gamesById.values()) {
    if (game.status === 'finished') {
      continue;
    }

    const playerIndex = game.players.findIndex((player) => player.index === userId);

    if (playerIndex === -1) {
      continue;
    }

    game.players.splice(playerIndex, 1);
    game.playerAnswers.delete(userId);
    broadcastPlayers(game);

    if (game.status === 'in_progress') {
      maybeResolveQuestionEarly(game);
    }
  }
}

function maybeResolveQuestionEarly(game: Game): void {
  if (
    game.status !== 'in_progress' ||
    game.questionStartTime === undefined ||
    game.players.length === 0
  ) {
    return;
  }

  const everyoneAnswered = game.players.every((player) => game.playerAnswers.has(player.index));

  if (!everyoneAnswered) {
    return;
  }

  finalizeQuestion(game.id, game.currentQuestion);
}

function broadcastPlayers(game: Game): void {
  broadcastToGame(game, 'update_players', game.players.map(serializePlayer));
}

function serializePlayer(player: Player): Player {
  return {
    name: player.name,
    index: player.index,
    score: player.score,
  };
}

function broadcastToGame(game: Game, type: string, data: unknown): void {
  const recipientIds = new Set<string>([game.hostId, ...game.players.map((player) => player.index)]);

  for (const userId of recipientIds) {
    const user = usersById.get(userId);

    if (user?.ws) {
      send(user.ws, type, data);
    }
  }
}

function send(ws: WebSocket, type: string, data: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(
    JSON.stringify({
      type,
      data,
      id: 0,
    }),
  );
}

function sendError(ws: WebSocket, message: string): void {
  send(ws, 'error', { message });
}

function getAuthenticatedUser(ws: WebSocket): User | undefined {
  const userId = socketToUserId.get(ws);

  if (!userId) {
    return undefined;
  }

  const user = usersById.get(userId);

  if (!user || user.ws !== ws) {
    return undefined;
  }

  return user;
}

function clearQuestionTimer(game: Game): void {
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = undefined;
  }
}

function clearTransitionTimer(game: Game): void {
  if (game.transitionTimer) {
    clearTimeout(game.transitionTimer);
    game.transitionTimer = undefined;
  }
}

function generateRoomCode(): string {
  let code = '';

  do {
    code = Array.from({ length: ROOM_CODE_LENGTH }, () => {
      const index = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
      return ROOM_CODE_ALPHABET[index];
    }).join('');
  } while (gamesByCode.has(code));

  return code;
}

function cloneQuestions(questions: Question[]): Question[] {
  return questions.map((question) => ({
    text: question.text,
    options: [...question.options],
    correctIndex: question.correctIndex,
    timeLimitSec: question.timeLimitSec,
  }));
}

function validateQuestions(questions: Question[]): string | null {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'At least one question is required';
  }

  for (const question of questions) {
    if (!isQuestion(question)) {
      return 'Questions payload has an invalid format';
    }

    if (!question.text.trim()) {
      return 'Question text cannot be empty';
    }

    if (question.options.some((option) => !option.trim())) {
      return 'Question options cannot be empty';
    }
  }

  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRegData(value: unknown): value is RegData {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    typeof value.password === 'string'
  );
}

function isCreateGameData(value: unknown): value is CreateGameData {
  return isObject(value) && Array.isArray(value.questions) && value.questions.every(isQuestion);
}

function isJoinGameData(value: unknown): value is JoinGameData {
  return isObject(value) && typeof value.code === 'string';
}

function isStartGameData(value: unknown): value is StartGameData {
  return isObject(value) && typeof value.gameId === 'string';
}

function isAnswerData(value: unknown): value is AnswerData {
  return (
    isObject(value) &&
    typeof value.gameId === 'string' &&
    Number.isInteger(value.questionIndex) &&
    Number.isInteger(value.answerIndex)
  );
}

function isQuestion(value: unknown): value is Question {
  return (
    isObject(value) &&
    typeof value.text === 'string' &&
    Array.isArray(value.options) &&
    value.options.length === 4 &&
    value.options.every((option) => typeof option === 'string') &&
    Number.isInteger(value.correctIndex) &&
    value.correctIndex >= 0 &&
    value.correctIndex <= 3 &&
    Number.isInteger(value.timeLimitSec) &&
    value.timeLimitSec > 0
  );
}
