package com.gorong.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class GorongBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(GorongBackendApplication.class, args);
    }

}
