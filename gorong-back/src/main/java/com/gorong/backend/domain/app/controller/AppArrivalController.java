package com.gorong.backend.domain.app.controller;

import com.gorong.backend.domain.app.dto.ArrivalRequestDto;
import com.gorong.backend.domain.app.service.AppArrivalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/app/arrivals")
@RequiredArgsConstructor
public class AppArrivalController {

    private final AppArrivalService appArrivalService;

    // PostGIS ST_Distance로 서버에서 검증
    @PostMapping
    public ResponseEntity<String> verifyArrival(
            @RequestBody ArrivalRequestDto requestDto,
            Authentication authentication) {
        boolean verified = appArrivalService.verifyArrival(
                requestDto.getVenueId(),
                requestDto.getLat(),
                requestDto.getLng(),
                authentication.getName()  // email
        );
        if (verified) return ResponseEntity.ok("도착 인증 완료!");
        return ResponseEntity.badRequest().body("행사장 반경 밖입니다.");
    }
}