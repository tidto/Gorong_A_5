package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.Badge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BadgeRepository extends JpaRepository<Badge, Long> {
    Optional<Badge> findByBadgeCode(String badgeCode);
}

