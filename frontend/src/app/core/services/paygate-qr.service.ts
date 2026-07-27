import { Injectable } from '@angular/core';

export interface PayGateQrPayload {
  scheme: 'paygate';
  action: 'transfer' | 'payment';
  accountNumber: string;
  accountName?: string;
  amount?: number;
  note?: string;
  timestamp?: number;
}

@Injectable({ providedIn: 'root' })
export class PaygateQrService {

  /**
   * Encodes a PayGate Wallet Transfer payload into a standard QR string format.
   * Format: PAYGATE:TRANSFER:<ACCOUNT_NO>:<AMOUNT>:<ENCODED_NOTE>:<ACCOUNT_NAME>
   */
  encodePayload(accountNumber: string, accountName: string, amount: number = 0, note: string = ''): string {
    const cleanAcc = (accountNumber || '').trim();
    const cleanName = (accountName || '').trim();
    const cleanNote = encodeURIComponent((note || '').trim());
    return `PAYGATE:TRANSFER:${cleanAcc}:${amount || 0}:${cleanNote}:${encodeURIComponent(cleanName)}`;
  }

  /**
   * Parses a QR code string or image text into structured PayGate Transfer info.
   * Supports PayGate format (PAYGATE:TRANSFER:...), JSON payload, or raw Account Numbers.
   */
  parsePayload(qrData: string): { accountNumber: string; accountName?: string; amount?: number; note?: string } | null {
    if (!qrData) return null;
    const trimmed = qrData.trim();

    // 1. PayGate Standard Format: PAYGATE:TRANSFER:AC00000005:100000:Tien%20ca%20phe:TRAN%20VIET%20TRINH
    if (trimmed.startsWith('PAYGATE:TRANSFER:')) {
      const parts = trimmed.split(':');
      if (parts.length >= 3) {
        const accountNumber = parts[2] || '';
        const amount = parts[3] ? Number(parts[3]) : 0;
        const note = parts[4] ? decodeURIComponent(parts[4]) : '';
        const accountName = parts[5] ? decodeURIComponent(parts[5]) : '';
        return {
          accountNumber,
          accountName,
          amount: isNaN(amount) ? 0 : amount,
          note
        };
      }
    }

    // 2. PayGate JSON Format: {"scheme":"paygate", "accountNumber":"AC00000005", ...}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.accountNumber || parsed.account_number || parsed.acc) {
          return {
            accountNumber: parsed.accountNumber || parsed.account_number || parsed.acc,
            accountName: parsed.accountName || parsed.name || '',
            amount: Number(parsed.amount) || 0,
            note: parsed.note || parsed.description || ''
          };
        }
      } catch (e) {
        // Ignore JSON parse error
      }
    }

    // 3. VietQR EMVCo Format fallback (Extract account number from Tag 38)
    if (trimmed.startsWith('000201') || trimmed.includes('A000000727')) {
      const accMatch = trimmed.match(/AC\d{8,12}/i) || trimmed.match(/ACC\d+/i);
      if (accMatch) {
        return { accountNumber: accMatch[0].toUpperCase() };
      }
    }

    // 4. Raw Account Number fallback (e.g. AC00000005, ACC10001, 1000000123)
    if (/^[A-Za-z0-9]{5,20}$/.test(trimmed)) {
      return { accountNumber: trimmed.toUpperCase() };
    }

    return null;
  }

  /**
   * Generates high-definition PayGate Internal QR Image URL using QuickChart CDN + Fallback
   */
  generateQrImageUrl(accountNumber: string, accountName: string, amount: number = 0, note: string = ''): string {
    const payload = this.encodePayload(accountNumber, accountName, amount, note);
    const encodedPayload = encodeURIComponent(payload);
    
    // QuickChart API is fast, CDN hosted by Cloudflare, highly available
    return `https://quickchart.io/qr?text=${encodedPayload}&size=340&ecLevel=H&margin=1`;
  }

  /**
   * Fallback QR Generator URL in case main CDN fails
   */
  getFallbackQrImageUrl(accountNumber: string, accountName: string, amount: number = 0, note: string = ''): string {
    const payload = this.encodePayload(accountNumber, accountName, amount, note);
    const encodedPayload = encodeURIComponent(payload);
    return `https://api.qrserver.com/v1/create-qr-code/?size=340x340&data=${encodedPayload}&color=059669&bgcolor=ffffff&margin=1`;
  }
}
