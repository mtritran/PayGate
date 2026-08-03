# Hướng dẫn & Template Code chuẩn Frontend (Angular 17+ Standalone)

Tài liệu này cung cấp cấu trúc thiết kế và template code chuẩn cho phần Frontend của dự án (sử dụng **Angular 17+**, **Standalone Component**, và **Angular Material**). Lập trình viên cần tuân thủ các quy tắc này để đảm bảo code đồng bộ và hoạt động mượt mà với phần Backend.

---

## 1. Cấu trúc thư mục Frontend

Kiến trúc thư mục tuân theo mô hình phân tách vai trò rõ ràng:

```text
frontend/src/app
│
├── core                        # Chứa các tài nguyên dùng chung toàn app (Singleton)
│   ├── guards                  # Route Guards (ví dụ: AuthGuard)
│   ├── interceptors            # HTTP Interceptors (gắn JWT token, handle error)
│   ├── models                  # Định nghĩa TypeScript Interface dùng chung
│   │   ├── api-response.model.ts   # Cấu trúc API Response từ Backend
│   │   └── page-response.model.ts  # Cấu trúc phân trang từ Backend
│   └── services                # Global Services (Auth, Notification, v.v...)
│
├── shared                      # Chứa các Components/Directives/Pipes tái sử dụng
│   └── components
│       ├── confirm-dialog      # Dialog xác nhận hành động xóa/huỷ
│       └── loading-spinner     # Hiệu ứng loading dùng chung
│
├── layout                      # Bố cục trang chính (Sidebar, Header, Footer)
│
├── features                    # Các module tính năng nghiệp vụ của ứng dụng
│   ├── dashboard               # Tính năng Dashboard
│   └── products                # [NEW] Ví dụ tính năng quản lý sản phẩm
│       ├── product-list        # Component danh sách sản phẩm
│       ├── product-form        # Component thêm mới/cập nhật sản phẩm
│       └── product.service.ts  # Service giao tiếp API riêng của Product
│
├── app.config.ts               # Cấu hình Providers toàn hệ thống (HttpClient, Animations...)
└── app.routes.ts               # Khai báo Router toàn trang
```

---

## 2. Các Quy tắc Phát triển quan trọng

1. **Standalone Components:** 
   - Không sử dụng `NgModule`. Mọi Component đều phải được khai báo `standalone: true`.
   - Các Angular Material Modules (hoặc Directives) nào component sử dụng thì phải được import trực tiếp trong mảng `imports` của `@Component`.
2. **Single File Components (SFC):**
   - Theo chuẩn hiện tại của codebase, các UI component nhỏ và vừa được viết trực tiếp mã HTML trong thuộc tính `template` (Sử dụng Template Literal ` `) ngay trong file `.component.ts` để quản lý tập trung và nhanh chóng.
3. **Mẫu Control Flow mới của Angular (Angular 17+):**
   - Sử dụng `@if (condition) { ... } @else { ... }` thay vì `*ngIf`.
   - Sử dụng `@for (item of items; track item.id) { ... }` thay vì `*ngFor`.
4. **Reactive Forms:**
   - Dùng `FormBuilder` để khởi tạo form dữ liệu và thực hiện validate phía Client.
5. **Giao tiếp API:**
   - Định nghĩa kiểu dữ liệu trả về thông qua wrapper `ApiResponse<T>` hoặc `ApiResponse<PageResponse<T>>`.

---

## 3. Chi tiết Template Code (Tính năng `Product`)

### 3.1. Service & Interfaces (`product.service.ts`)

Định nghĩa Interfaces cho dữ liệu ngay tại đầu file Service (trừ trường hợp dùng chung toàn hệ thống thì đưa vào `core/models`).

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { PageResponse } from '../../core/models/page-response.model';

// 1. Định nghĩa cấu trúc dữ liệu Product
export interface Product {
  id: number;
  code: string;
  name: string;
  price: number;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// 2. Định nghĩa DTO Request
export interface CreateProductRequest {
  code: string;
  name: string;
  price: number;
  description?: string;
}

export interface UpdateProductRequest {
  name: string;
  price: number;
  description?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  // Lấy danh sách phân trang
  getAll(page = 0, size = 20): Observable<ApiResponse<PageResponse<Product>>> {
    return this.http.get<ApiResponse<PageResponse<Product>>>(
      `${this.apiUrl}?page=${page}&size=${size}`
    );
  }

