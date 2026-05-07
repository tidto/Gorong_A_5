package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "GO_CAT", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoCat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "GO_CAT_ID")
    private Long goCatId;

    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    @Column(name = "MINI_HOME_ID", nullable = false)
    private Long miniHomeId;

    @Column(name = "CAT_NAME", nullable = false, columnDefinition = "TEXT")
    private String catName;

    @Column(name = "CHARACTER_TYPE", nullable = false, columnDefinition = "TEXT")
    private String characterType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "APPEARANCE_STATE", columnDefinition = "jsonb")
    private Map<String, Object> appearanceState;

    @Column(name = "UPDATE_AT")
    private OffsetDateTime updateAt;

    @PrePersist
    public void prePersist() {
        if (this.catName == null) this.catName = "고냥이";
        if (this.characterType == null) this.characterType = "BASIC";
        if (this.updateAt == null) this.updateAt = OffsetDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updateAt = OffsetDateTime.now();
    }
}
