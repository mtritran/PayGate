package com.training.paygate.security;

import com.training.paygate.util.HmacUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
public class BankWebhookFilter extends OncePerRequestFilter {

    @Value("${paygate.vietqr.webhook-secret:vietqr-secret-default}")
    private String webhookSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String incomingSignature = request.getHeader("X-Bank-Signature");

        if (incomingSignature == null) {
            log.warn("Missing X-Bank-Signature header for bank webhook");
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing X-Bank-Signature Header");
            return;
        }

        CachedBodyHttpServletRequest cachedBodyRequest;
        if (request instanceof CachedBodyHttpServletRequest) {
            cachedBodyRequest = (CachedBodyHttpServletRequest) request;
        } else {
            cachedBodyRequest = new CachedBodyHttpServletRequest(request);
        }

        String jsonBody = new String(cachedBodyRequest.getCachedBody(), request.getCharacterEncoding() != null ? request.getCharacterEncoding() : "UTF-8");

        try {
            String expectedSignature = HmacUtils.generateSignature(jsonBody, webhookSecret);

            if (!expectedSignature.equals(incomingSignature)) {
                log.warn("Invalid Bank Signature for bank webhook — signature mismatch");
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Bank Signature");
                return;
            }

            filterChain.doFilter(cachedBodyRequest, response);

        } catch (Exception e) {
            log.error("Error validating bank signature", e);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Error validating signature");
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.equals("/api/v1/integration/bank-webhook");
    }
}
