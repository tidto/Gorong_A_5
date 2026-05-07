package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "BADGE", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Badge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "BADGE_ID")
    private Long badgeId;

    @Column(name = "BADGE_CODE", nullable = false, columnDefinition = "TEXT")
    private String badgeCode;

    @Column(name = "TITLE", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(name = "DESCRIPTION", columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "CREATE_AT", updatable = false)
    private OffsetDateTime createAt;
}

