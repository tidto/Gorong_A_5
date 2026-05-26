package com.gorong.backend.domain.event.controller;

import com.gorong.backend.domain.event.dto.TourItemDto;
import com.gorong.backend.domain.event.service.TourApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class MapController {

    private final TourApiService tourApiService;

    // /api/public/** → SecurityConfig에서 이미 permitAll → 비로그인도 접근 가능
    @GetMapping("/public/map")
    public ResponseEntity<List<TourItemDto>> getMapData() {
        List<TourItemDto> festivalList = tourApiService.getSmartFestivalList();
        return ResponseEntity.ok(festivalList);
    }

    // 상세 조회도 public으로 (비로그인 상세페이지 접근 허용)
    @GetMapping("/public/map/{id}")
    public ResponseEntity<TourItemDto> getEventDetail(@PathVariable Long id) {
        TourItemDto detail = tourApiService.getEventDetail(id);
        return ResponseEntity.ok(detail);
    }
}