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

@Slf4j
@Service
@RequiredArgsConstructor
public class AppArrivalService {

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
            var venueGeo = appVenueService.findCachedVenueGeo(normalizedVenueId).orElse(null);
            if (venueGeo == null) {
                log.warn("도착 인증 실패 - venue 캐시 없음: venueId={}, user={}", normalizedVenueId, userEmail);
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

            boolean verified = distance <= venueGeo.radius();
            log.info("도착 인증 요청 - venueId: {}, lat: {}, lng: {}, user: {}",
                    normalizedVenueId, lat, lng, userEmail);
            log.info("도착 인증 거리 계산 - venueId={}, user={}, distance={}m, radius={}m, verified={}",
                    normalizedVenueId, userEmail, Math.round(distance), venueGeo.radius(), verified);
            if (verified && user != null) {
                venueArrivalRecordRepository.findByUserIdAndVenueId(user.getId(), normalizedVenueId)
                        .ifPresentOrElse(record -> {
                            venueArrivalRecordRepository.save(record);
                        }, () -> venueArrivalRecordRepository.save(VenueArrivalRecord.builder()
                                .userId(user.getId())
                                .venueId(normalizedVenueId)
                                .build()));
            }
            return verified;
        } catch (Exception e) {
            log.error("도착 인증 실패: {}", e.getMessage());
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

    private User resolveCurrentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof FirebaseToken token)) {
            return null;
        }
        return userRepository.findByFirebaseUid(token.getUid()).orElse(null);
    }
}
