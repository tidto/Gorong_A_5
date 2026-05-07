package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "USER_ITEM", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "USER_ITEM_ID")
    private Long userItemId;

    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    @Column(name = "ITEM_ID", nullable = false)
    private Long itemId;

    @CreationTimestamp
    @Column(name = "ACQUIRED_AT", updatable = false)
    private OffsetDateTime acquiredAt;
}

