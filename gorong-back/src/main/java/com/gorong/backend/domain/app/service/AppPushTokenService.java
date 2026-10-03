package com.gorong.backend.domain.app.service;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.app.entity.AppPushToken;
import com.gorong.backend.domain.app.repository.AppPushTokenRepository;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AppPushTokenService {
    private final AppPushTokenRepository tokenRepository;
    private final UserRepository userRepository;

    @Transactional
    public void register(Authentication authentication, String token, String platform) {
        User user = resolveUser(authentication);
        if (!"ANDROID".equalsIgnoreCase(platform)) {
            throw new IllegalArgumentException("현재 Android 푸시 알림만 지원합니다.");
        }

        AppPushToken pushToken = tokenRepository.findByToken(token).orElseGet(AppPushToken::new);
        pushToken.setUserId(user.getId());
        pushToken.setToken(token);
        pushToken.setPlatform("ANDROID");
        tokenRepository.save(pushToken);
    }

    @Transactional
    public void unregister(Authentication authentication, String token) {
        User user = resolveUser(authentication);
        tokenRepository.findByTokenAndUserId(token, user.getId()).ifPresent(tokenRepository::delete);
    }

    private User resolveUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof FirebaseToken firebaseToken)) {
            throw new IllegalStateException("인증이 필요합니다.");
        }
        return userRepository.findByFirebaseUid(firebaseToken.getUid())
                .orElseThrow(() -> new IllegalStateException("가입된 사용자를 찾을 수 없습니다."));
    }
}
