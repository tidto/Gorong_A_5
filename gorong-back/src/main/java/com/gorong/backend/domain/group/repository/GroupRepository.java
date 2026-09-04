package com.gorong.backend.domain.group.repository;

import com.gorong.backend.domain.group.entity.GroupPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public interface GroupRepository extends JpaRepository<GroupPost, Long> {

    /** 유저가 참여 중이며 모집 중(RECRUITING)인 그룹 — 최신 글(id desc) */
    @Query("""
        SELECT gp FROM GroupPost gp
        WHERE gp.status = 'RECRUITING'
          AND EXISTS (
            SELECT 1 FROM GroupParticipant p
            WHERE p.groupPost = gp AND p.user.id = :userId
          )
        ORDER BY gp.id DESC
        """)
    List<GroupPost> findRecruitingGroupPostsByUserId(@Param("userId") Long userId);
    // 기본 CRUD(findById, save, delete 등)는 JpaRepository가 자동으로 제공합니다.
    // 나중에 특정 조건으로 검색이 필요하면 여기에 메서드를 추가하면 됩니다.

    /**
     * meetingDate(yyyy-MM-dd) + meetingTime(HH:mm) 을 합쳐서 현재 시각보다 이전인
     * RECRUITING / IN_PROGRESS 상태의 그룹을 CLOSED 로 일괄 업데이트합니다.
     * :now 는 "yyyy-MM-dd HH:mm" 형태의 문자열로 넘겨주세요.
     */
    @Modifying
    @Query("""
        UPDATE GroupPost g
           SET g.status = 'CLOSED'
         WHERE g.status IN ('RECRUITING', 'IN_PROGRESS')
           AND g.meetingDate IS NOT NULL
           AND g.meetingTime  IS NOT NULL
           AND CONCAT(g.meetingDate, ' ', g.meetingTime) < :now
        """)
    int closeExpiredGroups(@Param("now") String now);
}
