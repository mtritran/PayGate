# 🤖 CODING STANDARDS — Hướng dẫn chuẩn cho AI & Team (2 dự án)

> File này là **quy chuẩn duy nhất** để mọi AI / người đọc code GatePay & MarketPlace viết **cùng 1 phong cách**.
> Áp dụng cho: backend (Spring Boot) + frontend (Angular) + SQL migration + Git commit.

---

## 1. BACKEND — Spring Boot (Java 17)

### 1.1 Cấu trúc package (bắt buộc)
```
com.training.<app>/
├── common/        → ApiResponse, PageResponse (dùng chung)
├── config/        → Security, Redis, RabbitMQ, Async
├── controller/    → REST endpoint (chỉ gọi service, KHÔNG chứa logic)
├── service/       → interface nghiệp vụ
│   └── impl/      → implement
├── repository/    → Spring Data JPA
├── entity/        → JPA entity
├── dto/
│   ├── request/   → request body (record + @Valid)
│   └── response/  → response
├── enums/         → enum (Role, Status, EntryType...)
├── mapper/        → MapStruct mapper
├── exception/     → exception class
├── security/      → JWT, filter, config security
├── messaging/     → RabbitMQ event, consumer, publisher
└── credit/        → (GatePay) CreditScore riêng, tách khỏi Fraud
```

### 1.2 Naming convention
| Loại | Quy tắc | Ví dụ |
|---|---|---|
| Class | PascalCase | `FraudDetectionService` |
| Method | camelCase, verb trước | `evaluatePayment()`, `getLatest()` |
| Constant | UPPER_SNAKE | `REDIS_PREFIX` |
| Biến | camelCase | `riskScore` |
| Field entity | camelCase + `@Column` | `createdAt` |
| Test class | `XxxServiceTest` | `CreditScoreServiceTest` |
| Package | lowercase | `com.training.paygate.credit` |

### 1.3 Response chuẩn (bắt buộc dùng `ApiResponse`)
```java
// THÀNH CÔNG
return ApiResponse.success(data);                    // không message
return ApiResponse.success("Msg", data);             // có message
// LỖI
throw new BadRequestException("Thông báo tiếng Việt");
throw new ResourceNotFoundException("Order", orderId);
```
- **KHÔNG** tự build `ResponseEntity` thủ công trừ khi cần status đặc biệt (vd 201 Created).
- Mọi response bọc trong `ApiResponse<T>` → frontend/AI parse nhất quán `{success, message, data}`.

### 1.4 Controller — mẫu
```java
@RestController
@RequestMapping("/api/v1/xxx")
@RequiredArgsConstructor
@Tag(name = "Xxx", description = "...")
public class XxxController {
    private final XxxService xxxService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")          // bảo mật rõ ràng
    @Operation(summary = "...")
    public ApiResponse<XxxResponse> create(@Valid @RequestBody XxxRequest req) {
        return ApiResponse.success("Tạo thành công", xxxService.create(req));
    }
}
```

### 1.5 Service — mẫu
- **Interface** + **Impl** (`@Service`, `@RequiredArgsConstructor`, `@Slf4j`).
- **Transaction** dùng `@Transactional` (readOnly cho query).
- Logic tách hẳn: controller không có logic nghiệp vụ.
- Log quan trọng bằng `log.info/warn/error`.

### 1.6 Entity — mẫu
```java
@Entity
@Table(name = "xxx")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Xxx {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "field", nullable = false)
    private String field;
}
```

### 1.7 DTO request — record + validation
```java
public record CreateXxxRequest(
    @NotBlank(message = "Tên là bắt buộc") String name,
    @NotNull @DecimalMin("1000") BigDecimal amount
) {}
```

---

## 2. SQL MIGRATION (Flyway)

- Tên file: **`V{STT}__mo_ta.sql`** — STT **tăng dần, không đè** (V27, V28...).
- Mỗi dự án **giữ dải số riêng**: GatePay `V1..V26+`, MarketPlace `V1..V8` → **không dùng chung dải** để tránh conflict khi merge.
- Đặt tên mô tả rõ: `V27__create_credit_scores_table.sql`.
- Mỗi migration **idempotent** nếu có thể (dùng `ON CONFLICT DO NOTHING` cho seed).
- Có index cho cột hay query (`CREATE INDEX ...`).

---

## 3. FRONTEND — Angular 17

- Cấu trúc feature: `app/features/<feature>/<name>.component.ts`.
- Service gọi API: `app/core/services/<name>.service.ts`.
- Mọi API call bọc qua service (không gọi trực tiếp trong component).
- Dùng `HttpClient`, `RxJS` (`map`, `catchError`), **không** dùng `any` bừa bãi.
- Form dùng `ReactiveFormsModule`, validation rõ message.

---

## 4. GIT — Commit & Branch

### Commit message (Conventional Commits)
```
feat(scope): mô tả ngắn bằng tiếng Việt/Anh
fix(scope): ...
refactor(scope): ...
docs: ...
test: ...
```
Ví dụ:
- `feat(security): implement Distributed Rate-Limiting`
- `fix(ai): fix amount parsing 500k -> 500000`
- `chore: rename migrations V24/V25 to avoid conflict`

### Branch
- Feature: `feature/<tên>`
- Fix: `fix/<tên>`
- Mỗi người **1 mảng** → commit riêng, tránh đè file của nhau (chống conflict).

