package com.gorong.backend.domain.group.controller;

import com.gorong.backend.domain.group.service.TourApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tour") // 📌 여기서 주소를 정의해야 합니다.
@RequiredArgsConstructor
public class TourApiController {

    private final TourApiService tourApiService;

    @GetMapping("/events") // 📌 최종 주소: /api/tour/events
    public ResponseEntity<String> getEvents() {
        String data = tourApiService.getTourEvents();
        return ResponseEntity.ok(data);
    }
}