package com.gorong.backend.domain.event.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.OffsetDateTime;

@Entity
@Table(name = "events")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Event {

    // TourAPI의 contentId와 1:1 매칭이므로 @GeneratedValue를 쓰지 않습니다! (직접 삽입)
    @Id
    @Column(name = "event_id", nullable = false)
    private Long id;

    @Column(name = "title", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(name = "event_start_date", columnDefinition = "TEXT")
    private String eventStartDate;

    @Column(name = "event_end_date", columnDefinition = "TEXT")
    private String eventEndDate;

    @Column(name = "addr", columnDefinition = "TEXT")
    private String addr;

    @Column(name = "tel", columnDefinition = "TEXT")
    private String tel;

    @Column(name = "map_x", columnDefinition = "TEXT")
    private String mapX;

    @Column(name = "map_y", columnDefinition = "TEXT")
    private String mapY;

    @Column(name = "first_image", columnDefinition = "TEXT")
    private String firstImage;

    @Column(name = "first_image2", columnDefinition = "TEXT")
    private String firstImage2;

    @Column(name = "tour_category_code", columnDefinition = "TEXT")
    private String tourCategoryCode;

    @Column(name = "area_code", columnDefinition = "TEXT")
    private String areaCode;

    @Column(name = "sigungu_code", columnDefinition = "TEXT")
    private String sigunguCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "modified_time", columnDefinition = "TEXT")
    private String modifiedTime;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}