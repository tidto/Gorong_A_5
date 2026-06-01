package com.gorong.backend.domain.app.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppArrivalService {

    private final JdbcTemplate jdbcTemplate;
    private final AppVenueService appVenueService;

    // PostGIS ST_Distance로 거리 검증 (Fake GPS 방어)
    public boolean verifyArrival(String venueId, double lat, double lng, String userEmail) {
        String sql = """
            SELECT ST_Distance(
                ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
            ) as distance
            """;

        try {
            var venueGeo = appVenueService.findCachedVenueGeo(venueId).orElse(null);
            if (venueGeo == null) {
                log.warn("도착 인증 실패 - venue 캐시 없음: venueId={}, user={}", venueId, userEmail);
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
                    venueId, lat, lng, userEmail);
            log.info("도착 인증 거리 계산 - venueId={}, user={}, distance={}m, radius={}m, verified={}",
                    venueId, userEmail, Math.round(distance), venueGeo.radius(), verified);
            return verified;
        } catch (Exception e) {
            log.error("도착 인증 실패: {}", e.getMessage());
            return false;
        }
    }
}
