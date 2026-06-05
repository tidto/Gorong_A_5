package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.ActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByUserIdOrderByCreateAtDesc(Long userId, Pageable pageable);
    long countByUserId(Long userId);
    boolean existsByUserIdAndActivityTypeAndReferenceId(Long userId, String activityType, Long referenceId);

    @Query("""
            SELECT COUNT(a) FROM ActivityLog a
            WHERE a.userId = :userId
            AND (
                UPPER(a.activityType) IN (
                    'EVENT_PARTICIPATED', 'EVENT_PARTICIPATION', 'EVENT_ATTEND',
                    'EVENT_CHECKIN', 'FESTIVAL_JOIN', 'EVENT_JOIN', 'EVENT_APPLY',
                    'EVENT_SOLO', 'GROUP_EVENT_JOIN'
                )
                OR UPPER(a.activityType) LIKE '%EVENT%'
                OR UPPER(a.activityType) LIKE '%PARTICIP%'
                OR UPPER(a.activityType) LIKE '%FESTIVAL%'
            )
            """)
    long countEventParticipations(@Param("userId") Long userId);

    @Query("""
            SELECT UPPER(a.activityType), COUNT(a) FROM ActivityLog a
            WHERE a.userId = :userId
            GROUP BY UPPER(a.activityType)
            """)
    List<Object[]> countGroupByActivityType(@Param("userId") Long userId);

    @Query("""
            SELECT COUNT(a) FROM ActivityLog a
            WHERE a.userId = :userId
            AND (
                UPPER(a.activityType) IN (
                    'REVIEW_WRITTEN', 'REVIEW_WRITE', 'REVIEW_CREATED'
                )
                OR UPPER(a.activityType) LIKE '%REVIEW%'
            )
            """)
    long countReviewActivities(@Param("userId") Long userId);
}
