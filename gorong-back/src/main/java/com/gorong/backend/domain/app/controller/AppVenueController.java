package com.gorong.backend.domain.app.controller;

import com.gorong.backend.domain.app.dto.NearbyVenueResponseDto;
import com.gorong.backend.domain.app.service.AppVenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/app/venues")
@RequiredArgsConstructor
public class AppVenueController {

    private final AppVenueService appVenueService;

    // 앱에서 위경도 보내면 주변 행사 반환 (TourAPI 호출은 백엔드가 처리)
    @GetMapping("/nearby")
    public ResponseEntity<List<NearbyVenueResponseDto>> getNearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5000") int radius) {
        return ResponseEntity.ok(appVenueService.getNearbyVenues(lat, lng, radius));
    }
}