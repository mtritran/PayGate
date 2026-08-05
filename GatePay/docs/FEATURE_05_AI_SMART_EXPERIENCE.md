# 🧠 FEATURE 05: AI Smart Experience (AI Reviews & Smart Recommendations)

> **Tên tính năng:** Tóm tắt Đánh giá bằng AI & Gợi ý Sản phẩm Cá nhân hóa theo Hàng đợi
> **Mã quy chuẩn:** `FEATURE-05-AI-SMART`
> **Thành viên phụ trách:**
> - **MarketPlace (Backend + UI):** Đang cập nhật...
> - **Review:** Vinh (PM — chỉ review, không code)
>
> **Định vị:** Đây là tính năng "Wow factor" giúp MarketPlace trở nên chuyên nghiệp như các sàn TMĐT Tier-1 (Amazon, Shopee).

---

## 📌 1. Mô tả Nghiệp vụ & Kịch bản

Tính năng này gồm 2 luồng trải nghiệm chính hướng đến khách hàng:

### 🌟 1.1. Tóm tắt Đánh giá bằng AI (AI Review Summarization)
Khi một sản phẩm có quá nhiều đánh giá (Reviews), thay vì bắt khách đọc từng trang, hệ thống dùng Trí tuệ Nhân tạo (AI) để tổng hợp thành một đoạn tóm tắt ngắn (VD: *"Khách hàng đánh giá cao chất lượng vải và form dáng, nhưng lưu ý size hơi nhỏ và giao hàng đôi lúc chậm"*).
- Đoạn tóm tắt được ghim trên cùng của khu vực Review.
- Tự động phân loại: 👍 **Ưu điểm** và 👎 **Nhược điểm** chính.

### 🎯 1.2. Smart Category Recommendation (Tracking Ngầm & Gợi ý)
Khi khách hàng dạo quanh MarketPlace và click xem nhiều sản phẩm, hệ thống sẽ **theo dõi ngầm (background tracking)** các Danh mục (Category) của sản phẩm đó. Khi khách quay lại Trang chủ, hệ thống sẽ ưu tiên hiển thị các sản phẩm thuộc các danh mục họ vừa xem.

**⚠️ RÀNG BUỘC CỐT LÕI (Từ PM):**
1. **Queue Giới hạn độ dài:** Chỉ lưu tối đa `N` category (ví dụ: 5 category). Dùng thuật toán **FIFO Queue (Vào trước ra trước)**. Khi mảng đã đầy 5 category, nếu khách xem 1 category mới, hệ thống đẩy category cũ nhất ra khỏi hàng đợi. Tránh việc lưu toàn bộ category của hệ thống nếu khách "click dạo" quá nhiều.
2. **Hạn sử dụng 4 ngày (TTL):** Các category trong lịch sử chỉ có hiệu lực lưu trữ trong **4 ngày gần nhất**. Quá 4 ngày, dữ liệu cũ sẽ bị loại bỏ để luôn cập nhật theo sở thích mới nhất của khách.

---

## 🔄 2. Phân tích Kỹ thuật & Luồng Hoạt động

### 2.1 Luồng AI Review Summarization
1. **Trigger:** Có thể chạy định kỳ (Job mỗi đêm) hoặc kích hoạt khi sản phẩm đạt một mốc số lượng review mới (VD: cứ thêm 10 review thì chạy lại AI).
2. **Xử lý:** Backend gom text các comment → Gọi API của LLM (OpenAI/Gemini) với Prompt yêu cầu tóm tắt khách quan.
3. **Lưu trữ:** Kết quả tóm tắt lưu thẳng vào bảng `products` (cột `ai_review_summary`) hoặc Cache (Redis) để đọc siêu nhanh, không bắt khách chờ AI gen realtime lúc xem trang.

### 2.2 Luồng Smart Category Recommendation (Dùng Redis/NoSQL)
1. Khách click xem 1 Sản phẩm (thuộc `Category X`).
2. Frontend bắn API ngầm `POST /api/v1/tracking/view-category { categoryId: "X" }`. Trả về 200 OK ngay lập tức (Fire-and-forget).
3. **Backend xử lý Hàng đợi (Gợi ý dùng Redis List / ZSet):**
   - Đẩy `categoryId` vào 1 Queue của riêng user đó (key: `user:{id}:recent_categories`).
   - Gắn timestamp cho mỗi phần tử.
   - Xóa các phần tử có timestamp cũ hơn 4 ngày.
   - Nếu chiều dài Queue > 5, `POP` phần tử cũ nhất ra khỏi danh sách (FIFO).
