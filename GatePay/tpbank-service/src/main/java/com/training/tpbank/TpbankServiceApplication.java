package com.training.tpbank;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TpbankServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TpbankServiceApplication.class, args);
    }
}
