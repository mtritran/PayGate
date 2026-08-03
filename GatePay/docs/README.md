# 📚 Tài liệu GatePay — Chỉ dẫn

> Folder này chứa **tài liệu đang dùng** cho dự án. File **cũ/nháp** đã được gom vào `archive/`.

## 📌 NÊN ĐỌC TRƯỚC (mới — liên quan việc hiện tại)

| File | Nội dung | Dùng để làm gì |
|---|---|---|
| **`07_PHAN_CONG_FEATURE_LIENKET.md`** | ⭐ Phân công chi tiết các feature liên kết + thời gian dự kiến + lịch họp chiều | **Bạn làm gì, ai làm gì** |
| **`FEATURE_00_PAYMENT_GATEWAY.md`** | ⚠️ NỀN TẢNG — gắn cổng thanh toán thật GatePay lên MarketPlace (thay payment giả lập) | **Làm TRƯỚC hết** |

**Các file spec feature chi tiết:** `FEATURE_01_BNPL_CREDIT_SCORE`, `FEATURE_02_DELIVERY_TRACKING`, `FEATURE_03_PRODUCT_REVIEWS`, `FEATURE_04_REFUND_MANAGEMENT`.
| **`PAYMENT_GATEWAY_INTEGRATION_GUIDE.md`** | Hướng dẫn tích hợp cổng thanh toán cho Merchant | Đối tác/merchant đọc |

## 📐 Chuẩn code & quy trình

| File | Nội dung |
|---|---|
| **`00-AI-RULES.md`** | Quy tắc cho AI |
| `backend_code_template.md` | Template code chuẩn backend (Layered Architecture) |
| `frontend_code_template.md` | Template code chuẩn frontend |
| `CODING_STANDARDS/AGENTS.md` *(ngoài docs/)* | Chuẩn chung + GitHub Flow + phân công AI |

## 📅 Tài liệu tuần (WEEK2 — lịch sử)

| File | Nội dung |
|---|---|
| `01-SRS-WEEK2.md` · `02-DATABASE-WEEK2.md` · `03-ARCHITECTURE-WEEK2.md` · `04-API-SPEC-WEEK2.md` | Spec tuần 2 |
| `05-PHAN-CONG-CONG-VIEC-WEEK2.md` | Phân công tuần 2 |

## 🗄️ Tài liệu CŨ (archive/)

Đã gom vào [`archive/`](archive/) — không liên quan việc hiện tại:
- `01-SRS.md` ~ `04-API-SPEC.md` (spec gốc tuần 1, không WEEK2)
- `05-GIT-WORKFLOW.md`, `06-PHAN-CONG-CONG-VIEC.md`
- `Project 3 - PayGate.md`, `superpowers-guide.md`, `temp-day2-tri.md`

> Khi cần, mở `archive/` để xem lại; **không nên sửa** vì là lịch sử.

---

## 🧭 Tôi (người mới / AI) nên đọc gì trước?

1. `07_PHAN_CONG_FEATURE_LIENKET.md` → biết **mình làm gì**
2. `FEATURE_00_PAYMENT_GATEWAY.md` → biết **feature nền tảng làm trước**
3. `FEATURE_01..04_*.md` → biết **spec từng feature**
4. `CODING_STANDARDS/AGENTS.md` → biết **viết code chuẩn thế nào**
