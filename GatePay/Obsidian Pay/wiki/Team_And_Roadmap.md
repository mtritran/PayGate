# 👥 Phân Công Team & Lộ Trình

> **Nguồn:** `docs/07_PHAN_CONG_FEATURE_LIENKET.md`
> **Cập nhật lần cuối:** 2026-08-09

## Quy Ước Port

| Dự án | Frontend | Backend |
|---|---|---|
| **MarketPlace** | 4200 | 8080 |
| **GatePay** | 4201 | 8081 |

## Phân Công Theo Feature

| Feature | Phụ Trách (GatePay) | Phụ Trách (MarketPlace) | Review |
|---|---|---|---|
| F00 - Payment Gateway | **Trí** (3 ngày) | **Hoàng** (2-3 ngày) | Vinh |
| F01 - BNPL + Credit Score | **Nhi** (5 ngày) | **Hoàng** (4 ngày) | Vinh |
| F02 - Delivery Tracking | — | **Giảng** (3 ngày) | Vinh |
| F03 - Product Reviews | — | **Khoa** (3 ngày) | Vinh |
| F04 - Refund + 2 Hũ | **Trí** (3-5 ngày) | **Trí v2** | Vinh |

## Vai Trò Đặc Biệt (Vinh - PM)
- **KHÔNG code bên PayGate** — chỉ review F00, F01, F04
- **CODE MarketPlace:** F02 Delivery + F03 Reviews
- **KHÔNG phụ trách phần DB** (do Trí + members khác lo)

## Nguyên Tắc Thực Thi

1. **GatePay = Cung cấp API/Nghiệp vụ** | **MarketPlace = Xây UI/Client**
2. **Không merge code** — kết nối qua REST API + Webhook
3. **1 người 1 mảng** — không đè file nhau, tránh Git Conflict
4. Tuân thủ coding standard `CODING_STANDARDS/AGENTS.md`

## Lộ Trình Milestone

```
MILESTONE 0 (Tuần 1, ngày 1-3)
  └─ F00: Payment Gateway ← ⚠️ NỀN TẢNG, LÀM TRƯỚC

MILESTONE 1 (Tuần 1-2)
  ├─ F01: BNPL ⭐ (Ưu tiên cao nhất)
  ├─ F04: Refund + 2 Hũ
  └─ F02: Delivery Tracking

MILESTONE 2 (Tuần 3-4)
  └─ F03: Product Reviews & Ratings
```

## Liên kết

- [[Feature 00 - Payment Gateway]]
- [[Feature 01 - BNPL]]
- [[Features 02 03 04 05]]