4. **Khi khách mở Trang chủ (Homepage):**
   - Frontend gọi API `GET /api/v1/recommendations/homepage`.
   - Backend đọc Queue của user (chỉ lấy tối đa 5 category hợp lệ trong 4 ngày).
   - Lấy ngẫu nhiên các sản phẩm thuộc 5 category đó để trả về làm danh sách "Gợi ý dành riêng cho bạn".
   - **⚠️ Fallback (Chi tiết thuật toán Cold Start cho khách mới):** 
     - **Điều kiện kích hoạt:** Khi `Queue.length == 0` (user mới tạo tài khoản, hoặc khách vãng lai chưa click sản phẩm nào, hoặc dữ liệu quá 4 ngày đã bị xóa hết).
     - **Logic xử lý Backend:** Bỏ qua truy vấn Category, tự động switch sang query top các sản phẩm có `view_count` hoặc `sold_count` cao nhất trong 7 ngày gần nhất.
     - **Logic hiển thị Frontend:** API trả về kèm một cờ `isFallback: true`. Frontend dựa vào đó đổi tiêu đề block từ *"Gợi ý dành riêng cho bạn"* thành *"Đang thịnh hành tuần này"* hoặc *"Top Bán Chạy"*, giúp UI luôn có dữ liệu hiển thị lấp đầy màn hình.

---

## 🔌 3. Danh Sách API Specifications

| Method | Endpoint | Nhiệm vụ |
|---|---|---|
| `POST` | `/api/v1/tracking/view-category` | Gửi dữ liệu tracking khi khách click vào sản phẩm. Payload: `{ categoryId }`. Cần xử lý ngầm, API phản hồi < 50ms. |
| `GET` | `/api/v1/recommendations/homepage` | Lấy danh sách sản phẩm gợi ý dựa trên Queue lịch sử xem của user. |
| `GET` | `/api/v1/products/{id}/ai-summary` | Lấy đoạn tóm tắt AI của sản phẩm (hoặc có thể gộp luôn vào cục data Chi tiết Sản phẩm). |

---

## 🗄️ 4. Cơ Sở Dữ Liệu & Infrastructure

**1. AI Reviews:**
- Bổ sung cột vào bảng sản phẩm (MarketPlace): `ALTER TABLE products ADD COLUMN ai_summary TEXT;` và `ai_summary_updated_at TIMESTAMP;`
- Migration: `V12__add_ai_summary_to_products.sql`.

**2. Recommendation Tracking:**
- **Khuyến nghị dùng Redis:** Vì yêu cầu "Hàng đợi (Queue)" + "Xóa sau 4 ngày (TTL)" + "Cập nhật liên tục", dùng RDBMS (SQL) sẽ gây nặng database.
- Dùng Redis List `LPUSH` / `RTRIM` hoặc Redis Sorted Set (ZSET) với score là Unix timestamp để dễ dọn rác 4 ngày.
- Nếu khách chưa đăng nhập (Guest): Lưu lịch sử queue này dưới `localStorage` của Trình duyệt (Frontend tự xử lý queue) hoặc tạo 1 `guest_id` lưu trên Redis.

---

## 📋 5. Phân Công Task & Yêu cầu Output

### 🔵 Backend (MarketPlace):
- [ ] Tích hợp LangChain hoặc viết HTTP client gọi LLM API (OpenAI/Gemini). Viết Prompt chuẩn để tóm tắt review.
- [ ] Viết Job chạy ngầm (cronjob) tự động quét các sản phẩm có nhiều review mới để gọi AI và cập nhật vào cột `ai_summary`.
- [ ] Viết API `POST /tracking/view-category`. Implement logic Queue bằng Redis (Giới hạn size = 5, TTL dọn rác = 4 ngày).
- [ ] Viết API `GET /recommendations/homepage` lấy danh sách category từ Redis và query ra sản phẩm tương ứng.

### 🟠 Frontend (MarketPlace):
- [ ] Gắn event bắn API tracking ngầm mỗi khi user vào trang Chi tiết Sản phẩm. (Lưu ý: Nếu user là Guest, thiết kế cơ chế lưu Queue dưới `localStorage` với rule y hệt: 5 món, xóa sau 4 ngày).
- [ ] Bổ sung UI trên Trang chủ (Homepage) một dải component: *"Dựa trên mục bạn đã xem gần đây"*.
- [ ] Thiết kế UI cho khung **"AI Tóm tắt Đánh giá"** trên trang Chi tiết sản phẩm (cần có icon AI/Sparkles nhìn cho xịn xò, highlight chữ xanh/đỏ cho Khen/Chê).

---

## ✅ 6. Definition of Done (DoD)
- [ ] AI Summary hiện chuẩn xác, giọng văn tự nhiên, không sinh ra ảo giác (hallucination), không bắt khách chờ tải quá lâu.
- [ ] Truy cập nhiều hơn 5 category khác nhau, hệ thống chỉ giữ đúng 5 category mới nhất (Test bằng cách xem Redis hoặc logs).
- [ ] Trôi qua 4 ngày, hệ thống không còn gợi ý những category cũ đó nữa (Test chỉnh sửa timestamp).
- [ ] Trang chủ gọi đúng API Recommendation và hiển thị sản phẩm chính xác theo lịch sử.
- [ ] Có giải pháp cho Guest User (chưa đăng nhập).
