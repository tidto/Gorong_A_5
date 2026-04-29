package com.gorong.backend.domain.user.service;

import com.gorong.backend.domain.user.dto.SignUpRequestDto;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

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
                // 💡 역할(Role), 베리어프리, 외국인 여부는 엔티티에서 설정한 기본값이 자동으로 들어갑니다!
                // 굳이 적는다면 .roleType(User.RoleType.USER) 이렇게 적어야 합니다.
                .build();
        User savedUser = userRepository.save(newUser);

        // 3. user_profiles 테이블에 초기 정보 INSERT
        UserProfile newProfile = UserProfile.builder()
                .user(savedUser) // 외래키(FK) 연결
                .nickname(requestDto.getNickname())
                // .gorongHz(requestDto.getGorongHz()) 온보딩 페이지에서 작성 후 insert
                // 💡 온도(38.5)와 걸음수(0)도 엔티티의 생성자가 알아서 넣어주므로 생략!
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

        // 💡 주의: 여기서 save()를 또 부를 필요가 없습니다! (JPA 더티 체킹)
    }
}