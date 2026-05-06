package com.gorong.backend.domain.user.controller;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.user.dto.SignUpRequestDto;
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

        if (!decodedToken.getUid().equals(requestDto.getFirebaseUid())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("인증된 토큰 정보와 요청한 UID가 일치하지 않습니다.");
        }

        userService.signUpUser(requestDto);
        return ResponseEntity.ok("고롱(Gorong)의 세계에 오신 것을 환영합니다!");
    }
}