package com.gorong.backend.domain.admin.controller;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.admin.dto.*;
import com.gorong.backend.domain.admin.entity.Report;
import com.gorong.backend.domain.admin.entity.UserBan;
import com.gorong.backend.domain.admin.service.AdminService;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;

    @PostMapping("/users/{userId}/ban")
    public ResponseEntity<BanSummaryDto> banUser(
            @PathVariable Long userId,
            @Valid @RequestBody BanUserRequestDto requestDto
    ) {
        BanSummaryDto response = adminService.banUser(
                userId,
                requestDto.getReportId(),
                requestDto.getBanReason(),
                requestDto.getBanDays()
        );
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/bans/{banId}")
    public ResponseEntity<String> unbanUser(
            @PathVariable Long banId,
            @RequestParam(required = false) String reviewNote
    ) {
        adminService.unbanUser(banId, reviewNote);
        return ResponseEntity.ok("밴 해제가 완료되었습니다.");
    }

    @PatchMapping("/bans/{banId}/appeals/reviewing")
    public ResponseEntity<BanSummaryDto> markAppealReviewing(@PathVariable Long banId) {
        return ResponseEntity.ok(adminService.markAppealReviewing(banId));
    }

    @GetMapping("/bans")
    public ResponseEntity<Page<BanSummaryDto>> getBanList(
            @RequestParam(required = false) UserBan.BanStatus banStatus,
            @RequestParam(required = false) UserBan.AppealStatus appealStatus,
            @PageableDefault(sort = "bannedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(adminService.getBanList(banStatus, appealStatus, pageable));
    }

    @GetMapping("/reports")
    public ResponseEntity<Page<ReportSummaryDto>> getReports(
            @RequestParam(required = false) Report.ReportStatus status,
            @RequestParam(required = false) Long reporterId,
            @RequestParam(required = false) Long reportedUserId,
            @RequestParam(required = false) OffsetDateTime from,
            @RequestParam(required = false) OffsetDateTime to,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(adminService.getReports(status, reporterId, reportedUserId, from, to, pageable));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getAdminMe(Authentication authentication) {
        FirebaseToken token = (FirebaseToken) authentication.getPrincipal();
        User user = userRepository.findByFirebaseUid(token.getUid())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        return ResponseEntity.ok(Map.of(
                "userId", user.getId(),
                "email", user.getEmail(),
                "roleType", user.getRoleType().name()
        ));
    }
}
