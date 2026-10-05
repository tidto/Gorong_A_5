package com.gorong.backend.domain.file.service;

import com.gorong.backend.domain.file.model.UploadSourceType;
import com.gorong.backend.domain.minihome.dto.GalleryImageCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.MiniHomePageResponseDto;
import com.gorong.backend.domain.minihome.entity.MiniHome;
import com.gorong.backend.domain.minihome.entity.MiniHomeGallery;
import com.gorong.backend.domain.minihome.repository.GalleryImageRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeGalleryRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeRepository;
import com.gorong.backend.domain.minihome.service.MiniHomeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * 트레일 러닝아트가 트레일 기록 없이 갤러리에 등록되는 문제의 재현/방지 테스트.
 */
@ExtendWith(MockitoExtension.class)
class GalleryAutoSaveServiceTest {

    private static final Long USER_ID = 1L;
    private static final Long MINI_HOME_ID = 10L;
    private static final Long GALLERY_ID = 100L;
    private static final String VENUE_ID = "1118418";
    private static final String TRAIL_ART_URL = "https://bucket/users/1/trail_art/20260101/trail.jpg";
    private static final String APP_PHOTO_URL = "https://bucket/users/1/app_photo/20260101/photo.jpg";

    @Mock
    private MiniHomeService miniHomeService;
    @Mock
    private MiniHomeRepository miniHomeRepository;
    @Mock
    private MiniHomeGalleryRepository miniHomeGalleryRepository;
    @Mock
    private GalleryImageRepository galleryImageRepository;

    @InjectMocks
    private GalleryAutoSaveService galleryAutoSaveService;

    private void givenMiniHome() {
        when(miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(USER_ID))
                .thenReturn(Optional.of(MiniHome.builder()
                        .miniHomeId(MINI_HOME_ID)
                        .userId(USER_ID)
                        .build()));
    }

    // ── 비정상: 트레일 기록이 없는 트레일 러닝아트 ─────────────────────────

    @Test
    @DisplayName("[비정상] 트레일 러닝아트는 referenceId 가 없으면 거절하고 아무것도 저장하지 않는다")
    void append_trailArtWithoutReferenceId_isRejectedAndNothingSaved() {
        assertThatThrownBy(() ->
                galleryAutoSaveService.append(USER_ID, TRAIL_ART_URL, UploadSourceType.TRAIL_ART, null))
                .isInstanceOf(IllegalArgumentException.class);

        // S3 업로드 이전 단계이므로 미니홈/갤러리/이미지 모두 생성되지 않아야 한다.
        verify(miniHomeService, never()).getOrCreateMiniHomePage(anyLong());
        verify(miniHomeGalleryRepository, never()).save(any(MiniHomeGallery.class));
        verify(galleryImageRepository, never()).save(any());
        verifyNoInteractions(galleryImageRepository);
    }

    @Test
    @DisplayName("[비정상] 트레일 러닝아트는 공백뿐인 referenceId 도 거절한다")
    void append_trailArtWithBlankReferenceId_isRejected() {
        assertThatThrownBy(() ->
                galleryAutoSaveService.append(USER_ID, TRAIL_ART_URL, UploadSourceType.TRAIL_ART, "   "))
                .isInstanceOf(IllegalArgumentException.class);

        verify(galleryImageRepository, never()).save(any());
    }

    // ── 정상: 트레일 기록이 있는 트레일 러닝아트 ───────────────────────────

    @Test
    @DisplayName("[정상] 트레일 러닝아트는 해당 트레일 갤러리에 등록한다")
    void append_trailArtWithReferenceId_registersInTrailGallery() {
        givenMiniHome();
        when(miniHomeGalleryRepository
                .findFirstByMiniHomeIdAndReferenceIdOrderByCreateAtDesc(MINI_HOME_ID, VENUE_ID))
                .thenReturn(Optional.of(MiniHomeGallery.builder()
                        .galleryId(GALLERY_ID)
                        .miniHomeId(MINI_HOME_ID)
                        .referenceId(VENUE_ID)
                        .build()));
        when(galleryImageRepository.existsByGalleryIdAndImageUrl(GALLERY_ID, TRAIL_ART_URL))
                .thenReturn(false);

        galleryAutoSaveService.append(USER_ID, TRAIL_ART_URL, UploadSourceType.TRAIL_ART, VENUE_ID);

        ArgumentCaptor<GalleryImageCreateRequestDto> captor =
                ArgumentCaptor.forClass(GalleryImageCreateRequestDto.class);
        verify(miniHomeService).addGalleryImage(eq(GALLERY_ID), captor.capture(), eq(USER_ID));
        assertThat(captor.getValue().getImageUrl()).isEqualTo(TRAIL_ART_URL);
        assertThat(captor.getValue().getLocationName()).isEqualTo("TRAIL_ART");
    }