  // Lấy chi tiết sản phẩm theo ID
  getById(id: number): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${id}`);
  }

  // Thêm mới sản phẩm
  create(product: CreateProductRequest): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(this.apiUrl, product);
  }

  // Cập nhật sản phẩm
  update(id: number, product: UpdateProductRequest): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${this.apiUrl}/${id}`, product);
  }

  // Xóa sản phẩm
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

### 3.2. List Component (`product-list.component.ts`)

Hiển thị danh sách dạng bảng dữ liệu của **Angular Material Table** kết hợp phân trang **MatPaginator**.

```typescript
import { Component, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CurrencyPipe } from '@angular/common';
import { Product, ProductService } from '../product.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    RouterLink, 
    MatTableModule, 
    MatPaginatorModule, 
    MatButtonModule, 
    MatIconModule, 
    MatChipsModule, 
    MatDialogModule,
    CurrencyPipe
  ],
  template: `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>Products</h2>
      <a mat-raised-button color="primary" routerLink="/products/new">
        <mat-icon>add</mat-icon> New Product
      </a>
    </div>

    <table mat-table [dataSource]="products" class="full-width">
      <!-- ID Column -->
      <ng-container matColumnDef="id">
        <th mat-header-cell *matHeaderCellDef>ID</th>
        <td mat-cell *matCellDef="let product">{{ product.id }}</td>
      </ng-container>

      <!-- Code Column -->
      <ng-container matColumnDef="code">
        <th mat-header-cell *matHeaderCellDef>Code</th>
        <td mat-cell *matCellDef="let product"><strong>{{ product.code }}</strong></td>
      </ng-container>

      <!-- Name Column -->
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let product">{{ product.name }}</td>
      </ng-container>

      <!-- Price Column -->
      <ng-container matColumnDef="price">
        <th mat-header-cell *matHeaderCellDef>Price</th>
        <td mat-cell *matCellDef="let product">{{ product.price | currency }}</td>
      </ng-container>

      <!-- Status Column -->
      <ng-container matColumnDef="active">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let product">
          <mat-chip [highlighted]="product.active">
            {{ product.active ? 'Active' : 'Inactive' }}
          </mat-chip>
        </td>
      </ng-container>

      <!-- Actions Column -->
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let product">
          <a mat-icon-button [routerLink]="['/products', product.id, 'edit']">
            <mat-icon>edit</mat-icon>
          </a>
          <button mat-icon-button color="warn" (click)="onDelete(product)">
            <mat-icon>delete</mat-icon>
          </button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>

    <mat-paginator 
      [length]="totalElements" 
      [pageSize]="pageSize" 
      [pageSizeOptions]="[10, 20, 50]"
      (page)="onPageChange($event)">
    </mat-paginator>
  `
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  displayedColumns = ['id', 'code', 'name', 'price', 'active', 'actions'];
  totalElements = 0;
  pageSize = 20;
  currentPage = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private productService: ProductService,
    private notification: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getAll(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.products = res.data.content;
          this.totalElements = res.data.totalElements;
        }
      },
      error: () => this.notification.error('Failed to load products')
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadProducts();
  }

  onDelete(product: Product): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { 
        title: 'Delete Product', 
        message: `Are you sure you want to delete product "${product.name}"?` 
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.productService.delete(product.id).subscribe({
          next: () => {
            this.notification.success('Product deleted successfully');
            this.loadProducts();
          },
          error: (err) => this.notification.error(err.error?.message || 'Failed to delete product')
        });
      }
    });
  }
}
```

### 3.3. Form Component (`product-form.component.ts`)

Nhận nhiệm vụ thêm mới hoặc sửa đổi thông tin sản phẩm. Sử dụng **Reactive Forms** để kiểm soát tính hợp lệ của dữ liệu.

