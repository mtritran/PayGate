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
| GĐ3 | [`gd3-idempotency-test.js`](./gd3/gd3-idempotency-test.js) | PASS trên backend đã vá; 1 transaction, không double-charge | [`gd3-final-20260811-224105`](./gd3/evidence/gd3-final-20260811-224105/) |
| GĐ4-A | [`gd4-validation-test.js`](./gd4/gd4-validation-test.js) | PASS; 116.499/116.499 HTTP 404; p95 20,79 ms | [`gd4-validation-20260811-235710`](./gd4/evidence/gd4-validation-20260811-235710/) |
| GĐ4-B | [`gd4-settlement-test.js`](./gd4/gd4-settlement-test.js) | PASS; 30/30 settlement; p95 440,58 ms | [`gd4-settlement-20260812-000715`](./gd4/evidence/gd4-settlement-20260812-000715/) |
| GĐ4-C | [`gd4-forged-amount-test.js`](./gd4/gd4-forged-amount-test.js) | PASS; 24.317/24.317 amount sai bị chặn; accepted 0% | [`gd4-forged-20260812-001305`](./gd4/evidence/gd4-forged-20260812-001305/) |

- [Báo cáo GĐ3](./gd3/report-gd3.md)
- [Báo cáo GĐ4](./gd4/report-gd4.md)
- [Báo cáo forged amount](./gd4/report-gd4-forged.md)
- [Báo cáo tổng kết GĐ3-GĐ4](./BAO_CAO_TONG_KET_GD3_GD4.md)

## Cách chạy

Chạy từ application root `GatePay/` — cùng cấp với `backend/`, `frontend/` và `loadtest/`. `.env.example` chỉ là danh sách biến; k6 không tự nạp file này.

```powershell
# GĐ3
& 'C:\Program Files\k6\k6.exe' run loadtest/gd3/gd3-idempotency-test.js

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
- Mỗi run chính thức giữ manifest, k6 summary, console log đã quét secret, SQL preflight và SQL post-check trong phase tương ứng.
- Không stage run thất bại/smoke cũ. Chỉ bốn evidence directory được liệt kê trong bảng trạng thái là artifact bàn giao chính thức.
- GĐ3 release sign-off phụ thuộc việc merge backend fixes `96d4ecd` và `9703482` hoặc thay đổi tương đương.
