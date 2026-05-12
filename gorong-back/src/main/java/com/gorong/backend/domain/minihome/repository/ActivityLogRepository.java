package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.ActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByUserIdOrderByCreateAtDesc(Long userId, Pageable pageable);
    long countByUserId(Long userId);
}

