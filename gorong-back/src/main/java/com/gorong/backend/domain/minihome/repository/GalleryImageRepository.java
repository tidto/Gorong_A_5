package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.GalleryImage;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GalleryImageRepository extends JpaRepository<GalleryImage, Long> {
    List<GalleryImage> findByGalleryIdOrderByCreateAtDesc(Long galleryId);

    @Query("""
        SELECT gi
        FROM GalleryImage gi, MiniHomeGallery mh
        WHERE gi.galleryId = mh.galleryId
          AND gi.imageUrl IN ?1
          AND mh.referenceId = ?2
    """)
    List<GalleryImage> findByImageUrlsAndGalleryReferenceId(List<String> imageUrls, String referenceId);
}

