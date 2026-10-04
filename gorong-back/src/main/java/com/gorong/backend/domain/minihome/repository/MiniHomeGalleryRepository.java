package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.MiniHomeGallery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.Optional;

public interface MiniHomeGalleryRepository extends JpaRepository<MiniHomeGallery, Long> {
    List<MiniHomeGallery> findByMiniHomeIdOrderByCreateAtDesc(Long miniHomeId);

    // GalleryId로 MiniHomeGallery 찾기 (GalleryImage와의 연동용)
    Optional<MiniHomeGallery> findByGalleryId(Long galleryId);
}

