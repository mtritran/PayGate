import { Component, OnInit, signal, inject, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AiService } from '../../../core/services/ai.service';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  modelUsed?: string;
  actionButton?: {
    text: string;
    route: string;
    queryParams?: any;
  };
}

@Component({
  selector: 'pg-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="ai-widget-container">
      <!-- Trigger Button -->
      <button
        class="ai-trigger-btn"
        (click)="toggleOpen()"
        title="PayGate AI Financial Assistant"
        aria-label="Toggle AI Financial Assistant"
      >
        <div class="ai-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
        </div>
        <span class="ai-btn-text">PayGate AI</span>
        <span class="online-dot"></span>
      </button>

      <!-- Chat Window -->
      <div class="ai-chat-window fade-in-up" *ngIf="isOpen()">
        <!-- Header -->
        <div class="chat-header">
          <div class="header-title-box">
            <div class="ai-avatar-mini">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
            </div>
            <div class="header-text">
              <span class="title">PayGate AI Assistant</span>
              <span class="status"><span class="green-dot"></span> Powered by OpenRouter</span>
            </div>
          </div>
          <button class="btn-close-chat" (click)="isOpen.set(false)" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Messages -->
        <div class="chat-messages-body" #scrollContainer>
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

            <button
              *ngIf="msg.actionButton"
              class="btn-chat-action"
              (click)="triggerAction(msg.actionButton)"
            >
              {{ msg.actionButton.text }}
            </button>

            <span class="msg-time">{{ msg.timestamp | date:'HH:mm' }}</span>
          </div>

          <!-- Thinking Indicator -->
          <div class="chat-bubble-wrapper ai-bubble" *ngIf="isThinking()">
            <div class="thinking-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- Error Banner -->
        <div class="error-banner" *ngIf="errorMsg()">
          {{ errorMsg() }}
        </div>

        <!-- Input Footer -->
        <div class="chat-footer">
          <input
            type="text"
            class="chat-input"
            placeholder="Hỏi AI bất cứ điều gì..."
            [(ngModel)]="userInputText"
            (keyup.enter)="sendMessage()"
            [disabled]="isThinking()"
          />
          <button
            class="btn-send"
            [disabled]="!userInputText.trim() || isThinking()"
            (click)="sendMessage()"
            title="Gửi"
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
      border: 1px solid rgba(255,255,255,0.2);
      color: #ffffff;
      font-size: 0.92rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(5, 150, 105, 0.38);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      animation: pulseGlow 2.5s infinite;
    }
    .ai-trigger-btn:hover {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 14px 34px rgba(5, 150, 105, 0.48);
    }
    .ai-icon-box {
      width: 30px; height: 30px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    .ai-icon-box svg { width: 16px; height: 16px; }
    .online-dot {
      width: 8px; height: 8px;
      background: #34d399;
      border-radius: 50%;
      border: 2px solid #ffffff;
    }

    /* Chat Window */
    .ai-chat-window {
      position: absolute;
      bottom: 66px; right: 0;
      width: 390px; height: 540px;
      background: #ffffff;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header */
    .chat-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-title-box { display: flex; align-items: center; gap: 12px; }
    .ai-avatar-mini {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #059669, #10b981);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .ai-avatar-mini svg { width: 18px; height: 18px; color: #ffffff; stroke: #ffffff; }
    .header-text { display: flex; flex-direction: column; gap: 2px; }
    .header-text .title { font-size: 0.9rem; font-weight: 800; color: #ffffff; }
    .header-text .status { font-size: 0.7rem; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
    .green-dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; }
    .btn-close-chat {
      background: rgba(255,255,255,0.1); border: none;
      width: 30px; height: 30px; border-radius: 50%;
      color: #94a3b8; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .btn-close-chat:hover { background: rgba(255,255,255,0.2); color: #fff; }
    .btn-close-chat svg { width: 14px; height: 14px; }

    /* Messages */
    .chat-messages-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #f8fafc;
    }
    .chat-bubble-wrapper { display: flex; flex-direction: column; max-width: 86%; }
    .user-bubble { align-self: flex-end; }
    .ai-bubble { align-self: flex-start; }

    .bubble-sender-lbl {
      font-size: 0.68rem; font-weight: 800;
      color: #059669; margin-bottom: 4px;
      display: flex; align-items: center; gap: 4px;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .mini-sparkle { width: 11px; height: 11px; }

    .bubble-content {
      padding: 11px 15px;
      border-radius: 18px;
      font-size: 0.875rem;
      line-height: 1.6;
    }
    .user-bubble .bubble-content {
      background: linear-gradient(135deg, #059669, #047857);
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .ai-bubble .bubble-content {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }

    .btn-chat-action {
      margin-top: 8px;
      height: 40px; padding: 0 16px;
      background: linear-gradient(135deg, #059669, #047857);
      border: none; border-radius: 12px;
      color: #ffffff; font-size: 0.82rem; font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(5,150,105,0.25);
      transition: all 0.15s;
    }
    .btn-chat-action:hover { transform: translateY(-1px); }

    .msg-time { font-size: 0.62rem; color: #94a3b8; margin-top: 3px; align-self: flex-end; }
    .ai-bubble .msg-time { align-self: flex-start; }

    .thinking-dots {
      display: flex; align-items: center; gap: 4px;
      padding: 10px 16px;
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid #e2e8f0;
      width: fit-content;
    }
    .thinking-dots span {
      width: 6px; height: 6px;
      background: #059669;
      border-radius: 50%;
      animation: bounceDot 1.4s infinite ease-in-out both;
    }
    .thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
    .thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

    /* Error Banner */
    .error-banner {
      padding: 8px 14px;
      background: #fef2f2;
      border-top: 1px solid #fecaca;
      font-size: 0.78rem;
      color: #dc2626;
      font-weight: 600;
    }

    /* Input Footer */
    .chat-footer {
      padding: 12px 14px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex; align-items: center; gap: 10px;
    }
    .chat-input {
      flex: 1; height: 44px;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 0 14px;
      font-size: 0.85rem;
      color: #0f172a;
      outline: none;
      transition: border-color 0.15s;
    }
    .chat-input:focus { border-color: #059669; }
    .chat-input:disabled { background: #f8fafc; cursor: not-allowed; }

    .btn-send {
      width: 44px; height: 44px;
      background: #059669;
      border: none; border-radius: 14px;
      color: #ffffff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
      box-shadow: 0 4px 12px rgba(5,150,105,0.25);
    }
    .btn-send:hover:not(:disabled) { background: #047857; }
    .btn-send:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
    .btn-send svg { width: 17px; height: 17px; }

    @media (max-width: 480px) {
      .ai-widget-container { bottom: 18px; right: 18px; }
      .ai-chat-window { width: 94vw; right: -10px; bottom: 62px; height: 490px; }
    }
  `]
})
export class AiAssistantComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private aiService = inject(AiService);
  private router = inject(Router);

  isOpen = signal<boolean>(false);
  isThinking = signal<boolean>(false);
  errorMsg = signal<string>('');
  userInputText = '';

  messages = signal<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Xin chào! Tôi là **PayGate AI Assistant**, được cung cấp bởi OpenRouter. Hãy hỏi tôi bất cứ điều gì về tài chính, thanh toán hoặc các tính năng PayGate.',
      timestamp: new Date()
    }
  ]);

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  toggleOpen(): void {
    this.isOpen.update((v: boolean) => !v);
    this.errorMsg.set('');
  }

  sendMessage(): void {
    const text = this.userInputText.trim();
    if (!text || this.isThinking()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    this.messages.update((list: ChatMessage[]) => [...list, userMsg]);
    this.userInputText = '';
    this.isThinking.set(true);
    this.errorMsg.set('');

    this.aiService.chat(text).subscribe({
      next: (res: any) => {
        this.isThinking.set(false);
        const data = res.data || res;
        const reply = data.reply || 'Dịch vụ AI không trả về phản hồi.';
        const model = data.modelUsed;

        const aiMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'ai',
          text: reply,
          modelUsed: model,
          timestamp: new Date(),
          actionButton: this.resolveActionButton(data)
        };

        this.messages.update((list: ChatMessage[]) => [...list, aiMsg]);
      },
      error: (err: any) => {
        this.isThinking.set(false);
        const status = err?.status;
        if (status === 0) {
          this.errorMsg.set('Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.');
        } else if (status === 401 || status === 403) {
          this.errorMsg.set('API Key OpenRouter không hợp lệ. Vui lòng kiểm tra cấu hình OPENROUTER_API_KEY.');
        } else if (status === 429) {
          this.errorMsg.set('Đã vượt quá giới hạn yêu cầu OpenRouter. Vui lòng thử lại sau.');
        } else {
          this.errorMsg.set(`Lỗi từ server (${status || 'unknown'}). Vui lòng thử lại.`);
        }
      }
    });
  }

  triggerAction(actionBtn: { text: string; route: string; queryParams?: any }): void {
    this.isOpen.set(false);
    this.router.navigate([actionBtn.route], { queryParams: actionBtn.queryParams });
  }

  /** Map backend action + suggestedAmount/recipient to an action button */
  private resolveActionButton(data: any): ChatMessage['actionButton'] | undefined {
    const action: string | undefined = data.action;
    const amount: number | undefined = data.suggestedAmount;
    const recipient: string | undefined = data.suggestedRecipient;

    if (action === 'TOPUP') {
      return { text: '💳 Nạp tiền ngay', route: '/top-up' };
    }
    if (action === 'TRANSFER' || amount || recipient) {
      const formattedAmt = amount
        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
        : '';
      return {
        text: formattedAmt ? `💸 Chuyển ngay ${formattedAmt}` : '💸 Mở form chuyển tiền',
        route: '/transactions/send',
        queryParams: { amount, recipient }
      };
    }
    if (action === 'VIEW_TRANSACTIONS') {
      return { text: '📋 Xem lịch sử giao dịch', route: '/transactions' };
    }
    if (action === 'VIEW_BALANCE') {
      return { text: '💰 Xem số dư tài khoản', route: '/accounts/dashboard' };
    }
    return undefined;
  }

  formatMessageText(text: string): string {
    if (!text) return '';
    return text
      // Strip markdown tables entirely (lines starting with | )
      .replace(/^\|.*\|\s*$/gm, '')
      .replace(/^[\s|:-]+$/gm, '')
      // Strip markdown images ![...](...)
      .replace(/!\[([^\]]*?)\]\([^)]*?\)/g, '')
      // Strip any URL that looks like a QR/image link
      .replace(/https?:\/\/[^\s)>"]+\.(jpg|jpeg|png|gif|svg|webp|qr)[^\s)>"]*\?[^\s)>"]+/gi, '')
      // Strip markdown links [text](url) → just keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Strip large code blocks (```...```)
      .replace(/```[\s\S]*?```/g, '')
      // Bold & italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Inline code (small snippets only)
      .replace(/`([^`]{1,60})`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:0.85em">$1</code>')
      // Remaining backtick blocks
      .replace(/`[^`]*`/g, '')
      // Newlines
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n/g, '<br/>')
      .trim();
  }
}
