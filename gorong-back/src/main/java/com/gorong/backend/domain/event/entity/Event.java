package com.gorong.backend.domain.event.entity;

import com.gorong.backend.domain.event.dto.TourItemDto;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "events")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Event {

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

    @Column(name = "parking", columnDefinition = "TEXT")
    private String parking;

    @Column(name = "elevator", columnDefinition = "TEXT")
    private String elevator;

    @Column(name = "restroom", columnDefinition = "TEXT")
    private String restroom;

    @Column(name = "route", columnDefinition = "TEXT")
    private String route;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public void updateFromDto(TourItemDto dto) {
        this.title = dto.getTitle();
        this.eventStartDate = dto.getEventstartdate();
        this.eventEndDate = dto.getEventenddate();
        this.addr = dto.getAddr1();
        this.tel = dto.getTel();
        this.mapX = dto.getMapx();
        this.mapY = dto.getMapy();
        this.firstImage = dto.getFirstimage();
        this.firstImage2 = dto.getFirstimage2();
        this.areaCode = dto.getAreacode();
        this.sigunguCode = dto.getSigungucode();
        this.modifiedTime = dto.getModifiedtime();
        this.parking = dto.getParking();
        this.elevator = dto.getElevator();
        this.restroom = dto.getRestroom();
        this.route = dto.getRoute();

        String apiCat = dto.getCat1();
        if (apiCat != null) {
            switch (apiCat) {
                case "A01" -> this.tourCategoryCode = "NA";
                case "A02" -> this.tourCategoryCode = "VE";
                case "A03" -> this.tourCategoryCode = "LS";
                case "A04" -> this.tourCategoryCode = "SH";
                case "A05" -> this.tourCategoryCode = "FD";
                case "C01" -> this.tourCategoryCode = "C01";
                default -> this.tourCategoryCode = "ETC";
            }
        }

        if (dto.getOverview() != null) {
            this.description = dto.getOverview();
        }
    }
}
