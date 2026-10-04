package com.gorong.backend.domain.review.service;

import com.gorong.backend.domain.app.repository.VenueArrivalRecordRepository;
import com.gorong.backend.domain.event.entity.Event;
import com.gorong.backend.domain.event.repository.EventRepository;
import com.gorong.backend.domain.group.entity.EventParticipation;
import com.gorong.backend.domain.group.repository.EventParticipationRepository;
import com.gorong.backend.domain.review.entity.Review;
import com.gorong.backend.domain.review.entity.ReviewImage;
import com.gorong.backend.domain.review.repository.ReviewImageRepository;
import com.gorong.backend.domain.review.repository.ReviewRepository;
import com.gorong.backend.domain.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final EventParticipationRepository eventParticipationRepository;
    private final EventRepository eventRepository;
    private final VenueArrivalRecordRepository venueArrivalRecordRepository;

    public Review upsertQuickReview(Long userId, Long eventId, Integer rating, String reviewText, String authorName, List<ImagePayload> images) {
        validateRating(rating);
        validateReviewText(reviewText);
        validateAuthorName(authorName);
        validateImageCount(images);

        Review review = reviewRepository.findTopByUserIdAndEventIdOrderByCreatedAtDesc(userId, eventId)
                .orElseGet(() -> Review.builder()
                        .userId(userId)
                        .eventId(eventId)
                        .authorName(authorName)
                        .title("임시 포스팅")
                        .content("")
                        // [버그 수정] rating NOT NULL 제약 위반 방지 — 신규 엔티티 생성 시 rating을 함께 세팅합니다.
                        // 이전에는 빌더에 rating이 없어서 save() 시점에 DB NOT NULL 제약 위반으로 500 에러가 발생했습니다.
                        .rating(rating)
                        .reviewDate(OffsetDateTime.now())
                        .build());

        assertReviewMetaEditable(review, rating, reviewText);

        review.updateQuickReview(rating, reviewText);

        // DB의 content 컬럼 NOT NULL 제약조건 에러를 막기 위해
        // 간편 리뷰 저장 시에도 본문(content) 자리에 한 줄 리뷰 텍스트를 채워줍니다.
        review.updateContent(review.getTitle(), normalizeText(reviewText));

        syncImages(review, images);
        return reviewRepository.save(review);
    }

    public Review publishPosting(Long userId, PostingPayload payload) {
        // [버그 수정 1] eventId null 조기 검증 — null인 채로 DB 쿼리가 실행되면
        // NOT NULL 제약 위반으로 저장이 실패하므로 여기서 명확한 에러를 던집니다.
        if (payload.getEventId() == null) {
            throw new IllegalArgumentException("행사 정보가 누락되었습니다.");
        }

        validateParticipatedEvent(userId, payload.getEventId());
        validateRating(payload.getRating());
        validateReviewText(payload.getReviewText());
        validateTitle(payload.getTitle());
        validateImageCount(payload.getImages());

        Review review = resolvePostingTarget(userId, payload);
        assertReviewMetaEditable(review, payload.getRating(), payload.getReviewText());

        review.updateQuickReview(payload.getRating(), payload.getReviewText());
        review.updateContent(payload.getTitle().trim(), normalizeText(payload.getContents()));
        review.markPublished();
        syncImages(review, payload.getImages());
        return reviewRepository.save(review);
    }

    @Transactional(readOnly = true)
    public Page<Review> getEventReviews(Long eventId, Pageable pageable) {
        return reviewRepository.findByEventIdOrderByLatest(eventId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Review> getPublishedPosts(Pageable pageable) {
        return reviewRepository.findByStatusOrderByCreatedAtDesc(Review.PostStatus.PUBLISHED, pageable);
    }

    @Transactional(readOnly = true)
    public Review getPosting(Long reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("포스팅을 찾을 수 없습니다."));
    }

    @Transactional(readOnly = true)
    public Review getTemplate(Long userId, Long eventId) {
        return reviewRepository.findTopByUserIdAndEventIdOrderByCreatedAtDesc(userId, eventId)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<ParticipatedEventView> getParticipatedEvents(Long userId) {
        Map<Long, ParticipatedEventView> deduplicated = new LinkedHashMap<>();
        for (EventParticipation participation : eventParticipationRepository.findByUserIdOrderByAppliedAtDesc(userId)) {
            Long eventId = parseEventId(participation.getEventContentId());
            if (eventId == null || deduplicated.containsKey(eventId)) {
                continue;
            }
            deduplicated.put(eventId, new ParticipatedEventView(
                    eventId,
                    participation.getEventTitle(),
                    participation.getAppliedAt() == null ? null : participation.getAppliedAt().toString()
            ));
        }
        return new ArrayList<>(deduplicated.values());
    }

    @Transactional(readOnly = true)
    public String resolveEventTitle(Long eventId) {
        if (eventId == null) {
            return "행사 정보 없음";
        }
        return eventRepository.findById(eventId)
                .map(Event::getTitle)
                .filter(title -> !title.isBlank())
                .orElse("행사 #" + eventId);
    }

    @Transactional(readOnly = true)
    public boolean isReviewMetaEditable(Review review) {
        return review.isReviewMetaEditable(OffsetDateTime.now());
    }

    @Transactional(readOnly = true)
    public List<ReviewImage> getImagesByReviewId(Long reviewId) {
        return reviewImageRepository.findByReviewId(reviewId);
    }

    @Transactional
    public void deleteReview(Long reviewId, User user) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다."));

        boolean isAuthor = review.getUserId().equals(user.getId());
        boolean isAdmin  = user.getRoleType() == User.RoleType.ADMIN;

        if (!isAuthor && !isAdmin) {
            throw new IllegalArgumentException("삭제 권한이 없습니다.");
        }

        reviewRepository.delete(review);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // private helpers
    // ──────────────────────────────────────────────────────────────────────────

    private Review resolvePostingTarget(Long userId, PostingPayload payload) {
        // 케이스 A: 기존 포스팅 수정 (reviewId가 넘어온 경우)
        if (payload.getReviewId() != null) {
            Review review = getPosting(payload.getReviewId());
            if (!Objects.equals(review.getUserId(), userId)) {
                throw new IllegalArgumentException("본인 글만 수정할 수 있습니다.");
            }
            return review;
        }

        // 케이스 B: 신규 포스팅 — 같은 행사의 기존 간편 리뷰가 있으면 그걸 업그레이드
        return reviewRepository.findTopByUserIdAndEventIdOrderByCreatedAtDesc(userId, payload.getEventId())
                .orElseGet(() -> {
                    // [버그 수정 2] 신규 엔티티를 즉시 save해서 영속(Managed) 상태로 만든 뒤 반환합니다.
                    // save 없이 transient 상태 객체를 반환하면 이후 syncImages에서 ReviewImage에
                    // review FK가 null인 채로 연결되어 cascade INSERT 시 FK 제약 위반이 발생합니다.
                    Review newReview = Review.builder()
                            .userId(userId)
                            .eventId(payload.getEventId())
                            .authorName(payload.getAuthorName())
                            .title(payload.getTitle())
                            .rating(payload.getRating())
                            .reviewText(payload.getReviewText())
                            .content(normalizeText(payload.getContents()))
                            .reviewDate(OffsetDateTime.now())
                            .build();
                    return reviewRepository.save(newReview);
                });
    }

    private void syncImages(Review review, List<ImagePayload> images) {
        review.getReviewImages().clear();
        if (images == null) {
            return;
        }

        for (int index = 0; index < images.size(); index++) {
            ImagePayload image = images.get(index);
            ReviewImage reviewImage = ReviewImage.builder()
                    .imageUrl(image.getImageUrl())
                    .originalImgName(image.getOriginalImgName())
                    .saveImgName(image.getSaveImgName())
                    .displayOrder(index)
                    .build();
            review.addReviewImage(reviewImage);
        }
    }

    private void validateParticipatedEvent(Long userId, Long eventId) {
        boolean participated = eventParticipationRepository.findByUserIdOrderByAppliedAtDesc(userId).stream()
                .map(EventParticipation::getEventContentId)
                .map(this::parseEventId)
                .anyMatch(id -> Objects.equals(id, eventId));

        if (!participated) {
            throw new IllegalArgumentException("참여한 행사만 포스팅할 수 있습니다.");
        }

        boolean arrived = venueArrivalRecordRepository.existsByUserIdAndVenueId(userId, String.valueOf(eventId));

        if (!arrived) {
            throw new IllegalArgumentException("현장 방문 인증이 완료된 행사만 포스팅할 수 있습니다.");
        }
    }

    private void assertReviewMetaEditable(Review review, Integer requestedRating, String requestedText) {
        if (review.getId() == null) {
            // 아직 DB에 저장되지 않은 신규 객체 → 제약 없음
            return;
        }

        boolean changedRating = requestedRating != null && !Objects.equals(review.getRating(), requestedRating);
        boolean changedText   = requestedText   != null && !normalizeText(requestedText).equals(normalizeText(review.getReviewText()));

        if ((changedRating || changedText) && !review.isReviewMetaEditable(OffsetDateTime.now())) {
            throw new IllegalArgumentException("한 줄 리뷰와 발자국 평점은 작성 후 7일까지만 수정할 수 있습니다.");
        }
    }

    private Long parseEventId(String rawEventId) {
        try {
            return rawEventId == null ? null : Long.valueOf(rawEventId);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private void validateRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("평점은 1점에서 5점 사이여야 합니다.");
        }
    }

    private void validateReviewText(String reviewText) {
        if (normalizeText(reviewText).isBlank()) {
            throw new IllegalArgumentException("한 줄 리뷰를 입력해 주세요.");
        }
    }

    private void validateTitle(String title) {
        if (normalizeText(title).isBlank()) {
            throw new IllegalArgumentException("게시글 제목을 입력해 주세요.");
        }
    }

    private void validateAuthorName(String authorName) {
        if (normalizeText(authorName).isBlank()) {
            throw new IllegalArgumentException("작성자 정보가 없습니다.");
        }
    }

    private void validateImageCount(List<ImagePayload> images) {
        if (images != null && images.size() > 5) {
            throw new IllegalArgumentException("이미지는 최대 5장까지 첨부할 수 있습니다.");
        }
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // inner DTOs
    // ──────────────────────────────────────────────────────────────────────────

    @Getter
    @AllArgsConstructor
    public static class ImagePayload {
        private String imageUrl;
        private String originalImgName;
        private String saveImgName;
    }

    @Getter
    @AllArgsConstructor
    public static class PostingPayload {
        private Long reviewId;
        private Long eventId;
        private String title;
        private String reviewText;
        private Integer rating;
        private String contents;
        private String authorName;
        private List<ImagePayload> images;
    }

    @Getter
    @AllArgsConstructor
    public static class ParticipatedEventView {
        private Long eventId;
        private String title;
        private String appliedAt;
    }
}