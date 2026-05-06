package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "go_cat", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoCat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "go_cat_id")
    private Long goCatId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "mini_home_id", nullable = false)
    private Long miniHomeId;

    @Column(name = "cat_name", nullable = false)
    private String catName;

    @Column(name = "character_type", nullable = false)
    private String characterType;

    @Column(name = "appearance_state", columnDefinition = "TEXT")
    private String appearanceState;

    @Column(name = "update_at")
    private OffsetDateTime updateAt;

    @PrePersist
    public void prePersist() {
        this.catName = this.catName == null ? "GO냥이" : this.catName;
        this.characterType = this.characterType == null ? "BASIC" : this.characterType;
        this.appearanceState = this.appearanceState == null ? "{}" : this.appearanceState;
        this.updateAt = OffsetDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updateAt = OffsetDateTime.now();
    }
}
