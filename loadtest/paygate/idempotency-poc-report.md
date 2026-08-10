# GĐ3 — PayGate Idempotency Load Test Report

## Thông tin test

| Thông số | Giá trị |
|---|---|
| Endpoint | `POST /api/v1/transactions/pay` |
| User | `loadtest_user` (id=1026, account_id=10) |
| Dest Account | `4` (MER000000000000005 — Mock Merchant) |
| Amount | 10,000 VND |
| Idempotency Key | `LOADTEST-IDEM-POC-a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| VUs | 10 (shared-iterations, đồng thời) |
| Script | [`loadtest/paygate/idempotency-poc.js`](../loadtest/paygate/idempotency-poc.js) |

---

## Kết quả

### 1. Response phân bố từ 10 VU đồng thời

| HTTP Status | Số lượng | Ý nghĩa |
|---|---|---|
| `201 Created` | 4 | Trả về cùng `txRef=TXN-PAY-28D031C3` (idempotent response) |
| `409 Conflict` | 6 | Server phát hiện duplicate idempotency key, reject |

### 2. DB Evidence — Bảng `transactions`

```
 id | transaction_ref  | idempotency_key                                        | amount   | status    | source | dest
----+------------------+--------------------------------------------------------+----------+-----------+--------+------
  9 | TXN-PAY-28D031C3 | LOADTEST-IDEM-POC-a1b2c3d4-e5f6-7890-abcd-ef1234567890 | 10000.00 | COMPLETED | 10     | 4
```

→ **Chỉ 1 transaction duy nhất** được tạo từ 10 request đồng thời.

### 3. Account Balance — Trước/Sau

| Account | Trước test | Sau test | Chênh lệch |
|---|---|---|---|
| `ACC00000010` (loadtest_user) | 10,000,000 VND | 9,990,000 VND | **-10,000 VND** (đúng 1 lần) |
| `MER000000000000005` (merchant) | 0 VND | 10,000 VND | **+10,000 VND** (đúng 1 lần) |

---

## Kết luận

✅ **Idempotency hoạt động đúng** trên hệ thống PayGate hiện tại:
- Dù 10 VU gửi đồng thời cùng 1 `idempotencyKey`, chỉ **đúng 1 transaction** được tạo và tiền chỉ bị trừ **1 lần duy nhất**.
- Cơ chế bảo vệ: Redis cache + DB lookup + `409 Conflict` cho duplicate.

---

## Câu hỏi phân tích: Idempotency key hoạt động đúng nghĩa là gì?

**Idempotency key** đảm bảo rằng cùng một yêu cầu thanh toán gửi nhiều lần (do double-click, retry, network timeout...) chỉ được xử lý **đúng 1 lần**.

**Về mặt kỹ thuật:**
1. **Derive từ đâu**: Client tạo 1 UUID/chuỗi duy nhất gắn liền với hành động thanh toán cụ thể (ví dụ: checkout 1 đơn hàng). Key này phải **cố định** cho cùng 1 giao dịch logic, không được random mỗi request.
2. **Lưu ở đâu**: Server lưu mapping `idempotencyKey → transactionRef` trong Redis cache (TTL ngắn, tra cứu nhanh) và trong cột `idempotency_key` của bảng `transactions` (persistent, có UNIQUE constraint).
3. **Check ở bước nào**: Ngay đầu transaction flow — trước khi thực hiện bất kỳ thay đổi balance nào:
   - Bước 1: Check Redis cache → nếu có → trả về transaction đã tạo.
   - Bước 2: Check DB `findByIdempotencyKey` → nếu có → trả về + cache lại.
   - Bước 3: Nếu không có → tạo transaction mới, lưu DB + cache Redis.
   - Bước 4 (re-check): Sau khi validate accounts, check lại DB 1 lần nữa để phòng race condition giữa bước 2 và bước 3.
