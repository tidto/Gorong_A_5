package com.gorong.backend.domain.file.service;

import com.gorong.backend.domain.file.model.UploadSourceType;
import com.gorong.backend.domain.minihome.dto.GalleryCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GalleryImageCreateRequestDto;
import com.gorong.backend.domain.minihome.entity.MiniHome;
import com.gorong.backend.domain.minihome.entity.MiniHomeGallery;
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

    @Transactional
    public void append(Long userId, String fileUrl, UploadSourceType sourceType, String referenceId) {
        // 미니홈이 없으면 생성해서 자동 저장 동작이 항상 동일하게 유지되도록 한다.
        miniHomeService.getOrCreateMiniHomePage(userId);

        MiniHome miniHome = miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(userId)
                .orElseThrow(() -> new IllegalStateException("미니홈을 찾을 수 없습니다."));

        Long galleryId = resolveGalleryId(miniHome, referenceId);

        GalleryImageCreateRequestDto req = new GalleryImageCreateRequestDto();
        req.setImageUrl(fileUrl);
        req.setLocationName(sourceType.name());
        req.setTakenAt(OffsetDateTime.now());
        miniHomeService.addGalleryImage(galleryId, req);
    }

    private Long resolveGalleryId(MiniHome miniHome, String referenceId) {
        String normalizedReferenceId = referenceId == null ? null : referenceId.trim();
        Optional<MiniHomeGallery> found = miniHomeGalleryRepository
                .findByMiniHomeIdOrderByCreateAtDesc(miniHome.getMiniHomeId())
                .stream()
                .filter(gallery -> normalizedReferenceId == null
                        ? AUTO_GALLERY_TITLE.equals(gallery.getTitle())
                        : normalizedReferenceId.equals(gallery.getReferenceId()))
                .findFirst();

        if (found.isPresent()) {
            return found.get().getGalleryId();
        }

        GalleryCreateRequestDto createRequestDto = new GalleryCreateRequestDto();
        createRequestDto.setTitle(normalizedReferenceId == null ? AUTO_GALLERY_TITLE : "행사 사진");
        createRequestDto.setDescription(normalizedReferenceId == null
                ? "앱/웹 업로드에서 자동 저장된 이미지"
                : "행사 식별자: " + normalizedReferenceId);
        createRequestDto.setReferenceId(normalizedReferenceId);
        return miniHomeService.createGallery(miniHome.getUserId(), createRequestDto).getGalleryId();
    }
}
