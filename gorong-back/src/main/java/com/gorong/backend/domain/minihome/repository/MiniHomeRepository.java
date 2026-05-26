package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.MiniHome;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MiniHomeRepository extends JpaRepository<MiniHome, Long> {
    /** 동일 userId에 미니홈이 여러 건일 수 있어 가장 오래된 1건을 사용합니다. */
    Optional<MiniHome> findFirstByUserIdOrderByMiniHomeIdAsc(Long userId);
}

