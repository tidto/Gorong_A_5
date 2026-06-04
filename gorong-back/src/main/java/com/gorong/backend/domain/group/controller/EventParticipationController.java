package com.gorong.backend.domain.group.controller;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.group.dto.EventParticipationResponseDto;
import com.gorong.backend.domain.group.dto.SoloParticipationRequestDto;
import com.gorong.backend.domain.group.service.EventParticipationService;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/event-participation")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequiredArgsConstructor
public class EventParticipationController {

    private final EventParticipationService participationService;
    private final UserRepository userRepository;

    // ── Firebase 토큰 → User 엔티티 헬퍼 ─────────────────────────────
    private User getCurrentUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof FirebaseToken)) return null;
        FirebaseToken token = (FirebaseToken) auth.getPrincipal();
        return userRepository.findByFirebaseUid(token.getUid()).orElse(null);
    }

    /**
     * POST /api/event-participation/solo
     * 혼자 참여 신청
     * Body: { eventContentId: "12345", eventTitle: "행사명" }
     */
    @PostMapping("/solo")
    public ResponseEntity<EventParticipationResponseDto> applySolo(
            @RequestBody SoloParticipationRequestDto requestDto,
            Authentication authentication
    ) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();

        EventParticipationResponseDto result = participationService.applySolo(
                user.getId(),
                requestDto.getEventContentId(),
                requestDto.getEventTitle(),
                requestDto.getVisitDate()
        );
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/event-participation/group/{groupId}
     * 그룹 참여 시 이력 기록 (GroupController의 join 이후 프론트에서 함께 호출)
     * Body: { eventContentId: "12345", eventTitle: "행사명" }
     */
    @PostMapping("/group/{groupId}")
    public ResponseEntity<EventParticipationResponseDto> applyGroup(
            @PathVariable Long groupId,
            @RequestBody SoloParticipationRequestDto requestDto,
            Authentication authentication
    ) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();

        EventParticipationResponseDto result = participationService.applyGroup(
                user.getId(),
                requestDto.getEventContentId(),
                requestDto.getEventTitle(),
                groupId
        );
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/event-participation/me
     * 내 참여 이력 전체 조회
     */
    @GetMapping("/me")
    public ResponseEntity<List<EventParticipationResponseDto>> getMyParticipations(
            Authentication authentication
    ) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(participationService.getMyParticipations(user.getId()));
    }

    /**
     * DELETE /api/event-participation/solo?eventContentId=12345
     * 혼자 참여 취소
     */
    @DeleteMapping("/solo")
    public ResponseEntity<Void> cancelSolo(
            @RequestParam String eventContentId,
            Authentication authentication
    ) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();
        participationService.cancelSolo(user.getId(), eventContentId);
        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/event-participation/group/{groupId}?eventContentId=12345
     * 그룹 참여 이력 취소 (GroupController leaveGroup 과 함께 호출)
     */
    @DeleteMapping("/group/{groupId}")
    public ResponseEntity<Void> cancelGroup(
            @PathVariable Long groupId,
            @RequestParam String eventContentId,
            Authentication authentication
    ) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();
        participationService.cancelGroup(user.getId(), eventContentId, groupId);
        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/event-participation/solo/check?eventContentId=12345
     * 특정 행사에 혼자 참여 신청했는지 확인 (버튼 상태 표시용)
     */
    @GetMapping("/solo/check")
    public ResponseEntity<Map<String, Boolean>> checkSoloApplied(
            @RequestParam String eventContentId,
            Authentication authentication
    ) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.ok(Map.of("applied", false));

        boolean applied = participationService.isSoloApplied(user.getId(), eventContentId);
        return ResponseEntity.ok(Map.of("applied", applied));
    }
}