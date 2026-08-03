# 📁 CODING_STANDARDS — Quy chuẩn code chung cho team & AI

Folder này chứa **quy chuẩn thống nhất** cho cả 2 dự án GatePay và MarketPlace, để:
- **AI của mọi người đọc vào** → viết code cùng 1 phong cách.
- **Team** review code theo 1 chuẩn, tránh "mỗi người 1 kiểu".

## 📄 Các file
| File | Dùng để làm gì |
|---|---|
| `AGENTS.md` | ⭐ **File chính** — chuẩn AI đọc để code (backend, frontend, SQL, git, security, test). |
| `MARKETPLACE_REVIEW.md` | (nếu copy vào đây) — danh sách việc cần sửa của MarketPlace. |

## 🚀 Cách dùng cho team/AI
1. **AI code backend:** đọc `AGENTS.md` → tuân thủ phần `1. Backend` + `2. SQL` + `5. Security` + `6. Test`.
2. **AI code frontend:** đọc phần `3. Frontend`.
3. **AI commit:** đọc phần `4. Git`.
4. **Khi review:** check theo `8. Checklist` cuối file.

## 📍 Vị trí
- Folder đặt **ở root repo** (ngoài `GatePay/` và `erconomic/`) để cả 2 team đều thấy.
- Mỗi team có thể copy vào project của mình nếu muốn (vd `GatePay/AGENTS.md`), nhưng giữ bản gốc này là "nguồn chuẩn".

## 🔄 Cập nhật
- Khi có pattern mới trong code → bổ sung vào `AGENTS.md`.
- Nếu 2 dự án khác nhau điểm gì → ghi ở phần `7. Điểm riêng của 2 dự án`.
