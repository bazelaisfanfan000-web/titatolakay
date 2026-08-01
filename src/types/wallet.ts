/**
 * Types TypeScript pour le système de wallet atomique
 * WinCash - MonCashConnect Integration
 */

// ============================================================================
// TYPES DE BASE
// ============================================================================

export type TransactionType = 
  | "deposit"
  | "withdraw"
  | "game_bet"
  | "game_win"
  | "game_refund"
  | "commission"
  | "admin_adjustment";

export type TransactionStatus = 
  | "pending"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export type DepositStatus = 
  | "pending"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export type WithdrawStatus = 
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type TransactionSource = 
  | "moncash"
  | "game"
  | "admin"
  | "system";

// ============================================================================
// WALLET
// ============================================================================

export interface Wallet {
  userId?: string;
  balance: number;
  lockedBalance: number;
  updatedAt: number;
  createdAt: number;
}

// ============================================================================
// TRANSACTION LEDGER
// ============================================================================

export interface WalletTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  status: TransactionStatus;
  source: TransactionSource;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  completedAt?: number;
  failedAt?: number;
  failureReason?: string;
  updatedAt?: number;
}

// ============================================================================
// DÉPÔT
// ============================================================================

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  referenceId: string;
  status: DepositStatus;
  paymentUrl?: string;
  expiresAt?: number;
  moncashTransactionId?: string;
  moncashReference?: string;
  netAmount?: number;
  createdAt: number;
  completedAt?: number;
  failedAt?: number;
  failureReason?: string;
  idempotencyKey?: string;
}

export interface CreateDepositRequest {
  amount: number;
  returnUrl?: string;
  customerName?: string;
  customerEmail?: string;
}

export interface CreateDepositResponse {
  success: boolean;
  depositId?: string;
  paymentUrl?: string;
  referenceId?: string;
  expiresAt?: number;
  error?: string;
}

// ============================================================================
// RETRAIT
// ============================================================================

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  moncashNumber: string;
  referenceId: string;
  status: WithdrawStatus;
  moncashReference?: string;
  fee?: number;
  netAmount?: number;
  recipientAccountMasked?: string;
  createdAt: number;
  completedAt?: number;
  failedAt?: number;
  failureReason?: string;
  idempotencyKey?: string;
}

export interface CreateWithdrawalRequest {
  amount: number;
  moncashNumber: string;
}

export interface CreateWithdrawalResponse {
  success: boolean;
  withdrawalId?: string;
  referenceId?: string;
  status?: string;
  error?: string;
}

// ============================================================================
// MONCASH API
// ============================================================================

export interface MonCashPaymentRequest {
  amount: number;
  referenceId: string;
  returnUrl?: string;
  customerName?: string;
  customerEmail?: string;
}

export interface MonCashPaymentResponse {
  paymentUrl: string;
  reference: string;
  expiresAt: string;
}

export interface MonCashPaymentStatus {
  reference: string;
  status: "pending" | "completed" | "failed";
  amount: number;
  netAmount: number;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  moncashTransactionId: string | null;
  createdAt: string;
}

export interface MonCashPayoutRequest {
  amount: number;
  moncashNumber: string;
  referenceId: string;
}

export interface MonCashPayoutResponse {
  status: "success";
  payout: {
    reference: string;
    status: "queued" | "processing" | "completed" | "failed";
    amount_htg: number;
    fee_htg: number;
    net_htg: number;
    recipient_account_masked: string;
  };
}

export interface MonCashBalance {
  balanceHtg: number;
  withdrawableHtg: number;
  dailyCapHtg: number;
  usedTodayHtg: number;
}

// ============================================================================
// WEBHOOK
// ============================================================================

export interface MonCashWebhookEvent {
  event: "payment.completed" | "payment.failed" | "payout.completed" | "payout.failed";
  reference: string;
  amount?: number;
  status: string;
  completedAt?: string;
  failureReason?: string;
  recipient_account_masked?: string;
}

export interface ProcessedEvent {
  eventId: string;
  eventType: string;
  reference: string;
  processedAt: number;
  userId?: string;
}

// ============================================================================
// RÉSULTATS DE FONCTIONS
// ============================================================================

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface BalanceResult {
  success: boolean;
  balance?: number;
  lockedBalance?: number;
  error?: string;
}

export interface LedgerResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface MonCashConfig {
  apiKey: string;
  webhookSecret: string;
  apiUrl: string;
}

export interface WalletConfig {
  minDeposit: number;
  maxDeposit: number;
  minWithdraw: number;
  maxWithdraw: number;
  withdrawalFeePercent: number;
}
