package com.gorong.backend.domain.group.repository;

import com.gorong.backend.domain.group.entity.GroupPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Arrays;
import java.util.List;

@Repository
public interface GroupRepository extends JpaRepository<GroupPost, Long> {
    // author 필드의 id를 기준으로 리스트를 찾아오도록 명시
    List<GroupPost> findByAuthorId(Long userId);
}