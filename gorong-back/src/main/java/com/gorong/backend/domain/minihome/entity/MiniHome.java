package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "mini_home", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MiniHome {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "mini_home_id")
    private Long miniHomeId;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "theme_code")
    private String themeCode;

    @Column(name = "is_public", nullable = false)
    private Boolean isPublic;

    @Column(name = "furniture_items", columnDefinition = "TEXT")
    private String furnitureItems; // JSON 형식으로 저장

    @Column(name = "background_color")
    private String backgroundColor; // 배경색 (basic, cozy, calm, fresh, pink)

    @Column(name = "character_color")
    private String characterColor; // 캐릭터 색상

    @Column(name = "character_pattern")
    private String characterPattern; // 캐릭터 패턴

    @Column(name = "create_at")
    private OffsetDateTime createAt;

    @Column(name = "update_at")
    private OffsetDateTime updateAt;

    @PrePersist
    public void prePersist() {
        this.isPublic = this.isPublic == null ? true : this.isPublic;
        this.themeCode = this.themeCode == null ? "BASIC" : this.themeCode;
        this.createAt = OffsetDateTime.now();
        this.updateAt = OffsetDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updateAt = OffsetDateTime.now();
    }
}
