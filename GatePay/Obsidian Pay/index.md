# PayGate — LLM Wiki Index

> **Cập nhật lần cuối:** 2026-08-09 | **Tổng số trang:** 10

---

## ✅ Đọc Theo Thứ Tự Này (Nếu Là Member Mới)

1. [[System Overview]] — Hiểu kiến trúc tổng thể trước
2. [[Database Design]] — Hiểu schema DB
3. [[Security Model]] — Hiểu JWT, Idempotency, Fraud Detection
4. [[Team & Roadmap]] — Biết ai làm gì
5. Feature bạn được phân công

---

## 🏗 Kiến Trúc & Hạ Tầng

| Trang | Nội dung |
|---|---|
| [System Overview](wiki/System_Overview.md) | Tech stack, luồng dữ liệu chuẩn, RabbitMQ, Redis, cấu trúc package, 7 nguyên tắc bất biến |
| [Database Design](wiki/Database_Design.md) | ERD, SQL chi tiết 7 bảng, chiến lược locking, tại sao lock theo thứ tự id |
| [Security Model](wiki/Security_Model.md) | JWT, phân quyền RBAC, HMAC Signature, Fraud Detection điểm 0-100, Idempotency |
| [Services Overview](wiki/Services_Overview.md) | 15+ services, dependency graph, workers, code smells đã biết |

---

## 🚀 Tính Năng Chi Tiết

| Trang | Nội dung chính |
|---|---|
| [Feature 00 — Payment Gateway](wiki/Feature_00_Payment_Gateway.md) | Luồng Ví GatePay (Redirect+OTP) + Bank Transfer/VietQR, API specs đầy đủ, task breakdown Trí + Hoàng |
| [Feature 01 — BNPL](wiki/Feature_01_BNPL.md) | 6 phase luồng BNPL, cic-service, tp-bank-service, tại sao tiền không chạm ví User, API + DB + task Nhi + Hoàng |
| [Feature 02+03+05 — Delivery, Reviews, AI](wiki/Features_02_03_05.md) | Timeline giao hàng (Giảng), đánh giá sao + ràng buộc 2 chiều (Khoa), AI Summary + Smart Recommendation Queue (Redis FIFO 5 items, TTL 4 ngày) |
| [Feature 04 — Refund & 2-Bucket Settlement](wiki/Feature_04_Refund_Settlement.md) | Hoàn tiền mua thường, tại sao block BNPL refund, cơ chế 2 Hũ chống rút sớm, Scheduler chuyển Hũ A→B |

---

## 👥 Con Người

| Trang | Nội dung |
|---|---|
| [Team & Roadmap](wiki/Team_And_Roadmap.md) | Phân công từng feature, milestone, quy ước port, vai trò Vinh là PM không code PayGate |

---

## 📊 Thống Kê

- **Tổng trang wiki:** 10
- **Nguồn đã ingest:** Toàn bộ dự án GatePay (docs, backend Java, architecture, SRS, API spec)
- **Lần ingest:** 2026-08-09 (ingest toàn bộ)
