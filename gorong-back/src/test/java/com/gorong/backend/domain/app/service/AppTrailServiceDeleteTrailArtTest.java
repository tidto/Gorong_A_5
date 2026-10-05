package com.gorong.backend.domain.app.service;

import com.gorong.backend.domain.app.service.AppTrailService;
import com.gorong.backend.domain.file.service.S3StorageService;
import com.gorong.backend.domain.minihome.entity.GalleryImage;
import com.gorong.backend.domain.minihome.repository.ActivityLogRepository;
import com.gorong.backend.domain.minihome.repository.GalleryImageRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeGalleryRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeRepository;
import com.gorong.backend.domain.minihome.service.MiniHomeService;
import com.gorong.backend.domain.minihome.service.MiniHomeUserResolver;
import com.gorong.backend.domain.review.repository.ReviewImageRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * 트레일 기록 삭제 시 러닝아트(TRAIL_ART) 갤러리 이미지 연동 삭제 검증.
 *
 * 삭제 판정 기준:
 *  - 스코프는 locationName = TRAIL_ART 로 한정 (APP_PHOTO / POST_PHOTO 는 매칭 불가)
 *  - 조회 쿼리가 MiniHome 를 경유해 소유자까지 검증 (타인 이미지 삭제 불가)
 *  - 이미 삭제되었거나 없으면 아무 것도 하지 않음 (멱등)
 *  - 실제 삭제는 MiniHomeService.deleteGalleryImage 위임 (소유권 가드 + DB 선삭제 후 S3 삭제)
 */
@ExtendWith(MockitoExtension.class)
class AppTrailServiceDeleteTrailArtTest {

    private static final Long USER_ID = 1L;
    private static final String TRAIL_ART_URL = "https://bucket/users/1/trail_art/20260101/a.jpg";
    private static final String TRAIL_ART_LOCATION = "TRAIL_ART";
    private static final Long GALLERY_IMAGE_ID = 999L;

    @Mock private MiniHomeUserResolver miniHomeUserResolver;
    @Mock private MiniHomeService miniHomeService;
    @Mock private GalleryImageRepository galleryImageRepository;
    @Mock private S3StorageService s3StorageService;
    @Mock private MiniHomeRepository miniHomeRepository;
    @Mock private MiniHomeGalleryRepository miniHomeGalleryRepository;
    @Mock private ActivityLogRepository activityLogRepository;
    @Mock private ReviewImageRepository reviewImageRepository;
    @Mock private Authentication authentication;

    @InjectMocks
    private AppTrailService appTrailService;

    private void givenResolvedUser() {
        when(miniHomeUserResolver.resolveUserId(authentication)).thenReturn(USER_ID);
    }

    private void givenOwnedTrailArt() {
        givenResolvedUser();
        when(galleryImageRepository.findByImageUrlAndOwnerUserIdAndLocationName(
                TRAIL_ART_URL, USER_ID, TRAIL_ART_LOCATION))
                .thenReturn(Optional.of(GalleryImage.builder()
                        .galleryImageId(GALLERY_IMAGE_ID)
                        .imageUrl(TRAIL_ART_URL)
                        .locationName(TRAIL_ART_LOCATION)
                        .build()));
    }

    // ── 정상 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[정상] 본인 TRAIL_ART 이미지는 기존 삭제 경로로 위임되어 연동 삭제된다")
    void deleteTrailArt_ownedTrailArt_delegatesToGalleryImageDeletion() {
        givenOwnedTrailArt();

        appTrailService.deleteTrailArt(authentication, TRAIL_ART_URL);

        verify(miniHomeService).deleteGalleryImage(GALLERY_IMAGE_ID, USER_ID);
    }

    @Test
    @DisplayName("[멱등] 이미 삭제된 이미지 URL 은 예외 없이 아무 것도 하지 않는다")
    void deleteTrailArt_alreadyDeleted_doesNothing() {
        givenResolvedUser();
        when(galleryImageRepository.findByImageUrlAndOwnerUserIdAndLocationName(
                TRAIL_ART_URL, USER_ID, TRAIL_ART_LOCATION))
                .thenReturn(Optional.empty());

        appTrailService.deleteTrailArt(authentication, TRAIL_ART_URL);

        verify(miniHomeService, never()).deleteGalleryImage(any(), any());
    }

    @Test
    @DisplayName("[멱등] 존재하지 않는 URL 이 반복 호출되어도 매번 조용히 종료된다")
    void deleteTrailArt_repeatedCall_staysSilent() {
        givenResolvedUser();
        when(galleryImageRepository.findByImageUrlAndOwnerUserIdAndLocationName(
                TRAIL_ART_URL, USER_ID, TRAIL_ART_LOCATION))
                .thenReturn(Optional.empty());

        appTrailService.deleteTrailArt(authentication, TRAIL_ART_URL);
        appTrailService.deleteTrailArt(authentication, TRAIL_ART_URL);

        verify(miniHomeService, never()).deleteGalleryImage(any(), any());
    }

    // ── 보안: 다른 사용자 이미지 ────────────────────────────────────────

    @Test
    @DisplayName("[보안] 타인 소유 이미지는 조회 단계에서 걸러져 삭제되지 않는다")
    void deleteTrailArt_otherUsersImage_isNeverResolved() {
        givenResolvedUser();
        // 소유자 조건이 userId 로 걸리므로 타인 이미지는 빈 결과가 된다.
        when(galleryImageRepository.findByImageUrlAndOwnerUserIdAndLocationName(
                TRAIL_ART_URL, USER_ID, TRAIL_ART_LOCATION))
                .thenReturn(Optional.empty());

        appTrailService.deleteTrailArt(authentication, TRAIL_ART_URL);

        verify(miniHomeService, never()).deleteGalleryImage(any(), any());
        verifyNoInteractions(s3StorageService);
    }

