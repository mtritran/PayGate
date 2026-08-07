package com.training.paygate.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "paygate.vietqr")
public class VietQrProperties {
    private String bankBin;
    private String bankCode;
    private String accountNumber;
    private String accountName;
}
