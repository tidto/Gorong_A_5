package com.gorong.backend.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import org.locationtech.jts.geom.Point; // PostGIS 지오펜싱을 위한 핵심 라이브러리
import java.math.BigDecimal;
import java.time.LocalDateTime;

// ⭐️ 에러 원인이었던 클래스 레벨의 @Builder는 삭제했습니다.
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

    @Column(name = "gurr_temperature", columnDefinition = "numeric(3,1)")
    private Double gurrTemperature; // ⭐️ 생성자에서 처리할 것이므로 여기서 = 38.5 는 지웠습니다.

    @Column(name = "total_walk_distance", precision = 10, scale = 2)
    private BigDecimal totalWalkDistance;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ⭐️ 생성자에만 @Builder를 달아서 명확하게 통제합니다.
    @Builder
    public UserProfile(User user, String nickname, String gorongHz, Double gurrTemperature, BigDecimal totalWalkDistance) {
        this.user = user;
        this.nickname = nickname;
        this.gorongHz = gorongHz;

        // ⭐️ @Builder.Default 없이 여기서 깔끔하게 디폴트 값을 세팅합니다! (값이 안 들어오면 38.5)
        this.gurrTemperature = gurrTemperature != null ? gurrTemperature : 38.5;
        this.totalWalkDistance = totalWalkDistance != null ? totalWalkDistance : BigDecimal.ZERO;

        // 삭제된 jellyScore 로직은 완벽히 제거했습니다.
    }
}