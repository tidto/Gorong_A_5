package com.gorong.backend.domain.user.controller;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.user.dto.MyPageResponseDto;
import com.gorong.backend.domain.user.dto.SignUpRequestDto;
import com.gorong.backend.domain.user.dto.UserProfileUpdateRequestDto;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserProfileRepository userProfileRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(Authentication authentication) {
        FirebaseToken decodedToken = (FirebaseToken) authentication.getPrincipal();
        String uid = decodedToken.getUid();

        Optional<User> userOpt = userService.findByUid(uid);

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            String nickname = userProfileRepository.findByUserId(user.getId())
                    .map(UserProfile::getNickname)
                    .orElse("");

            // 프론트가 기대하는 { isRegistered: true, user: { nickname, email } } 구조
            return ResponseEntity.ok(Map.of(
                    "isRegistered", true,
                    "user", Map.of(
                            "nickname", nickname,
                            "email", user.getEmail()
                    )
            ));
        } else {
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
}