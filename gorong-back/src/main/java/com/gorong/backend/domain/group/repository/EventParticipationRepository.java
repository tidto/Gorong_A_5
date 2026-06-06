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

    /** 유저 + 행사 + 그룹으로 중복 확인 (그룹 참여 중복 방지) */
    boolean existsByUserIdAndEventContentIdAndGroupPostId(
            Long userId, String eventContentId, Long groupPostId);

    /** 혼자 참여 취소 */
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserIdAndEventContentIdAndParticipationType(
            Long userId, String eventContentId, ParticipationType type);

    /** 그룹 참여 취소 */
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserIdAndEventContentIdAndGroupPostId(
            Long userId, String eventContentId, Long groupPostId);

    /** 유저의 전체 참여 이력 조회 (마이페이지 등에서 활용) */
    List<EventParticipation> findByUserIdOrderByAppliedAtDesc(Long userId);

    /** 특정 행사에 대한 유저의 참여 기록 조회 */
    Optional<EventParticipation> findByUserIdAndEventContentIdAndParticipationType(
            Long userId, String eventContentId, ParticipationType type);

    /**
     * 참여 수 기준 인기 행사 TOP N 조회.
     * SOLO + GROUP 모두 집계 → eventContentId별 count 내림차순.
     */
    @org.springframework.data.jpa.repository.Query(
            "SELECT ep.eventContentId, COUNT(ep) AS cnt " +
                    "FROM EventParticipation ep " +
                    "GROUP BY ep.eventContentId " +
                    "ORDER BY cnt DESC"
    )
    List<Object[]> findTopEventContentIds(org.springframework.data.domain.Pageable pageable);
}