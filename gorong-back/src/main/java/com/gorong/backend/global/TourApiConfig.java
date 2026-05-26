package com.gorong.backend.global;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import lombok.Getter;

@Configuration
@Getter
public class TourApiConfig {
    @Value("${tour.api.service-key}")
    private String serviceKey;

    @Value("${tour.api.base-url}")
    private String baseUrl;
}