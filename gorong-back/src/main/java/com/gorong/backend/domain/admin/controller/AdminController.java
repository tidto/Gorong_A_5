package com.gorong.backend.domain.admin.controller;

import com.gorong.backend.domain.admin.entity.UserBan;
import com.gorong.backend.domain.admin.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")  // 클래스 전체에 적용
public class AdminController {

    private final AdminService adminService;

    // ==========================================
    // 유저 밴 처리
    // ==========================================
    @DeleteMapping("/users/{userId}/ban")
    public ResponseEntity<String> banUser(
            @PathVariable Long userId,
            @RequestParam(required = false) Long reportId,
            @RequestParam(defaultValue = "관리자에 의한 밴 처리") String banReason) {
        adminService.banUser(userId, reportId, banReason);
        return ResponseEntity.ok("유저가 밴 처리됐습니다. 7일 후 기록이 삭제됩니다.");
    }

    // ==========================================
    // 밴 목록 조회
    // ==========================================
    @GetMapping("/bans")
    public ResponseEntity<List<UserBan>> getBanList() {
        return ResponseEntity.ok(adminService.getBanList());
    }
}