package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.UserItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserItemRepository extends JpaRepository<UserItem, Long> {
    List<UserItem> findByUserIdOrderByAcquiredAtDesc(Long userId);

    boolean existsByUserIdAndItemId(Long userId, Long itemId);
}

