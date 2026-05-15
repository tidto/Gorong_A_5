package com.gorong.backend.domain.review.controller;

import com.gorong.backend.domain.review.entity.Review;
import com.gorong.backend.domain.review.entity.ReviewImage;
import com.gorong.backend.domain.review.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    // ─── 현재 로그인한 사용자 ID 추출 ───
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalArgumentException("인증되지 않은 사용자입니다.");
        }
        // Firebase 필터에서 userId를 principal로 설정했다고 가정
        Object principal = authentication.getPrincipal();
        if (principal instanceof Long) {
            return (Long) principal;
        }
        throw new IllegalArgumentException("유효하지 않은 사용자 정보입니다.");
    }

    // ─── CREATE: 리뷰 작성 ───
    @PostMapping
    public ResponseEntity<?> createReview(@RequestBody ReviewCreateRequest request) {
        try {
            Long currentUserId = getCurrentUserId();

            Review review = reviewService.createReview(
                    currentUserId,
                    request.getEventId(),
                    request.getRating(),
                    request.getTitle(),
                    request.getContent(),
                    request.getAuthorName()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(review);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "리뷰 작성 중 오류가 발생했습니다."));
        }
    }

    // ─── CREATE: 리뷰에 이미지 추가 ───
    @PostMapping("/{reviewId}/images")
    public ResponseEntity<?> addImageToReview(
            @PathVariable Long reviewId,
            @RequestBody ReviewImageRequest request) {
        try {
            Long currentUserId = getCurrentUserId();

            // 권한 확인: 본인의 리뷰인지 체크
            Review review = reviewService.getReviewById(reviewId);
            if (!review.getUserId().equals(currentUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "본인의 리뷰에만 이미지를 추가할 수 있습니다."));
            }

            ReviewImage image = reviewService.addImageToReview(reviewId, request.getImageUrl());
            return ResponseEntity.status(HttpStatus.CREATED).body(image);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "이미지 추가 중 오류가 발생했습니다."));
        }
    }

    // ─── READ: 행사별 리뷰 목록 (최신순) ───
    @GetMapping("/event/{eventId}")
    public ResponseEntity<?> getReviewsByEventId(@PathVariable Long eventId) {
        try {
            List<Review> reviews = reviewService.getReviewsByEventId(eventId);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "리뷰 조회 중 오류가 발생했습니다."));
        }
    }

    // ─── READ: 행사별 리뷰 목록 (별점 높은순) ───
    @GetMapping("/event/{eventId}/rating-high")
    public ResponseEntity<?> getReviewsByEventIdHighRating(@PathVariable Long eventId) {
        try {
            List<Review> reviews = reviewService.getReviewsByEventIdHighRating(eventId);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "리뷰 조회 중 오류가 발생했습니다."));
        }
    }

    // ─── READ: 행사별 리뷰 목록 (별점 낮은순) ───
    @GetMapping("/event/{eventId}/rating-low")
    public ResponseEntity<?> getReviewsByEventIdLowRating(@PathVariable Long eventId) {
        try {
            List<Review> reviews = reviewService.getReviewsByEventIdLowRating(eventId);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "리뷰 조회 중 오류가 발생했습니다."));
        }
    }

    // ─── READ: 사용자별 리뷰 목록 ───
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getReviewsByUserId(@PathVariable Long userId) {
        try {
            List<Review> reviews = reviewService.getReviewsByUserId(userId);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "리뷰 조회 중 오류가 발생했습니다."));
        }
    }

    // ─── READ: 특정 리뷰 조회 ───
    @GetMapping("/{reviewId}")
    public ResponseEntity<?> getReviewById(@PathVariable Long reviewId) {
        try {
            Review review = reviewService.getReviewById(reviewId);
            return ResponseEntity.ok(review);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "리뷰 조회 중 오류가 발생했습니다."));
        }
    }

    // ─── READ: 리뷰 이미지 조회 ───
    @GetMapping("/{reviewId}/images")
    public ResponseEntity<?> getImagesByReviewId(@PathVariable Long reviewId) {
        try {
            List<ReviewImage> images = reviewService.getImagesByReviewId(reviewId);
            return ResponseEntity.ok(images);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "이미지 조회 중 오류가 발생했습니다."));
        }
    }

    // ─── READ: 행사별 리뷰 개수 ───
    @GetMapping("/event/{eventId}/count")
    public ResponseEntity<?> getReviewCountByEventId(@PathVariable Long eventId) {
        try {
            Long count = reviewService.getReviewCountByEventId(eventId);
            Map<String, Long> response = new HashMap<>();
            response.put("count", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "리뷰 개수 조회 중 오류가 발생했습니다."));
        }
    }

    // ─── READ: 행사별 평균 별점 ───
    @GetMapping("/event/{eventId}/average-rating")
    public ResponseEntity<?> getAverageRatingByEventId(@PathVariable Long eventId) {
        try {
            Double avgRating = reviewService.getAverageRatingByEventId(eventId);
            Map<String, Double> response = new HashMap<>();
            response.put("averageRating", avgRating);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "평균 별점 조회 중 오류가 발생했습니다."));
        }
    }

    // ─── UPDATE: 리뷰 수정 (권한 체크) ───
    @PutMapping("/{reviewId}")
    public ResponseEntity<?> updateReview(
            @PathVariable Long reviewId,
            @RequestBody ReviewUpdateRequest request) {
        try {
            Long currentUserId = getCurrentUserId();

            Review updatedReview = reviewService.updateReview(
                    reviewId,
                    currentUserId,
                    request.getRating(),
                    request.getTitle(),
                    request.getContent()
            );

            return ResponseEntity.ok(updatedReview);
        } catch (IllegalArgumentException e) {
            if (e.getMessage().contains("본인의 리뷰만")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "리뷰 수정 중 오류가 발생했습니다."));
        }
    }

    // ─── DELETE: 리뷰 삭제 (권한 체크) ───
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<?> deleteReview(@PathVariable Long reviewId) {
        try {
            Long currentUserId = getCurrentUserId();
            reviewService.deleteReview(reviewId, currentUserId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            if (e.getMessage().contains("본인의 리뷰만")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "리뷰 삭제 중 오류가 발생했습니다."));
        }
    }

    // ─── DELETE: 리뷰 이미지 삭제 (권한 체크) ───
    @DeleteMapping("/{reviewId}/images/{imageId}")
    public ResponseEntity<?> deleteImage(
            @PathVariable Long reviewId,
            @PathVariable Long imageId) {
        try {
            Long currentUserId = getCurrentUserId();
            reviewService.deleteImage(imageId, reviewId, currentUserId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            if (e.getMessage().contains("본인의 리뷰")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "이미지 삭제 중 오류가 발생했습니다."));
        }
    }

    // ─── DTO: 리뷰 생성 요청 ───
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ReviewCreateRequest {
        private Integer rating; // 1~5
        private String title; // 필수
        private String content; // 선택
        private String authorName; // 필수
        private Long eventId; // FK (userId는 현재 로그인한 사용자에서 자동 추출)
    }

    // ─── DTO: 리뷰 수정 요청 ───
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ReviewUpdateRequest {
        private Integer rating; // 1~5
        private String title;
        private String content;
    }

    // ─── DTO: 리뷰 이미지 요청 ───
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ReviewImageRequest {
        private String imageUrl; // Firebase Storage URL 또는 Base64 데이터
    }
}