package com.gorong.backend.domain.app.controller;

import com.gorong.backend.domain.app.dto.ArrivalRequestDto;
import com.gorong.backend.domain.app.service.AppArrivalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.gorong.backend.domain.app.service.AppVenueService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/app/arrivals")
@RequiredArgsConstructor
public class AppArrivalController {

    private final AppArrivalService appArrivalService;
    private final AppVenueService appVenueService;

    // PostGIS ST_Distance로 서버에서 검증
    @PostMapping
    public ResponseEntity<String> verifyArrival(
            @RequestBody ArrivalRequestDto requestDto,
            Authentication authentication) {
        boolean verified = appArrivalService.verifyArrival(
                requestDto.getVenueId(),
                requestDto.getLat(),
                requestDto.getLng(),
                authentication
        );
        if (verified) return ResponseEntity.ok("도착 인증 완료!");
        return ResponseEntity.badRequest().body("행사장 반경 밖입니다.");
    }

    @GetMapping("/{venueId}/me")
    public ResponseEntity<Map<String, Boolean>> checkArrival(
            @PathVariable String venueId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(Map.of(
                "verified", appArrivalService.hasVerifiedArrival(authentication, venueId)
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<List<String>> getMyVerifiedVenueIds(Authentication authentication) {
        return ResponseEntity.ok(appArrivalService.getMyVerifiedVenueIds(authentication));
    }

    // 임시 테스트용 — 확인 후 반드시 삭제
    @GetMapping("/test")
    public ResponseEntity<String> testArrival() {
        var geo = appVenueService.resolveVenueGeo("1118418");
        if (geo.isEmpty()) return ResponseEntity.ok("VenueGeo 없음 — DB/캐시 조회 실패");
        return ResponseEntity.ok("VenueGeo 찾음 — lat=" + geo.get().lat() + ", lng=" + geo.get().lng());
    }
}
