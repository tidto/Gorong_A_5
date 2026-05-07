package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.MiniHomeGallery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MiniHomeGalleryRepository extends JpaRepository<MiniHomeGallery, Long> {
    List<MiniHomeGallery> findByMiniHomeIdOrderByCreateAtDesc(Long miniHomeId);
}

