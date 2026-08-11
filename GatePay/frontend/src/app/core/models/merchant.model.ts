export interface Merchant {
  id: number;
  userId?: number;
  merchantName: string;
  name?: string;
  merchantCode: string;
  taxCode?: string;
  representativeName?: string;
  contactEmail?: string;
  contactPhone?: string;
  webhookUrl: string;
  apiKey?: string;
  active?: boolean;
  isFeatured?: boolean;
  status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
  accountNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateMerchantRequest {
  userId: number;
  merchantName: string;
  merchantCode: string;
  taxCode?: string;
  representativeName?: string;
  contactPhone?: string;
  webhookUrl?: string;
  isFeatured?: boolean;
}

export interface UserMerchantRequest {
  merchantName: string;
  merchantCode: string;
  taxCode?: string;
  representativeName?: string;
  contactPhone?: string;
  webhookUrl?: string;
  isFeatured?: boolean;
}

export interface UpdateMerchantRequest {
  name?: string;
  merchantName?: string;
  contactEmail?: string;
  contactPhone?: string;
  webhookUrl?: string;
  isFeatured?: boolean;
  status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
}
