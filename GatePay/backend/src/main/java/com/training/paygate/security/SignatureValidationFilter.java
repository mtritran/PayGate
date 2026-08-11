package com.training.paygate.security;

import com.training.paygate.entity.Merchant;
import com.training.paygate.repository.MerchantRepository;
import com.training.paygate.util.HmacUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class SignatureValidationFilter extends OncePerRequestFilter {

    private final MerchantRepository merchantRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String merchantCode = request.getHeader("X-Merchant-Code");
        String incomingSignature = request.getHeader("X-Signature");

        if (merchantCode == null || incomingSignature == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing Authentication Headers");
            return;
        }

        Merchant merchant = merchantRepository.findByMerchantCode(merchantCode).orElse(null);
        if (merchant == null || !merchant.isActive()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or Inactive Merchant");
            return;
        }

        // Đọc toàn bộ Body ngay lập tức và lưu vào mảng byte để xài nhiều lần
        CachedBodyHttpServletRequest cachedBodyHttpServletRequest = new CachedBodyHttpServletRequest(request);
        String jsonBody = new String(cachedBodyHttpServletRequest.getCachedBody(),
                request.getCharacterEncoding() != null ? request.getCharacterEncoding() : "UTF-8");

        try {
            String expectedSignature = HmacUtils.generateSignature(jsonBody, merchant.getApiKey());

            if (!expectedSignature.equals(incomingSignature)) {
                log.warn("Chữ ký không khớp cho Merchant: {}", merchantCode);
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Signature");
                return; // Chặn request lại ngay lập tức
            }

            request.setAttribute("validatedMerchantCode", merchantCode);

            // Cho phép đi tiếp, nhớ truyền cái request đã được bọc vào nhé
            filterChain.doFilter(cachedBodyHttpServletRequest, response);

        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra chữ ký HMAC", e);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Lỗi server");
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/v1/checkout/create");
    }
}

class CachedBodyHttpServletRequest extends jakarta.servlet.http.HttpServletRequestWrapper {
    private final byte[] cachedBody;

    public CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
        super(request);
        java.io.InputStream requestInputStream = request.getInputStream();
        this.cachedBody = org.springframework.util.StreamUtils.copyToByteArray(requestInputStream);
    }

    @Override
    public jakarta.servlet.ServletInputStream getInputStream() {
        return new CachedBodyServletInputStream(this.cachedBody);
    }

    @Override
    public java.io.BufferedReader getReader() {
        java.io.ByteArrayInputStream byteArrayInputStream = new java.io.ByteArrayInputStream(this.cachedBody);
        return new java.io.BufferedReader(new java.io.InputStreamReader(byteArrayInputStream));
    }

    public byte[] getCachedBody() {
        return this.cachedBody;
    }
}

class CachedBodyServletInputStream extends jakarta.servlet.ServletInputStream {
    private final java.io.InputStream cachedBodyInputStream;

    public CachedBodyServletInputStream(byte[] cachedBody) {
        this.cachedBodyInputStream = new java.io.ByteArrayInputStream(cachedBody);
    }

    @Override
    public boolean isFinished() {
        try {
            return cachedBodyInputStream.available() == 0;
        } catch (IOException e) {
            return false;
        }
    }

    @Override
    public boolean isReady() {
        return true;
    }

    @Override
    public void setReadListener(jakarta.servlet.ReadListener readListener) {
        throw new UnsupportedOperationException();
    }

    @Override
    public int read() throws IOException {
        return cachedBodyInputStream.read();
    }
}
