package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "MINI_HOME", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MiniHome {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MINI_HOME_ID")
    private Long miniHomeId;

    // DB에는 USER_ID와 USER_ID2가 모두 존재합니다.
    // 코드에서는 USER_ID를 기본 사용자 ID(userId)로 사용하고, USER_ID2는 별도 컬럼으로 그대로 매핑합니다.
    @Column(name = "USER_ID2", nullable = false)
    private Long userId2;

    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    @Column(name = "DESCRIPTION", columnDefinition = "TEXT")
    private String description;

    @Column(name = "THEME_CODE", columnDefinition = "TEXT")
    private String themeCode;

    @Column(name = "IS_PUBLIC", nullable = false)
    private Boolean isPublic;

    @Column(name = "CREATE_AT")
    private OffsetDateTime createAt;

    @Column(name = "UPDATE_AT")
    private OffsetDateTime updateAt;

    @PrePersist
    public void prePersist() {
        if (this.isPublic == null) this.isPublic = true;
        OffsetDateTime now = OffsetDateTime.now();
        if (this.createAt == null) this.createAt = now;
        if (this.updateAt == null) this.updateAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updateAt = OffsetDateTime.now();
    }
}

