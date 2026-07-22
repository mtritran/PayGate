export interface Merchant {
  id: number;
  merchantCode: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  businessRegistrationNumber?: string;
  webhookUrl: string;
  secretKey?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  accountNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateMerchantRequest {
  merchantCode: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  businessRegistrationNumber?: string;
  webhookUrl: string;
}

export interface UpdateMerchantRequest {
  name: string;
  contactEmail: string;
  contactPhone?: string;
  webhookUrl: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}
