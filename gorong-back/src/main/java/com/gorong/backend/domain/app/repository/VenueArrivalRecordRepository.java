package com.gorong.backend.domain.app.repository;

import com.gorong.backend.domain.app.entity.VenueArrivalRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VenueArrivalRecordRepository extends JpaRepository<VenueArrivalRecord, Long> {
    Optional<VenueArrivalRecord> findByUserIdAndVenueId(Long userId, String venueId);

    boolean existsByUserIdAndVenueId(Long userId, String venueId);

    List<VenueArrivalRecord> findByUserId(Long userId);
}
