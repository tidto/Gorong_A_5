package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "CAT_TOWER_VISIT", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CatTowerVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "VISIT_ID")
    private Long visitId;

    @Column(name = "ROOM_OWNER_USER_ID", nullable = false)
    private Long roomOwnerUserId;

    @Column(name = "VISITOR_USER_ID", nullable = false)
    private Long visitorUserId;

    @CreationTimestamp
    @Column(name = "VISITED_AT", updatable = false)
    private OffsetDateTime visitedAt;
}
