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

    /**
     * 트레일 기록 삭제에 따른 러닝아트(TRAIL_ART) 갤러리 이미지 연동 삭제.
     *
     * 삭제되어 있거나 존재하지 않는 URL 도 204 를 반환하는 멱등 동작입니다.
     * 광범위한 예외 포착은 의도적으로 추가하지 않아 오류 상태를 그대로 전파합니다.
     */
    @DeleteMapping("/trail-art")
    public ResponseEntity<Void> deleteTrailArt(@RequestParam String imageUrl, Authentication authentication) {
        appTrailService.deleteTrailArt(authentication, imageUrl);
        return ResponseEntity.noContent().build();
    }
}
