package com.gorong.backend.domain.user.service;

import com.gorong.backend.domain.interest.entity.Interests;
import com.gorong.backend.domain.interest.entity.UserInterests;
import com.gorong.backend.domain.interest.repository.InterestsRepository;
import com.gorong.backend.domain.interest.repository.UserInterestsRepository;
import com.gorong.backend.domain.user.dto.SignUpRequestDto;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final InterestsRepository interestsRepository;
    private final UserInterestsRepository userInterestsRepository;

    @Transactional(readOnly = true)
    public boolean checkUserExistsByUid(String firebaseUid) {
        return userRepository.existsByFirebaseUid(firebaseUid);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByUid(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid);
    }

    @Transactional
    public void signUpUser(SignUpRequestDto requestDto) {

        if (userRepository.existsByFirebaseUid(requestDto.getFirebaseUid())) {
            throw new IllegalArgumentException("이미 가입된 계정입니다.");
        }

        Point baseLocation = null;
        if (requestDto.getLatitude() != null && requestDto.getLongitude() != null) {
            GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
            baseLocation = geometryFactory.createPoint(
                    new Coordinate(requestDto.getLongitude(), requestDto.getLatitude())
            );
        }

        // 1. barrierFreeType 파싱 (없으면 NONE)
        User.BarrierFreeType barrierFreeType = User.BarrierFreeType.NONE;
        if (requestDto.getBarrierFreeType() != null) {
            try {
                barrierFreeType = User.BarrierFreeType.valueOf(requestDto.getBarrierFreeType());
            } catch (IllegalArgumentException ignored) {}
        }

        // 2. users 테이블 저장
        User newUser = User.builder()
                .firebaseUid(requestDto.getFirebaseUid())
                .email(requestDto.getEmail())
                .roleType(User.RoleType.USER)
                .barrierFreeType(barrierFreeType)
                .isForeigner(requestDto.getIsForeigner() != null ? requestDto.getIsForeigner() : false)
                .build();
        User savedUser = userRepository.save(newUser);

        // 3. user_profiles 테이블 저장
        UserProfile newProfile = UserProfile.builder()
                .user(savedUser)
                .nickname(requestDto.getNickname())
                .baseAddress(requestDto.getBaseAddress())
                .baseLocation(baseLocation)
                .gorongHz(requestDto.getGorongHz())
                .build();
        userProfileRepository.save(newProfile);

        // 4. user_interests 저장
        if (requestDto.getInterestIds() != null && !requestDto.getInterestIds().isEmpty()) {
            List<Interests> interests = interestsRepository.findAllByIdIn(requestDto.getInterestIds());
            List<UserInterests> userInterests = interests.stream()
                    .map(interest -> UserInterests.builder()
                            .user(savedUser)
                            .interest(interest)
                            .build())
                    .toList();
            userInterestsRepository.saveAll(userInterests);
        }
    }

    @Transactional
    public void updateGorongHz(Long userId, String gorongHz) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("프로필을 찾을 수 없습니다."));
        profile.updateGorongHz(gorongHz);
    }


}