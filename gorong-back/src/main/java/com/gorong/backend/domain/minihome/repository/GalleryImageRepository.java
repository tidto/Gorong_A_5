package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.GalleryImage;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GalleryImageRepository extends JpaRepository<GalleryImage, Long> {
    List<GalleryImage> findByGalleryIdOrderByCreateAtDesc(Long galleryId);

    boolean existsByGalleryIdAndImageUrl(Long galleryId, String imageUrl);

    /**
     * imageUrl 과 referenceId 가 일치하는 갤러리 이미지를 찾습니다.
     * GalleryImage 에는 userId 가 없으므로 MiniHome 를 경유해 소유자를까지 조인해야
     * 다른 사용자의 갤러리 이미지가 함께 삭제되지 않습니다.
     */
    @Query("""
        SELECT gi
        FROM GalleryImage gi, MiniHomeGallery mh, MiniHome mhHome
        WHERE gi.galleryId = mh.galleryId
          AND mh.miniHomeId = mhHome.miniHomeId
          AND gi.imageUrl IN ?1
          AND mh.referenceId = ?2
          AND mhHome.userId = ?3
    """)
    List<GalleryImage> findByImageUrlsAndGalleryReferenceIdAndOwnerUserId(
            List<String> imageUrls,
            String referenceId,
            Long ownerUserId
    );

    /**
     * imageUrl 로 갤러리 이미지를 찾되, MiniHome 를 경유해 소유자를 반드시 검증하고
     * locationName 으로 범위를 좁힙니다.
     * 트레일 러닝아트 연동 삭제에서 사용하며, locationName 이 "TRAIL_ART" 로 고정되어
     * 같은 갤러리에 함께 저장될 수 있는 APP_PHOTO / POST_PHOTO 는 절대 매칭되지 않습니다.
     */
    @Query("""
        SELECT gi
        FROM GalleryImage gi, MiniHomeGallery mh, MiniHome mhHome
        WHERE gi.galleryId = mh.galleryId
          AND mh.miniHomeId = mhHome.miniHomeId
          AND gi.imageUrl = ?1
          AND mhHome.userId = ?2
          AND gi.locationName = ?3
    """)
    Optional<GalleryImage> findByImageUrlAndOwnerUserIdAndLocationName(
            String imageUrl,
            Long ownerUserId,
            String locationName
    );
}

