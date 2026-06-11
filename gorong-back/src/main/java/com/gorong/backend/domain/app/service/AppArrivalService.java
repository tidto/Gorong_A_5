package com.gorong.backend.domain.app.service;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.app.entity.VenueArrivalRecord;
import com.gorong.backend.domain.app.repository.VenueArrivalRecordRepository;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppArrivalService {

    // 소비자 GPS 오차와 서버 계산 차이를 흡수하기 위한 허용치
    private static final double GEOLOCATION_TOLERANCE_METERS = 100.0;

    private final JdbcTemplate jdbcTemplate;
    private final AppVenueService appVenueService;
    private final VenueArrivalRecordRepository venueArrivalRecordRepository;
    private final UserRepository userRepository;

    // PostGIS ST_Distance로 거리 검증 (Fake GPS 방어)
    public boolean verifyArrival(String venueId, double lat, double lng, Authentication authentication) {
        String normalizedVenueId = venueId == null ? null : venueId.trim();
        User user = resolveCurrentUser(authentication);
        String userEmail = user != null ? user.getEmail() : "unknown";
        String sql = """
            SELECT ST_Distance(
                ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
            ) as distance
            """;

        try {
            var venueGeo = appVenueService.resolveVenueGeo(normalizedVenueId).orElse(null);
            if (venueGeo == null) {
                log.warn("도착 인증 실패 - venue 좌표를 찾지 못함: venueId={}, user={}", normalizedVenueId, userEmail);
                return false;
            }

            Double distance = jdbcTemplate.queryForObject(
                    sql,
                    Double.class,
                    lng,
                    lat,
                    venueGeo.lng(),
                    venueGeo.lat()
            );

            if (distance == null) {
                return false;
            }

            double effectiveRadius = venueGeo.radius() + GEOLOCATION_TOLERANCE_METERS;
            boolean verified = distance <= effectiveRadius;
            log.info("도착 인증 요청 - venueId: {}, lat: {}, lng: {}, user: {}",
                    normalizedVenueId, lat, lng, userEmail);
            log.info("도착 인증 거리 계산 - venueId={}, user={}, distance={}m, radius={}m, tolerance={}m, effectiveRadius={}m, verified={}",
                    normalizedVenueId, userEmail, Math.round(distance), venueGeo.radius(), GEOLOCATION_TOLERANCE_METERS, Math.round(effectiveRadius), verified);
            if (verified && user != null) {
                boolean alreadyRecorded = venueArrivalRecordRepository
                        .existsByUserIdAndVenueId(user.getId(), normalizedVenueId);
                if (!alreadyRecorded) {
                    venueArrivalRecordRepository.save(VenueArrivalRecord.builder()
                            .userId(user.getId())
                            .venueId(normalizedVenueId)
                            .build());
                    log.info("[ArrivalRecord] 도착 기록 저장 완료 - userId={}, venueId={}", user.getId(), normalizedVenueId);
                }
            }
            return verified;
        } catch (Exception e) {
            log.error("도착 인증 실패 - venueId={}, user={}, message={}", normalizedVenueId, userEmail, e.getMessage(), e);
            return false;
        }
    }

    public boolean hasVerifiedArrival(Authentication authentication, String venueId) {
        User user = resolveCurrentUser(authentication);
        String normalizedVenueId = venueId == null ? null : venueId.trim();
        if (user == null || normalizedVenueId == null || normalizedVenueId.isBlank()) {
            return false;
        }
        return venueArrivalRecordRepository.existsByUserIdAndVenueId(user.getId(), normalizedVenueId);
    }

    public List<String> getMyVerifiedVenueIds(Authentication authentication) {
        User user = resolveCurrentUser(authentication);
        if (user == null) return List.of();
        return venueArrivalRecordRepository.findByUserId(user.getId())
                .stream()
                .map(VenueArrivalRecord::getVenueId)
                .toList();
    }

    private User resolveCurrentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof FirebaseToken token)) {
            return null;
        }
        return userRepository.findByFirebaseUid(token.getUid()).orElse(null);
    }
}
