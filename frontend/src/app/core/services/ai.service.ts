import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface AiChatRequest {
  prompt: string;
  userId?: number;
}

export interface AiChatResponse {
  reply: string;
  modelUsed: string;
  suggestedAmount?: number;
  suggestedRecipient?: string;
  action?: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  chat(prompt: string, userId?: number): Observable<ApiResponse<AiChatResponse>> {
    let targetUserId = userId;
    if (!targetUserId && typeof localStorage !== 'undefined') {
      try {
        const keys = ['user', 'currentUser', 'paygate_user', 'auth_user'];
        for (const key of keys) {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed && parsed.id) {
              targetUserId = parsed.id;
              break;
            }
          }
        }
      } catch {}
    }
    return this.http.post<ApiResponse<AiChatResponse>>(`${this.apiUrl}/chat`, { prompt, userId: targetUserId });
  }
}
