package com.gorong.backend.domain.group.repository;

import com.gorong.backend.domain.group.entity.GroupParticipant;
import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import org.springframework.transaction.annotation.Transactional;

public interface GroupParticipantRepository extends JpaRepository<GroupParticipant, Long> {
    @Query("SELECT p FROM GroupParticipant p WHERE p.user.id = :userId")
    List<GroupParticipant> findByUser_Id(@Param("userId") Long userId);

    @Query("SELECT COUNT(p) FROM GroupParticipant p WHERE p.user.id = :userId")
    long countByUser_Id(@Param("userId") Long userId);

    boolean existsByUserAndGroupPost(User user, GroupPost groupPost);

    @Transactional
    @Query("DELETE FROM GroupParticipant p WHERE p.user.id = :userId AND p.groupPost.id = :groupPostId")
    void deleteByUser_IdAndGroupPost_Id(@Param("userId") Long userId, @Param("groupPostId") Long groupPostId);

    @Transactional
    void deleteByGroupPostId(Long groupPostId);
}