---
tags:
  - training
  - project
  - paygate
  - git-workflow
created: 2026-07-20
---

# Git Workflow — PayGate

Repo: https://github.com/TuanHoAnh/PayGate
Team: 3 (2 thành viên)

## 1. Chiến lược nhánh (Branching Strategy)

Áp dụng mô hình **Trunk-based rút gọn / GitHub Flow** — phù hợp team nhỏ, chu kỳ 4 tuần, cần release liên tục sau mỗi tuần yêu cầu.

```
main                  ← nhánh ổn định, luôn deploy được, bảo vệ (protected)
 └─ develop           ← nhánh tích hợp trong tuần (tuỳ chọn, khuyến nghị dùng nếu 2 người làm song song nhiều tính năng)
     ├─ feature/pay-b-101-merchant-entity
     ├─ feature/pay-b-201-process-payment
     ├─ feature/pay-f-101-merchant-list
     ├─ bugfix/pay-w-403-fix-negative-balance
     └─ hotfix/...
```

- **main**: chỉ nhận merge qua Pull Request đã review + pass CI. Gắn tag sau mỗi tuần hoàn thành (`v1.0-week1`, `v1.0-week2`...).
- **develop** (khuyến nghị vì team 2 người, tránh conflict trực tiếp trên `main`): nơi tích hợp các feature branch trong cùng tuần trước khi merge lên `main` vào cuối tuần.
- **feature/**: 1 nhánh cho 1 requirement (bám theo mã `REQ-PAY-...`) hoặc 1 nhóm requirement liên quan chặt (VD toàn bộ CRUD Merchant).
- **bugfix/**: dùng khi sửa lỗi phát hiện trong quá trình test/review (VD REQ-PAY-W-403).
- **hotfix/**: dùng khi cần sửa gấp trên `main` (hiếm gặp trong bối cảnh đào tạo).

## 2. Quy tắc đặt tên nhánh

```
<type>/<req-code-lowercase>-<mo-ta-ngan>
```
Ví dụ:
- `feature/pay-b-102-account-entity`
- `feature/pay-b-201-process-payment-serializable`
- `feature/pay-f-201-payment-form-component`
- `feature/pay-b-207-rabbitmq-setup`
- `bugfix/pay-t-201-fix-duplicate-idempotency-test`

`type` ∈ {`feature`, `bugfix`, `hotfix`, `chore`, `docs`, `test`}.

## 3. Quy ước Commit Message (Conventional Commits)

```
<type>(<scope>): <mô tả ngắn gọn, thì hiện tại>

[optional body]
[optional footer: Refs REQ-PAY-B-201]
```

| type | Khi dùng |
|---|---|
| `feat` | Thêm tính năng mới (entity, service, endpoint, component...) |
| `fix` | Sửa lỗi |
| `test` | Thêm/sửa test |
| `refactor` | Tái cấu trúc code không đổi hành vi |
| `docs` | Cập nhật tài liệu (SRS, README, API spec...) |
| `chore` | Cấu hình, dependency, CI/CD, migration script không thuộc feature cụ thể |
| `perf` | Tối ưu hiệu năng (index, cache...) |

**Ví dụ commit thực tế theo dự án**:
```
feat(merchant): add Merchant entity and Flyway V2 migration

Refs REQ-PAY-B-101

feat(transaction): implement processPayment with SERIALIZABLE isolation

- Lock accounts in ascending id order to prevent deadlock
- Check idempotency key via Redis before DB transaction
- Create 2 balanced ledger entries per transaction

Refs REQ-PAY-B-201

fix(ledger): correct balance_after calculation in refund flow

Refs REQ-PAY-W-403

test(transaction): add concurrent payment test with 10 threads

Refs REQ-PAY-T-302
```

## 4. Quy trình làm việc (Workflow) hàng ngày

1. `git checkout develop && git pull origin develop`
2. Tạo branch mới từ `develop`: `git checkout -b feature/pay-b-201-process-payment`
3. Code + commit nhỏ, thường xuyên theo Conventional Commits.
4. Trước khi tạo PR: `git fetch origin && git rebase origin/develop` (giữ lịch sử sạch, tránh merge commit rác).
5. Push: `git push origin feature/pay-b-201-process-payment`
6. Mở **Pull Request** vào `develop` (không PR thẳng vào `main`).
7. Assign reviewer là thành viên còn lại trong team (bắt buộc ≥ 1 approve).
8. CI phải pass (build + unit test) trước khi merge.
9. Merge bằng **Squash and merge** để `develop` có lịch sử gọn theo từng requirement.
10. Cuối mỗi tuần: mở PR `develop → main`, review tổng thể, merge, gắn tag `vX-weekN`.

## 5. Quy tắc Pull Request

**Template PR** (đề xuất `.github/PULL_REQUEST_TEMPLATE.md`):
```markdown
## Mô tả
Mô tả ngắn gọn thay đổi.

## Requirement liên quan
- REQ-PAY-B-201

## Loại thay đổi
- [ ] feat
- [ ] fix
- [ ] test
- [ ] docs
- [ ] refactor

## Checklist
- [ ] Code build thành công (mvn clean install / ng build)
- [ ] Unit test đã viết và pass
- [ ] Đã tự review code (self-review)
- [ ] Đã cập nhật Swagger annotation (nếu có API mới)
- [ ] Đã cập nhật tài liệu liên quan (nếu cần)

## Ghi chú cho reviewer
...
```

**Quy tắc review**:
- PR không quá lớn (khuyến nghị < 400 dòng diff, tách nhỏ theo requirement).
- Reviewer kiểm tra: đúng layered architecture, có `@Transactional` phù hợp, có test, không hard-code, tuân thủ naming convention của template.
- Không tự merge PR của chính mình trừ trường hợp team 2 người và reviewer duy nhất đã approve.

## 6. Bảo vệ nhánh (Branch Protection — cấu hình trên GitHub)
- `main`: yêu cầu PR + ≥1 approval + status check (CI) pass; không cho phép force-push; không cho phép merge trực tiếp.
- `develop`: yêu cầu PR + status check pass; approval khuyến khích nhưng có thể nới lỏng do team nhỏ.

## 7. Gắn Tag & Release theo tuần
| Thời điểm | Tag | Nội dung |
|---|---|---|
| Cuối Tuần 1 | `v0.1-week1` | Merchant/Account CRUD, migration V2-V7 |
| Cuối Tuần 2 | `v0.2-week2` | Payment processing, ledger, idempotency, RabbitMQ, webhook |
| Cuối Tuần 3 | `v1.0-final` | Integration test, concurrency test, admin UI, end-to-end, performance test, README, demo |

```bash
git tag -a v0.1-week1 -m "Week 1: Merchant & Account foundation"
git push origin v0.1-week1

git tag -a v0.2-week2 -m "Week 2: Payment processing, ledger, webhook"
git push origin v0.2-week2

git tag -a v1.0-final -m "Week 3: Testing, Admin UI, end-to-end, demo"
git push origin v1.0-final
```

## 8. Cross-review với team khác (REQ-PAY-W-402)
- Sau khi merge lên `main` cuối Tuần 3/4, tạo PR "review-only" hoặc dùng tính năng **GitHub Code Review** trực tiếp trên repo Team 4 (StockPulse) — để lại ≥ 10 comment mang tính xây dựng (không chỉnh sửa code trực tiếp trừ khi được yêu cầu).
- Ghi nhận lại các comment quan trọng vào file `docs/cross-review-notes.md` trong repo PayGate để làm minh chứng nộp bài.

## 9. Xử lý bug từ mentor (REQ-PAY-W-403)
- Mỗi issue mentor tạo trên GitHub Issues → tạo branch `bugfix/pay-w-403-issue-<số-issue>`.
- Commit fix kèm `Fixes #<issue-number>` trong PR description để GitHub tự đóng issue khi merge.
- Tối thiểu 5 bug fix hợp lệ, mỗi bug có PR riêng để dễ truy vết.
