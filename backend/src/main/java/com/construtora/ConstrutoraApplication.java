package com.construtora;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ConstrutoraApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConstrutoraApplication.class, args);
    }
}
