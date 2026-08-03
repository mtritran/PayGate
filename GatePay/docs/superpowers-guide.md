# Hướng Dẫn Cài Đặt và Sử Dụng Superpowers

[Superpowers](https://github.com/obra/superpowers) là một bộ phương pháp luận và kỹ năng (skills) giúp định hình luồng làm việc của các AI Coding Agent (như Claude Code, Antigravity, Cursor, v.v.) theo chuẩn quy trình công nghệ phần mềm: lập kế hoạch, viết test trước (TDD) và tự kiểm tra lỗi.

---

## 1. Hướng dẫn cài đặt theo từng công cụ

### Google Antigravity (`agy` CLI)
Cài đặt trực tiếp từ kho lưu trữ GitHub bằng lệnh CLI `agy`:
```bash
agy plugin install https://github.com/obra/superpowers
```
*Lưu ý: Antigravity sẽ tự khởi chạy plugin này mỗi khi bạn bắt đầu một phiên làm việc mới.*

---

### Claude Code (Anthropic)
Bạn có thể cài đặt thông qua một trong hai cách:

*   **Cách 1: Từ chợ chính thức của Claude Code**
    ```bash
    /plugin install superpowers@claude-plugins-official
    ```

*   **Cách 2: Từ chợ của cộng đồng Superpowers**
    ```bash
    /plugin marketplace add obra/superpowers-marketplace
    /plugin install superpowers@superpowers-marketplace
    ```

---

### Cursor (Cursor Agent Chat)
Trong khung chat của Cursor Agent, gõ lệnh sau để cài đặt:
```text
/add-plugin superpowers
```
Hoặc tìm kiếm từ khóa "superpowers" trực tiếp trên cửa hàng plugin của Cursor.

---

### Các công cụ khác (Codex CLI / Factory Droid)
*   **Codex CLI**:
    ```bash
    /plugins
    # Tìm kiếm "superpowers" và chọn Install
    ```
*   **Factory Droid**:
    ```bash
    droid plugin marketplace add https://github.com/obra/superpowers
    droid plugin install superpowers@superpowers
    ```

---

## 2. Cách thức hoạt động trong thực tế

Sau khi cài đặt thành công, Superpowers sẽ tự kích hoạt ngầm. Khi bạn yêu cầu AI làm việc, nó sẽ tuân thủ quy trình 4 bước sau:

1.  **Thu thập yêu cầu (Tease out Spec)**: AI không bắt đầu viết code ngay mà sẽ hỏi bạn để làm rõ yêu cầu, sau đó trình bày lại Spec dưới dạng các khối thông tin nhỏ dễ đọc để bạn duyệt.
2.  **Lập kế hoạch (Implementation Plan)**: Tạo ra một bản kế hoạch cụ thể tập trung vào tính đơn giản (**YAGNI**), không lặp code (**DRY**) và kiểm thử bài bản.
3.  **Viết Test Trước (TDD)**: Viết các bài test và chạy kiểm thử thất bại (Red), sau đó mới viết code logic để kiểm thử vượt qua (Green).
4.  **Chạy Subagents**: AI tự động tạo các agent con (Subagents) thực hiện các phần việc nhỏ song song, tự giám sát chéo và hoàn thành kế hoạch.
