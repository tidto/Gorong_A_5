package com.gorong.backend.domain.group.repository;

import com.gorong.backend.domain.group.entity.GroupPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface GroupRepository extends JpaRepository<GroupPost, Long> {
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
