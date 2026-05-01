package com.gorong.backend.domain.user.controller;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.user.dto.SignUpRequestDto;
import com.gorong.backend.domain.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> login(Authentication authentication) {
        FirebaseToken decodedToken = (FirebaseToken) authentication.getPrincipal();
        String uid = decodedToken.getUid();

        // 💡 UserService에 존재하는지 확인하는 로직 필요
        boolean exists = userService.checkUserExistsByUid(uid);

        if (exists) {
            return ResponseEntity.ok().build(); // 200 OK
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build(); // 404 Not Found
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<String> signUp(
            @Valid @RequestBody SignUpRequestDto requestDto,
            Authentication authentication) {

        FirebaseToken decodedToken = (FirebaseToken) authentication.getPrincipal();

        // 🛡️ [보안 철벽 방어] 프론트가 DTO에 담아 보낸 UID와, 진짜 인증 토큰의 UID가 같은지 확인!
        if (!decodedToken.getUid().equals(requestDto.getFirebaseUid())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("인증된 토큰 정보와 요청한 UID가 일치하지 않습니다.");
        }

        // 검증이 끝났으니 안심하고 서비스로 DTO를 넘깁니다.
        userService.signUpUser(requestDto);
        return ResponseEntity.ok("고롱(Gorong)의 세계에 오신 것을 환영합니다! 냥BTI 등록 완료.");
    }
}