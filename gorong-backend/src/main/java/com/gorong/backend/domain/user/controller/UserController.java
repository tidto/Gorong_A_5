package com.gorong.backend.domain.user.controller;

import com.gorong.backend.domain.user.dto.SignUpRequestDto;
import com.gorong.backend.domain.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * 최초 회원가입 API (소셜 로그인, 이메일/비밀번호 모두 이 API를 거침)
     * SecurityConfig에서 이 주소는 로그인 없이 접근 가능하도록 열어두어야 합니다!
     */
    @PostMapping("/signup")
    public ResponseEntity<String> signUp(@Valid @RequestBody SignUpRequestDto requestDto) {
        userService.signUpUser(requestDto);
        return ResponseEntity.ok("고롱(Gorong)의 세계에 오신 것을 환영합니다! 냥BTI 등록 완료.");
    }
}