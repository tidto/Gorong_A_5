package com.gorong.backend.domain.user.service;

import com.gorong.backend.domain.user.dto.SignUpRequestDto;
// import User, UserProfile 엔티티 및 Repository (미리 생성해두셨다고 가정)
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    // @Transactional 은 오라클의 BEGIN ... COMMIT/ROLLBACK 블록과 같습니다.
    // 도중에 에러가 나면 전부 롤백됩니다.
    @Transactional
    public void signUpUser(SignUpRequestDto requestDto) {

        // 1. 이미 가입된 유저인지 검증 (오라클의 UNIQUE 제약조건 위반 전 사전 방어)
        if (userRepository.existsByFirebaseUid(requestDto.getFirebaseUid())) {
            throw new IllegalArgumentException("이미 가입된 계정입니다.");
        }

        // 2. users 테이블에 핵심 계정 정보 INSERT
        User newUser = User.builder()
                .firebaseUid(requestDto.getFirebaseUid())
                .email(requestDto.getEmail())
                .roleType("USER")
                .isBarrierFree(false) // 기본값은 false, 나중에 Codef API로 인증
                .build();
        User savedUser = userRepository.save(newUser);

        // 3. user_profiles (캣타워) 테이블에 초기 정보 INSERT
        UserProfile newProfile = UserProfile.builder()
                .user(savedUser) // 외래키(FK) 연결
                .nickname(requestDto.getNickname())
                .gorongHz(requestDto.getGorongHz())
                .totalWalkDistance(BigDecimal.ZERO)
                .build();
        userProfileRepository.save(newProfile);
    }
}