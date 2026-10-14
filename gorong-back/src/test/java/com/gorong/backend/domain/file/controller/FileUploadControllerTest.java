package com.gorong.backend.domain.file.controller;

import com.gorong.backend.domain.app.service.AppArrivalService;
import com.gorong.backend.domain.file.dto.FileUploadResponseDto;
import com.gorong.backend.domain.file.model.UploadSourceType;
import com.gorong.backend.domain.file.service.GalleryAutoSaveService;
import com.gorong.backend.domain.file.service.S3StorageService;
import com.gorong.backend.domain.minihome.service.MiniHomeUserResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 트레일 러닝아트가 트레일 기록 없이 S3/갤러리에 올라가는 문제의 재현/방지 테스트.
 */
@ExtendWith(MockitoExtension.class)
class FileUploadControllerTest {

    private static final Long USER_ID = 1L;
    private static final String VENUE_ID = "1118418";
    private static final String S3_KEY = "users/1/trail_art/20260101/trail.jpg";
    private static final String FILE_URL = "https://bucket/" + S3_KEY;

    @Mock
    private S3StorageService s3StorageService;
    @Mock
    private GalleryAutoSaveService galleryAutoSaveService;
    @Mock
    private AppArrivalService appArrivalService;
    @Mock
    private MiniHomeUserResolver miniHomeUserResolver;
    @Mock
    private Authentication authentication;
    @Mock
    private MultipartFile file;

    @InjectMocks
    private FileUploadController controller;

    @BeforeEach
    void setUp() {
        when(miniHomeUserResolver.resolveUserId(authentication)).thenReturn(USER_ID);
    }

    private void givenUploaded() {
        when(s3StorageService.upload(any(), anyLong(), any()))
                .thenReturn(FileUploadResponseDto.builder()
                        .fileUrl(FILE_URL)
                        .key(S3_KEY)
                        .contentType("image/jpeg")
                        .size(1024L)
                        .gallerySaved(false)
                        .build());
    }

    // ── 비정상: 트레일 기록 없는 트레일 러닝아트는 S3 호출 전에 400 ───────

    @Test
    @DisplayName("[비정상] 트레일 러닝아트 + referenceId 없음 -> 400 이고 S3 객체도 만들지 않는다")
    void upload_trailArtWithoutReferenceId_failsBeforeS3Upload() {
        ResponseStatusException ex = catchThrowableOfType(
                () -> controller.upload(file, UploadSourceType.TRAIL_ART, true, null, authentication),
                ResponseStatusException.class
        );

        assertThat(ex).isNotNull();
        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getReason()).contains("트레일 기록");

        // 핵심: S3 업로드가 일어나지 않아 쓰레기 S3 객체도 남지 않는다.
        verify(s3StorageService, never()).upload(any(), any(), any());
        verify(galleryAutoSaveService, never()).append(anyLong(), anyString(), any(), any());
    }

    @Test
    @DisplayName("[비정상] 트레일 러닝아트 + 공백뿐인 referenceId -> 400 이고 S3 업로드도 없다")
    void upload_trailArtWithBlankReferenceId_failsBeforeS3Upload() {
        ResponseStatusException ex = catchThrowableOfType(
                () -> controller.upload(file, UploadSourceType.TRAIL_ART, true, "   ", authentication),
                ResponseStatusException.class
        );

        assertThat(ex).isNotNull();
        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(s3StorageService, never()).upload(any(), any(), any());
    }

    @Test
    @DisplayName("[비정상] 트레일 러닝아트 + 도착 인증 미완료 -> 403 이고 S3 업로드도 없다")
    void upload_trailArtWithoutVerifiedArrival_forbidden() {
        when(appArrivalService.hasVerifiedArrival(authentication, VENUE_ID)).thenReturn(false);

        ResponseStatusException ex = catchThrowableOfType(
                () -> controller.upload(file, UploadSourceType.TRAIL_ART, true, VENUE_ID, authentication),
                ResponseStatusException.class
        );

        assertThat(ex).isNotNull();
        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(s3StorageService, never()).upload(any(), any(), any());
    }

    // ── 정상 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[정상] 트레일 러닝아트 + 트레일 기록 + 도착 인증 완료 -> 업로드 후 갤러리 저장")
    void upload_trailArtWithReferenceId_savesToGallery() {
        givenUploaded();
        when(appArrivalService.hasVerifiedArrival(authentication, VENUE_ID)).thenReturn(true);

        var response = controller.upload(file, UploadSourceType.TRAIL_ART, true, VENUE_ID, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isGallerySaved()).isTrue();
        assertThat(response.getBody().getFileUrl()).isEqualTo(FILE_URL);

        // trim 된 referenceId 로 등록해야 트레일 기록이 정확히 연결된다.
        verify(galleryAutoSaveService).append(USER_ID, FILE_URL, UploadSourceType.TRAIL_ART, VENUE_ID);
    }

    @Test
    @DisplayName("[정상] autoSaveToGallery=false 면 referenceId 없이도 업로드만 된다")
    void upload_trailArtWithoutAutoSave_onlyUploads() {
        givenUploaded();

        var response = controller.upload(file, UploadSourceType.TRAIL_ART, false, null, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isGallerySaved()).isFalse();
        verify(s3StorageService).upload(file, USER_ID, UploadSourceType.TRAIL_ART);
        verify(galleryAutoSaveService, never()).append(anyLong(), anyString(), any(), any());
    }

    // ── 회귀 방지: 기존 APP_PHOTO / POST_PHOTO 흐름 유지 ─────────────────

    @Test
    @DisplayName("[회귀] referenceId 없는 APP_PHOTO 는 기존처럼 자동 저장 갤러리에 등록된다")
    void upload_appPhotoWithoutReferenceId_stillAutoSaves() {
        givenUploaded();

        var response = controller.upload(file, UploadSourceType.APP_PHOTO, true, null, authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isGallerySaved()).isTrue();
        verify(galleryAutoSaveService).append(USER_ID, FILE_URL, UploadSourceType.APP_PHOTO, null);
    }

    @Test
    @DisplayName("[회귀] POST_PHOTO 는 지오펜싱 검증 대상이 아니다")
    void upload_postPhoto_skipsGeofenceCheck() {
        givenUploaded();

        var response = controller.upload(file, UploadSourceType.POST_PHOTO, true, "555", authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(appArrivalService, never()).hasVerifiedArrival(any(), anyString());
        verify(galleryAutoSaveService).append(USER_ID, FILE_URL, UploadSourceType.POST_PHOTO, "555");
    }

    // ── 트랜잭션: S3 업로드 성공 후 갤러리 저장 실패 시 S3 보상 ──────────

    @Test
    @DisplayName("[비정상] 갤러리 저장 실패 시 S3 객체도 삭제하고 예외를 전파한다")
    void upload_gallerySaveFails_deletesS3ObjectAndRethrows() {
        givenUploaded();
        RuntimeException failure = new IllegalStateException("갤러리 저장 실패");
        doThrow(failure).when(galleryAutoSaveService).append(anyLong(), anyString(), any(), isNull());

        assertThatThrownBy(() ->
                controller.upload(file, UploadSourceType.APP_PHOTO, true, null, authentication))
                .isSameAs(failure);

        // DB 롤백돼도 S3 업로드는 되돌릴 수 없으므로 명시적으로 제거해야 한다.
        verify(s3StorageService).delete(S3_KEY);
    }
}
