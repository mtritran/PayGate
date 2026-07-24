import { Injectable } from '@angular/core';

export interface VietQrConfig {
  bankBin: string; // e.g. '970422' for MB Bank, '970436' for Vietcombank, '970407' for Techcombank, '970418' for BIDV
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  transferNote: string;
}

export interface BankDeepLink {
  name: string;
  scheme: string;
  appStoreUrl: string;
  bg: string;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class VietQrService {
  // Official Central Receiver Account for PayGate System
  private readonly DEFAULT_BANK_CODE = 'MB'; // MB Bank
  private readonly DEFAULT_BANK_BIN = '970422';
  private readonly DEFAULT_ACCOUNT_NUMBER = '8888999988';
  private readonly DEFAULT_ACCOUNT_HOLDER = 'PAYGATE GATEWAY SYSTEM';

  /**
   * Generates a standard VietQR Image URL using official VietQR API
   */
  generateQrImageUrl(amount: number, transferNote: string, bankCode: string = 'MB', accountNumber: string = '8888999988', accountHolder: string = 'PAYGATE GATEWAY SYSTEM'): string {
    const encodedNote = encodeURIComponent(transferNote);
    const encodedName = encodeURIComponent(accountHolder);
    return `https://img.vietqr.io/image/${bankCode.toLowerCase()}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodedNote}&accountName=${encodedName}`;
  }

  /**
   * Generates EMVCo VietQR String Payload (000201010212...)
   */
  generateEMVCoPayload(config: VietQrConfig): string {
    const bankBin = config.bankBin || this.DEFAULT_BANK_BIN;
    const accNum = config.accountNumber || this.DEFAULT_ACCOUNT_NUMBER;
    const amountStr = config.amount.toString();
    const note = config.transferNote;

    // Guid for VietQR: A000000727
    const guid = '0010A000000727';
    const sub38_00 = `00${bankBin.length.toString().padStart(2, '0')}${bankBin}`;
    const sub38_01 = `01${accNum.length.toString().padStart(2, '0')}${accNum}`;
    const merchantInfoValue = `${sub38_00}${sub38_01}`;
    const tag38Value = `${guid}01${merchantInfoValue.length.toString().padStart(2, '0')}${merchantInfoValue}`;
    const tag38 = `38${tag38Value.length.toString().padStart(2, '0')}${tag38Value}`;

    const tag53 = '5303704'; // Currency VND 704
    const tag54 = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
    const tag58 = '5802VN';

    const sub62_08 = `08${note.length.toString().padStart(2, '0')}${note}`;
    const tag62 = `62${sub62_08.length.toString().padStart(2, '0')}${sub62_08}`;

    const rawWithoutCrc = `000201010212${tag38}${tag53}${tag54}${tag58}${tag62}6304`;
    const crc = this.calculateCRC16(rawWithoutCrc);
    return `${rawWithoutCrc}${crc}`;
  }

  /**
   * Standard CRC16 CCITT Calculation for VietQR EMVCo spec
   */
  private calculateCRC16(str: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      crc ^= (c << 8);
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Mobile Banking Deep Links
   */
  getMobileBankingApps(): BankDeepLink[] {
    return [
      { name: 'MB Bank', scheme: 'mbmobile://', appStoreUrl: 'https://mbbank.com.vn', bg: '#1d4ed8', color: '#ffffff' },
      { name: 'Vietcombank', scheme: 'vcbdigibank://', appStoreUrl: 'https://vietcombank.com.vn', bg: '#047857', color: '#ffffff' },
      { name: 'Techcombank', scheme: 'tcb://', appStoreUrl: 'https://techcombank.com.vn', bg: '#dc2626', color: '#ffffff' },
      { name: 'MoMo Wallet', scheme: 'momo://', appStoreUrl: 'https://momo.vn', bg: '#db2777', color: '#ffffff' },
      { name: 'BIDV SmartBanking', scheme: 'bidvsmartbanking://', appStoreUrl: 'https://bidv.com.vn', bg: '#0284c7', color: '#ffffff' }
    ];
  }
}
