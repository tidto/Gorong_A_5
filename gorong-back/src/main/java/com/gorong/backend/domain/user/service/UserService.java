package com.gorong.backend.domain.user.service;

import com.gorong.backend.domain.interest.entity.Interests;
import com.gorong.backend.domain.interest.entity.UserInterests;
import com.gorong.backend.domain.interest.repository.InterestsRepository;
import com.gorong.backend.domain.interest.repository.UserInterestsRepository;
import com.gorong.backend.domain.admin.repository.UserBanRepository;
import com.gorong.backend.domain.user.dto.MyPageResponseDto;
import com.gorong.backend.domain.user.dto.SignUpRequestDto;
import com.gorong.backend.domain.user.dto.UserProfileUpdateRequestDto;
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
    private final UserBanRepository userBanRepository;

    // ✅ GeometryFactory를 빈으로 재사용 (SRID 4326 = WGS84)
    private static final GeometryFactory GEO_FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

    @Transactional(readOnly = true)
    public boolean checkUserExistsByUid(String firebaseUid) {
        return userRepository.existsByFirebaseUid(firebaseUid);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByUid(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid);
    }

    /**
     * ✅ lat/lng가 null이거나 0이면 null을 반환 (0,0은 좌표 변환 실패를 의미)
     */
    private Point buildPoint(Double lat, Double lng) {
        if (lat == null || lng == null) return null;
        if (lat == 0.0 && lng == 0.0) return null; // 좌표 변환 실패 fallback
        Point point = GEO_FACTORY.createPoint(new Coordinate(lng, lat)); // x=lng, y=lat
        point.setSRID(4326);
        return point;
    }

    @Transactional
    public void signUpUser(SignUpRequestDto requestDto, String firebaseUid) {

        if (userRepository.existsByFirebaseUid(firebaseUid)) {
            throw new IllegalArgumentException("이미 가입된 계정입니다.");
        }
        if (requestDto.getEmail() != null && userRepository.findByEmail(requestDto.getEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }
        if (requestDto.getEmail() != null && userBanRepository.existsByFirebaseUidOrEmail(firebaseUid, requestDto.getEmail())) {
            throw new IllegalArgumentException("이 계정은 이용이 제한되어 재가입할 수 없습니다.");
        }

        // ✅ 수정: 0,0 좌표(변환 실패)는 null로 처리
        Point baseLocation = buildPoint(requestDto.getLatitude(), requestDto.getLongitude());

        // 1. barrierFreeType 파싱 (없으면 NONE)
        User.BarrierFreeType barrierFreeType = User.BarrierFreeType.NONE;
        if (requestDto.getBarrierFreeType() != null) {
            try {
                barrierFreeType = User.BarrierFreeType.valueOf(requestDto.getBarrierFreeType());
            } catch (IllegalArgumentException ignored) {}
        }

        // 2. users 테이블 저장
        User newUser = User.builder()
                .firebaseUid(firebaseUid)
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

    // 마이페이지 데이터 조회
    @Transactional(readOnly = true)
    public MyPageResponseDto getMyPageInfo(String firebaseUid) {
        User user = userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        UserProfile profile = userProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("프로필을 찾을 수 없습니다."));

        List<String> interestCodes = userInterestsRepository.findByUserId(user.getId())
                .stream()
                .map(ui -> ui.getInterest().getTourCategoryCode())
                .toList();

        return MyPageResponseDto.builder()
                .nickname(profile.getNickname())
                .email(user.getEmail())
                .baseAddress(profile.getBaseAddress())
                .purrTemperature(profile.getPurrTemperature())
                .gorongHz(profile.getGorongHz())
                .barrierFreeType(user.getBarrierFreeType().name())
                .isForeigner(user.getIsForeigner())
                .interestCodes(interestCodes)
                .build();
    }

    // 마이페이지 데이터 수정
    @Transactional
    public void updateMyPageInfo(String firebaseUid, UserProfileUpdateRequestDto request) {
        User user = userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        UserProfile profile = userProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("프로필을 찾을 수 없습니다."));

        User.BarrierFreeType barrierType = null;
        if (request.getBarrierFreeType() != null) {
            try { barrierType = User.BarrierFreeType.valueOf(request.getBarrierFreeType()); }
            catch (IllegalArgumentException ignored) {}
        }
        user.updateProfile(barrierType, request.getIsForeigner());

        //  0,0 좌표(변환 실패)는 null로 처리
        Point newLocation = buildPoint(request.getLatitude(), request.getLongitude());
        profile.updateProfile(request.getNickname(), request.getBaseAddress(), newLocation);

        userInterestsRepository.deleteByUserId(user.getId());
        if (request.getInterestCodes() != null && !request.getInterestCodes().isEmpty()) {
            List<Interests> newInterests = interestsRepository.findByTourCategoryCodeIn(request.getInterestCodes());
            userInterestsRepository.saveAll(newInterests.stream()
                    .map(i -> UserInterests.builder().user(user).interest(i).build())
                    .toList());
        }
    }
}
