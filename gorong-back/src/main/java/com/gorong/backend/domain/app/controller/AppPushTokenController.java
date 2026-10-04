package com.gorong.backend.domain.app.controller;

import com.gorong.backend.domain.app.dto.AppPushTokenRequest;
import com.gorong.backend.domain.app.service.AppPushTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/app/push-tokens")
@RequiredArgsConstructor
public class AppPushTokenController {
    private final AppPushTokenService pushTokenService;

    @PutMapping
    public ResponseEntity<Void> register(
            @Valid @RequestBody AppPushTokenRequest request,
            Authentication authentication
    ) {
        pushTokenService.register(authentication, request.getToken(), request.getPlatform());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> unregister(
            @Valid @RequestBody AppPushTokenRequest request,
            Authentication authentication
    ) {
        pushTokenService.unregister(authentication, request.getToken());
        return ResponseEntity.noContent().build();
    }
}
