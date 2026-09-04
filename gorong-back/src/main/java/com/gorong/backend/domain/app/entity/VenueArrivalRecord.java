package com.gorong.backend.domain.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "venue_arrival_record",
        schema = "gorong_schema",
        uniqueConstraints = @jakarta.persistence.UniqueConstraint(
                name = "uq_user_venue_arrival",
                columnNames = {"user_id", "venue_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VenueArrivalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "arrival_record_id")
    private Long arrivalRecordId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "venue_id", nullable = false, length = 100)
    private String venueId;

    @CreationTimestamp
    @Column(name = "verified_at", nullable = false, updatable = false)
    private OffsetDateTime verifiedAt;
}
