import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BillService, BillProviderResponse, BillResponse, SavedBillResponse } from '../../../core/services/bill.service';

@Component({
  selector: 'app-bill-pay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4">
      <div class="row">
        <!-- Main Form Left -->
        <div class="col-md-8">
          <div class="card shadow-sm border-0">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">⚡ Thanh Toán Hóa Đơn Điện / Nước / Internet</h5>
            </div>
            <div class="card-body">
              <!-- Step 1: Provider Type & Selection -->
              <div class="mb-3">
                <label class="form-label fw-semibold">1. Chọn loại dịch vụ</label>
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-outline-primary" [class.active]="selectedType === 'ELECTRICITY'" (click)="selectType('ELECTRICITY')">⚡ Điện</button>
                  <button type="button" class="btn btn-outline-primary" [class.active]="selectedType === 'WATER'" (click)="selectType('WATER')">💧 Nước</button>
                  <button type="button" class="btn btn-outline-primary" [class.active]="selectedType === 'INTERNET'" (click)="selectType('INTERNET')">🌐 Internet</button>
                </div>
              </div>

              <div class="mb-3" *ngIf="filteredProviders.length > 0">
                <label class="form-label fw-semibold">2. Nhà cung cấp</label>
                <select class="form-select" [(ngModel)]="selectedProviderCode">
                  <option value="">-- Chọn Nhà Cung Cấp --</option>
                  <option *ngFor="let p of filteredProviders" [value]="p.code">{{ p.name }}</option>
                </select>
              </div>

              <!-- Step 2: Customer Code -->
              <div class="mb-3" *ngIf="selectedProviderCode">
                <label class="form-label fw-semibold">3. Mã khách hàng</label>
                <div class="input-group">
                  <input type="text" class="form-control" [(ngModel)]="customerCode" placeholder="Nhập mã KH (VD: PE0100112233)">
                  <button class="btn btn-primary" (click)="lookup()" [disabled]="lookingUp || !customerCode">
                    {{ lookingUp ? 'Đang tra cứu...' : 'Tra cứu hóa đơn' }}
                  </button>
                </div>
              </div>

              <!-- Step 3: Bill Result & Payment Confirmation -->
              <div *ngIf="billResult" class="alert alert-info border-info mt-4">
                <h6 class="fw-bold">📄 Thông Tin Hóa Đơn</h6>
                <hr>
                <p class="mb-1"><strong>Khách hàng:</strong> {{ billResult.customerName }}</p>
                <p class="mb-1"><strong>Địa chỉ:</strong> {{ billResult.address }}</p>
                <p class="mb-1"><strong>Kỳ thanh toán:</strong> {{ billResult.period }}</p>
                <p class="mb-1"><strong>Số tiền:</strong> <span class="fs-5 text-danger fw-bold">{{ billResult.amount | currency:'VND':'symbol':'1.0-0' }}</span></p>
                
                <div class="mt-3">
                  <input type="text" class="form-control mb-2" [(ngModel)]="voucherCode" placeholder="Nhập mã Voucher giảm giá (optional)">
                  <button class="btn btn-success w-100 fw-bold" (click)="pay()" [disabled]="paying">
                    {{ paying ? 'Đang xử lý...' : 'Xác Nhận Thanh Toán' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Saved Bills Right Sidebar -->
        <div class="col-md-4">
          <div class="card shadow-sm border-0">
            <div class="card-header bg-light">
              <h6 class="mb-0 fw-bold">⭐ Hóa Đơn Đã Lưu</h6>
            </div>
            <div class="card-body p-2">
              <div *ngFor="let saved of savedBills" class="p-2 border-bottom hover-bg" (click)="quickLookup(saved)">
                <div class="fw-bold">{{ saved.nickname || saved.providerName }}</div>
                <small class="text-muted">{{ saved.customerCode }}</small>
              </div>
              <div *ngIf="savedBills.length === 0" class="text-center text-muted p-3">Chưa có hóa đơn được lưu</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BillPayComponent implements OnInit {
  providers: BillProviderResponse[] = [];
  filteredProviders: BillProviderResponse[] = [];
  savedBills: SavedBillResponse[] = [];
  
  selectedType: string = 'ELECTRICITY';
  selectedProviderCode: string = '';
  customerCode: string = '';
  voucherCode: string = '';

  lookingUp: boolean = false;
  paying: boolean = false;
  billResult: BillResponse | null = null;

  constructor(private billService: BillService) {}

  ngOnInit(): void {
    this.loadProviders();
    this.loadSavedBills();
  }

  loadProviders(): void {
    this.billService.getProviders().subscribe(res => {
      if (res.success) {
        this.providers = res.data || [];
        this.filterProviders();
      }
    });
  }

  loadSavedBills(): void {
    this.billService.getSavedBills().subscribe(res => {
      if (res.success) this.savedBills = res.data || [];
    });
  }

  selectType(type: string): void {
    this.selectedType = type;
    this.selectedProviderCode = '';
    this.billResult = null;
    this.filterProviders();
  }

  filterProviders(): void {
    this.filteredProviders = this.providers.filter(p => p.type === this.selectedType);
  }

  lookup(): void {
    this.lookingUp = true;
    this.billResult = null;
    this.billService.lookupBill(this.selectedProviderCode, this.customerCode).subscribe({
      next: (res) => {
        this.lookingUp = false;
        if (res.success) this.billResult = res.data;
      },
      error: (err) => {
        this.lookingUp = false;
        alert(err.error?.message || 'Không tìm thấy hóa đơn chưa thanh toán');
      }
    });
  }

  quickLookup(saved: SavedBillResponse): void {
    this.selectedProviderCode = saved.providerCode;
    this.customerCode = saved.customerCode;
    this.lookup();
  }

  pay(): void {
    if (!this.billResult) return;
    this.paying = true;
    this.billService.payBill(this.billResult.id, this.voucherCode).subscribe({
      next: (res) => {
        this.paying = false;
        if (res.success) {
          alert('Thanh toán hóa đơn thành công!');
          this.billResult = null;
        }
      },
      error: (err) => {
        this.paying = false;
        alert(err.error?.message || 'Thanh toán hóa đơn thất bại');
      }
    });
  }
}
