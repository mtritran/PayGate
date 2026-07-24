import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { WebhookLog } from '../models/webhook-log.model';

@Injectable({
  providedIn: 'root'
})
export class WebhookLogService {
  private readonly baseUrl = '/api/v1/admin/webhooks';

  constructor(private http: HttpClient) {}

  getLogs(page: number = 0, size: number = 20, status?: string): Observable<ApiResponse<PageResponse<WebhookLog>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', 'createdAt')
      .set('sortDir', 'DESC');

    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }

    return this.http.get<ApiResponse<PageResponse<WebhookLog>>>(this.baseUrl, { params });
  }
}
