package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.MiniHome;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MiniHomeRepository extends JpaRepository<MiniHome, Long> {
    Optional<MiniHome> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
}