    // ── 스코프: TRAIL_ART 만 삭제 대상 ───────────────────────────────────

    @Test
    @DisplayName("[스코프] 조회는 locationName=TRAIL_ART 로 고정되어 APP_PHOTO/POST_PHOTO 와 매칭되지 않는다")
    void deleteTrailArt_scopedToTrailArtOnly() {
        givenResolvedUser();
        when(galleryImageRepository.findByImageUrlAndOwnerUserIdAndLocationName(
                TRAIL_ART_URL, USER_ID, TRAIL_ART_LOCATION))
                .thenReturn(Optional.empty());

        appTrailService.deleteTrailArt(authentication, TRAIL_ART_URL);

        verify(galleryImageRepository).findByImageUrlAndOwnerUserIdAndLocationName(
                TRAIL_ART_URL, USER_ID, "TRAIL_ART");
    }

    @Test
    @DisplayName("[입력] APP_PHOTO URL 은 조회 단계에서 TRAIL_ART 로 한정되어 삭제되지 않는다")
    void deleteTrailArt_appPhotoUrl_isNotMatched() {
        String appPhotoUrl = "https://bucket/users/1/app_photo/20260101/b.jpg";
        givenResolvedUser();
        when(galleryImageRepository.findByImageUrlAndOwnerUserIdAndLocationName(
                appPhotoUrl, USER_ID, TRAIL_ART_LOCATION))
                .thenReturn(Optional.empty());

        appTrailService.deleteTrailArt(authentication, appPhotoUrl);

        verify(miniHomeService, never()).deleteGalleryImage(any(), any());
    }

    @Test
    @DisplayName("[입력] POST_PHOTO URL 은 조회 단계에서 TRAIL_ART 로 한정되어 삭제되지 않는다")
    void deleteTrailArt_postPhotoUrl_isNotMatched() {
        String postPhotoUrl = "https://bucket/users/1/post_photo/20260101/c.jpg";
        givenResolvedUser();
        when(galleryImageRepository.findByImageUrlAndOwnerUserIdAndLocationName(
                postPhotoUrl, USER_ID, TRAIL_ART_LOCATION))
                .thenReturn(Optional.empty());

        appTrailService.deleteTrailArt(authentication, postPhotoUrl);

        verify(miniHomeService, never()).deleteGalleryImage(any(), any());
    }

    // ── 입력 검증 ───────────────────────────────────────────────────────

    @Test
    @DisplayName("[입력] 빈 imageUrl 은 인증 조회 없이 조용히 종료된다")
    void deleteTrailArt_blankUrl_returnsWithoutQuery() {
        appTrailService.deleteTrailArt(authentication, "   ");

        verifyNoInteractions(galleryImageRepository, miniHomeService);
    }

    @Test
    @DisplayName("[입력] imageUrl 앞뒤 공백은 trim 후 조회된다")
    void deleteTrailArt_trimsUrlBeforeLookup() {
        givenOwnedTrailArt();

        appTrailService.deleteTrailArt(authentication, "  " + TRAIL_ART_URL + "  ");

        verify(galleryImageRepository).findByImageUrlAndOwnerUserIdAndLocationName(
                TRAIL_ART_URL, USER_ID, TRAIL_ART_LOCATION);
    }

    // ── 기존 경로 동작 유지 ─────────────────────────────────────────────

    @Test
    @DisplayName("[재사용] 소유권/리뷰 가드로 인한 삭제는 위임된 경로가 그대로 예외를 전파한다")
    void deleteTrailArt_delegatedDeletionFailure_propagates() {
        givenOwnedTrailArt();
        doThrow(new IllegalArgumentException("리뷰에 등록된 이미지는 삭제할 수 없습니다."))
                .when(miniHomeService).deleteGalleryImage(GALLERY_IMAGE_ID, USER_ID);

        try {
            appTrailService.deleteTrailArt(authentication, TRAIL_ART_URL);
            Assertions.fail("예외가 전파되어야 합니다");
        } catch (IllegalArgumentException expected) {
            // 기존 deleteGalleryImage 의 예외를 그대로 전달한다(HTTP 매핑을 새로 만들지 않음).
            Assertions.assertEquals(
                    "리뷰에 등록된 이미지는 삭제할 수 없습니다.", expected.getMessage());
        }

        verify(miniHomeService).deleteGalleryImage(GALLERY_IMAGE_ID, USER_ID);
    }

    @Test
    @DisplayName("[재사용] 미니홈 서비스 실패 시 추가 S3 호출은 발생하지 않는다")
    void deleteTrailArt_delegatedDeletionError_doesNotTouchS3Directly() {
        givenOwnedTrailArt();
        doThrow(new IllegalStateException("갤러리를 찾을 수 없습니다."))
                .when(miniHomeService).deleteGalleryImage(GALLERY_IMAGE_ID, USER_ID);

        try {
            appTrailService.deleteTrailArt(authentication, TRAIL_ART_URL);
            Assertions.fail("예외가 전파되어야 합니다");
        } catch (IllegalStateException expected) {
            // 예외는 미니홈 서비스가 만들고, 이 서비스는 S3 를 직접 다루지 않는다.
            Assertions.assertEquals(
                    "갤러리를 찾을 수 없습니다.", expected.getMessage());
        }

        verify(s3StorageService, never()).delete(anyString());
        verify(galleryImageRepository, never()).delete(any());
    }
}