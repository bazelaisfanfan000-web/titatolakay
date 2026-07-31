/**
 * Types pour le système de revanche
 */

export interface RevengeRequest {
  requestId: string;
  requesterId: string;
  opponentId: string;
  previousGameId: string;
  previousRoomId: string;
  betAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  createdAt: number;
  respondedAt?: number;
  newRoomId?: string;
}

export interface CreateRevengeRequest {
  requesterId: string;
  opponentId: string;
  previousGameId: string;
  previousRoomId: string;
  betAmount: number;
}

export interface AcceptRevengeRequest {
  requestId: string;
  userId: string;
}

export interface RejectRevengeRequest {
  requestId: string;
  userId: string;
}

export interface RevengeValidationResult {
  valid: boolean;
  error?: string;
  requesterBalance?: number;
  opponentBalance?: number;
}
