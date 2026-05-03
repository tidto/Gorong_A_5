package com.gorong.backend.domain.juso.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/juso")
@RequiredArgsConstructor
public class JusoController {

    @Value("${juso.api.key}")
    private String jusoApiKey;

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        String url = UriComponentsBuilder
                .fromUriString("https://business.juso.go.kr/addrlink/addrLinkApi.do")
                .queryParam("currentPage", page)
                .queryParam("countPerPage", size)
                .queryParam("keyword", keyword)
                .queryParam("confmKey", jusoApiKey)
                .queryParam("resultType", "json")
                .build()
                .toUriString();

        RestTemplate restTemplate = new RestTemplate();
        Object result = restTemplate.getForObject(url, Object.class);
        return ResponseEntity.ok(result);
    }
}