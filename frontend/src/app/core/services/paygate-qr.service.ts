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
   * Generates a direct web transfer URL for PayGate payment redirect.
   * e.g. http://localhost:4200/transactions/transfer?recipient=AC00000005&amount=100000&note=Tien%20ca%20phe
   */
  generatePayGatePaymentLink(accountNumber: string, amount: number = 0, note: string = ''): string {
    const cleanAcc = (accountNumber || '').trim();
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? window.location.origin
      : 'http://localhost:4200';
    
    let url = `${origin}/transactions/transfer?recipient=${encodeURIComponent(cleanAcc)}`;
    if (amount > 0) {
      url += `&amount=${amount}`;
    }
    if (note && note.trim()) {
      url += `&note=${encodeURIComponent(note.trim())}`;
    }
    url += `&accept=1`;
    return url;
  }

  /**
   * Encodes a PayGate Wallet Transfer payload into a scannable Web URL / QR format.
   * Format: Direct Web URL so phone cameras immediately open the PayGate Payment Transfer Page!
   */
  encodePayload(accountNumber: string, accountName: string = '', amount: number = 0, note: string = ''): string {
    return this.generatePayGatePaymentLink(accountNumber, amount, note);
  }

  /**
   * Parses a QR code string, URL, or image text into structured PayGate Transfer info.
   * Supports:
   * 1. Direct Web URLs (http://.../transactions/transfer?recipient=AC00000005&amount=100000&note=Tien%20ca%20phe)
   * 2. PayGate Standard Format (PAYGATE:TRANSFER:AC00000005:100000:Tien%20ca%20phe:NAME)
   * 3. JSON Payloads ({"accountNumber":"AC00000005", "amount":100000, "note":"..."})
   * 4. Raw Account Numbers (AC00000005)
   */
  parsePayload(qrData: string): { accountNumber: string; accountName?: string; amount?: number; note?: string } | null {
    if (!qrData) return null;
    const trimmed = qrData.trim();

    // 1. Direct Web URL format (e.g. http://localhost:4200/transactions/transfer?recipient=AC00000005&amount=100000&note=Tien%20ca%20phe)
    if (trimmed.includes('/transactions/transfer') || trimmed.includes('recipient=')) {
      try {
        const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `http://${trimmed}`);
        const recipient = urlObj.searchParams.get('recipient') || urlObj.searchParams.get('acc') || urlObj.searchParams.get('to');
        const amountStr = urlObj.searchParams.get('amount') || urlObj.searchParams.get('amt');
        const note = urlObj.searchParams.get('note') || urlObj.searchParams.get('description') || urlObj.searchParams.get('memo') || '';

        if (recipient) {
          return {
            accountNumber: recipient.toUpperCase(),
            amount: amountStr ? Number(amountStr) : 0,
            note: decodeURIComponent(note)
          };
        }
      } catch (e) {
        // Fallback parameter regex parsing if URL parsing fails
        const recipientMatch = trimmed.match(/[?&](recipient|acc|to)=([A-Za-z0-9]+)/i);
        const amountMatch = trimmed.match(/[?&](amount|amt)=(\d+)/i);
        const noteMatch = trimmed.match(/[?&](note|description|memo)=([^&]+)/i);

        if (recipientMatch) {
          return {
            accountNumber: recipientMatch[2].toUpperCase(),
            amount: amountMatch ? Number(amountMatch[2]) : 0,
            note: noteMatch ? decodeURIComponent(noteMatch[2]) : ''
          };
        }
      }
    }

    // 2. PayGate Standard Format: PAYGATE:TRANSFER:AC00000005:100000:Tien%20ca%20phe:TRAN%20VIET%20TRINH
    if (trimmed.startsWith('PAYGATE:TRANSFER:')) {
      const parts = trimmed.split(':');
      if (parts.length >= 3) {
        const accountNumber = parts[2] || '';
        const amount = parts[3] ? Number(parts[3]) : 0;
        const note = parts[4] ? decodeURIComponent(parts[4]) : '';
        const accountName = parts[5] ? decodeURIComponent(parts[5]) : '';
        return {
          accountNumber: accountNumber.toUpperCase(),
          accountName,
          amount: isNaN(amount) ? 0 : amount,
          note
        };
      }
    }

    // 3. PayGate JSON Format: {"scheme":"paygate", "accountNumber":"AC00000005", ...}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.accountNumber || parsed.account_number || parsed.acc) {
          return {
            accountNumber: (parsed.accountNumber || parsed.account_number || parsed.acc).toUpperCase(),
            accountName: parsed.accountName || parsed.name || '',
            amount: Number(parsed.amount) || 0,
            note: parsed.note || parsed.description || ''
          };
        }
      } catch (e) {
        // Ignore JSON parse error
      }
    }

    // 4. VietQR EMVCo Format fallback (Extract account number from Tag 38)
    if (trimmed.startsWith('000201') || trimmed.includes('A000000727')) {
      const accMatch = trimmed.match(/AC\d{8,12}/i) || trimmed.match(/ACC\d+/i);
      if (accMatch) {
        return { accountNumber: accMatch[0].toUpperCase() };
      }
    }

    // 5. Raw Account Number fallback (e.g. AC00000005, ACC10001, 1000000123)
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
