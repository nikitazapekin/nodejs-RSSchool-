export interface Question {
  text: string;
  options: string[];       // exactly 4 options
  correctIndex: number;    // index of the correct option (0-3)
  timeLimitSec: number;    // time limit for the question in seconds
}

export interface Player {
  name: string;
  index: number | string;  // unique player id
  score: number;
}

export interface PlayerResult {
  name: string;
  answered: boolean;
  correct: boolean;
  pointsEarned: number;
  totalScore: number;
}

// WebSocket Message Types
export interface WSMessage {
  type: string;
  data: any;
  id: number;
}

// --- Request types (client → server) ---

export interface RegRequest {
  name: string;
  password: string;
}

export interface CreateGameRequest {
  questions: Question[];
}

export interface JoinGameRequest {
  code: string;
}

export interface StartGameRequest {
  gameId: string;
}

export interface AnswerRequest {
  gameId: string;
  questionIndex: number;
  answerIndex: number;
}

// --- Response types (server → client) ---

export interface RegResponse {
  name: string;
  index: number | string;
  error: boolean;
  errorText: string;
}

export interface GameCreatedResponse {
  gameId: string;
  code: string;
}

export interface GameJoinedResponse {
  gameId: string;
}

export interface PlayerJoinedMessage {
  playerName: string;
  playerCount: number;
}

export interface UpdatePlayersMessage {
  // data is the array itself: Player[]
}

export interface QuestionMessage {
  questionNumber: number;
  totalQuestions: number;
  text: string;
  options: string[];
  timeLimitSec: number;
}

export interface AnswerAcceptedMessage {
  questionIndex: number;
}

export interface QuestionResultMessage {
  questionIndex: number;
  correctIndex: number;
  playerResults: PlayerResult[];
}

export interface GameFinishedMessage {
  scoreboard: { name: string; score: number; rank: number }[];
}

export interface QuestionsExportedMessage {
  schemaVersion: number;
  questions: Question[];
}

export interface QuestionsImportedMessage {
  gameId: string;
  totalQuestions: number;
}

export interface ErrorMessage {
  message: string;
}
