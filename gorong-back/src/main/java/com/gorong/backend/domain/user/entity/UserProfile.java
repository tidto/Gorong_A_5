package com.gorong.backend.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import org.locationtech.jts.geom.Point;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

// 1. 클래스 레벨의 @Builder 와 @AllArgsConstructor 를 삭제했습니다!
@Entity
@Table(name = "user_profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "profile_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "nickname", nullable = false, columnDefinition = "TEXT")
    private String nickname;

    @Column(name = "profile_image_url", columnDefinition = "TEXT")
    private String profileImageUrl;

    @Column(name = "gorong_hz", columnDefinition = "TEXT")
    private String gorongHz;

    @Column(name = "base_address", columnDefinition = "TEXT")
    private String baseAddress;

    @Column(name = "base_location", columnDefinition = "geometry(Point, 4326)")
    private Point baseLocation;

    // @Builder.Default 와 = 38.5 를 삭제했습니다! (생성자에서 알아서 해주니까요)
    @Column(name = "purr_tempurature", nullable = false, columnDefinition = "numeric(3,1)")
    private Double purrTemperature;

    @Column(name = "total_walk_distance", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalWalkDistance;

    @UpdateTimestamp
    @Column(name = "update_at")
    private OffsetDateTime updateAt;

    // 4. 오직 이 생성자에만 @Builder를 달아서 통제합니다.
    @Builder
    public UserProfile(User user, String nickname, String gorongHz, Double purrTemperature, BigDecimal totalWalkDistance) {
        this.user = user;
        this.nickname = nickname;
        this.gorongHz = gorongHz;

        // 값이 안 들어오면 여기서 38.5와 0으로 세팅합니다.
        this.purrTemperature = purrTemperature != null ? purrTemperature : 38.5;
        this.totalWalkDistance = totalWalkDistance != null ? totalWalkDistance : BigDecimal.ZERO;
    }
    // 온보딩 결과 주파수 업데이트 메서드
    public void updateGorongHz(String gorongHz) {
        this.gorongHz = gorongHz;
    }
}