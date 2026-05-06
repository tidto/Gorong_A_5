package com.gorong.backend.domain.group.repository;

import com.gorong.backend.domain.group.entity.GroupPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GroupRepository extends JpaRepository<GroupPost, Long> {
}