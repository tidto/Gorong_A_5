package com.gorong.backend.domain.minihome.service;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.minihome.exception.MiniHomeUnauthorizedException;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * 미니홈 /me API 전용 — Firebase 토큰에서 DB userId를 조회합니다.
 * (user 도메인 서비스/로그인 로직은 변경하지 않습니다.)
 */
@Service
@RequiredArgsConstructor
public class MiniHomeUserResolver {

    private final UserRepository userRepository;

    public Long resolveUserId(Authentication authentication) {
        FirebaseToken token = requireFirebaseToken(authentication);
        return userRepository.findByFirebaseUid(token.getUid())
                .map(u -> u.getId())
                .orElseThrow(() -> new MiniHomeUnauthorizedException(
                        "등록된 사용자가 없습니다. 회원가입을 완료한 뒤 다시 시도해 주세요."
                ));
    }

    /** 비로그인·토큰 없음 → null (방문자 조회용) */
    public Long resolveUserIdOptional(Authentication authentication) {
        if (authentication == null) return null;
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof FirebaseToken firebaseToken)) return null;
        return userRepository.findByFirebaseUid(firebaseToken.getUid()).map(u -> u.getId()).orElse(null);
    }

    /** FirebaseTokenFilter는 principal만 설정할 수 있어 isAuthenticated 검사는 생략합니다. */
    private static FirebaseToken requireFirebaseToken(Authentication authentication) {
        if (authentication == null) {
            throw new MiniHomeUnauthorizedException(
                    "Firebase 인증이 필요합니다. Authorization Bearer 토큰을 확인해 주세요."
            );
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof FirebaseToken firebaseToken) {
            return firebaseToken;
        }
        throw new MiniHomeUnauthorizedException("Firebase 토큰 인증이 아닙니다.");
    }
}