    @Test
    @DisplayName("[정상] 같은 트레일의 갤러리가 없으면 referenceId 를 가진 갤러리를 새로 만든다")
    void append_trailArtWithoutExistingGallery_createsGalleryWithReferenceId() {
        givenMiniHome();
        when(miniHomeGalleryRepository
                .findFirstByMiniHomeIdAndReferenceIdOrderByCreateAtDesc(MINI_HOME_ID, VENUE_ID))
                .thenReturn(Optional.empty());
        when(miniHomeService.createGallery(eq(USER_ID), any()))
                .thenReturn(MiniHomePageResponseDto.GalleryDto.builder()
                        .galleryId(GALLERY_ID)
                        .referenceId(VENUE_ID)
                        .build());
        when(galleryImageRepository.existsByGalleryIdAndImageUrl(GALLERY_ID, TRAIL_ART_URL))
                .thenReturn(false);

        galleryAutoSaveService.append(USER_ID, TRAIL_ART_URL, UploadSourceType.TRAIL_ART, VENUE_ID);

        verify(miniHomeService).createGallery(eq(USER_ID), any());
        verify(miniHomeService).addGalleryImage(eq(GALLERY_ID), any(), eq(USER_ID));
    }

    // ── 중복 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[중복] 동일 이미지가 이미 등록돼 있으면 다시 넣지 않는다")
    void append_duplicateImage_isSkipped() {
        givenMiniHome();
        when(miniHomeGalleryRepository
                .findFirstByMiniHomeIdAndReferenceIdOrderByCreateAtDesc(MINI_HOME_ID, VENUE_ID))
                .thenReturn(Optional.of(MiniHomeGallery.builder()
                        .galleryId(GALLERY_ID)
                        .miniHomeId(MINI_HOME_ID)
                        .referenceId(VENUE_ID)
                        .build()));
        when(galleryImageRepository.existsByGalleryIdAndImageUrl(GALLERY_ID, TRAIL_ART_URL))
                .thenReturn(true);

        galleryAutoSaveService.append(USER_ID, TRAIL_ART_URL, UploadSourceType.TRAIL_ART, VENUE_ID);

        verify(miniHomeService, never()).addGalleryImage(anyLong(), any(), anyLong());
    }

    // ── 회귀 방지: 기존 APP_PHOTO 자동 저장 동작은 그대로 유지 ────────────

    @Test
    @DisplayName("[회귀] referenceId 없는 APP_PHOTO 는 기존처럼 자동 저장 갤러리에 등록된다")
    void append_appPhotoWithoutReferenceId_usesAutoGallery() {
        givenMiniHome();
        when(miniHomeGalleryRepository.findByMiniHomeIdOrderByCreateAtDesc(MINI_HOME_ID))
                .thenReturn(List.of(MiniHomeGallery.builder()
                        .galleryId(GALLERY_ID)
                        .miniHomeId(MINI_HOME_ID)
                        .title("자동 저장 갤러리")
                        .build()));
        when(galleryImageRepository.existsByGalleryIdAndImageUrl(GALLERY_ID, APP_PHOTO_URL))
                .thenReturn(false);

        galleryAutoSaveService.append(USER_ID, APP_PHOTO_URL, UploadSourceType.APP_PHOTO, null);

        verify(miniHomeService).addGalleryImage(eq(GALLERY_ID), any(), eq(USER_ID));
        verify(miniHomeService, never()).createGallery(anyLong(), any());
    }
}
