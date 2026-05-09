import { Injectable } from '@nestjs/common';

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ConversationSession {
  expiresAt: number;
  messages: ConversationMessage[];
}

@Injectable()
export class ConversationMemoryService {
  private readonly sessions = new Map<string, ConversationSession>();
  private readonly ttlMs = 15 * 60 * 1000;
  private readonly maxMessages = 8;

  getContext(sessionId?: string): ConversationMessage[] {
    if (!sessionId) {
      return [];
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return [];
    }

    session.expiresAt = Date.now() + this.ttlMs;
    return [...session.messages];
  }

  append(sessionId: string | undefined, userPrompt: string, assistantReply: string): void {
    if (!sessionId) {
      return;
    }

    const existingMessages = this.getContext(sessionId);
    const messages = [
      ...existingMessages,
      { role: 'user' as const, text: userPrompt },
      { role: 'assistant' as const, text: assistantReply },
    ].slice(-this.maxMessages);

    this.sessions.set(sessionId, {
      messages,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  getDiagnostics() {
    this.cleanupExpiredSessions();
    return {
      activeSessions: this.sessions.size,
      sessionTtlSec: Math.floor(this.ttlMs / 1000),
      maxMessagesPerSession: this.maxMessages,
    };
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
