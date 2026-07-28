import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoucherService, VoucherResponse, UserVoucherResponse, VoucherCreateRequest } from '../../core/services/voucher.service';
import { RewardService, PointsResponse, PointTransactionResponse } from '../../core/services/reward.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiResponse } from '../../core/models/api-response.model';

@Component({
  selector: 'app-voucher-shop',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4 mb-5">
      <!-- Top Banner Header & User Points Center -->
      <div class="row mb-4">
        <div class="col-md-12">
          <div class="card bg-gradient text-white shadow-sm border-0 mb-3" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 20px;">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                  <h3 class="fw-bold mb-1 text-white">🎁 Kho Voucher & Trung Tâm Điểm Thưởng</h3>
                  <p class="mb-0 text-white-50">Tích lũy điểm thưởng tự động qua mỗi giao dịch thanh toán để đổi Voucher ưu đãi từ PayGate</p>
                </div>
              </div>

              <!-- 3 Feature Stat Badges for User Points -->
              <div class="row g-3 mt-3" *ngIf="points">
                <div class="col-md-4">
                  <div class="p-3 bg-white text-dark rounded-4 shadow-sm d-flex align-items-center justify-content-between">
                    <div>
                      <small class="text-muted text-uppercase fw-bold d-block mb-1">Tổng điểm hiện có</small>
                      <div class="fs-3 fw-extrabold text-success">{{ points.totalPoints | number }} <span class="fs-6 text-muted">pts</span></div>
                    </div>
                    <div class="p-3 rounded-circle" style="background: #ecfdf5; color: #059669;">
                      <span class="fs-3">🏆</span>
                    </div>
                  </div>
                </div>

                <div class="col-md-4">
                  <div class="p-3 bg-white text-dark rounded-4 shadow-sm d-flex align-items-center justify-content-between">
                    <div>
                      <small class="text-muted text-uppercase fw-bold d-block mb-1">Hạng thành viên</small>
                      <div class="fs-4 fw-bold text-warning">{{ points.tier }}</div>
                    </div>
                    <div class="p-3 rounded-circle" style="background: #fef3c7; color: #d97706;">
                      <span class="fs-3">⭐</span>
                    </div>
                  </div>
                </div>

                <div class="col-md-4">
                  <div class="p-3 bg-white text-dark rounded-4 shadow-sm d-flex align-items-center justify-content-between">
                    <div>
                      <small class="text-muted text-uppercase fw-bold d-block mb-1">Tích lũy tháng này</small>
                      <div class="fs-4 fw-bold text-primary">+{{ points.earnedThisMonth | number }} <span class="fs-6 text-muted">pts</span></div>
                    </div>
                    <div class="p-3 rounded-circle" style="background: #eff6ff; color: #2563eb;">
                      <span class="fs-3">📈</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs & Admin Action -->
      <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2 flex-wrap gap-2">
        <ul class="nav nav-pills gap-2">
          <li class="nav-item">
            <button class="nav-link fw-semibold" [class.active]="activeTab === 'shop'" (click)="activeTab = 'shop'">
              🛒 Đổi Voucher ({{ shopVouchers.length }})
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link fw-semibold" [class.active]="activeTab === 'my'" (click)="activeTab = 'my'">
              🎟️ Voucher Của Tôi ({{ myVouchers.length }})
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link fw-semibold" [class.active]="activeTab === 'history'" (click)="activeTab = 'history'; loadHistory()">
              📜 Lịch Sử Điểm ({{ pointHistory.length }})
            </button>
          </li>
        </ul>

        <!-- Admin Only Toggle Button -->
        <button *ngIf="isAdmin" 
                class="btn fw-bold px-3 py-2 rounded-3 shadow-sm d-flex align-items-center gap-2"
                [ngClass]="activeTab === 'admin' ? 'btn-dark' : 'btn-outline-dark'"
                (click)="toggleAdminTab()">
          <span>⚙️ {{ activeTab === 'admin' ? 'Đóng Quản Lý Admin' : 'Tạo & Quản Lý Voucher (Admin)' }}</span>
        </button>
      </div>

      <!-- Tab 1: Voucher Shop -->
      <div *ngIf="activeTab === 'shop'" class="row g-3">
        <div *ngFor="let voucher of shopVouchers" class="col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden position-relative hover-lift">
            <div class="card-header bg-emerald text-white p-3 d-flex justify-content-between align-items-center" style="background: #10b981;">
              <span class="badge bg-white text-emerald fw-bold fs-6" style="color: #047857;">Mã: {{ voucher.code }}</span>
              <span class="badge bg-danger">Còn {{ voucher.remainingQty }}/{{ voucher.totalQuantity }}</span>
            </div>
            <div class="card-body p-3 d-flex flex-column justify-content-between">
              <div>
                <h5 class="fw-bold text-dark mb-2">{{ voucher.title }}</h5>
                <div class="mb-2">
                  <span class="fs-4 fw-bold text-danger">{{ voucher.discountAmount | currency:'VND':'symbol':'1.0-0' }}</span>
                  <small class="text-muted ms-1">cho đơn từ {{ voucher.minOrderAmount | currency:'VND':'symbol':'1.0-0' }}</small>
                </div>
                <div class="small text-secondary mb-1">Áp dụng: <span class="badge bg-light text-dark border">{{ voucher.applicableType }}</span></div>
                <div class="small text-secondary">Hạn dùng: {{ voucher.expiresAt | date:'dd/MM/yyyy' }}</div>
              </div>
              <div class="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                <div>
                  <small class="text-muted d-block">Giá đổi</small>
                  <span class="fw-bold text-primary fs-5">{{ voucher.pointsRequired }} pts</span>
                </div>
                <button class="btn btn-emerald text-white fw-bold px-3 py-2 rounded-3" 
                        style="background: #10b981;"
                        (click)="redeem(voucher.id)" 
                        [disabled]="redeemingId === voucher.id || (points ? points.totalPoints < voucher.pointsRequired : false) || voucher.remainingQty <= 0">
                  {{ redeemingId === voucher.id ? 'Đang xử lý...' : (points && points.totalPoints < voucher.pointsRequired ? 'Thiếu điểm' : 'Đổi Ngay') }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div *ngIf="shopVouchers.length === 0" class="col-12 text-center py-5 text-muted">
          Hiện tại chưa có Voucher nào sẵn có để đổi.
        </div>
      </div>

      <!-- Tab 2: My Vouchers -->
      <div *ngIf="activeTab === 'my'" class="row g-3">
        <div *ngFor="let voucher of myVouchers" class="col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm border-0 rounded-4"
               [ngClass]="{
                 'border-start border-5 border-success': voucher.status === 'AVAILABLE',
                 'border-start border-5 border-secondary opacity-75': voucher.status === 'USED',
                 'border-start border-5 border-danger opacity-50': voucher.status === 'EXPIRED'
               }">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="fw-bold mb-0 text-primary">{{ voucher.voucherCode }}</h5>
                <span class="badge px-3 py-2 rounded-pill"
                      [ngClass]="{
                        'bg-success': voucher.status === 'AVAILABLE',
                        'bg-secondary': voucher.status === 'USED',
                        'bg-danger': voucher.status === 'EXPIRED'
                      }">
                  {{ voucher.status === 'AVAILABLE' ? 'Sẵn sàng dùng' : (voucher.status === 'USED' ? 'Đã sử dụng' : 'Hết hạn') }}
                </span>
              </div>
              <p class="fw-semibold text-dark mb-1">{{ voucher.title }}</p>
              <div class="fs-5 fw-bold text-danger mb-2">Giảm {{ voucher.discountAmount | currency:'VND':'symbol':'1.0-0' }}</div>
              <small class="text-muted d-block">Đã đổi: {{ voucher.redeemedAt | date:'dd/MM/yyyy HH:mm' }}</small>
              <small class="text-muted d-block">Hạn sử dụng: {{ voucher.expiresAt | date:'dd/MM/yyyy' }}</small>
            </div>
          </div>
        </div>
        <div *ngIf="myVouchers.length === 0" class="col-12 text-center py-5 text-muted">
          Bạn chưa sở hữu Voucher nào. Hãy chọn tab "Đổi Voucher" để tích đổi nhé!
        </div>
      </div>

      <!-- Tab 3: Point History -->
      <div *ngIf="activeTab === 'history'" class="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-light">
              <tr>
                <th class="py-3 ps-3">Loại</th>
                <th class="py-3">Mô tả</th>
                <th class="py-3">Mã tham chiếu</th>
                <th class="py-3">Điểm thay đổi</th>
                <th class="py-3 text-end pe-3">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of pointHistory">
                <td class="ps-3">
                  <span class="badge" [class.bg-success]="item.type === 'EARN'" [class.bg-danger]="item.type === 'REDEEM'">
                    {{ item.type === 'EARN' ? '+ Tích điểm' : '- Đổi quà' }}
                  </span>
                </td>
                <td>{{ item.description }}</td>
                <td><code>{{ item.transactionRef || '-' }}</code></td>
                <td class="fw-bold" [class.text-success]="item.type === 'EARN'" [class.text-danger]="item.type === 'REDEEM'">
                  {{ item.type === 'EARN' ? '+' : '-' }}{{ item.points }} pts
                </td>
                <td class="text-end pe-3 text-muted small">{{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
              <tr *ngIf="pointHistory.length === 0">
                <td colspan="5" class="text-center py-4 text-muted">Chưa có lịch sử giao dịch điểm.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 4: Admin Management & Create Voucher -->
      <div *ngIf="activeTab === 'admin'" class="row g-4">
        <!-- Form Tạo Voucher Mới -->
        <div class="col-md-5">
          <div class="card shadow-sm border-0 rounded-4">
            <div class="card-header bg-dark text-white rounded-top-4 p-3">
              <h5 class="mb-0 fw-bold">➕ Tạo Voucher Mới</h5>
            </div>
            <div class="card-body p-3">
              <form (ngSubmit)="createVoucher()">
                <div class="mb-3">
                  <label class="form-label fw-semibold small">Mã Voucher (Code)</label>
                  <input type="text" class="form-control" [(ngModel)]="newVoucher.code" name="code" placeholder="VD: BILL50K" required>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold small">Tên hiển thị (Title)</label>
                  <input type="text" class="form-control" [(ngModel)]="newVoucher.title" name="title" placeholder="Giảm 50K hóa đơn Điện" required>
                </div>
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="form-label fw-semibold small">Số tiền giảm (VND)</label>
                    <input type="number" class="form-control" [(ngModel)]="newVoucher.discountAmount" name="discountAmount" required>
                  </div>
                  <div class="col-6">
                    <label class="form-label fw-semibold small">Điểm cần đổi (pts)</label>
                    <input type="number" class="form-control" [(ngModel)]="newVoucher.pointsRequired" name="pointsRequired" required>
                  </div>
                </div>
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="form-label fw-semibold small">Đơn tối thiểu (VND)</label>
                    <input type="number" class="form-control" [(ngModel)]="newVoucher.minOrderAmount" name="minOrderAmount" required>
                  </div>
                  <div class="col-6">
                    <label class="form-label fw-semibold small">Số lượng phát hành</label>
                    <input type="number" class="form-control" [(ngModel)]="newVoucher.totalQuantity" name="totalQuantity" required>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold small">Loại áp dụng (Applicable Type)</label>
                  <select class="form-select" [(ngModel)]="newVoucher.applicableType" name="applicableType">
                    <option value="ALL">ALL (Tất cả dịch vụ)</option>
                    <option value="BILL_PAYMENT">BILL_PAYMENT (Thanh toán hóa đơn)</option>
                    <option value="ELECTRICITY">ELECTRICITY (Điện)</option>
                    <option value="WATER">WATER (Nước)</option>
                    <option value="INTERNET">INTERNET (Internet)</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold small">Ngày hết hạn (YYYY-MM-DDTHH:mm:ss)</label>
                  <input type="text" class="form-control" [(ngModel)]="newVoucher.expiresAt" name="expiresAt" placeholder="2026-12-31T23:59:59" required>
                </div>
                <button type="submit" class="btn btn-primary w-100 fw-bold py-2 rounded-3" [disabled]="creating">
                  {{ creating ? 'Đang khởi tạo...' : 'Tạo Voucher' }}
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Danh Sách Voucher Hệ Thống (Admin View) -->
        <div class="col-md-7">
          <div class="card shadow-sm border-0 rounded-4">
            <div class="card-header bg-light p-3">
              <h5 class="mb-0 fw-bold">📋 Tất Cả Voucher Trong Hệ Thống</h5>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th class="ps-3">Code</th>
                      <th>Giảm giá</th>
                      <th>Điểm đổi</th>
                      <th>Còn lại</th>
                      <th>Hạn dùng</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let v of adminVouchers">
                      <td class="ps-3">
                        <span class="fw-bold text-success">{{ v.code }}</span>
                        <div class="small text-muted">{{ v.title }}</div>
                      </td>
                      <td class="fw-bold text-danger">{{ v.discountAmount | currency:'VND':'symbol':'1.0-0' }}</td>
                      <td>{{ v.pointsRequired }} pts</td>
                      <td><span class="badge bg-info text-dark">{{ v.remainingQty }}/{{ v.totalQuantity }}</span></td>
                      <td class="small text-muted">{{ v.expiresAt | date:'dd/MM/yyyy' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class VoucherShopComponent implements OnInit {
  activeTab: 'shop' | 'my' | 'history' | 'admin' = 'shop';
  points: PointsResponse | null = null;
  shopVouchers: VoucherResponse[] = [];
  myVouchers: UserVoucherResponse[] = [];
  pointHistory: PointTransactionResponse[] = [];
  adminVouchers: VoucherResponse[] = [];
  
  redeemingId: number | null = null;
  creating: boolean = false;

  newVoucher: VoucherCreateRequest = {
    code: '',
    title: '',
    discountAmount: 20000,
    pointsRequired: 100,
    minOrderAmount: 100000,
    applicableType: 'ALL',
    totalQuantity: 100,
    expiresAt: '2026-12-31T23:59:59'
  };

  constructor(
    private voucherService: VoucherService,
    private rewardService: RewardService,
    private authService: AuthService
  ) {}

  get isAdmin(): boolean {
    return this.authService.getRole() === 'ADMIN';
  }

  ngOnInit(): void {
    this.loadPoints();
    this.loadShopVouchers();
    this.loadMyVouchers();
  }

  toggleAdminTab(): void {
    if (this.activeTab === 'admin') {
      this.activeTab = 'shop';
    } else {
      this.activeTab = 'admin';
      this.loadAdminVouchers();
    }
  }

  loadPoints(): void {
    this.rewardService.getMyPoints().subscribe({
      next: (res: ApiResponse<PointsResponse>) => {
        if (res.success) this.points = res.data;
      },
      error: (err) => console.error('Failed to load points:', err)
    });
  }

  loadShopVouchers(): void {
    this.voucherService.getShopVouchers().subscribe({
      next: (res: any) => {
        if (res.success && res.data) this.shopVouchers = res.data.content || [];
      },
      error: (err) => console.error('Failed to load shop vouchers:', err)
    });
  }

  loadMyVouchers(): void {
    this.voucherService.getMyVouchers().subscribe({
      next: (res: ApiResponse<UserVoucherResponse[]>) => {
        if (res.success) this.myVouchers = res.data || [];
      },
      error: (err) => console.error('Failed to load my vouchers:', err)
    });
  }

  loadHistory(): void {
    this.rewardService.getPointsHistory().subscribe({
      next: (res: any) => {
        if (res.success && res.data) this.pointHistory = res.data.content || [];
      },
      error: (err) => console.error('Failed to load point history:', err)
    });
  }

  loadAdminVouchers(): void {
    this.voucherService.getAllVouchersForAdmin().subscribe({
      next: (res: any) => {
        if (res.success && res.data) this.adminVouchers = res.data.content || [];
      },
      error: (err) => console.error('Failed to load admin vouchers:', err)
    });
  }

  redeem(voucherId: number): void {
    this.redeemingId = voucherId;
    this.voucherService.redeemVoucher(voucherId).subscribe({
      next: (res: ApiResponse<UserVoucherResponse>) => {
        this.redeemingId = null;
        if (res.success) {
          alert('🎉 Đổi voucher thành công!');
          this.loadPoints();
          this.loadShopVouchers();
          this.loadMyVouchers();
        }
      },
      error: (err: any) => {
        this.redeemingId = null;
        alert(err.error?.message || 'Đổi voucher thất bại');
      }
    });
  }

  createVoucher(): void {
    if (!this.newVoucher.code || !this.newVoucher.title) {
      alert('Vui lòng nhập đầy đủ mã và tên Voucher');
      return;
    }
    this.creating = true;
    this.voucherService.createVoucher(this.newVoucher).subscribe({
      next: (res) => {
        this.creating = false;
        if (res.success) {
          alert('✅ Tạo Voucher thành công!');
          this.newVoucher.code = '';
          this.newVoucher.title = '';
          this.loadAdminVouchers();
          this.loadShopVouchers();
        }
      },
      error: (err) => {
        this.creating = false;
        alert(err.error?.message || 'Tạo Voucher thất bại');
      }
    });
  }
}
