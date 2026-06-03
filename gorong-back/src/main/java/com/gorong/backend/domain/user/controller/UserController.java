package com.gorong.backend.domain.user.controller;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.admin.dto.AppealRequestDto;
import com.gorong.backend.domain.admin.dto.BanSummaryDto;
import com.gorong.backend.domain.admin.entity.UserBan;
import com.gorong.backend.domain.admin.service.AdminService;
import com.gorong.backend.domain.user.dto.MyPageResponseDto;
import com.gorong.backend.domain.user.dto.SignUpRequestDto;
import com.gorong.backend.domain.user.dto.UserProfileUpdateRequestDto;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.HashMap;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserProfileRepository userProfileRepository;
    private final AdminService adminService;

    @PostMapping("/login")
    public ResponseEntity<?> login(Authentication authentication) {
        FirebaseToken decodedToken = (FirebaseToken) authentication.getPrincipal();
        String uid = decodedToken.getUid();

        Optional<User> userOpt = userService.findByUid(uid);
        UserBan latestBan = adminService.getLatestBanByFirebaseUid(uid);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            String nickname = userProfileRepository.findByUserId(user.getId())
                    .map(UserProfile::getNickname)
                    .orElse("");

            if (user.getAccountStatus() == User.AccountStatus.INACTIVE) {
                Map<String, Object> banInfo = new HashMap<>();
                if (latestBan != null) {
                    banInfo.put("banId", latestBan.getBanId());
                    banInfo.put("banDays", latestBan.getBanDays());
                    banInfo.put("banStatus", latestBan.getBanStatus().name());
                    banInfo.put("appealStatus", latestBan.getAppealStatus().name());
                    banInfo.put("banReason", latestBan.getBanReason());
                }

                return ResponseEntity.ok(Map.of(
                        "isRegistered", true,
                        "accessRestricted", true,
                        "accountStatus", user.getAccountStatus().name(),
                        "message", buildRestrictionMessage(latestBan),
                        "ban", banInfo,
                        "user", Map.of(
                                "nickname", nickname,
                                "email", user.getEmail(),
                                "roleType", user.getRoleType().name(),
                                "accountStatus", user.getAccountStatus().name()
                        )
                ));
            }

            // 프론트가 기대하는 { isRegistered: true, user: { nickname, email } } 구조
            return ResponseEntity.ok(Map.of(
                    "isRegistered", true,
                    "user", Map.of(
                            "nickname", nickname,
                            "email", user.getEmail(),
                            "roleType", user.getRoleType().name(),
                            "accountStatus", user.getAccountStatus().name()
                    )
            ));
        } else {
            if (latestBan != null) {
                Map<String, Object> banInfo = new HashMap<>();
                banInfo.put("banId", latestBan.getBanId());
                banInfo.put("banDays", latestBan.getBanDays());
                banInfo.put("banStatus", latestBan.getBanStatus().name());
                banInfo.put("appealStatus", latestBan.getAppealStatus().name());
                banInfo.put("banReason", latestBan.getBanReason());

                return ResponseEntity.ok(Map.of(
                        "isRegistered", false,
                        "accessRestricted", true,
                        "accountStatus", "INACTIVE",
                        "message", buildRestrictionMessage(latestBan),
                        "ban", banInfo
                ));
            }

            // 신규 유저: isRegistered: false 반환 (404 아닌 200으로 통일 - 에러가 아니므로)
            return ResponseEntity.ok(Map.of("isRegistered", false));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<String> signUp(
            @Valid @RequestBody SignUpRequestDto requestDto,
            Authentication authentication) {

        FirebaseToken decodedToken = (FirebaseToken) authentication.getPrincipal();

        // 클라이언트 UID 대신 토큰 UID를 직접 사용 (더 안전)
        userService.signUpUser(requestDto, decodedToken.getUid());
        return ResponseEntity.ok("고롱 Go Road ING! 환영합니다. 당신의 발걸음이 문화/행사에 큰 힘이 됩니다.");
    }

    // ... 기존 login, signup 유지 ...

    @GetMapping("/me")
    public ResponseEntity<MyPageResponseDto> getMyPage(Authentication authentication) {
        FirebaseToken decodedToken = (FirebaseToken) authentication.getPrincipal();
        MyPageResponseDto responseDto = userService.getMyPageInfo(decodedToken.getUid());
        return ResponseEntity.ok(responseDto);
    }


    @PutMapping("/me/profile")
    public ResponseEntity<String> updateMyPage(
            @RequestBody UserProfileUpdateRequestDto requestDto,
            Authentication authentication) {
        FirebaseToken decodedToken = (FirebaseToken) authentication.getPrincipal();
        userService.updateMyPageInfo(decodedToken.getUid(), requestDto);
        return ResponseEntity.ok("프로필 정보가 성공적으로 업데이트되었습니다.");
    }

    @GetMapping("/me/ban")
    public ResponseEntity<?> getMyBanStatus(Authentication authentication) {
        FirebaseToken decodedToken = (FirebaseToken) authentication.getPrincipal();
        User user = userService.findByUid(decodedToken.getUid())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        BanSummaryDto activeBan = adminService.getActiveBanByUserId(user.getId());
        if (activeBan == null) {
            return ResponseEntity.ok(Map.of("banned", false));
        }
        return ResponseEntity.ok(Map.of("banned", true, "ban", activeBan));
    }

    @PostMapping("/me/appeal")
    public ResponseEntity<BanSummaryDto> submitAppeal(
            @Valid @RequestBody AppealRequestDto requestDto,
            Authentication authentication
    ) {
        FirebaseToken decodedToken = (FirebaseToken) authentication.getPrincipal();
        User user = userService.findByUid(decodedToken.getUid())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        return ResponseEntity.ok(adminService.submitAppeal(user.getId(), requestDto.getAppealText()));
    }

    private String buildRestrictionMessage(UserBan latestBan) {
        if (latestBan == null) {
            return "계정 이용이 제한되었습니다.";
        }
        if (latestBan.getBanDays() != null && latestBan.getBanDays() == 0) {
            return "영구정지된 계정입니다.";
        }
        if (latestBan.getBanStatus() == UserBan.BanStatus.EXPIRED) {
            return "비활성화된 계정입니다.";
        }
        return "계정 이용이 제한되었습니다.";
    }
}
