package com.training.paygate.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    public static final String TOKEN_TYPE_CLAIM = "token_type";
    public static final String USER_ID_CLAIM = "user_id";
    public static final String ROLE_CLAIM = "role";
    public static final String ACCESS_TOKEN_TYPE = "ACCESS";
    public static final String REFRESH_TOKEN_TYPE = "REFRESH";

    public String generateAccessToken(String username, Long userId, String role) {
        return generateToken(username, userId, role, accessTokenExpiration, ACCESS_TOKEN_TYPE);
    }

    public String generateRefreshToken(String username, Long userId, String role) {
        return generateToken(username, userId, role, refreshTokenExpiration, REFRESH_TOKEN_TYPE);
    }

    private String generateToken(String username, Long userId, String role, long expiration, String tokenType) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .subject(username)
                .claim(TOKEN_TYPE_CLAIM, tokenType)
                .claim(USER_ID_CLAIM, userId)
                .claim(ROLE_CLAIM, role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Long extractUserId(String token) {
        try {
            Number userIdNumber = extractClaim(token, claims -> claims.get(USER_ID_CLAIM, Number.class));
            return userIdNumber != null ? userIdNumber.longValue() : null;
        } catch (Exception e) {
            return null;
        }
    }

    public String extractRole(String token) {
        try {
            return extractClaim(token, claims -> claims.get(ROLE_CLAIM, String.class));
        } catch (Exception e) {
            return null;
        }
    }

    public String extractTokenType(String token) {
        try {
            return extractClaim(token, claims -> claims.get(TOKEN_TYPE_CLAIM, String.class));
        } catch (Exception e) {
            return null;
        }
    }

    public boolean isAccessToken(String token) {
        return ACCESS_TOKEN_TYPE.equals(extractTokenType(token));
    }

    public boolean isRefreshToken(String token) {
        return REFRESH_TOKEN_TYPE.equals(extractTokenType(token));
    }

    public long getRemainingExpirationMs(String token) {
        try {
            Date expiration = extractClaim(token, Claims::getExpiration);
            long remaining = expiration.getTime() - System.currentTimeMillis();
            return Math.max(remaining, 0);
        } catch (Exception e) {
            return 0;
        }
    }

    public boolean isTokenValid(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claimsResolver.apply(claims);
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
