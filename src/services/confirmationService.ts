import { randomUUID } from 'node:crypto';

export type RequestStatus = 'pending' | 'consumed' | 'cancelled' | 'expired';
export type RequestKind = 'apply' | 'publish' | 'release';

export interface PendingApplyRequest {
  id: string;
  kind: RequestKind;
  guildId: string;
  channelId: string;
  requesterId: string;
  note?: string;
  createdAt: number;
  expiresAt: number;
  status: RequestStatus;
}

export const CONFIRMATION_TTL_MS = 10 * 60 * 1000;

export class ConfirmationService {
  private readonly requests = new Map<string, PendingApplyRequest>();

  create(input: {
    kind: RequestKind;
    guildId: string;
    channelId: string;
    requesterId: string;
    note?: string;
  }): PendingApplyRequest {
    const now = Date.now();
    const request: PendingApplyRequest = {
      id: randomUUID(),
      kind: input.kind,
      guildId: input.guildId,
      channelId: input.channelId,
      requesterId: input.requesterId,
      note: input.note,
      createdAt: now,
      expiresAt: now + CONFIRMATION_TTL_MS,
      status: 'pending',
    };
    this.requests.set(request.id, request);
    return request;
  }

  get(id: string): PendingApplyRequest | undefined {
    const request = this.requests.get(id);
    if (!request) return undefined;
    if (request.status === 'pending' && Date.now() > request.expiresAt) {
      request.status = 'expired';
    }
    return request;
  }

  getActiveForGuild(guildId: string, kind: RequestKind): PendingApplyRequest | undefined {
    for (const request of this.requests.values()) {
      if (
        request.guildId === guildId &&
        request.kind === kind &&
        this.get(request.id)?.status === 'pending'
      ) {
        return request;
      }
    }
    return undefined;
  }

  /** Atomically marks a pending request as consumed so a button cannot be replayed. */
  consume(id: string): boolean {
    const request = this.get(id);
    if (!request || request.status !== 'pending') return false;
    request.status = 'consumed';
    return true;
  }

  cancel(id: string): boolean {
    const request = this.get(id);
    if (!request || request.status !== 'pending') return false;
    request.status = 'cancelled';
    return true;
  }

  prune(): number {
    let removed = 0;
    const cutoff = Date.now() - CONFIRMATION_TTL_MS * 2;
    for (const [id, request] of this.requests) {
      if (request.status !== 'pending' || request.createdAt < cutoff) {
        this.requests.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  get size(): number {
    return this.requests.size;
  }
}

/** In-memory only: run Railway with a single replica. Pending requests do not survive restarts. */
export const confirmations = new ConfirmationService();
