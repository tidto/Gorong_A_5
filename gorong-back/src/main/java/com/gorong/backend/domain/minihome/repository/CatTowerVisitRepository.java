package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.CatTowerVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;

public interface CatTowerVisitRepository extends JpaRepository<CatTowerVisit, Long> {

    long countByRoomOwnerUserId(Long roomOwnerUserId);

    @Query("""
            SELECT COUNT(DISTINCT v.visitorUserId)
            FROM CatTowerVisit v
            WHERE v.roomOwnerUserId = :roomOwnerUserId
              AND v.visitedAt >= :fromInclusive
              AND v.visitedAt < :toExclusive
            """)
    long countDistinctVisitorsBetween(
            @Param("roomOwnerUserId") Long roomOwnerUserId,
            @Param("fromInclusive") OffsetDateTime fromInclusive,
            @Param("toExclusive") OffsetDateTime toExclusive
    );
}
