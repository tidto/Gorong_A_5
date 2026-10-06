package com.gorong.backend.domain.file.service;

import com.gorong.backend.domain.file.model.UploadSourceType;
import com.gorong.backend.domain.minihome.dto.GalleryCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GalleryImageCreateRequestDto;
import com.gorong.backend.domain.minihome.entity.MiniHome;
import com.gorong.backend.domain.minihome.entity.MiniHomeGallery;
import com.gorong.backend.domain.minihome.repository.GalleryImageRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeGalleryRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeRepository;
import com.gorong.backend.domain.minihome.service.MiniHomeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GalleryAutoSaveService {

    private static final String AUTO_GALLERY_TITLE = "자동 저장 갤러리";

    private final MiniHomeService miniHomeService;
    private final MiniHomeRepository miniHomeRepository;
    private final MiniHomeGalleryRepository miniHomeGalleryRepository;
    private final GalleryImageRepository galleryImageRepository;

    @Transactional
    public void append(Long userId, String fileUrl, UploadSourceType sourceType, String referenceId) {
        String normalizedReferenceId = referenceId == null ? null : referenceId.trim();

        // 트레일 러닝아트는 트레일 기록이 없으면 갤러리에 등록할 수 없다.
        // 컨트롤러에서 S3 업로드 전에 차단하지만, 다른 호출 경로에서도 같은 정합성을 보장한다.
        if (sourceType == UploadSourceType.TRAIL_ART
                && (normalizedReferenceId == null || normalizedReferenceId.isBlank())) {
            throw new IllegalArgumentException("트레일 러닝아트는 트레일 기록이 있어야 갤러리에 저장할 수 있습니다.");
        }

        // 미니홈이 없으면 생성해서 자동 저장 동작이 항상 동일하게 유지되도록 한다.
        miniHomeService.getOrCreateMiniHomePage(userId);

        MiniHome miniHome = miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(userId)
                .orElseThrow(() -> new IllegalStateException("미니홈을 찾을 수 없습니다."));

        Long galleryId = resolveGalleryId(miniHome, normalizedReferenceId);

        // 자동 저장은 재시도/중복 호출에도 안전해야 하므로 같은 이미지는 한 번만 넣는다.
        if (galleryImageRepository.existsByGalleryIdAndImageUrl(galleryId, fileUrl)) {
            return;
        }

        GalleryImageCreateRequestDto req = new GalleryImageCreateRequestDto();
        req.setImageUrl(fileUrl);
        req.setLocationName(sourceType.name());
        req.setTakenAt(OffsetDateTime.now());
        miniHomeService.addGalleryImage(galleryId, req, userId);
    }

    /** referenceId가 이미 있으면 같은 트레일/행사 갤러리를 재사용하고, 없으면 새로 만든다. */
    private Long resolveGalleryId(MiniHome miniHome, String normalizedReferenceId) {
        if (normalizedReferenceId != null) {
            Optional<MiniHomeGallery> found = miniHomeGalleryRepository
                    .findFirstByMiniHomeIdAndReferenceIdOrderByCreateAtDesc(
                            miniHome.getMiniHomeId(),
                            normalizedReferenceId
                    );
            if (found.isPresent()) {
                return found.get().getGalleryId();
            }

            GalleryCreateRequestDto createRequestDto = new GalleryCreateRequestDto();
            createRequestDto.setTitle("행사 사진");
            createRequestDto.setDescription("행사 식별자: " + normalizedReferenceId);
            createRequestDto.setReferenceId(normalizedReferenceId);
            return miniHomeService.createGallery(miniHome.getUserId(), createRequestDto).getGalleryId();
        }

        Optional<MiniHomeGallery> autoGallery = miniHomeGalleryRepository
                .findByMiniHomeIdOrderByCreateAtDesc(miniHome.getMiniHomeId())
                .stream()
                .filter(gallery -> AUTO_GALLERY_TITLE.equals(gallery.getTitle()))
                .findFirst();
        if (autoGallery.isPresent()) {
            return autoGallery.get().getGalleryId();
        }

        GalleryCreateRequestDto createRequestDto = new GalleryCreateRequestDto();
        createRequestDto.setTitle(AUTO_GALLERY_TITLE);
        createRequestDto.setDescription("앱/웹 업로드에서 자동 저장된 이미지");
        createRequestDto.setReferenceId(null);
        return miniHomeService.createGallery(miniHome.getUserId(), createRequestDto).getGalleryId();
    }
}
