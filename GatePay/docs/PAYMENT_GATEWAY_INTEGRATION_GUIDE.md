# HƯỚNG DẪN TÍCH HỢP CỔNG THANH TOÁN PAYGATE (PAYMENT GATEWAY INTEGRATION GUIDE)

Chào mừng bạn đến với tài liệu tích hợp Cổng thanh toán **PayGate**. Tài liệu này hướng dẫn chi tiết dành cho các Nhà phát triển (Developers) và Đối tác (Merchants) để kết nối hệ thống website/ứng dụng bán hàng của bạn với dịch vụ thanh toán trực tuyến PayGate.

---

## 📑 MỤC LỤC
1. [Tổng quan Luồng Thanh toán (Payment Flow Overview)](#1-tổng-quan-luồng-thanh-toán)
2. [Cơ chế Định danh & Bảo mật (Merchant Credentials)](#2-cơ-chế-định-danh--bảo-mật)
3. [Quy trình 4 Bước Tích hợp Chi tiết](#3-quy-trình-4-bước-tích-hợp-chi-tiết)
   - [Bước 1: Khởi tạo Đơn hàng Thanh toán (Create Checkout Session)](#bước-1-khởi-tạo-đơn-hàng-thanh-toán)
   - [Bước 2: Chuyển hướng Khách hàng (Redirect Customer)](#bước-2-chuyển-hướng-khách-hàng)
   - [Bước 3: Khách hàng Xác thực OTP qua Gmail](#bước-3-khách-hàng-xác-thực-otp-qua-gmail)
   - [Bước 4: Nhận Kết quả Thanh toán (Callback & Webhook)](#bước-4-nhận-kết-quả-thanh-toán)
4. [Mã Code Mẫu (SDK Code Snippets)](#4-mã-code-mẫu-sdk-code-snippets)
   - [Node.js (Express & Axios)](#nodejs-express--axios)
   - [PHP (Curl)](#php-curl)
   - [Python (Requests)](#python-requests)
   - [cURL Command Line](#curl-command-line)
5. [Mã Lỗi Thường Gặp & Cách Xử Lý (Error Codes)](#5-mã-lỗi-thường-gặp--cách-xử-lý)
6. [Môi trường Sandbox & Test API](#6-môi-trường-sandbox--test-api)

---

## 1. TỔNG QUAN LUỒNG THANH TOÁN

Sơ đồ tuần tự (Sequence Diagram) thể hiện luồng tương tác giữa **Website của bạn**, **Server PayGate**, và **Khách hàng**:

```
[ Khách Hàng ]              [ Website Của Bạn ]                [ PayGate Gateway ]
      │                              │                                  │
      │ 1. Bấm "Thanh toán PayGate"  │                                  │
      │─────────────────────────────>│                                  │
      │                              │ 2. POST /api/v1/checkout/create  │
      │                              │    (Kèm apiKey & thông tin đơn)  │
      │                              │─────────────────────────────────>│
      │                              │                                  │
      │                              │ 3. Trả về paymentUrl & Token     │
      │                              │<─────────────────────────────────│
      │                              │                                  │
      │ 4. Chuyển hướng (Redirect)   │                                  │
      │<─────────────────────────────┘                                  │
      │                                                                 │
      │ 5. Hiển thị Trang Checkout (Nhập OTP từ Gmail)                  │
      │<────────────────────────────────────────────────────────────────>│
      │                                                                 │
      │ 6. Tự động chuyển về returnUrl kèm Status SUCCESS               │
      │<────────────────────────────────────────────────────────────────┘
```

---

## 2. CƠ CHẾ ĐỊNH DANH & BẢO MẬT

Để kết nối tới API PayGate, bạn cần có tài khoản **Merchant Partner**:
1. Tru cập **Merchant Portal**: `http://localhost:4200/merchant/register`
2. Sang tab **`🔑 API Integration Keys`** để lấy các thông tin:
   - **`Merchant Code`**: Mã định danh đối tác (ví dụ: `SHOPEE_STORE`).
   - **`API Key`**: Chuỗi khóa bí mật (Secret Key) để gọi API (ví dụ: `6436dcc0-e065-4259-bd45-43cb936bb56c`).

> ⚠️ **LƯU Ý BẢO MẬT QUAN TRỌNG:**
> - Tuyệt đối **KHÔNG** để lộ `API Key` ở frontend (JavaScript phía browser).
> - Tất cả lệnh gọi API `create checkout` phải được thực hiện ở **Server Backend** của bạn.

---

## 3. QUY TRÌNH 4 BƯỚC TÍCH HỢP CHI TIẾT

### Bước 1: Khởi tạo Đơn hàng Thanh toán
Khi khách hàng bấm thanh toán trên website của bạn, Server phía bạn gửi request tới API PayGate.

- **HTTP Method**: `POST`
- **URL**: `http://localhost:8080/api/v1/checkout/create`
- **Header**: `Content-Type: application/json`

#### Request Body (JSON):
```json
{
  "apiKey": "6436dcc0-e065-4259-bd45-43cb936bb56c",
  "orderId": "DON_HANG_998822",
  "amount": 250000,
  "description": "Thanh toán đơn hàng Áo sơ mi cao cấp",
  "returnUrl": "https://yourwebsite.com/checkout/success",
  "cancelUrl": "https://yourwebsite.com/checkout/cancel"
}
```

#### Tham số Request:
| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `apiKey` | `String` | **Có** | API Key lấy tại Merchant Portal |
| `orderId` | `String` | **Có** | Mã đơn hàng duy nhất trên hệ thống của bạn |
| `amount` | `Number` | **Có** | Số tiền thanh toán (tối thiểu `1,000` VND) |
| `description` | `String` | Không | Mô tả nội dung đơn hàng |
| `returnUrl` | `String` | **Có** | URL nhận kết quả sau khi khách thanh toán thành công |
| `cancelUrl` | `String` | Không | URL chuyển về nếu khách bấm Hủy thanh toán |

#### Response Thành công (200 OK):
```json
{
  "success": true,
  "message": "Tạo phiên thanh toán thành công",
  "data": {
    "token": "CHK_3EF6DF2E73B9469093B97BFD47177875",
    "paymentUrl": "http://localhost:4200/checkout?token=CHK_3EF6DF2E73B9469093B97BFD47177875",
    "expiresAt": "2026-07-28T16:30:00.000"
  },
  "timestamp": "2026-07-28T16:15:00.000"
}
```

---

### Bước 2: Chuyển hướng Khách hàng
Sau khi nhận được `paymentUrl` từ Bước 1, Server của bạn thực hiện chuyển hướng trình duyệt của khách hàng (`HTTP 302 Redirect`) sang link `paymentUrl`.

Giao diện Checkout PayGate sẽ tự động tải các thông tin đơn hàng, số tiền và tên thương hiệu của bạn.

---

### Bước 3: Khách hàng Xác thực OTP qua Gmail
Tại giao diện `http://localhost:4200/checkout?token=...`:
1. Khách hàng xem thông tin số tiền & Đăng nhập Ví PayGate của họ.
2. Bấm nút **"Xác thực OTP & Thanh toán"**.
3. Hệ thống tự động gửi **Mã OTP 6 chữ số** về Email (Gmail) của khách hàng.
4. Khách hàng nhập mã OTP để hoàn tất. Tiền lập tức được trừ khỏi Ví khách hàng và cộng vào **Ví Merchant** của bạn.

---

### Bước 4: Nhận Kết quả Thanh toán
Ngay sau khi giao dịch hoàn tất, PayGate tự động chuyển hướng khách hàng quay trở lại `returnUrl` mà bạn đã đăng ký ở Bước 1.

#### URL Callback mẫu trả về cho Website của bạn:
```text
https://yourwebsite.com/checkout/success?status=SUCCESS&orderId=DON_HANG_998822&transactionRef=TXN-PAY-384A1D81
```

#### Các tham số Query String trên URL Callback:
- `status`: `SUCCESS` (Thanh toán thành công) hoặc `FAILED` (Thất bại).
- `orderId`: Mã đơn hàng của bạn.
- `transactionRef`: Mã giao dịch tham chiếu duy nhất trên hệ thống PayGate.

---

## 4. MÃ CODE MẪU (SDK CODE SNIPPETS)

### Node.js (Express & Axios)
```javascript
const express = require('express');
const axios = require('axios');
const app = express();

const PAYGATE_API_KEY = "YOUR_API_KEY_HERE";
const PAYGATE_URL = "http://localhost:8080/api/v1/checkout/create";

app.post('/create-payment', async (req, res) => {
    try {
        const response = await axios.post(PAYGATE_URL, {
            apiKey: PAYGATE_API_KEY,
            orderId: "ORDER_" + Date.now(),
            amount: 150000,
            description: "Thanh toan đơn hàng giày thể thao",
            returnUrl: "https://yourwebsite.com/checkout/success"
        });

        // Redirect khách hàng sang đường dẫn thanh toán của PayGate
        const { paymentUrl } = response.data.data;
        res.redirect(paymentUrl);
    } catch (error) {
        console.error("Lỗi khởi tạo PayGate:", error.response?.data || error.message);
        res.status(500).send("Thanh toán thất bại");
    }
});
```

### PHP (Curl)
```php
<?php
$apiKey = "YOUR_API_KEY_HERE";
$orderId = "ORDER_" . time();

$payload = json_encode([
    "apiKey" => $apiKey,
    "orderId" => $orderId,
    "amount" => 200000,
    "description" => "Thanh toan don hang PHP",
    "returnUrl" => "https://yourwebsite.com/checkout/success"
]);

$ch = curl_init('http://localhost:8080/api/v1/checkout/create');
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = json_decode(curl_exec($ch), true);
curl_close($ch);

if ($result && isset($result['data']['paymentUrl'])) {
    header('Location: ' . $result['data']['paymentUrl']);
    exit;
} else {
    echo "Lỗi: " . ($result['message'] ?? 'Không thể khởi tạo thanh toán');
}
?>
```

### Python (Requests)
```python
import requests

PAYGATE_API_KEY = "YOUR_API_KEY_HERE"

def create_checkout_session(order_id, amount):
    url = "http://localhost:8080/api/v1/checkout/create"
    payload = {
        "apiKey": PAYGATE_API_KEY,
        "orderId": order_id,
        "amount": amount,
        "description": f"Thanh toan don hang {order_id}",
        "returnUrl": "https://yourwebsite.com/checkout/success"
    }
    
    response = requests.post(url, json=payload).json()
    if response.get("success"):
        return response["data"]["paymentUrl"]
    else:
        raise Exception(response.get("message"))

# Example Usage
payment_url = create_checkout_session("ORDER_999", 500000)
print("Redirect user to:", payment_url)
```

### cURL Command Line
```bash
curl -X POST http://localhost:8080/api/v1/checkout/create \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY_HERE",
    "orderId": "ORDER_TEST_001",
    "amount": 100000,
    "description": "Thanh toan qua cURL",
    "returnUrl": "https://yourwebsite.com/checkout/success"
  }'
```

---

## 5. MÃ LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

| Mã Lỗi / Response Message | Nguyên nhân | Cách xử lý |
| :--- | :--- | :--- |
| `API Key của Merchant không hợp lệ` | Sai `apiKey` hoặc chưa lấy đúng Key | Truy cập Merchant Portal để copy đúng `apiKey` |
| `Tài khoản Merchant hiện đang bị khóa` | Merchant chưa được Admin duyệt (`PENDING`) | Liên hệ Admin PayGate để phê duyệt tài khoản |
| `Số tiền thanh toán tối thiểu là 1,000 VND` | Số tiền `amount` truyền vào < 1000 | Kiểm tra lại giá trị tham số `amount` |
| `Phiên thanh toán đã hết hạn` | Quá 15 phút chưa hoàn tất thanh toán | Yêu cầu khách hàng thực hiện tạo lại đơn thanh toán mới |

---

## 6. MÔI TRƯỜNG SANDBOX & TEST API

- **Swagger UI Interactive Documentation**: `http://localhost:8080/swagger-ui.html` (Mục **Payment Gateway Checkout**).
- **Trang Test Checkout**: Bạn có thể sử dụng bất kỳ ứng dụng Postman / Insomnia / cURL nào để gửi đơn hàng mẫu tới `http://localhost:8080/api/v1/checkout/create`.
