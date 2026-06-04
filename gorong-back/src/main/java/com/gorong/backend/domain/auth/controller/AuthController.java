package com.gorong.backend.domain.auth.controller;

import com.gorong.backend.domain.auth.dto.GithubLoginRequestDto;
import com.gorong.backend.domain.auth.dto.GithubLoginResponseDto;
import com.gorong.backend.domain.auth.service.GithubAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final GithubAuthService githubAuthService;

    @PostMapping("/github/login")
    public ResponseEntity<GithubLoginResponseDto> githubLogin(@RequestBody GithubLoginRequestDto requestDto) {
        return ResponseEntity.ok(githubAuthService.login(
                requestDto.getCode(),
                requestDto.getRedirectUri(),
                requestDto.getCodeVerifier()
        ));
    }
}
