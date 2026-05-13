package com.gorong.backend.domain.event.controller;

import com.gorong.backend.domain.event.entity.Event;
import com.gorong.backend.domain.event.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class MapController {
    private final EventService eventService;

    @GetMapping("/map")
    public ResponseEntity<List<Event>> getMapData() {
        // 💡 SecurityContext에서 FirebaseTokenFilter가 저장한 유저 정보 추출
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // 기본 관심사 (인증 실패나 정보 부재 시 대비)
        List<String> userInterests = List.of("VE", "FD");

        // 인증된 유저라면 실제 DB에 저장된 관심사로 교체 로직 (예시)
        /*
        if (auth != null && auth.isAuthenticated()) {
            User user = (User) auth.getPrincipal();
            userInterests = user.getInterests();
        }
        */

        List<Event> recommendations = eventService.getRecommendedEvents(userInterests);
        return ResponseEntity.ok(recommendations);
    }
}