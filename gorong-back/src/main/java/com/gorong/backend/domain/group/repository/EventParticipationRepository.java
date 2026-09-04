package com.gorong.backend.domain.group.repository;

import com.gorong.backend.domain.group.entity.EventParticipation;
import com.gorong.backend.domain.group.entity.EventParticipation.ParticipationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventParticipationRepository extends JpaRepository<EventParticipation, Long> {

    /** 유저 + 행사 + 참여유형으로 중복 확인 */
    boolean existsByUserIdAndEventContentIdAndParticipationType(
            Long userId, String eventContentId, ParticipationType type);

    /** 유저 + 행사 + 그룹으로 중복 확인 */
    boolean existsByUserIdAndEventContentIdAndGroupPostId(
            Long userId, String eventContentId, Long groupPostId);

    /** ✅ 유저 + 그룹으로 기존 레코드 조회 (중복 INSERT 방지용) */
    Optional<EventParticipation> findByUserIdAndGroupPostId(
            Long userId, Long groupPostId);

    /** 혼자 참여 취소 */
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserIdAndEventContentIdAndParticipationType(
            Long userId, String eventContentId, ParticipationType type);

    /** 그룹 참여 취소 */
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserIdAndEventContentIdAndGroupPostId(
            Long userId, String eventContentId, Long groupPostId);

    /** 유저의 전체 참여 이력 조회 */
    List<EventParticipation> findByUserIdOrderByAppliedAtDesc(Long userId);

    /** 특정 행사에 대한 유저의 참여 기록 조회 */
    Optional<EventParticipation> findByUserIdAndEventContentIdAndParticipationType(
            Long userId, String eventContentId, ParticipationType type);

    @org.springframework.data.jpa.repository.Query(
            "SELECT ep.eventContentId, COUNT(ep) AS cnt " +
                    "FROM EventParticipation ep " +
                    "GROUP BY ep.eventContentId " +
                    "ORDER BY cnt DESC"
    )
    List<Object[]> findTopEventContentIds(org.springframework.data.domain.Pageable pageable);

    /**
     * visitDate가 오늘 이전이고 아직 ACTIVE인 SOLO 참여 레코드 조회
     * — GroupScheduler가 매일 자정에 호출하여 CLOSED로 일괄 전환
     */
    @org.springframework.data.jpa.repository.Query(
            "SELECT ep FROM EventParticipation ep " +
                    "WHERE ep.participationType = 'SOLO' " +
                    "  AND ep.status = 'ACTIVE' " +
                    "  AND ep.visitDate < :today"
    )
    List<EventParticipation> findExpiredSoloParticipations(
            @org.springframework.data.repository.query.Param("today") java.time.LocalDate today);
}