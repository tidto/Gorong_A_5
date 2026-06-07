package com.gorong.backend.domain.review.controller;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.review.entity.Review;
import com.gorong.backend.domain.review.entity.ReviewImage;
import com.gorong.backend.domain.review.service.ReviewService;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final UserRepository userRepository;

    @GetMapping("/posts")
    public ResponseEntity<?> getPublishedPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<Review> posts = reviewService.getPublishedPosts(PageRequest.of(page, Math.min(size, 20)));
        return ResponseEntity.ok(PageResponse.from(posts.map(review -> toSummary(review, true))));
    }

    @GetMapping("/posts/{reviewId}")
    public ResponseEntity<?> getPostingDetail(@PathVariable Long reviewId) {
        Review review = reviewService.getPosting(reviewId);
        return ResponseEntity.ok(toDetail(review));
    }

    @PostMapping("/posts")
    public ResponseEntity<?> publishPosting(@RequestBody PublishPostingRequest request, Authentication authentication) {
        try {
            User user = resolveUser(authentication);
            Review saved = reviewService.publishPosting(
                    user.getId(),
                    new ReviewService.PostingPayload(
                            request.getReviewId(),
                            request.getEventId(),
                            request.getTitle(),
                            request.getReviewText(),
                            request.getRating(),
                            request.getContents(),
                            request.getAuthorName(),
                            toImagePayloads(request.getImages())
                    )
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(toDetail(saved));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
    }

    @PutMapping("/posts/{reviewId}")
    public ResponseEntity<?> updatePosting(
            @PathVariable Long reviewId,
            @RequestBody PublishPostingRequest request,
            Authentication authentication
    ) {
        try {
            User user = resolveUser(authentication);
            Review saved = reviewService.publishPosting(
                    user.getId(),
                    new ReviewService.PostingPayload(
                            reviewId,
                            request.getEventId(),
                            request.getTitle(),
                            request.getReviewText(),
                            request.getRating(),
                            request.getContents(),
                            request.getAuthorName(),
                            toImagePayloads(request.getImages())
                    )
            );
            return ResponseEntity.ok(toDetail(saved));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
    }
    @DeleteMapping("/posts/{reviewId}")
    public ResponseEntity<?> deleteReview(
            @PathVariable Long reviewId,
            Authentication authentication
    ) {
        User user = resolveUser(authentication);

        reviewService.deleteReview(reviewId, user);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<?> getEventReviews(
            @PathVariable Long eventId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<Review> reviews = reviewService.getEventReviews(eventId, PageRequest.of(page, Math.min(size, 20)));
        return ResponseEntity.ok(PageResponse.from(reviews.map(review -> toSummary(review, false))));
    }

    @PostMapping("/event/{eventId}/quick")
    public ResponseEntity<?> upsertQuickReview(
            @PathVariable Long eventId,
            @RequestBody QuickReviewRequest request,
            Authentication authentication
    ) {
        try {
            User user = resolveUser(authentication);
            Review saved = reviewService.upsertQuickReview(
                    user.getId(),
                    eventId,
                    request.getRating(),
                    request.getReviewText(),
                    request.getAuthorName(),
                    toImagePayloads(request.getImages())
            );
            return ResponseEntity.ok(toDetail(saved));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
    }

    @GetMapping("/template/{eventId}")
    public ResponseEntity<?> getPostingTemplate(@PathVariable Long eventId, Authentication authentication) {
        User user = resolveUser(authentication);
        Review template = reviewService.getTemplate(user.getId(), eventId);
        return ResponseEntity.ok(template == null ? null : toDetail(template));
    }

    @GetMapping("/my/events")
    public ResponseEntity<?> getParticipatedEvents(Authentication authentication) {
        User user = resolveUser(authentication);
        return ResponseEntity.ok(reviewService.getParticipatedEvents(user.getId()));
    }

    @GetMapping("/{reviewId}/images")
    public ResponseEntity<List<ReviewImageSummary>> getImagesByReviewId(@PathVariable Long reviewId) {
        return ResponseEntity.ok(
                reviewService.getImagesByReviewId(reviewId).stream()
                        .map(this::toImageSummary)
                        .toList()
        );
    }

    private User resolveUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof FirebaseToken firebaseToken)) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }

        return userRepository.findByFirebaseUid(firebaseToken.getUid())
                .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));
    }

    private ReviewSummaryResponse toSummary(Review review, boolean includeContents) {
        String eventTitle = reviewService.resolveEventTitle(review.getEventId());
        return new ReviewSummaryResponse(
                review.getId(),
                review.getEventId(),
                eventTitle,
                review.getUserId(),
                review.getAuthorName(),
                review.getRating(),
                review.getTitle(),
                review.getReviewText(),
                includeContents ? review.getContent() : null,
                review.getStatus().name(),
                reviewService.isReviewMetaEditable(review),
                review.getStatus() == Review.PostStatus.PUBLISHED ? "/posting/" + review.getId() : null,
                review.getCreatedAt(),
                review.getUpdatedAt(),
                review.getReviewImages().stream().map(this::toImageSummary).toList()
        );
    }

    private ReviewDetailResponse toDetail(Review review) {
        String eventTitle = reviewService.resolveEventTitle(review.getEventId());
        return new ReviewDetailResponse(
                review.getId(),
                review.getEventId(),
                eventTitle,
                review.getUserId(),
                review.getAuthorName(),
                review.getRating(),
                review.getTitle(),
                review.getReviewText(),
                review.getContent(),
                review.getStatus().name(),
                reviewService.isReviewMetaEditable(review),
                review.getCreatedAt(),
                review.getUpdatedAt(),
                review.getReviewImages().stream().map(this::toImageSummary).toList()
        );
    }

    private ReviewImageSummary toImageSummary(ReviewImage image) {
        return new ReviewImageSummary(
                image.getId(),
                image.getImageUrl(),
                image.getOriginalImgName(),
                image.getSaveImgName(),
                image.getDisplayOrder()
        );
    }

    private List<ReviewService.ImagePayload> toImagePayloads(List<ImageRequest> images) {
        if (images == null) {
            return List.of();
        }
        return images.stream()
                .map(image -> new ReviewService.ImagePayload(image.getImageUrl(), image.getOriginalImgName(), image.getSaveImgName()))
                .toList();
    }

    public record ReviewImageSummary(Long id, String imageUrl, String originalImgName, String saveImgName, Integer displayOrder) {}

    public record ReviewSummaryResponse(
            Long id,
            Long eventId,
            String eventTitle,
            Long userId,
            String authorName,
            Integer rating,
            String title,
            String reviewText,
            String contents,
            String status,
            boolean reviewMetaEditable,
            String postingPath,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            List<ReviewImageSummary> images
    ) {}

    public record ReviewDetailResponse(
            Long id,
            Long eventId,
            String eventTitle,
            Long userId,
            String authorName,
            Integer rating,
            String title,
            String reviewText,
            String contents,
            String status,
            boolean reviewMetaEditable,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            List<ReviewImageSummary> images
    ) {}

    public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages, boolean last) {
        public static <T> PageResponse<T> from(Page<T> page) {
            return new PageResponse<>(
                    page.getContent(),
                    page.getNumber(),
                    page.getSize(),
                    page.getTotalElements(),
                    page.getTotalPages(),
                    page.isLast()
            );
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageRequest {
        private String imageUrl;
        private String originalImgName;
        private String saveImgName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuickReviewRequest {
        private Integer rating;
        private String reviewText;
        private String authorName;
        private List<ImageRequest> images;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublishPostingRequest {
        private Long reviewId;
        private Long eventId;
        private String title;
        private String reviewText;
        private Integer rating;
        private String contents;
        private String authorName;
        private List<ImageRequest> images;
    }
}
