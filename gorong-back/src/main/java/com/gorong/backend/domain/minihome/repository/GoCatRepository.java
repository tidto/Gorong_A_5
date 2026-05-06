package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.GoCat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GoCatRepository extends JpaRepository<GoCat, Long> {
    Optional<GoCat> findByUserId(Long userId);
    Optional<GoCat> findByMiniHomeId(Long miniHomeId);
}
