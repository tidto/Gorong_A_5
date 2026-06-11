package com.gorong.backend.domain.group.repository;

import com.gorong.backend.domain.group.entity.GroupParticipant;
import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

public interface GroupParticipantRepository extends JpaRepository<GroupParticipant, Long> {
    // 📌 유저 ID로 참여 기록을 찾는 메서드 추가
    List<GroupParticipant> findByUserId(Long userId);

    Optional<GroupParticipant> findByUser_IdAndGroupPost_Id(Long userId, Long groupPostId);

    boolean existsByUserAndGroupPost(User user, GroupPost groupPost);

    @Transactional
    void deleteByUserIdAndGroupPostId(Long userId, Long groupPostId);

    @Transactional
    void deleteByGroupPostId(Long groupPostId);
}