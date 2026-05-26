package com.gorong.backend.domain.group.repository;

import com.gorong.backend.domain.group.entity.GroupPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GroupRepository extends JpaRepository<GroupPost, Long> {
    // 기본 CRUD(findById, save, delete 등)는 JpaRepository가 자동으로 제공합니다.
    // 나중에 특정 조건으로 검색이 필요하면 여기에 메서드를 추가하면 됩니다.
}