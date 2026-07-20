# Layer Architecture Template — Spring Boot

> File này là **code template chuẩn** cho toàn bộ project backend, dựa trên codebase hiện tại.
> Khi thêm một domain mới (VD: Product, Order, Category,...), hãy follow đúng pattern dưới đây.

---

## Mục lục

1. [Luồng xử lý tổng quan](#1-luồng-xử-lý-tổng-quan)
2. [Entity Layer](#2-entity-layer)
3. [Repository Layer](#3-repository-layer)
4. [DTO Layer](#4-dto-layer)
5. [Mapper Layer](#5-mapper-layer)
6. [Service Layer](#6-service-layer)
7. [Controller Layer](#7-controller-layer)
8. [Flyway Migration](#8-flyway-migration)
9. [Exception Layer](#9-exception-layer)
10. [Test Layer](#10-test-layer)
11. [Quy tắc chung](#11-quy-tắc-chung)
12. [Checklist khi thêm domain mới](#12-checklist-khi-thêm-domain-mới)

---

## 1. Luồng xử lý tổng quan

```
[HTTP Request]
      ↓
[Controller]       ← Nhận request, gọi Service, trả về ApiResponse
      ↓
[Service]          ← Business logic, transaction, gọi Repository + Mapper
      ↓
[Mapper]           ← Map Entity ↔ DTO (MapStruct)
      ↓
[Repository]       ← Spring Data JPA, giao tiếp DB
      ↓
[Entity]           ← Ánh xạ tới bảng trong DB
      ↓
[Database]
```

**Luồng đầy đủ cho một request:**

1. Request → **Controller** (validation DTO tự động qua `@Valid`)
2. Controller → **Service** interface → **ServiceImpl**
3. Service gọi **Mapper**: RequestDTO → Entity
4. Service gọi **Repository**: CRUD với DB
5. Service gọi **Mapper**: Entity → ResponseDTO
6. Service trả về ResponseDTO
7. Controller bọc trong **ApiResponse** và trả về client

---

## 2. Entity Layer

### 2.1. BaseEntity (kế thừa cho mọi entity)

**Vị trí:** `src/main/java/com/training/starter/entity/BaseEntity.java`

```java
package com.training.starter.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@MappedSuperclass
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

### 2.2. Concrete Entity

**Vị trí:** `src/main/java/com/training/starter/entity/<Tên>.java`

```java
package com.training.starter.entity;

import com.training.starter.enums.Role;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Role role = Role.USER;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
```

### 2.3. Enum

**Vị trí:** `src/main/java/com/training/starter/enums/<Tên>.java`

```java
package com.training.starter.enums;

public enum Role {
    ADMIN,
    USER
}
```

### Quy tắc Entity

| Quy tắc | Giải thích |
|---------|-----------|
| Luôn kế thừa `BaseEntity` | Có sẵn id, createdAt, updatedAt |
| Dùng `@Table(name = "tên_bảng")` | Tên bảng số nhiều, snake_case |
| `@Column(name = "..." )` | Map field Java → column DB |
| `@Enumerated(EnumType.STRING)` | Lưu enum dạng string, không phải số |
| `@Builder.Default` cho giá trị mặc định | Tránh lỗi khi dùng Lombok Builder |
| `@NoArgsConstructor` + `@AllArgsConstructor` | Bắt buộc cho JPA + Builder |
| `boolean` (primitive) thay vì `Boolean` | Tránh null không mong muốn |

---

## 3. Repository Layer

**Vị trí:** `src/main/java/com/training/starter/repository/<Tên>Repository.java`

```java
package com.training.starter.repository;

import com.training.starter.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // --- Query methods ---
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);

    // --- Exists check ---
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
```

### Quy tắc Repository

| Quy tắc | Giải thích |
|---------|-----------|
| `extends JpaRepository<Entity, IdType>` | Có sẵn CRUD + pagination |
| `@Repository` | Đánh dấu Spring Bean |
| `Optional<T>` cho find methods | Tránh NullPointerException |
| `existsBy*` cho kiểm tra tồn tại | Tối ưu hơn `findBy* != null` |
| Đặt tên theo **Spring Data JPA naming convention** | `findBy`, `existsBy`, `countBy`, `deleteBy` |

---

## 4. DTO Layer

### 4.1. Request DTO (record)

**Vị trí:** `src/main/java/com/training/starter/dto/request/<Tên>Request.java`

```java
package com.training.starter.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank @Size(min = 3, max = 50) String username,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6, max = 100) String password,
        @NotBlank String fullName
) {}
```

**Request cho update (optional fields):**

```java
package com.training.starter.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @Email String email,
        @Size(min = 1, max = 100) String fullName,
        Boolean active
) {}
```

### 4.2. Response DTO (record)

**Vị trí:** `src/main/java/com/training/starter/dto/response/<Tên>Response.java`

```java
package com.training.starter.dto.response;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String username,
        String email,
        String fullName,
        String role,
        boolean active,
        LocalDateTime createdAt
) {}
```

### Quy tắc DTO

| Quy tắc | Giải thích |
|---------|-----------|
| **Luôn dùng `record`** (Java 17+) | Immutable, tự động có constructor, getter, equals, hashCode |
| Request: validation annotations | `@NotBlank`, `@Email`, `@Size`, `@Pattern`... |
| Một file = một record | Không gộp nhiều DTO trong một file |
| Tên rõ ràng: `Create*Request`, `Update*Request` | Phân biệt create vs update |
| Update request dùng `Boolean` (wrapper) | `null` = không thay đổi field đó |

---

## 5. Mapper Layer

**Vị trí:** `src/main/java/com/training/starter/mapper/<Tên>Mapper.java`

```java
package com.training.starter.mapper;

import com.training.starter.dto.request.CreateUserRequest;
import com.training.starter.dto.request.UpdateUserRequest;
import com.training.starter.dto.response.UserResponse;
import com.training.starter.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface UserMapper {

    // Entity → Response (chuyển enum role thành String)
    @Mapping(target = "role", expression = "java(user.getRole().name())")
    UserResponse toResponse(User user);

    // Request → Entity (bỏ qua role, active — service sẽ set)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    User toEntity(CreateUserRequest request);

    // Update: chỉ cập nhật field không null
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(@MappingTarget User user, UpdateUserRequest request);
}
```

### Quy tắc Mapper

| Quy tắc | Giải thích |
|---------|-----------|
| `@Mapper(componentModel = "spring")` | Để Spring quản lý bean |
| **Interface**, không phải class | MapStruct sinh code tự động |
| `@Mapping(target = ..., ignore = true)` | Bỏ qua các field không map trực tiếp |
| `@MappingTarget` cho update | Cập nhật vào entity có sẵn, không tạo mới |
| `NullValuePropertyMappingStrategy.IGNORE` | Update chỉ thay đổi field khác null |
| `expression = "java(...)"` cho logic đặc biệt | VD: enum → string |

---

## 6. Service Layer

### 6.1. Service Interface

**Vị trí:** `src/main/java/com/training/starter/service/<Tên>Service.java`

```java
package com.training.starter.service;

import com.training.starter.dto.request.CreateUserRequest;
import com.training.starter.dto.request.UpdateUserRequest;
import com.training.starter.dto.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserService {

    Page<UserResponse> getAll(Pageable pageable);

    UserResponse getById(Long id);

    UserResponse create(CreateUserRequest request);

    UserResponse update(Long id, UpdateUserRequest request);

    void delete(Long id);
}
```

### 6.2. Service Implementation

**Vị trí:** `src/main/java/com/training/starter/service/impl/<Tên>ServiceImpl.java`

```java
package com.training.starter.service.impl;

import com.training.starter.dto.request.CreateUserRequest;
import com.training.starter.dto.request.UpdateUserRequest;
import com.training.starter.dto.response.UserResponse;
import com.training.starter.entity.User;
import com.training.starter.enums.Role;
import com.training.starter.exception.DuplicateResourceException;
import com.training.starter.exception.ResourceNotFoundException;
import com.training.starter.mapper.UserMapper;
import com.training.starter.repository.UserRepository;
import com.training.starter.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    // --- READ (có phân trang) ---

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getAll(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(userMapper::toResponse);
    }

    // --- READ (theo ID) ---

    @Override
    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        return userMapper.toResponse(findById(id));
    }

    // --- CREATE ---

    @Override
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        // 1. Check duplicate
        if (userRepository.existsByUsername(request.username())) {
            throw new DuplicateResourceException("User", "username", request.username());
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("User", "email", request.email());
        }

        // 2. Map request → entity
        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);
        user.setActive(true);

        // 3. Save & return
        return userMapper.toResponse(userRepository.save(user));
    }

    // --- UPDATE ---

    @Override
    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request) {
        User user = findById(id);

        // Check email uniqueness nếu có thay đổi
        if (request.email() != null
                && !request.email().equals(user.getEmail())
                && userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("User", "email", request.email());
        }

        // Partial update: chỉ thay đổi field không null
        userMapper.updateEntity(user, request);

        // Nếu có password mới thì encode
        // if (request.password() != null) {
        //     user.setPassword(passwordEncoder.encode(request.password()));
        // }

        return userMapper.toResponse(userRepository.save(user));
    }

    // --- DELETE ---

    @Override
    @Transactional
    public void delete(Long id) {
        User user = findById(id);
        userRepository.delete(user);
    }

    // --- Helper ---

    private User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }
}
```

### Quy tắc Service

| Quy tắc | Giải thích |
|---------|-----------|
| `@Service` + `@RequiredArgsConstructor` | Spring Bean + Inject bằng constructor |
| Implement **interface** trước | Dễ test và thay đổi implementation |
| `@Transactional(readOnly = true)` cho GET | Tối ưu read, không lock DB |
| `@Transactional` cho CUD | Đảm bảo atomic |
| Check business rules **đầu method** | Fail-fast: kiểm tra trước khi xử lý |
| Dùng **custom exception** | `ResourceNotFoundException`, `DuplicateResourceException` |
| **Không** xử lý exception ở Service | Để GlobalExceptionHandler xử lý |
| `private` helper method `findById()` | Tránh code lặp lại |

---

## 7. Controller Layer

**Vị trí:** `src/main/java/com/training/starter/controller/<Tên>Controller.java`

```java
package com.training.starter.controller;

import com.training.starter.common.ApiResponse;
import com.training.starter.common.PageResponse;
import com.training.starter.dto.request.CreateUserRequest;
import com.training.starter.dto.request.UpdateUserRequest;
import com.training.starter.dto.response.UserResponse;
import com.training.starter.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User CRUD operations (reference implementation)")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Get paginated list of users")
    public ApiResponse<PageResponse<UserResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {

        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.fromString(sortDir), sortBy));

        Page<UserResponse> userPage = userService.getAll(pageable);
        PageResponse<UserResponse> pageResponse = PageResponse.from(userPage, r -> r);

        return ApiResponse.success(pageResponse);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    public ApiResponse<UserResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(userService.getById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new user")
    public ApiResponse<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ApiResponse.success("User created", userService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing user")
    public ApiResponse<UserResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ApiResponse.success("User updated", userService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a user")
    public void delete(@PathVariable Long id) {
        userService.delete(id);
    }
}
```

### Quy tắc Controller

| Quy tắc | Giải thích |
|---------|-----------|
| `@RestController` | = `@Controller` + `@ResponseBody` |
| `@RequestMapping("/api/v1/...")` | Version API: `/api/v1/{resource}` |
| `@RequiredArgsConstructor` | Inject Service qua constructor |
| `@Tag` + `@Operation` | Document cho Swagger |
| `@Valid` ở request body | Tự động validation |
| `@ResponseStatus(HttpStatus.CREATED)` cho POST | HTTP 201 |
| `@ResponseStatus(HttpStatus.NO_CONTENT)` cho DELETE | HTTP 204 |
| **Không có business logic** trong Controller | Chỉ gọi Service |
| **Luôn trả về ApiResponse** | Trừ DELETE (204) |
| Pagination: `@RequestParam` với default value | Page, size, sortBy, sortDir |

---

## 8. Flyway Migration

**Vị trí:** `src/main/resources/db/migration/V<số>__<mô_tả>.sql`

```sql
-- V1__create_users_table.sql
CREATE TABLE users (
    id          BIGSERIAL    PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(100),
    role        VARCHAR(20)  NOT NULL DEFAULT 'USER',
    active      BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP    NOT NULL
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email    ON users(email);
```

### Quy tắc Flyway

| Quy tắc | Giải thích |
|---------|-----------|
| Tên file: `V<số>__<mô_tả>.sql` | Số thứ tự tăng dần, mô tả bằng snake_case |
| `BIGSERIAL` cho PK | Tự động tăng, tương ứng `IDENTITY` trong JPA |
| `VARCHAR` có độ dài cụ thể | `@Column(length = ...)` |
| `TIMESTAMP` cho thời gian | Tương ứng `LocalDateTime` |
| `NOT NULL` + `DEFAULT` hợp lý | Giống annotation trong Entity |
| Index cho column hay query | `findByUsername`, `findByEmail`... |
| **Không sửa file đã merge** | Tạo file V2 mới để alter |

---

## 9. Exception Layer

### 9.1. Custom Exceptions

**Vị trí:** `src/main/java/com/training/starter/exception/`

```java
// BadRequestException.java
package com.training.starter.exception;

public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}

// ResourceNotFoundException.java
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " not found with id: " + id);
    }
}

