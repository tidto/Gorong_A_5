package com.gorong.backend.domain.review.repository;

import com.gorong.backend.domain.review.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    // ─── 사용자별 리뷰 조회 ───
    List<Review> findByUserId(Long userId);

    // ─── 행사별 리뷰 조회 ───
    List<Review> findByEventId(Long eventId);

    // ─── 사용자 + 행사별 리뷰 조회 ───
    List<Review> findByUserIdAndEventId(Long userId, Long eventId);

    // ─── 행사별 리뷰 개수 ───
    Long countByEventId(Long eventId);

    // ─── 행사별 평균 별점 ───
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.eventId = :eventId")
    Optional<Double> findAverageRatingByEventId(@Param("eventId") Long eventId);

    // ─── 특정 행사의 모든 리뷰 (정렬) ───
    @Query("SELECT r FROM Review r WHERE r.eventId = :eventId ORDER BY r.createdAt DESC")
    List<Review> findByEventIdOrderByLatest(@Param("eventId") Long eventId);

    // ─── 별점 높은순 ───
    @Query("SELECT r FROM Review r WHERE r.eventId = :eventId ORDER BY r.rating DESC, r.createdAt DESC")
    List<Review> findByEventIdOrderByRatingDesc(@Param("eventId") Long eventId);

    // ─── 별점 낮은순 ───
    @Query("SELECT r FROM Review r WHERE r.eventId = :eventId ORDER BY r.rating ASC, r.createdAt DESC")
    List<Review> findByEventIdOrderByRatingAsc(@Param("eventId") Long eventId);
}
