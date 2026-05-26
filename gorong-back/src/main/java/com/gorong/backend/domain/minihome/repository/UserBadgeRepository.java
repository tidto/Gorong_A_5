package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    List<UserBadge> findByUserIdOrderByEarnedAtDesc(Long userId);
}

