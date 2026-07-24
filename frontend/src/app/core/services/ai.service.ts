import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface AiChatRequest {
  prompt: string;
}

export interface AiChatResponse {
  reply: string;
  modelUsed: string;
  suggestedAmount?: number;
  suggestedRecipient?: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = `${environment.apiUrl}/v1/ai`;

  constructor(private http: HttpClient) {}

  chat(prompt: string): Observable<ApiResponse<AiChatResponse>> {
    return this.http.post<ApiResponse<AiChatResponse>>(`${this.apiUrl}/chat`, { prompt });
  }
}
