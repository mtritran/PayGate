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
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
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

export interface UpdateMerchantRequest {
  name?: string;
  merchantName?: string;
  contactEmail?: string;
  contactPhone?: string;
  webhookUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}
