package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "ITEM", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ITEM_ID")
    private Long itemId;

    @Column(name = "ITEM_CODE", length = 50, unique = true)
    private String itemCode;

    @Column(name = "ITEM_NAME", nullable = false, columnDefinition = "TEXT")
    private String itemName;

    @Column(name = "ITEM_TYPE", length = 30)
    private String itemType;

    @Column(name = "IMAGE_URL", columnDefinition = "TEXT")
    private String imageUrl;

    @CreationTimestamp
    @Column(name = "CREATE_AT", updatable = false)
    private OffsetDateTime createAt;
}

