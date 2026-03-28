export interface Question {
  text: string;
  options: string[];      
  correctIndex: number;    
  timeLimitSec: number;    
}

export interface Player {
  name: string;
  index: number | string;   
  score: number;
}

export interface PlayerResult {
  name: string;
  answered: boolean;
  correct: boolean;
  pointsEarned: number;
  totalScore: number;
}
 
export interface WSMessage {
  type: string;
  data: any;
  id: number;
}
 

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
