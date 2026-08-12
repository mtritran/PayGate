# Load Test PayGate

Thư mục này tổ chức load test theo cùng cấu trúc phase-folder của Marketplace: mỗi giai đoạn có script, report và evidence riêng.

## Cấu trúc

```text
loadtest/
├── README.md
├── .env.example
├── BAO_CAO_TONG_KET_GD3_GD4.md
├── common/
│   ├── env.js
│   ├── checkout.js
│   └── webhook.js
├── gd3/
│   ├── gd3-idempotency-test.js
│   ├── gd3-idempotency-scale-test.js
│   ├── report-gd3.md
│   └── evidence/gd3-final-20260811-224105/
└── gd4/
    ├── gd4-validation-test.js
    ├── gd4-settlement-test.js
    ├── gd4-forged-amount-test.js
    ├── report-gd4.md
    ├── report-gd4-forged.md
    └── evidence/
        ├── gd4-validation-20260811-235710/
        ├── gd4-settlement-20260812-000715/
        └── gd4-forged-20260812-001305/
```

`common/` chỉ chứa helper dùng chung; không chứa secret hoặc dữ liệu môi trường.

## Trạng thái

| Phase | Script | Kết quả | Evidence |
|---|---|---|---|
| GĐ3 | [`gd3-idempotency-test.js`](./gd3/gd3-idempotency-test.js), [`gd3-idempotency-scale-test.js`](./gd3/gd3-idempotency-scale-test.js) | Dữ liệu PASS; scale API FAIL với 6/50 và 11/100 response 5xx | [`report-gd3.md`](./gd3/report-gd3.md) — evidence text đã nhúng |
| GĐ4-A | [`gd4-validation-test.js`](./gd4/gd4-validation-test.js) | 50/100 VUs PASS; 200 VUs FAIL với 240 lỗi kết nối | [`report-gd4.md`](./gd4/report-gd4.md) — evidence text đã nhúng |
| GĐ4-B | [`gd4-settlement-test.js`](./gd4/gd4-settlement-test.js) | 30/50 settlement PASS; p95 706,15/941,35 ms | [`report-gd4.md`](./gd4/report-gd4.md) — evidence text đã nhúng |
| GĐ4-C | [`gd4-forged-amount-test.js`](./gd4/gd4-forged-amount-test.js) | 50/100 VUs PASS; 28.725/28.725 amount sai bị chặn | [`report-gd4.md`](./gd4/report-gd4.md) — evidence text đã nhúng |

- [Báo cáo GĐ3](./gd3/report-gd3.md)
- [Báo cáo GĐ4](./gd4/report-gd4.md)
- [Báo cáo forged amount lịch sử](./gd4/report-gd4-forged.md)
- [Báo cáo tổng kết GĐ3-GĐ4](./BAO_CAO_TONG_KET_GD3_GD4.md)

## Cách chạy

Chạy từ application root `GatePay/` — cùng cấp với `backend/`, `frontend/` và `loadtest/`. `.env.example` chỉ là danh sách biến; k6 không tự nạp file này.

```powershell
# GĐ3
& 'C:\Program Files\k6\k6.exe' run loadtest/gd3/gd3-idempotency-test.js

# GĐ3 scale: nhiều nhóm độc lập, mỗi user tối đa 10 request trùng key
& 'C:\Program Files\k6\k6.exe' run loadtest/gd3/gd3-idempotency-scale-test.js

# GĐ4-A: random/non-matching validation
& 'C:\Program Files\k6\k6.exe' run loadtest/gd4/gd4-validation-test.js

# GĐ4-B: 30 settlement độc lập
& 'C:\Program Files\k6\k6.exe' run loadtest/gd4/gd4-settlement-test.js

# GĐ4-C: signed wrong-amount spam
& 'C:\Program Files\k6\k6.exe' run loadtest/gd4/gd4-forged-amount-test.js
```

## Quy tắc an toàn và evidence

- Không hardcode hoặc commit JWT, password, merchant API key, bank HMAC secret và raw auth header.
- GĐ4 bắt buộc `GD4_TEST_ENV=isolated`, `GD4_ALLOW_MUTATION=true`, `GD4_CALLBACK_SAFE=true`.
- Mutation test chỉ chạy trên database disposable và merchant callback phải `NULL` hoặc local stub đã kiểm chứng.
- Raw log, JSON summary, SQL output và screenshot mới được giữ cục bộ trong `loadtest/results/` để hậu kiểm và không commit.
- Báo cáo bàn giao phải chép trực tiếp các chỉ số k6/SQL cần thiết để có thể gửi độc lập; các thư mục `gd3/gd4/evidence/` là snapshot lịch sử đã tồn tại.
- GĐ3 chưa được sign-off trên `develop`: dữ liệu không double-charge nhưng scale test còn trả 5xx do serialization conflict không đi qua retry boundary.
- GĐ3 chuẩn vẫn dùng 1 user và 8-10 VUs theo requirements. Script `gd3-idempotency-scale-test.js`
  là bài mở rộng capacity: mỗi user là một logical payment riêng, dùng một key riêng và tối đa 10
  request trùng key. Không tăng thẳng một user quá 10 request vì khi đó kết quả chỉ phản ánh HTTP 429.

## Quick runner cho local smoke test

`run.ps1` nạp cấu hình máy cá nhân từ `.env.local`, tự sinh run ID và idempotency key, kiểm tra backend rồi gọi đúng script k6 của scenario được chọn. Các secret để trống trong `.env.local` sẽ được hỏi ẩn khi chạy.

```powershell
# Chạy từ GatePay/
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\loadtest\run.ps1 -Scenario validation -Smoke
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\loadtest\run.ps1 -Scenario gd3 -Smoke
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\loadtest\run.ps1 -Scenario gd3-scale -SaveQuickLog
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\loadtest\run.ps1 -Scenario settlement -Smoke
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\loadtest\run.ps1 -Scenario forged -Smoke

# Chạy cả bốn scenario và lưu console log local
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\loadtest\run.ps1 -Scenario all -Smoke -SaveQuickLog
```

Smoke mode chỉ dùng để kiểm tra nhanh, không thay thế evidence chính thức hoặc SQL hậu kiểm. GĐ3, settlement và forged vẫn có side effect nên chỉ chạy trên database disposable. `.env.local` và `.quick-runs/` không được commit.
