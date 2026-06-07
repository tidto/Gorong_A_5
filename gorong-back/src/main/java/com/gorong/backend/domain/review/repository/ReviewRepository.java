package com.gorong.backend.domain.review.repository;

import com.gorong.backend.domain.review.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByUserId(Long userId);

    List<Review> findByEventId(Long eventId);

    List<Review> findByUserIdAndEventId(Long userId, Long eventId);

    Optional<Review> findTopByUserIdAndEventIdOrderByCreatedAtDesc(Long userId, Long eventId);

    Long countByEventId(Long eventId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.eventId = :eventId")
    Optional<Double> findAverageRatingByEventId(@Param("eventId") Long eventId);

    @Query("SELECT r FROM Review r WHERE r.eventId = :eventId ORDER BY r.createdAt DESC")
    Page<Review> findByEventIdOrderByLatest(@Param("eventId") Long eventId, Pageable pageable);

    @Query("SELECT r FROM Review r WHERE r.eventId = :eventId ORDER BY r.rating DESC, r.createdAt DESC")
    List<Review> findByEventIdOrderByRatingDesc(@Param("eventId") Long eventId);

    @Query("SELECT r FROM Review r WHERE r.eventId = :eventId ORDER BY r.rating ASC, r.createdAt DESC")
    List<Review> findByEventIdOrderByRatingAsc(@Param("eventId") Long eventId);

    Page<Review> findByStatusOrderByCreatedAtDesc(Review.PostStatus status, Pageable pageable);
}
