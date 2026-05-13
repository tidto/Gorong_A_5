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

    private static final double DEFAULT_RADIUS = 150.0;  // 기본 150m

    // PostGIS ST_Distance로 거리 검증 (Fake GPS 방어)
    public boolean verifyArrival(String venueId, double lat, double lng, String userEmail) {
        // venues 테이블에서 해당 venue 위치 가져와서 ST_Distance 계산
        String sql = """
            SELECT ST_Distance(
                ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
            ) as distance
            """;

        try {
            // TODO: venue의 실제 위치는 캐시 테이블에서 가져와야 함
            // 현재는 venueId로 캐시된 위경도를 조회하는 로직 필요
            // 임시: venueId를 파싱해서 사용 (추후 venue 캐시 테이블 추가)
            log.info("도착 인증 요청 - venueId: {}, lat: {}, lng: {}, user: {}",
                    venueId, lat, lng, userEmail);
            return true;  // TODO: PostGIS 검증 완성 후 실제 거리 비교
        } catch (Exception e) {
            log.error("도착 인증 실패: {}", e.getMessage());
            return false;
        }
    }
}