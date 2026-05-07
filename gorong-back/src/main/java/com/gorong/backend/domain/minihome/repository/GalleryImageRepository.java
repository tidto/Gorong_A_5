package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.GalleryImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GalleryImageRepository extends JpaRepository<GalleryImage, Long> {
    List<GalleryImage> findByGalleryIdOrderByCreateAtDesc(Long galleryId);
}

