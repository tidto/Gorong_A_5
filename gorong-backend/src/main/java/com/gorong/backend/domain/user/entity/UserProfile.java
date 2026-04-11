package com.gorong.backend.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import org.locationtech.jts.geom.Point; // PostGIS 지오펜싱을 위한 핵심 라이브러리
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "profile_id")
    private Long id;

    // 1:1 관계 설정 (User가 삭제되면 Profile도 삭제됨)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(unique = true, nullable = false, length = 50)
    private String nickname;

    @Column(name = "profile_image_url", columnDefinition = "TEXT")
    private String profileImageUrl;

    @Column(name = "gorong_hz", length = 100)
    private String gorongHz;

    @Column(name = "base_address")
    private String baseAddress;

    // PostGIS 전용 데이터 타입 명시 (4326은 전세계 표준 GPS 위경도)
    @Column(name = "base_location", columnDefinition = "geometry(Point, 4326)")
    private Point baseLocation;

    // 육구 점수 (5점 만점, 소수점 첫째 자리) -> 오라클 NUMBER(2,1)과 동일
    @Column(name = "jelly_score", precision = 2, scale = 1)
    private BigDecimal jellyScore;

    @Column(name = "total_walk_distance", precision = 10, scale = 2)
    private BigDecimal totalWalkDistance;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public UserProfile(User user, String nickname, String gorongHz, BigDecimal jellyScore, BigDecimal totalWalkDistance) {
        this.user = user;
        this.nickname = nickname;
        this.gorongHz = gorongHz;
        this.jellyScore = jellyScore != null ? jellyScore : BigDecimal.ZERO;
        this.totalWalkDistance = totalWalkDistance != null ? totalWalkDistance : BigDecimal.ZERO;
    }
}