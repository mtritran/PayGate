# 🔄 FEATURE 04: Refund & Installment Cancellation
> **Tên tính năng:** Xử Lý Hoàn Tiền Giao Dịch & Hủy Kỳ Trả Góp BNPL  
> **Mã quy chuẩn:** `FEATURE-04-REFUND`  
> **Thành viên phụ trách:**  
> - **GatePay & MarketPlace:** Trí v2 (3–5 ngày)  

---

## 📌 1. Mô tả Nghiệp vụ & Kịch bản
Khi Khách hàng yêu cầu hủy đơn hoặc trả hàng trên MarketPlace, hệ thống tự động kích hoạt luồng **Hoàn tiền (Refund)** bảo mật:

1. **Đối với Đơn hàng Mua Thường:** Hoàn tiền ròng lại trực tiếp vào Số dư Ví GatePay của khách hàng.
2. **Đối với Đơn hàng Mua Trả Góp BNPL:** Tự động **Hủy/Hoãn các kỳ trả góp `installments` chưa đến hạn**, và hoàn trả lại số tiền khách đã thanh toán ở các kỳ trước đó.
3. Hạch toán Sổ cái kép `EntryType.REFUND` để thu hồi lại tiền từ Ví Merchant.

---

## 🔄 2. Sơ đồ Luồng Giao Dịch (Sequence Diagram)

```mermaid
sequenceDiagram
    participant K as Khách hàng
    participant M as MarketPlace
    participant G as GatePay (Refund Engine)

    K->>M: Yêu cầu trả hàng / Hủy đơn (Order #1024)
    M->>G: POST /api/v1/refunds (transactionRef, amount, reason)
    G->>G: Kiểm tra loại giao dịch gốc (NORMAL vs BNPL)
    alt Giao dịch thường (NORMAL)
        G->>G: Hoàn tiền về Ví GatePay của Khách + Khấu trừ Ví Merchant (Ledger REFUND)
    else Giao dịch Trả góp (BNPL)
        G->>G: Hủy toàn bộ các kỳ trả góp PENDING trong bảng installments
        G->>G: Hoàn lại tiền các kỳ đã đóng về Ví Khách
    end
    G-->>M: Trả về {refundId: "RF-9988", status: "REFUNDED", amountRefunded: 2500000}
    M->>M: Cập nhật Order status -> REFUNDED & Kích hoạt InventoryFacade.release()
```

---

## 🔌 3. Danh Sách API Specifications

### 3.1. Tạo yêu cầu hoàn tiền
- **Endpoint:** `POST /api/v1/refunds`
- **Request Body:**
```json
{
  "transactionRef": "TX-2026-0803-9988",
  "orderId": "ORD-2026-0803-9988",
  "amount": 2500000,
  "reason": "Khách trả hàng do sai kích thước"
}
```
- **Response (200 OK):**
```json
{
  "code": 200,
  "message": "Refund processed successfully",
  "data": {
    "refundId": "RF-2026-0803-0055",
    "transactionRef": "TX-2026-0803-9988",
    "amountRefunded": 2500000,
    "sourceType": "BNPL",
    "installmentsCancelled": 4,
    "status": "COMPLETED"
  }
}
```

---

## 🗄️ 4. Cơ Sở Dữ Liệu & Migration

### Các bảng mới trên GatePay:
1. `refunds`: Lưu vết toàn bộ thông tin các yêu cầu hoàn tiền.
2. Tái sử dụng bảng `ledger_entries` với loại bút toán `EntryType.REFUND`.

---

## 📋 5. Phân Công Chi Tiết Task

### 🟢🔵 Phụ trách chính (Trí v2 - 3 đến 5 ngày):
- [ ] Tạo Flyway migration `V31__create_refunds_table.sql` + Entity `Refund`.
- [ ] Viết API `POST /api/v1/refunds` xử lý hoàn tiền mua thường vs. mua BNPL.
- [ ] Hạch toán Sổ cái kép Ledger `EntryType.REFUND` để thu hồi tiền từ ví Merchant.
- [ ] Thêm Nút **"Hoàn tiền"** trên màn hình Chi tiết đơn hàng của MarketPlace và cập nhật trạng thái đơn.

---

## 🔒 6. Security (bắt buộc)
- **JWT Bearer** — chỉ người liên quan giao dịch (khách/merchant) hoặc ADMIN mới hoàn được.
- **Idempotent** bằng `orderId` — tránh hoàn trùng 2 lần khi retry (kiểm tra `refunds` đã tồn tại).
- **Chặn hoàn quá số đã trả** — validate `amount ≤ tổng đã thanh toán`.
- **Rate limit** request hoàn tiền.
- **REFUND ledger** hoàn ngược đúng — không để số dư âm.

---

## 🔗 7. Phụ thuộc & Thứ tự
- **Phụ thuộc:** Cần có **giao dịch thật** (NORMAL hoặc BNPL) — tức phụ thuộc FEATURE-01 (BNPL) tạo ra đơn trả góp để hoàn.
- **Thứ tự:** làm **SAU** FEATURE-01 (cần giao dịch/installment có sẵn).

---

## ✅ 8. Definition of Done (DoD)
- [ ] `POST /refunds` hoàn tiền NORMAL → về Ví khách đúng.
- [ ] Hoàn BNPL → hủy các kỳ installment PENDING + hoàn các kỳ đã đóng.
- [ ] Ledger `EntryType.REFUND` thu hồi từ ví Merchant đúng.
- [ ] Chặn hoàn trùng / hoàn quá số đã trả.
- [ ] MarketPlace nút "Hoàn tiền" + cập nhật order → `REFUNDED` + `InventoryFacade.release()`.
- [ ] `./mvnw -o test-compile` xanh + unit test.
