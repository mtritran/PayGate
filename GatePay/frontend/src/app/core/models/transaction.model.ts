export type TransactionType = 'PAYMENT' | 'TOPUP' | 'REFUND' | 'WITHDRAW';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

export interface TransactionResponse {
  transactionRef: string;
  status: TransactionStatus;
  amount: number;
  sourceAccountId: number;
  destAccountId: number;
  type: TransactionType;
  description: string;
  createdAt: string;
}

export interface LedgerEntryResponse {
  id: number;
  transactionId: number;
  accountId: number;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

export interface TransactionDetailResponse {
  transactionRef: string;
  status: string;
  amount: number;
  sourceAccountId: number;
  destAccountId: number;
  type: string;
  description: string;
  createdAt: string;
  ledgerEntries: LedgerEntryResponse[];
}

export interface PaymentRequest {
  destAccountId: number;
  amount: number;
  merchantId?: number;
  description?: string;
  idempotencyKey: string;
}