---

## 4.5 GITHUB FLOW — Luồng làm việc chuẩn

> Áp dụng cho mọi người khi code trên repo PayGate (team GatePay).

### Quy trình (mỗi task nhỏ)
```
1. Cập nhật develop mới nhất:   git fetch origin && git checkout develop && git pull
2. Tạo branch của riêng mình:   git checkout -b feature/<tên-feature>
3. Code + commit nhỏ:            git add <file> && git commit -m "feat(scope): ..."
4. Push branch:                  git push -u origin feature/<tên-feature>
5. Tạo Pull Request lên develop: dùng gh pr create
6. (CI tự chạy qua .github/workflows/ci.yml)
7. Merge sau khi CI xanh + review
```

### Quy tắc
- **KHÔNG commit trực tiếp lên `develop`/`main`** — luôn qua branch + PR.
- CI bắt buộc: `GatePay/backend` phải **compile + unit test xanh** (`./mvnw test -Dtest='!*IntegrationTest'`).
- **1 người 1 mảng** → ít conflict; nếu đụng file nhau → branch riêng + merge develop thường xuyên.
- Commit nhỏ, message rõ. Trước PR chạy: `./mvnw -o test-compile` xanh.

### GitHub Actions (CI)
- Workflow: `.github/workflows/ci.yml` — build + test backend trên Ubuntu, Java 17.
- Chạy khi: push/PR lên `develop`, `main`, `feature/*`, `fix/*`, `hotfix/*`.

---

## 4.6 PHÂN CÔNG AI — 4 feature liên kết GatePay ↔ MarketPlace

> Mỗi feature giao **1 AI/người ở GatePay** làm API/nghiệp vụ; **AI/người bên MarketPlace** code client.
> Nguyên tắc: PayGate cấp API + spec, MarketPlace tự code client. Không merge code.

| Feature | GatePay (làm API/nghiệp vụ) | MarketPlace (làm client/UI) |
|---|---|---|
| **1. BNPL — Mua trước trả sau** ⭐ | AI/Nhi | AI/Hoàng |
| **2. Instant Settlement — Rút doanh thu sớm** | AI/Vinh | AI/Giảng + AI/Trí v2 |
| **3. Working Capital — Vay vốn người bán** | AI/Trí | AI/Khoa |
| **4. Credit Score — Điểm tín dụng chung** | AI/Vinh | AI/Giảng + AI/Trí v2 |

### Prompt mẫu cho AI khi nhận feature
```text
Bạn là AI dev cho feature <tên>. Đọc CODING_STANDARDS/AGENTS.md rồi:
- Xây theo đúng package/naming/ApiResponse đã quy chuẩn.
- Api response dùng ApiResponse.success(...).
- Migration mới dùng V27+ (GatePay).
- Đừng đụng file của feature khác (mỗi người 1 mảng).
- Viết test + ./mvnw -o test-compile xanh.
```

---

## 5. SECURITY — Chuẩn bắt buộc

- **JWT** dùng cho user (Bearer token). Secret **luôn từ env**, không hardcode.
- **API Key** dùng cho merchant (xác thực đối tác) — lưu trong body hoặc header, verify `active`.
- **OTP** cho hành động nhạy cảm (trả sau, rút tiền, chấp nhận vay).
- **Rate limit** trên endpoint nhạy cảm (login, payment, credit).
- **Idempotent** bằng `transactionRef`/`orderId` — tránh trùng.
- **Data nhạy cảm** (credit score, balance) → chỉ ADMIN.
- **CSRF**: disable cho API stateless, dùng JWT.

---

## 6. TEST — Unit test (Mockito + AssertJ)

- Tên: `XxxServiceTest`, `XxxControllerTest`.
- Dùng `@ExtendWith(MockitoExtension.class)`, `@Mock`, `@InjectMocks`.
- Assert bằng AssertJ (`assertThat(...)`), không dùng `assertEquals` rải rác.
- Mẫu:
```java
@ExtendWith(MockitoExtension.class)
class XxxServiceTest {
    @Mock XxxRepository repo;
    @InjectMocks XxxServiceImpl service;
    @Test void strongInput_returnsHighScore() {
        // given/when/then
        assertThat(result.getScore()).isEqualTo(70);
    }
}
```

---

## 7. ĐIỂM RIÊNG CỦA 2 DỰ ÁN

| | GatePay | MarketPlace |
|---|---|---|
| Base package | `com.training.paygate` | `com.training.marketplace` |
| DB | `training_db` (5432) | `marketplace_db` (5433) |
| Flyway | V1..V26+ | V1..V8 |
| Port | 8081 | 8080 |
| Roles | USER/ADMIN | CUSTOMER/STAFF/MANAGER/ADMIN |

> Khi 2 dự án liên kết: **không merge code**, nối qua API + Webhook. GatePay cấp API, MarketPlace tự code client.

---

## 8. CHECKLIST TRƯỚC KHI AI GIAO CODE
- [ ] Controller **không chứa logic** (chỉ gọi service)
- [ ] Response dùng `ApiResponse.success(...)`
- [ ] DTO request dùng record + `@Valid`
- [ ] Migration đúng dải số, idempotent
- [ ] Security: có PreAuthorize / API key / OTP phù hợp
- [ ] Có test (ít nhất happy path + 1 edge case)
- [ ] `./mvnw -o test-compile` xanh
