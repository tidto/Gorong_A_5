package com.gorong.backend.global.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void init() {
        System.out.println("Firebase disabled in local");
    }
}
