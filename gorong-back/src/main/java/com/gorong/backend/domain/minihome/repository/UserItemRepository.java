package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.UserItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserItemRepository extends JpaRepository<UserItem, Long> {
    List<UserItem> findByUserIdOrderByAcquiredAtDesc(Long userId);

    boolean existsByUserIdAndItemId(Long userId, Long itemId);

    @Query("""
            SELECT COUNT(ui) > 0 FROM UserItem ui
            INNER JOIN Item i ON ui.itemId = i.itemId
            WHERE ui.userId = :userId
            AND UPPER(TRIM(i.itemCode)) = UPPER(TRIM(:itemCode))
            """)
    boolean existsByUserIdAndItemCodeIgnoreCase(@Param("userId") Long userId, @Param("itemCode") String itemCode);
}

