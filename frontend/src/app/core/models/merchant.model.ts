export interface Merchant {
  id: number;
  userId: number;
  merchantName: string;
  name?: string;
  merchantCode: string;
  contactEmail?: string;
  contactPhone?: string;
  webhookUrl: string;
  apiKey?: string;
  active?: boolean;
  status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
  accountNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateMerchantRequest {
  userId: number;
  merchantName: string;
  merchantCode: string;
  webhookUrl?: string;
}

export interface UserMerchantRequest {
  merchantName: string;
  merchantCode: string;
  webhookUrl?: string;
}

export interface UpdateMerchantRequest {
  name?: string;
  merchantName?: string;
  contactEmail?: string;
  contactPhone?: string;
  webhookUrl?: string;
  status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
}
