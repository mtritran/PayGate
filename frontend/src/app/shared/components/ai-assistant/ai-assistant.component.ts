import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AccountService } from '../../../core/services/account.service';
import { TransactionService } from '../../../core/services/transaction.service';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  actionButton?: {
    text: string;
    route: string;
    queryParams?: any;
  };
  statBadge?: {
    title: string;
    value: string;
    subtitle?: string;
  };
}

@Component({
  selector: 'pg-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <!-- Floating AI Widget Trigger Button -->
    <div class="ai-widget-container" [class.open]="isOpen()">
      <button 
        class="ai-trigger-btn" 
        (click)="toggleOpen()" 
        title="PayGate AI Financial Assistant"
        aria-label="Toggle AI Financial Assistant"
      >
        <div class="sparkle-ring"></div>
        <div class="ai-icon-box">
          <svg class="ai-sparkle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
        </div>
        <span class="ai-btn-text">PayGate AI</span>
        <span class="online-dot"></span>
      </button>

      <!-- Expandable Floating Chat Modal Box -->
      <div class="ai-chat-window fade-in-up" *ngIf="isOpen()">
        <!-- Header Bar -->
        <div class="chat-header">
          <div class="header-title-box">
            <div class="ai-avatar-mini">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
            </div>
            <div class="header-text">
              <span class="title">PayGate AI Assistant</span>
              <span class="status"><span class="green-dot"></span> Online - Trợ lý tài chính 24/7</span>
            </div>
          </div>

          <button class="btn-close-chat" (click)="isOpen.set(false)" title="Close Chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Messages Area -->
        <div class="chat-messages-body" #messagesContainer>
          <div 
            *ngFor="let msg of messages()" 
            class="chat-bubble-wrapper"
            [class.user-bubble]="msg.sender === 'user'"
            [class.ai-bubble]="msg.sender === 'ai'"
          >
            <div class="bubble-sender-lbl" *ngIf="msg.sender === 'ai'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-sparkle">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
              PayGate AI
            </div>

            <div class="bubble-content" [innerHTML]="formatMessageText(msg.text)"></div>

            <!-- Optional Stat Badge -->
            <div class="stat-badge-card" *ngIf="msg.statBadge">
              <div class="sb-title">{{ msg.statBadge.title }}</div>
              <div class="sb-value">{{ msg.statBadge.value }}</div>
              <div class="sb-sub" *ngIf="msg.statBadge.subtitle">{{ msg.statBadge.subtitle }}</div>
            </div>

            <!-- Optional Action Button -->
            <button 
              *ngIf="msg.actionButton" 
              class="btn-chat-action" 
              (click)="triggerAction(msg.actionButton)"
            >
              {{ msg.actionButton.text }}
            </button>

            <span class="msg-time">{{ msg.timestamp | date:'HH:mm' }}</span>
          </div>

          <!-- Thinking Loading Animation Indicator -->
          <div class="chat-bubble-wrapper ai-bubble" *ngIf="isThinking()">
            <div class="thinking-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- Quick Prompts Bar -->
        <div class="quick-prompts-bar">
          <button 
            *ngFor="let prompt of quickPrompts" 
            class="prompt-chip"
            (click)="sendQuickPrompt(prompt)"
          >
            {{ prompt }}
          </button>
        </div>

        <!-- Chat Input Footer -->
        <div class="chat-footer">
          <input 
            type="text" 
            class="chat-input" 
            placeholder="Hỏi AI (VD: Chuyển 200k cho PAY0000000004)..." 
            [(ngModel)]="userInputText"
            (keyup.enter)="sendMessage()"
          />
          <button 
            class="btn-send" 
            [disabled]="!userInputText.trim()" 
            (click)="sendMessage()"
            title="Gửi câu hỏi"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.4); }
      70% { box-shadow: 0 0 0 14px rgba(5, 150, 105, 0); }
      100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0); }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes bounceDot {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }

    .fade-in-up { animation: fadeInUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    .ai-widget-container {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9990;
      font-family: 'Inter', system-ui, sans-serif;
    }

    .ai-trigger-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 52px;
      padding: 0 20px 0 14px;
      border-radius: 28px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border: 1px solid rgba(255,255,255,0.25);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(5, 150, 105, 0.38);
      position: relative;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      animation: pulseGlow 2.5s infinite;
    }
    .ai-trigger-btn:hover {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 14px 34px rgba(5, 150, 105, 0.48);
    }

    .ai-icon-box {
      width: 32px;
      height: 32px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ai-sparkle-icon {
      width: 18px;
      height: 18px;
      color: #ffffff;
    }
    .online-dot {
      width: 8px;
      height: 8px;
      background: #34d399;
      border-radius: 50%;
      border: 2px solid #ffffff;
    }

    /* Floating Chat Box Window */
    .ai-chat-window {
      position: absolute;
      bottom: 66px;
      right: 0;
      width: 390px;
      height: 560px;
      background: #ffffff;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #ffffff;
    }
    .header-title-box { display: flex; align-items: center; gap: 12px; }
    .ai-avatar-mini {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }
    .ai-avatar-mini svg { width: 20px; height: 20px; }

    .header-text { display: flex; flex-direction: column; gap: 2px; }
    .header-text .title { font-size: 0.95rem; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; }
    .header-text .status { font-size: 0.72rem; color: #94a3b8; display: flex; align-items: center; gap: 5px; font-weight: 600; }
    .green-dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; display: inline-block; }

    .btn-close-chat {
      background: rgba(255,255,255,0.1);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .btn-close-chat:hover { background: rgba(255,255,255,0.2); color: #ffffff; }
    .btn-close-chat svg { width: 16px; height: 16px; }

    /* Messages Body */
    .chat-messages-body {
      flex: 1;
      padding: 18px 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f8fafc;
    }

    .chat-bubble-wrapper {
      display: flex;
      flex-direction: column;
      max-width: 86%;
    }
    .user-bubble { align-self: flex-end; }
    .ai-bubble { align-self: flex-start; }

    .bubble-sender-lbl {
      font-size: 0.72rem;
      font-weight: 800;
      color: #059669;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .mini-sparkle { width: 12px; height: 12px; }

    .bubble-content {
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .user-bubble .bubble-content {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .ai-bubble .bubble-content {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.03);
    }

    .stat-badge-card {
      background: #f0fdf4;
      border: 1px solid #a7f3d0;
      border-radius: 14px;
      padding: 12px 14px;
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sb-title { font-size: 0.72rem; font-weight: 800; color: #047857; text-transform: uppercase; }
    .sb-value { font-size: 1.25rem; font-weight: 900; color: #059669; }
    .sb-sub { font-size: 0.75rem; color: #475569; }

    .btn-chat-action {
      margin-top: 10px;
      height: 42px;
      padding: 0 16px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border: none;
      border-radius: 12px;
      color: #ffffff;
      font-size: 0.85rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.28);
      transition: all 0.15s;
    }
    .btn-chat-action:hover { transform: translateY(-1.5px); }

    .msg-time { font-size: 0.65rem; color: #94a3b8; margin-top: 4px; align-self: flex-end; }
    .ai-bubble .msg-time { align-self: flex-start; }

    /* Thinking Dots */
    .thinking-dots {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 16px;
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid #e2e8f0;
      width: fit-content;
    }
    .thinking-dots span {
      width: 6px;
      height: 6px;
      background: #059669;
      border-radius: 50%;
      animation: bounceDot 1.4s infinite ease-in-out both;
    }
    .thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
    .thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

    /* Quick Prompts Bar */
    .quick-prompts-bar {
      padding: 10px 14px;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
      display: flex;
      gap: 6px;
      overflow-x: auto;
      white-space: nowrap;
    }
    .prompt-chip {
      padding: 6px 12px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .prompt-chip:hover { background: #ecfdf5; border-color: #059669; color: #059669; }

    /* Input Footer */
    .chat-footer {
      padding: 12px 14px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .chat-input {
      flex: 1;
      height: 44px;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 0 14px;
      font-size: 0.85rem;
      color: #0f172a;
      outline: none;
      transition: border-color 0.15s;
    }
    .chat-input:focus { border-color: #059669; }

    .btn-send {
      width: 44px;
      height: 44px;
      background: #059669;
      border: none;
      border-radius: 14px;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
    }
    .btn-send:hover:not(:disabled) { background: #047857; }
    .btn-send:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .btn-send svg { width: 18px; height: 18px; }

    @media (max-width: 480px) {
      .ai-widget-container { bottom: 18px; right: 18px; }
      .ai-chat-window { width: 94vw; right: -10px; bottom: 62px; height: 500px; }
    }
  `]
})
export class AiAssistantComponent implements OnInit {
  private accountService = inject(AccountService);
  private transactionService = inject(TransactionService);
  private router = inject(Router);

  isOpen = signal<boolean>(false);
  isThinking = signal<boolean>(false);
  userInputText = '';

  messages = signal<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Xin chào! Tôi là **PayGate AI Assistant**. Tôi có thể giúp bạn kiểm tra chi tiêu, tính toán tổng giao dịch hoặc tự động điền đơn chuyển tiền nhanh chóng.',
      timestamp: new Date()
    }
  ]);

  quickPrompts = [
    'Chuyển 200k cho PAY0000000004',
    'Tổng chi tiêu 7 ngày qua?',
    'Kiểm tra số dư Ví',
    'Hướng dẫn nạp VietQR'
  ];

  ngOnInit(): void {}

  toggleOpen(): void {
    this.isOpen.update((v: boolean) => !v);
  }

  sendQuickPrompt(promptText: string): void {
    this.userInputText = promptText;
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.userInputText.trim();
    if (!text) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date()
    };

    this.messages.update((list: ChatMessage[]) => [...list, userMsg]);
    this.userInputText = '';
    this.isThinking.set(true);

    // Simulate AI Intent Recognition
    setTimeout(() => {
      this.processAiResponse(text);
      this.isThinking.set(false);
    }, 650);
  }

  private processAiResponse(input: string): void {
    const lower = input.toLowerCase();

    // Intent 1: Money Transfer Auto-fill (e.g. "Chuyển 200k cho PAY0000000004" or "Chuyển 50000 cho 0988123456")
    if (lower.includes('chuyển') || lower.includes('chuyen') || lower.includes('pay') || lower.includes('gửi')) {
      const parsed = this.extractTransferDetails(input);
      if (parsed.amount || parsed.recipient) {
        const formattedAmountStr = parsed.amount ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parsed.amount) : 'Chưa rõ số tiền';
        const recipientStr = parsed.recipient || 'chưa rõ số tài khoản';

        const aiMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'ai',
          text: `Tôi đã nhận diện lệnh chuyển tiền của bạn:\n• Số tiền: **${formattedAmountStr}**\n• Người nhận: **${recipientStr}**\n\nTôi đã chuẩn bị xong thông tin. Bấm nút bên dưới để tự động mở trang chuyển tiền!`,
          timestamp: new Date(),
          actionButton: {
            text: `Chuyển ngay ${formattedAmountStr} ➔`,
            route: '/transactions/send',
            queryParams: { amount: parsed.amount, recipient: parsed.recipient }
          }
        };
        this.messages.update((list: ChatMessage[]) => [...list, aiMsg]);
        return;
      }
    }

    // Intent 2: Volume / Expense Summary ("Chi bao nhiêu", "7 ngày", "tổng giao dịch")
    if (lower.includes('chi bao nhiêu') || lower.includes('tổng') || lower.includes('7 ngày') || lower.includes('thống kê')) {
      this.transactionService.getMyTransactions({ page: 0, size: 100 }).subscribe({
        next: (res: any) => {
          const content = res.content || (res.data && res.data.content) || [];
          const totalVol = content
            .filter((t: any) => t.status === 'COMPLETED')
            .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
          
          const formattedVol = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalVol);

          const aiMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'ai',
            text: `Đây là tổng hợp giao dịch gần đây của bạn:`,
            timestamp: new Date(),
            statBadge: {
              title: 'Tổng chi tiêu gần đây',
              value: formattedVol,
              subtitle: `Dựa trên ${content.length} giao dịch thành công`
            }
          };
          this.messages.update((list: ChatMessage[]) => [...list, aiMsg]);
        },
        error: () => {
          const aiMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'ai',
            text: 'Tổng số tiền giao dịch 7 ngày qua của bạn được cập nhật trực tiếp tại trang **Account Dashboard**.',
            timestamp: new Date(),
            actionButton: { text: 'Xem Bảng Dashboard ➔', route: '/dashboard' }
          };
          this.messages.update((list: ChatMessage[]) => [...list, aiMsg]);
        }
      });
      return;
    }

    // Intent 3: Balance Query ("Số dư", "tài khoản", "ví")
    if (lower.includes('số dư') || lower.includes('so du') || lower.includes('tài khoản') || lower.includes('ví')) {
      this.accountService.getAccountMe().subscribe({
        next: (res: any) => {
          const acc = res.data || res;
          const formattedBalance = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(acc.balance || 0);
          const aiMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'ai',
            text: `Số dư khả dụng hiện tại trong Ví PayGate của bạn:`,
            timestamp: new Date(),
            statBadge: {
              title: 'Số dư khả dụng',
              value: formattedBalance,
              subtitle: `Tài khoản số: ${acc.accountNumber}`
            }
          };
          this.messages.update((list: ChatMessage[]) => [...list, aiMsg]);
        },
        error: () => {
          const aiMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'ai',
            text: 'Bạn có thể xem chi tiết số dư tại trang Dashboard cá nhân.',
            timestamp: new Date(),
            actionButton: { text: 'Đến trang Dashboard ➔', route: '/dashboard' }
          };
          this.messages.update((list: ChatMessage[]) => [...list, aiMsg]);
        }
      });
      return;
    }

    // Intent 4: Top up / VietQR guide
    if (lower.includes('nạp') || lower.includes('nap') || lower.includes('vietqr') || lower.includes('qr')) {
      const aiMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        text: 'Bạn có thể nạp tiền vào ví PayGate bằng cách chọn các Ngân hàng liên kết (MB, Vietcombank...) hoặc Quét mã VietQR 24/7.',
        timestamp: new Date(),
        actionButton: { text: 'Đến trang Nạp tiền VietQR ➔', route: '/accounts/topup' }
      };
      this.messages.update((list: ChatMessage[]) => [...list, aiMsg]);
      return;
    }

    // Default Fallback
    const fallbackMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      text: 'Tôi có thể hỗ trợ bạn:\n1. Tự động điền đơn chuyển tiền (Gõ: *Chuyển 200k cho PAY0000000004*)\n2. Kiểm tra tổng chi tiêu 7 ngày qua\n3. Trả cứu số dư ví tức thì.',
      timestamp: new Date()
    };
    this.messages.update((list: ChatMessage[]) => [...list, fallbackMsg]);
  }

  private extractTransferDetails(text: string): { amount: number | null; recipient: string | null } {
    let amount: number | null = null;
    let recipient: string | null = null;

    // Extract amount: e.g., 200k, 200.000, 50k, 100000, 1tr
    const kMatch = text.match(/(\d+)\s*(k|kđ|tr|triệu|000)/i);
    if (kMatch) {
      const num = parseInt(kMatch[1], 10);
      const unit = kMatch[2].toLowerCase();
      if (unit === 'k' || unit === 'kđ' || unit === '000') {
        amount = num * 1000;
      } else if (unit === 'tr' || unit === 'triệu') {
        amount = num * 1000000;
      }
    } else {
      const rawNum = text.match(/(\d{4,9})/);
      if (rawNum) {
        amount = parseInt(rawNum[1], 10);
      }
    }

    // Extract recipient: PAY0000000004 or 10-digit phone number 0988123456
    const payMatch = text.match(/(PAY\d{10})/i);
    const phoneMatch = text.match(/(0\d{9})/);

    if (payMatch) {
      recipient = payMatch[1].toUpperCase();
    } else if (phoneMatch) {
      recipient = phoneMatch[1];
    }

    return { amount, recipient };
  }

  triggerAction(actionBtn: { text: string; route: string; queryParams?: any }): void {
    this.isOpen.set(false);
    this.router.navigate([actionBtn.route], { queryParams: actionBtn.queryParams });
  }

  formatMessageText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  }
}
