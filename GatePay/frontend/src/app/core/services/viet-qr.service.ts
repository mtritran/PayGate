import { Injectable } from '@angular/core';

export interface BankInfo {
  code: string;
  bin: string;
  shortName: string;
  name: string;
  logo: string;
}

export interface VietQrConfig {
  bankCode?: string;
  bankBin?: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  transferNote: string;
  template?: 'compact2' | 'compact' | 'qr_only' | 'print';
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
  public readonly DEFAULT_BANK_CODE = 'MB';
  public readonly DEFAULT_BANK_BIN = '970422';
  public readonly DEFAULT_ACCOUNT_NUMBER = '8888999988';
  public readonly DEFAULT_ACCOUNT_HOLDER = 'PAYGATE GATEWAY SYSTEM';

  private readonly SUPPORTED_BANKS: BankInfo[] = [
    { code: 'MB', bin: '970422', shortName: 'MBBank', name: 'Ngân hàng TMCP Quân Đội', logo: 'https://api.vietqr.io/img/MB.png' },
    { code: 'VCB', bin: '970436', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', logo: 'https://api.vietqr.io/img/VCB.png' },
    { code: 'TCB', bin: '970407', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam', logo: 'https://api.vietqr.io/img/TCB.png' },
    { code: 'BIDV', bin: '970418', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', logo: 'https://api.vietqr.io/img/BIDV.png' },
    { code: 'VTB', bin: '970415', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công Thương Việt Nam', logo: 'https://api.vietqr.io/img/ICB.png' },
    { code: 'VBA', bin: '970405', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn VN', logo: 'https://api.vietqr.io/img/VBA.png' },
    { code: 'VPB', bin: '970432', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', logo: 'https://api.vietqr.io/img/VPB.png' },
    { code: 'ACB', bin: '970416', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu', logo: 'https://api.vietqr.io/img/ACB.png' },
    { code: 'TPB', bin: '970423', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong', logo: 'https://api.vietqr.io/img/TPB.png' },
    { code: 'STB', bin: '970403', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', logo: 'https://api.vietqr.io/img/STB.png' },
    { code: 'HDB', bin: '970437', shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM', logo: 'https://api.vietqr.io/img/HDB.png' },
    { code: 'OCB', bin: '970448', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông', logo: 'https://api.vietqr.io/img/OCB.png' },
    { code: 'VIB', bin: '970441', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', logo: 'https://api.vietqr.io/img/VIB.png' },
    { code: 'MSB', bin: '970426', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', logo: 'https://api.vietqr.io/img/MSB.png' },
    { code: 'EIB', bin: '970431', shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam', logo: 'https://api.vietqr.io/img/EIB.png' },
    { code: 'SEAB', bin: '970440', shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á', logo: 'https://api.vietqr.io/img/SEAB.png' },
    { code: 'LPB', bin: '970449', shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam', logo: 'https://api.vietqr.io/img/LPB.png' },
    { code: 'SHB', bin: '970443', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', logo: 'https://api.vietqr.io/img/SHB.png' },
    { code: 'ABB', bin: '970425', shortName: 'ABBANK', name: 'Ngân hàng TMCP An Bình', logo: 'https://api.vietqr.io/img/ABB.png' },
    { code: 'BAB', bin: '970409', shortName: 'BacABank', name: 'Ngân hàng TMCP Bắc Á', logo: 'https://api.vietqr.io/img/BAB.png' },
    { code: 'VAB', bin: '970427', shortName: 'VietABank', name: 'Ngân hàng TMCP Việt Á', logo: 'https://api.vietqr.io/img/VAB.png' },
    { code: 'NCB', bin: '970419', shortName: 'NCB', name: 'Ngân hàng TMCP Quốc Dân', logo: 'https://api.vietqr.io/img/NCB.png' },
    { code: 'Shinhan', bin: '970424', shortName: 'ShinhanBank', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam', logo: 'https://api.vietqr.io/img/SHINHAN.png' },
    { code: 'Woori', bin: '970457', shortName: 'WooriBank', name: 'Ngân hàng TNHH MTV Woori Việt Nam', logo: 'https://api.vietqr.io/img/WOORI.png' }
  ];

  getBanks(): BankInfo[] {
    return this.SUPPORTED_BANKS;
  }

  getBankByCode(code: string): BankInfo | undefined {
    return this.SUPPORTED_BANKS.find(b => b.code.toUpperCase() === code.toUpperCase());
  }

  /**
   * Generates a standard VietQR Image URL using official VietQR API
   */
  generateQrImageUrl(
    amount: number,
    transferNote: string,
    bankCode: string = 'MB',
    accountNumber: string = '8888999988',
    accountHolder: string = 'PAYGATE GATEWAY SYSTEM',
    template: 'compact2' | 'compact' | 'qr_only' | 'print' = 'compact2'
  ): string {
    const cleanBank = (bankCode || 'MB').toLowerCase();
    const cleanAcc = (accountNumber || '8888999988').trim();
    const encodedNote = encodeURIComponent(transferNote || 'PAYGATE TOPUP');
    const encodedName = encodeURIComponent(accountHolder || 'PAYGATE GATEWAY SYSTEM');
    return `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-${template}.png?amount=${amount}&addInfo=${encodedNote}&accountName=${encodedName}`;
  }

  /**
   * Generates EMVCo VietQR String Payload (000201010212...)
   */
  generateEMVCoPayload(config: VietQrConfig): string {
    const bankBin = config.bankBin || this.DEFAULT_BANK_BIN;
    const accNum = config.accountNumber || this.DEFAULT_ACCOUNT_NUMBER;
    const amountStr = (config.amount || 0).toString();
    const note = config.transferNote || '';

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
