export interface LedgerVerificationResponse {
  balanced: boolean;
  totalDebit: number;
  totalCredit: number;
  message: string;
  verifiedAt: string;
}

export interface LedgerEntry {
  id: number;
  transactionId: number;
  accountId: number;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  balanceAfter: number;
  createdAt: string;
}
