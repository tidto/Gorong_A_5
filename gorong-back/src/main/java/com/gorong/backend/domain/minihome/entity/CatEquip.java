package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "CAT_EQUIP", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CatEquip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CAT_EQUIP_ID")
    private Long catEquipId;

    @Column(name = "GO_CAT_ID", nullable = false)
    private Long goCatId;

    @Column(name = "ITEM_ID", nullable = false)
    private Long itemId;

    @Column(name = "SLOT_TYPE", nullable = false, columnDefinition = "TEXT")
    private String slotType;

    @Column(name = "IS_ACTIVE", nullable = false)
    private Boolean isActive;

    @CreationTimestamp
    @Column(name = "EQUIPPED_AT", updatable = false)
    private OffsetDateTime equippedAt;

    @PrePersist
    public void prePersist() {
        if (this.isActive == null) this.isActive = true;
    }
}