// DuplicateResourceException.java
public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }

    public DuplicateResourceException(String resourceName, String fieldName, Object fieldValue) {
        super(resourceName + " already exists with " + fieldName + ": " + fieldValue);
    }
}
```

### 9.2. Global Exception Handler

**Vị trí:** `src/main/java/com/training/starter/exception/GlobalExceptionHandler.java`

```java
package com.training.starter.exception;

import com.training.starter.common.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleResourceNotFound(ResourceNotFoundException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(DuplicateResourceException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleDuplicateResource(DuplicateResourceException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleBadRequest(BadRequestException ex) {
        return ApiResponse.error(ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Map<String, String>> handleValidationErrors(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(err -> errors.put(err.getField(), err.getDefaultMessage()));
        return ApiResponse.error("Validation failed");
    }

    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiResponse<Void> handleBadCredentials(BadCredentialsException ex) {
        return ApiResponse.error("Invalid username or password");
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiResponse<Void> handleAccessDenied(AccessDeniedException ex) {
        return ApiResponse.error("Access denied");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleGeneral(Exception ex) {
        log.error("Unexpected error", ex);
        return ApiResponse.error("Internal server error");
    }
}
```

---

## 10. Test Layer

### 10.1. Unit Test (Mockito)

**Vị trí:** `src/test/java/com/training/starter/service/<Tên>ServiceTest.java`

```java
package com.training.starter.service;

import com.training.starter.dto.request.CreateUserRequest;
import com.training.starter.dto.request.UpdateUserRequest;
import com.training.starter.dto.response.UserResponse;
import com.training.starter.entity.User;
import com.training.starter.enums.Role;
import com.training.starter.exception.DuplicateResourceException;
import com.training.starter.exception.ResourceNotFoundException;
import com.training.starter.mapper.UserMapper;
import com.training.starter.repository.UserRepository;
import com.training.starter.service.impl.UserServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    // === CREATE ===

    @Test
    void create_validRequest_returnsUserResponse() {
        // Given
        CreateUserRequest request = new CreateUserRequest("john", "john@example.com",
                "password123", "John Doe");
        User entity = buildUser(1L, "john", "john@example.com");
        User savedEntity = buildUser(1L, "john", "john@example.com");
        UserResponse expected = new UserResponse(1L, "john", "john@example.com",
                "John Doe", "USER", true, LocalDateTime.now());

        when(userRepository.existsByUsername("john")).thenReturn(false);
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(userMapper.toEntity(request)).thenReturn(entity);
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(userRepository.save(entity)).thenReturn(savedEntity);
        when(userMapper.toResponse(savedEntity)).thenReturn(expected);

        // When
        UserResponse actual = userService.create(request);

        // Then
        assertEquals("john", actual.username());
        assertEquals("john@example.com", actual.email());
        verify(userRepository).save(entity);
    }

    @Test
    void create_duplicateUsername_throwsDuplicateResourceException() {
        CreateUserRequest request = new CreateUserRequest("john", "john@example.com",
                "password123", "John Doe");

        when(userRepository.existsByUsername("john")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> userService.create(request));
        verify(userRepository, never()).save(any());
    }

    // === GET BY ID ===

    @Test
    void getById_found_returnsUserResponse() {
        User entity = buildUser(1L, "john", "john@example.com");
        UserResponse expected = new UserResponse(1L, "john", "john@example.com",
                "John Doe", "USER", true, LocalDateTime.now());

        when(userRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(userMapper.toResponse(entity)).thenReturn(expected);

        UserResponse actual = userService.getById(1L);

        assertEquals(1L, actual.id());
        assertEquals("john", actual.username());
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getById(99L));
    }

    // === UPDATE ===

    @Test
    void update_validRequest_updatesAndReturns() {
        User entity = buildUser(1L, "john", "john@example.com");
        UpdateUserRequest request = new UpdateUserRequest("newemail@example.com", "New Name", true);
        UserResponse expected = new UserResponse(1L, "john", "newemail@example.com",
                "New Name", "USER", true, LocalDateTime.now());

        when(userRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(userRepository.existsByEmail("newemail@example.com")).thenReturn(false);
        when(userRepository.save(entity)).thenReturn(entity);
        when(userMapper.toResponse(entity)).thenReturn(expected);

        UserResponse actual = userService.update(1L, request);

        assertEquals("newemail@example.com", actual.email());
        verify(userMapper).updateEntity(entity, request);
    }

    // === DELETE ===

    @Test
    void delete_existingUser_deletesSuccessfully() {
        User entity = buildUser(1L, "john", "john@example.com");

        when(userRepository.findById(1L)).thenReturn(Optional.of(entity));

        userService.delete(1L);

        verify(userRepository).delete(entity);
    }

    // --- Helper ---
    private User buildUser(Long id, String username, String email) {
        User user = User.builder()
                .username(username)
                .email(email)
                .password("encoded")
                .fullName("John Doe")
                .role(Role.USER)
                .active(true)
                .build();
        user.setId(id);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return user;
    }
}
```

### 10.2. Integration Test

**Vị trí:** `src/test/java/com/training/starter/BaseIntegrationTest.java`

```java
package com.training.starter;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class BaseIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Container
    static RabbitMQContainer rabbitMQ = new RabbitMQContainer("rabbitmq:3-management-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.rabbitmq.host", rabbitMQ::getHost);
        registry.add("spring.rabbitmq.port", rabbitMQ::getAmqpPort);
        registry.add("spring.rabbitmq.username", rabbitMQ::getAdminUsername);
        registry.add("spring.rabbitmq.password", rabbitMQ::getAdminPassword);
    }
}
```

### Quy tắc Test

| Quy tắc | Giải thích |
|---------|-----------|
| `@ExtendWith(MockitoExtension.class)` | Unit test với Mockito |
| `@Mock` cho dependency | Repository, Mapper, Encoder... |
| `@InjectMocks` cho class cần test | ServiceImpl |
| Tên method: `method_condition_expectedResult()` | VD: `create_duplicateUsername_throwsException` |
| 3A Pattern: **Arrange** → **Act** → **Assert** | Given → When → Then |
| `verify()` cho method có side-effect | Kiểm tra method được gọi/không được gọi |
| `assertThrows` cho exception case | Kiểm tra exception đúng type |
| `extends BaseIntegrationTest` cho integration test | Có sẵn Testcontainers |

---

## 11. Quy tắc chung

### 11.1. Common Layer

**ApiResponse** — bọc mọi response (trừ DELETE 204):

```java
// ApiResponse.java (có sẵn trong common/)
@Builder
@JsonInclude(Include.NON_NULL)
public class ApiResponse<T> {
    boolean success;
    String message;
    T data;
    LocalDateTime timestamp;

    public static <T> ApiResponse<T> success(T data) { ... }
    public static <T> ApiResponse<T> success(String message, T data) { ... }
    public static <T> ApiResponse<T> error(String message) { ... }
}
```

**PageResponse** — bọc paginated response:

```java
// PageResponse.java (có sẵn trong common/)
public class PageResponse<T> {
    List<T> content;
    int page;
    int size;
    long totalElements;
    int totalPages;
    boolean last;

    public static <E, R> PageResponse<R> from(Page<E> page, Function<E, R> mapper) { ... }
}
```

### 11.2. Security Layer (giữ nguyên)

Security đã được cấu hình sẵn trong project. Khi thêm endpoint mới:

- `POST /api/v1/auth/**` — public (không cần token)
- Các endpoint khác mặc định **yêu cầu xác thực**
- Nếu cần public thêm: cập nhật `SecurityConfig.java`

### 11.3. Quy tắc đặt tên

| Layer | Pattern | Ví dụ |
|-------|---------|-------|
| Entity | Danh từ, số ít | `User`, `Product`, `Order` |
| Repository | `<Entity>Repository` | `UserRepository` |
| Service Interface | `<Entity>Service` | `UserService` |
| Service Impl | `<Entity>ServiceImpl` | `UserServiceImpl` |
| Controller | `<Entity>Controller` | `UserController` |
| Request DTO | `<Action><Entity>Request` | `CreateUserRequest` |
| Response DTO | `<Entity>Response` | `UserResponse` |
| Mapper | `<Entity>Mapper` | `UserMapper` |
| Migration | `V<number>__<description>.sql` | `V2__create_products_table.sql` |

### 11.4. Package structure

```
com/training/starter/
├── common/           # ApiResponse, PageResponse
├── config/           # Redis, RabbitMQ, OpenAPI, CORS
├── controller/       # REST controllers
├── dto/
│   ├── request/      # Request DTOs
│   └── response/     # Response DTOs
├── entity/           # JPA entities
├── enums/            # Enumerations
├── exception/        # Custom exceptions + handler
├── mapper/           # MapStruct mappers
├── repository/       # Spring Data JPA repositories
├── security/         # JWT, filter, config
└── service/
    └── impl/         # Business logic implementations
```

### 11.5. Annotations phổ biến

| Annotation | Dùng ở | Mục đích |
|------------|--------|----------|
| `@Entity` | Class | Đánh dấu là JPA entity |
| `@Table` | Class | Tên bảng trong DB |
| `@Repository` | Interface | Spring Data repository |
| `@Service` | Class | Business logic |
| `@RestController` | Class | REST API endpoint |
| `@RequestMapping` | Class/ Method | URL mapping |
| `@GetMapping` v.v. | Method | HTTP method mapping |
| `@RequiredArgsConstructor` | Class | Inject dependencies (final fields) |
| `@Transactional` | Method | Quản lý transaction |
| `@Valid` | Parameter | Kích hoạt validation |
| `@Mapper(componentModel = "spring")` | Interface | MapStruct mapper |

---

## 12. Checklist khi thêm domain mới

Khi thêm một domain mới (ví dụ: `Product`), hãy làm theo thứ tự:

- [ ] **1. Flyway migration**: `V2__create_products_table.sql`
- [ ] **2. Entity**: `Product.java` extends `BaseEntity`
- [ ] **3. Repository**: `ProductRepository extends JpaRepository<Product, Long>`
- [ ] **4. Request DTOs**: `CreateProductRequest.java`, `UpdateProductRequest.java`
- [ ] **5. Response DTO**: `ProductResponse.java`
- [ ] **6. Mapper**: `ProductMapper.java` (MapStruct interface)
- [ ] **7. Service Interface**: `ProductService.java`
- [ ] **8. Service Impl**: `ProductServiceImpl.java`
- [ ] **9. Controller**: `ProductController.java`
- [ ] **10. Unit Test**: `ProductServiceTest.java`
- [ ] **11. Chạy thử**: `./mvnw spring-boot:run` (dùng JDK 17)

> **Mẹo:** Copy các file của `User` làm template rồi sửa — nhanh hơn viết từ đầu!

---

*Template này được tạo từ codebase backend của dự án Training Starter. Cập nhật nếu có thay đổi về architecture.*
