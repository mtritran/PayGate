export interface WebhookLog {
  id: number;
  transactionId: number;
  merchantId: number;
  url: string;
  payload: string;
  responseStatus?: number;
  responseBody?: string;
  attempt: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  nextRetryAt?: string;
  createdAt: string;
}
