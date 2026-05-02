package com.gorong.backend.domain.user.service;

import com.gorong.backend.domain.user.dto.SignUpRequestDto;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    // 💡 [추가] UserController의 /login API에서 회원이 존재하는지 판별할 때 사용하는 메서드!
    @Transactional(readOnly = true) // 읽기 전용이므로 성능이 더 빠릅니다.
    public boolean checkUserExistsByUid(String firebaseUid) {
        return userRepository.existsByFirebaseUid(firebaseUid);
    }
    @Transactional(readOnly = true)
    public Optional<User> findByUid(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid);
    }

    @Transactional
    public void signUpUser(SignUpRequestDto requestDto) {

        // 1. 이미 가입된 유저인지 검증
        if (userRepository.existsByFirebaseUid(requestDto.getFirebaseUid())) {
            throw new IllegalArgumentException("이미 가입된 계정입니다.");
        }

        // 2. users 테이블에 핵심 계정 정보 INSERT
        User newUser = User.builder()
                .firebaseUid(requestDto.getFirebaseUid())
                .email(requestDto.getEmail())
                // 💡 [수정] RoleType은 기본값이 설정되어 있지 않으므로 반드시 명시해주어야 에러가 나지 않습니다!
                .nickname(requestDto.getNickname())
                .roleType(User.RoleType.USER)
                .build();
        User savedUser = userRepository.save(newUser);

        // 3. user_profiles 테이블에 초기 정보 INSERT
        UserProfile newProfile = UserProfile.builder()
                .user(savedUser) // 외래키(FK) 연결
                .nickname(requestDto.getNickname())
                // .gorongHz(requestDto.getGorongHz()) 온보딩 페이지에서 작성 후 insert
                .build();
        userProfileRepository.save(newProfile);
    }

    // 온보딩 완료 후 고롱 주파수를 업데이트하는 메서드
    @Transactional
    public void updateGorongHz(Long userId, String gorongHz) {
        // 1. 빈칸을 채울 유저의 프로필을 DB에서 찾아옵니다.
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("프로필을 찾을 수 없습니다."));

        // 2. 프로필 객체의 빈칸에 주파수를 채워 넣습니다.
        profile.updateGorongHz(gorongHz);

        // 💡 JPA 더티 체킹: 트랜잭션이 끝날 때 알아서 UPDATE 쿼리가 날아갑니다. 완벽합니다!
    }
}