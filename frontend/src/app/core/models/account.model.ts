export interface AccountResponse {
  id: number;
  ownerId: number;
  ownerType: 'USER' | 'MERCHANT' | 'SYSTEM';
  accountNumber: string;
  balance: number;
  currency: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  createdAt: string;
}

export interface TopUpRequest {
  amount: number;
  description?: string;
}
