package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "ACTIVITY_LOG", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ACTIVITY_ID")
    private Long activityId;

    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    @Column(name = "ACTIVITY_TYPE", columnDefinition = "TEXT")
    private String activityType;

    @Column(name = "REFERENCE_ID")
    private Long referenceId;

    @Column(name = "TEMPERATURE_CHANGE")
    private Integer temperatureChange;

    @CreationTimestamp
    @Column(name = "CREATE_AT", updatable = false)
    private OffsetDateTime createAt;

    @PrePersist
    public void prePersist() {
        if (this.temperatureChange == null) this.temperatureChange = 0;
    }
}

