---
title: Phân công Load Test — PayGate ↔ MarketPlace
date: 2026-08-10
tags:
  - load-test
  - k6
  - phan-cong
  - training
---

# 👥 Phân công Load Test — Chéo 2 Bên

> **Nguyên tắc:** Mỗi bên test hệ thống **ĐỐI DIỆN** (khách quan, bắt bug không nể code).
> - **PayGate (GP)** → test **MarketPlace (MP)**.
> - **MarketPlace (MP)** → test **PayGate (GP)**.

> **Tham chiếu:** yêu cầu chi tiết trong tài liệu gốc (4 GĐ: endpoint thật, kịch bản k6, DoD).

---

## 🧭 Đội hình & vai trò

| Bên | Thành viên | Nhiệm vụ load test |
|---|---|---|
| **MarketPlace (MP)** — bị test | — | Được **PayGate** test: GĐ1 (đọc) + GĐ2 (ghi cart→order) |
| **PayGate (PG)** — bị test | — | Được **MarketPlace** test: GĐ3 (concurrency/idempotency) + GĐ4 (webhook) |

| Bên test | Thành viên test | Test hệ nào | Giai đoạn |
|---|---|---|---|
| **PayGate team** | Trí, Nhi, Vinh (review) | **MarketPlace** | GĐ1 + GĐ2 |
| **MarketPlace team** | Hoàng, Trí v2, Giảng, Khoa | **PayGate** | GĐ3 + GĐ4 |

---

## 📋 CHIA NHỎ TỪNG GIAI ĐOẠN

### 🟢 GĐ1 — MP: API đọc (PayGate team test MP)
**3 endpoint:** `/products` · `/products/catalog` · `/recommendations`

| Task | Người | Output |
|---|---|---|
| Viết script k6 cho `/products` (page/size random) + report p95 | **Nhi** | `loadtest/marketplace/gd1-products.js` + số liệu |
| Viết script k6 cho `/catalog` (filter param) + report | **Trí** | `loadtest/marketplace/gd1-catalog.js` + số liệu |
| Viết script k6 cho `/recommendations` + report | **Trí** | `loadtest/marketplace/gd1-recommend.js` + số liệu |
| Tổng hợp so sánh 3 endpoint + đọc service giải thích | **Vinh** | Phần so sánh GĐ1 trong báo cáo |

- DoD: p95 của cả 3 ở 20 VU + giải thích endpoint nào chậm nhất + so sánh `size=10` vs `size=100`.

### 🟢 GĐ2 — MP: luồng ghi (PayGate team test MP)
**Luồng:** login → add-to-cart → tạo order

| Task | Người | Output |
|---|---|---|
| Chuẩn bị 10 user test + `setup()` login N user | **Nhi** | script phần setup + danh sách user |
| Script add-to-cart + tạo order (1 VU = 1 user, `__VU` map token) | **Trí** | `loadtest/marketplace/gd2-cart-order.js` |
| Theo dõi HikariCP pool lúc test + phân tích | **Vinh** | số liệu pool + kết luận |
| Tổng hợp p95 `POST /orders` vs GĐ1 | **Vinh** | phần so sánh GĐ2 |

- DoD: không lẫn giỏ hàng giữa VU + p95 `POST /orders` + kết luận pool exhausted không.

---

### 🔵 GĐ3 — PG: concurrency & idempotency (MarketPlace team test PG)
**Trọng tâm:** tái hiện bug P-C4 — cùng 1 `idempotencyKey`, 8-10 VU đồng thời.

| Task | Người | Output |
|---|---|---|
| Viết script `shared-iterations` 10 VU cùng 1 idempotencyKey | **Hoàng** | `loadtest/paygate/gd3-idempotency.js` |
| Setup user test + token (login 1 lần, cache) | **Giảng** | phần setup + seed user |
| Sau khi chạy: query DB đếm transaction + verify số dư | **Trí v2** | bằng chứng số transaction/số lần trừ |
| Tái hiện bug → tách `idempotency-poc.js` + đính kèm output | **Khoa** | file poc + nhật ký |
| Chạy lại sau khi fix P-C4 (nếu có) | **Khoa** | xác nhận còn đúng 1 transaction |

- DoD: bằng chứng cụ thể (số transaction, số lần trừ tiền) + có/không tái hiện bug P-C4.

### 🔵 GĐ4 — PG: webhook (MarketPlace team test PG)
**Endpoint:** POST `/api/v1/integration/bank-webhook` (public, không auth)

| Task | Người | Output |
|---|---|---|
| Script kịch bản 1 — load thường 20-50 VU random transferContent | **Hoàng** | `loadtest/paygate/gd4-webhook-load.js` + throughput |
| Script kịch bản 2 — spam giả mạo (cùng transferContent, amount sai) | **Giảng** | `loadtest/paygate/gd4-webhook-spam.js` + % lọt |
| Tạo checkout session hợp lệ trước khi spam | **Trí v2** | setup script + session test |
| Tổng hợp: webhook không auth có nhanh hơn auth không + kết luận bảo mật | **Khoa** | phần so sánh GĐ4 |

- DoD: throughput/p95 kịch bản 1 + % request giả mạo (amount sai) bị chấp nhận — input ưu tiên fix bảo mật.

---

## 📝 BÁO CÁO TỔNG KẾT

| Task | Người | Output |
|---|---|---|
| Bảng so sánh p95 4 endpoint đại diện (2 MP + 2 PG) | **Vinh + Khoa** | bảng trong báo cáo |
| Kết luận "tối ưu 1 chỗ duy nhất — vì sao" | **Vinh** | 1 đoạn tổng kết |
| Gộp báo cáo từ GĐ1-4 + nhật ký (có tái hiện P-C4 không) | **Vinh** | file báo cáo tổng |

---

## 🕐 Khối lượng mỗi người (Load Test)

| Người | Bên test | GĐ | Khối lượng |
|---|---|---|---|
| **Nhi** | MP | GĐ1 `/products` + GĐ2 user setup | 2 script + số liệu |
| **Trí** | MP | GĐ1 `/catalog` + `/recommend` + GĐ2 script cart-order | 3 script |
| **Vinh** | MP | Tổng hợp GĐ1/GĐ2 + pool + báo cáo | phân tích + tổng hợp |
| **Hoàng** | PG | GĐ3 script idempotency + GĐ4 load | 2 script |
| **Giảng** | PG | GĐ3 user setup + GĐ4 spam | setup + script |
| **Trí v2** | PG | GĐ3 verify DB + GĐ4 checkout session | verify + setup |
| **Khoa** | PG | GĐ3 poc + GĐ4 tổng hợp bảo mật | poc + phân tích |

---

## 🛠️ Cách dùng
- Mỗi script để trong `loadtest/<bên>/` theo file ghi trên.
- Làm xong GĐ nào đánh dấu `[x]` trong tài liệu gốc.
- Kết quả ghi vào phần **Nhật ký** mỗi GĐ để làm báo cáo.