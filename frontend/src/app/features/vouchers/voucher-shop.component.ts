import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoucherService, VoucherResponse, UserVoucherResponse } from '../../../core/services/voucher.service';
import { RewardService, PointsResponse } from '../../../core/services/reward.service';

@Component({
  selector: 'app-voucher-shop',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <div class="row mb-4">
        <div class="col-md-12">
          <div class="card bg-primary text-white shadow-sm">
            <div class="card-body d-flex justify-content-between align-items-center">
              <div>
                <h4 class="card-title mb-1">🎁 Kho Voucher & Điểm Thưởng</h4>
                <p class="mb-0">Tích điểm đổi quà ưu đãi hấp dẫn cùng PayGate</p>
              </div>
              <div class="text-end" *ngIf="points">
                <div class="fs-3 fw-bold">{{ points.totalPoints }} điểm</div>
                <span class="badge bg-warning text-dark me-2">Hạng {{ points.tier }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <ul class="nav nav-tabs mb-4">
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'shop'" (click)="activeTab = 'shop'">
            🛒 Đổi Voucher ({{ shopVouchers.length }})
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" [class.active]="activeTab === 'my'" (click)="activeTab = 'my'">
            🎟️ Voucher Của Tôi ({{ myVouchers.length }})
          </button>
        </li>
      </ul>

      <!-- Tab 1: Voucher Shop -->
      <div *ngIf="activeTab === 'shop'" class="row">
        <div *ngFor="let voucher of shopVouchers" class="col-md-6 mb-3">
          <div class="card h-100 shadow-sm border-0 border-start border-4 border-success">
            <div class="card-body d-flex flex-column justify-content-between">
              <div>
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5 class="card-title fw-bold text-success mb-0">{{ voucher.code }}</h5>
                  <span class="badge bg-danger">Còn {{ voucher.remainingQty }} mã</span>
                </div>
                <p class="card-text text-dark fw-semibold mb-1">{{ voucher.title }}</p>
                <small class="text-muted d-block">Giảm giá: {{ voucher.discountAmount | currency:'VND':'symbol':'1.0-0' }}</small>
                <small class="text-muted d-block">Đơn tối thiểu: {{ voucher.minOrderAmount | currency:'VND':'symbol':'1.0-0' }}</small>
                <small class="text-muted d-block">Hạn dùng: {{ voucher.expiresAt | date:'dd/MM/yyyy' }}</small>
              </div>
              <div class="mt-3 d-flex justify-content-between align-items-center">
                <span class="fw-bold text-primary">{{ voucher.pointsRequired }} điểm</span>
                <button class="btn btn-sm btn-outline-success" (click)="redeem(voucher.id)" [disabled]="redeemingId === voucher.id">
                  {{ redeemingId === voucher.id ? 'Đang đổi...' : 'Đổi ngay' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: My Vouchers -->
      <div *ngIf="activeTab === 'my'" class="row">
        <div *ngFor="let voucher of myVouchers" class="col-md-6 mb-3">
          <div class="card h-100 shadow-sm border-0 border-start border-4"
               [ngClass]="{
                 'border-primary': voucher.status === 'AVAILABLE',
                 'border-secondary': voucher.status === 'USED',
                 'border-danger': voucher.status === 'EXPIRED'
               }">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="card-title fw-bold mb-0">{{ voucher.voucherCode }}</h5>
                <span class="badge"
                      [ngClass]="{
                        'bg-success': voucher.status === 'AVAILABLE',
                        'bg-secondary': voucher.status === 'USED',
                        'bg-danger': voucher.status === 'EXPIRED'
                      }">
                  {{ voucher.status }}
                </span>
              </div>
              <p class="card-text mb-1">{{ voucher.title }}</p>
              <small class="text-muted d-block">Hạn dùng: {{ voucher.expiresAt | date:'dd/MM/yyyy' }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class VoucherShopComponent implements OnInit {
  activeTab: 'shop' | 'my' = 'shop';
  points: PointsResponse | null = null;
  shopVouchers: VoucherResponse[] = [];
  myVouchers: UserVoucherResponse[] = [];
  redeemingId: number | null = null;

  constructor(
    private voucherService: VoucherService,
    private rewardService: RewardService
  ) {}

  ngOnInit(): void {
    this.loadPoints();
    this.loadShopVouchers();
    this.loadMyVouchers();
  }

  loadPoints(): void {
    this.rewardService.getMyPoints().subscribe(res => {
      if (res.success) this.points = res.data;
    });
  }

  loadShopVouchers(): void {
    this.voucherService.getShopVouchers().subscribe(res => {
      if (res.success && res.data) this.shopVouchers = res.data.content || [];
    });
  }

  loadMyVouchers(): void {
    this.voucherService.getMyVouchers().subscribe(res => {
      if (res.success) this.myVouchers = res.data || [];
    });
  }

  redeem(voucherId: number): void {
    this.redeemingId = voucherId;
    this.voucherService.redeemVoucher(voucherId).subscribe({
      next: (res) => {
        this.redeemingId = null;
        if (res.success) {
          alert('Đổi voucher thành công!');
          this.loadPoints();
          this.loadShopVouchers();
          this.loadMyVouchers();
        }
      },
      error: (err) => {
        this.redeemingId = null;
        alert(err.error?.message || 'Đổi voucher thất bại');
      }
    });
  }
}