```typescript
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ProductService } from '../product.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSlideToggleModule],
  template: `
    <h2>{{ isEdit ? 'Edit Product' : 'Create Product' }}</h2>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" style="max-width: 500px; display: flex; flex-direction: column; gap: 16px;">
      
      <!-- Code Field (Chỉ cho phép nhập khi tạo mới) -->
      <mat-form-field class="full-width">
        <mat-label>Product Code</mat-label>
        <input matInput formControlName="code">
        @if (form.get('code')?.hasError('required')) {
          <mat-error>Product code is required</mat-error>
        }
        @if (form.get('code')?.hasError('minlength')) {
          <mat-error>Code must be at least 3 characters</mat-error>
        }
      </mat-form-field>

      <!-- Name Field -->
      <mat-form-field class="full-width">
        <mat-label>Product Name</mat-label>
        <input matInput formControlName="name">
        @if (form.get('name')?.hasError('required')) {
          <mat-error>Product name is required</mat-error>
        }
      </mat-form-field>

      <!-- Price Field -->
      <mat-form-field class="full-width">
        <mat-label>Price</mat-label>
        <input matInput type="number" formControlName="price">
        @if (form.get('price')?.hasError('required')) {
          <mat-error>Price is required</mat-error>
        }
        @if (form.get('price')?.hasError('min')) {
          <mat-error>Price must be greater than 0</mat-error>
        }
      </mat-form-field>

      <!-- Description Field -->
      <mat-form-field class="full-width">
        <mat-label>Description</mat-label>
        <textarea matInput rows="4" formControlName="description"></textarea>
      </mat-form-field>

      <!-- Active Toggle (Chỉ hiện khi Update) -->
      @if (isEdit) {
        <mat-slide-toggle formControlName="active">Active Status</mat-slide-toggle>
      }

      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}
        </button>
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
      </div>
    </form>
  `
})
export class ProductFormComponent implements OnInit {
  isEdit = false;
  loading = false;
  productId: number | null = null;

  form = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    description: [''],
    active: [true]
  });

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.productId = +id;
      // Khi edit, không cho sửa code (sát với quy định backend ở mapper)
      this.form.get('code')?.disable();
      this.loadProduct();
    }
  }

  loadProduct(): void {
    this.productService.getById(this.productId!).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.form.patchValue({
            code: res.data.code,
            name: res.data.name,
            price: res.data.price,
            description: res.data.description,
            active: res.data.active
          });
        }
      },
      error: () => this.notification.error('Failed to load product detail')
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;

    // Lấy tất cả giá trị form (bao gồm cả các input bị disable như 'code')
    const rawValue = this.form.getRawValue();

    if (this.isEdit) {
      this.productService.update(this.productId!, {
        name: rawValue.name!,
        price: rawValue.price!,
        description: rawValue.description!,
        active: rawValue.active!
      }).subscribe({
        next: () => {
          this.notification.success('Product updated successfully');
          this.router.navigate(['/products']);
        },
        error: (err) => {
          this.loading = false;
          this.notification.error(err.error?.message || 'Failed to update product');
        }
      });
    } else {
      this.productService.create({
        code: rawValue.code!,
        name: rawValue.name!,
        price: rawValue.price!,
        description: rawValue.description!
      }).subscribe({
        next: () => {
          this.notification.success('Product created successfully');
          this.router.navigate(['/products']);
        },
        error: (err) => {
          this.loading = false;
          this.notification.error(err.error?.message || 'Failed to create product');
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/products']);
  }
}
```

---

## 4. Tích hợp Route mới (`app.routes.ts`)

Khai báo lazy loading các routes của tính năng mới vào hệ thống:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  // ... các route hiện có
  {
    path: 'products',
    loadComponent: () => import('./features/products/product-list/product-list.component').then(c => c.ProductListComponent)
  },
  {
    path: 'products/new',
    loadComponent: () => import('./features/products/product-form/product-form.component').then(c => c.ProductFormComponent)
  },
  {
    path: 'products/:id/edit',
    loadComponent: () => import('./features/products/product-form/product-form.component').then(c => c.ProductFormComponent)
  }
];
```
