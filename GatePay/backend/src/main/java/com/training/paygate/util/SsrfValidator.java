package com.training.paygate.util;

import lombok.extern.slf4j.Slf4j;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;

@Slf4j
public class SsrfValidator {

    /**
     * Validates if a given URL is safe to call (not pointing to internal network).
     * Blocks loopback (127.x), link-local (169.254.x), site-local (10.x, 172.16.x, 192.168.x).
     * @param urlString The webhook URL to validate
     * @return true if safe, false if it resolves to a restricted internal IP or is malformed
     */
    public static boolean isSafeUrl(String urlString) {
        if (urlString == null || urlString.isBlank()) {
            return false;
        }
        
        try {
            URI uri = new URI(urlString);
            String host = uri.getHost();
            if (host == null) {
                log.warn("SSRF Validator: Invalid URL format, no host found: {}", urlString);
                return false;
            }

            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress address : addresses) {
                if (address.isLoopbackAddress() || 
                    address.isSiteLocalAddress() || 
                    address.isLinkLocalAddress() || 
                    address.isAnyLocalAddress()) {
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
