package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "USER_BADGE", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "USER_BADGE_ID")
    private Long userBadgeId;

    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    @Column(name = "BADGE_ID", nullable = false)
    private Long badgeId;

    @CreationTimestamp
    @Column(name = "EARNED_AT", updatable = false)
    private OffsetDateTime earnedAt;
}

