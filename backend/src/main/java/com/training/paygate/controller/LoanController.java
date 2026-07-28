package com.training.paygate.controller;

import com.training.paygate.common.ApiResponse;
import com.training.paygate.common.PageResponse;
import com.training.paygate.dto.request.LoanApplyRequest;
import com.training.paygate.dto.request.LoanApprovalRequest;
import com.training.paygate.dto.request.LoanRepayRequest;
import com.training.paygate.dto.response.LoanResponse;
import com.training.paygate.entity.User;
import com.training.paygate.exception.ResourceNotFoundException;
import com.training.paygate.repository.UserRepository;
import com.training.paygate.service.LoanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Loans", description = "APIs quản lý vay tiêu dùng (User đăng ký/trả nợ & Admin phê duyệt/giải ngân)")
public class LoanController {

    private final LoanService loanService;
    private final UserRepository userRepository;

    // --- USER ENDPOINTS ---

    @PostMapping("/loans/apply")
    @PreAuthorize("hasAnyAuthority('USER', 'ROLE_USER', 'ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "Tạo yêu cầu vay tiêu dùng mới")
    public ApiResponse<LoanResponse> applyLoan(
            Principal principal,
            @Valid @RequestBody LoanApplyRequest request
    ) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
        return ApiResponse.success("Loan application submitted successfully", loanService.applyLoan(user.getId(), request));
    }

    @GetMapping("/loans/my-loans")
    @PreAuthorize("hasAnyAuthority('USER', 'ROLE_USER', 'ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "Xem danh sách khoản vay của User")
    public ApiResponse<PageResponse<LoanResponse>> getMyLoans(
            Principal principal,
            Pageable pageable
    ) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
        return ApiResponse.success(PageResponse.from(loanService.getMyLoans(user.getId(), pageable), l -> l));
    }

    @GetMapping("/loans/{id}")
    @PreAuthorize("hasAnyAuthority('USER', 'ROLE_USER', 'ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "Xem chi tiết khoản vay và lịch trả nợ")
    public ApiResponse<LoanResponse> getLoanById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentication.getName()));
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
        return ApiResponse.success(loanService.getLoanById(id, user.getId(), isAdmin));
    }

    @PostMapping("/loans/{id}/accept-offer")
    @PreAuthorize("hasAnyAuthority('USER', 'ROLE_USER', 'ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "User chấp nhận đề nghị vay, hoàn tất ký hợp đồng & giải ngân về ví PayGate")
    public ApiResponse<LoanResponse> acceptLoanOffer(
            @PathVariable Long id,
            Principal principal
    ) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
        return ApiResponse.success("Loan offer accepted. Contract signed and funds disbursed successfully!", loanService.acceptLoanOffer(user.getId(), id));
    }

    @GetMapping("/loans/{id}/contract-pdf")
    @PreAuthorize("hasAnyAuthority('USER', 'ROLE_USER', 'ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "Tải file Hợp đồng vay tiêu dùng PDF 3 trang chi tiết")
    public org.springframework.http.ResponseEntity<byte[]> downloadContractPdf(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentication.getName()));
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));

        byte[] pdfBytes = loanService.generateLoanContractPdf(id, user.getId(), isAdmin);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "PayGate_Loan_Contract_" + id + ".pdf");

        return new org.springframework.http.ResponseEntity<>(pdfBytes, headers, org.springframework.http.HttpStatus.OK);
    }

    @PostMapping("/loans/{id}/repay")
    @PreAuthorize("hasAnyAuthority('USER', 'ROLE_USER', 'ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "Thanh toán khoản vay (trả nợ theo kỳ hoặc tất toán)")
    public ApiResponse<LoanResponse> repayLoan(
            @PathVariable Long id,
            Principal principal,
            @Valid @RequestBody LoanRepayRequest request
    ) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getName()));
        return ApiResponse.success("Loan repayment processed successfully", loanService.repayLoan(user.getId(), id, request));
    }

    // --- ADMIN ENDPOINTS ---

    @GetMapping("/admin/loans")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "Admin xem tất cả đơn vay trong hệ thống")
    public ApiResponse<PageResponse<LoanResponse>> getAllLoansForAdmin(Pageable pageable) {
        return ApiResponse.success(PageResponse.from(loanService.getAllLoansForAdmin(pageable), l -> l));
    }

    @PostMapping("/admin/loans/{id}/approve")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "Admin phê duyệt và tự động giải ngân khoản vay sang ví User")
    public ApiResponse<LoanResponse> approveLoan(
            @PathVariable Long id,
            Principal principal,
            @RequestBody(required = false) LoanApprovalRequest request
    ) {
        User admin = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found: " + principal.getName()));
        return ApiResponse.success("Loan approved and disbursed successfully", loanService.approveLoan(id, admin.getId(), request));
    }

    @PostMapping("/admin/loans/{id}/reject")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN')")
    @Operation(summary = "Admin từ chối đơn vay")
    public ApiResponse<LoanResponse> rejectLoan(
            @PathVariable Long id,
            Principal principal,
            @RequestBody(required = false) LoanApprovalRequest request
    ) {
        User admin = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found: " + principal.getName()));
        return ApiResponse.success("Loan rejected", loanService.rejectLoan(id, admin.getId(), request));
    }
}
