package com.training.paygate.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
public class SsrfValidator {

    private final Set<String> allowedInternalHosts;

    public SsrfValidator(
            @Value("${app.webhook.allowed-internal-hosts:localhost}") String allowedInternalHosts,
            Environment environment) {
        this.allowedInternalHosts = Arrays.stream(allowedInternalHosts.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());

        if (environment.acceptsProfiles(Profiles.of("prod")) && !this.allowedInternalHosts.isEmpty()) {
            throw new IllegalStateException(
                    "Internal webhook hosts must not be allowed under the prod profile; "
                            + "set WEBHOOK_ALLOWED_INTERNAL_HOSTS to an empty value");
        }
    }

    /**
     * Validates if a given URL is safe to call (not pointing to internal network).
     * Blocks loopback (127.x), link-local (169.254.x), site-local (10.x, 172.16.x, 192.168.x).
     * @param urlString The webhook URL to validate
     * @return true if safe, false if it resolves to a restricted internal IP or is malformed
     */
    public boolean isSafeUrl(String urlString) {
        if (urlString == null || urlString.isBlank()) {
            return false;
        }
        
        try {
            URI uri = new URI(urlString);
            String scheme = uri.getScheme();
            if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
                log.warn("SSRF Validator: Unsupported webhook URL scheme: {}", urlString);
                return false;
            }

            String host = uri.getHost();
            if (host == null) {
                log.warn("SSRF Validator: Invalid URL format, no host found: {}", urlString);
                return false;
            }

            String normalizedHost = host.toLowerCase(Locale.ROOT);
            boolean explicitlyAllowedInternalHost = allowedInternalHosts.contains(normalizedHost);

            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress address : addresses) {
                if (address.isLoopbackAddress() || 
                    address.isSiteLocalAddress() || 
                    address.isLinkLocalAddress() || 
                    address.isAnyLocalAddress()) {
                    if (explicitlyAllowedInternalHost) {
                        continue;
                    }
                    log.warn("SSRF Validator: Blocked attempt to access internal IP {} from URL {}", address.getHostAddress(), urlString);
                    return false;
                }
            }
            return true;
        } catch (UnknownHostException e) {
            log.warn("SSRF Validator: Unknown host in URL {}: {}", urlString, e.getMessage());
            return false;
        } catch (Exception e) {
            log.warn("SSRF Validator: Failed to parse or validate URL {}: {}", urlString, e.getMessage());
            return false;
        }
    }
}
