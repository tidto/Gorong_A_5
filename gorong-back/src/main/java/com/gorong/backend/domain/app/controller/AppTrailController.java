package com.gorong.backend.domain.app.controller;

import com.gorong.backend.domain.app.dto.TrailSaveRequestDto;
import com.gorong.backend.domain.app.service.AppTrailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/app/trails")
@RequiredArgsConstructor
public class AppTrailController {

    private final AppTrailService appTrailService;

    @PostMapping
    public ResponseEntity<String> saveTrail(
            @RequestBody TrailSaveRequestDto requestDto,
            Authentication authentication
    ) {
        try {
            return ResponseEntity.ok(appTrailService.saveTrail(authentication, requestDto));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("트레일 저장 실패");
        }
    }
}
