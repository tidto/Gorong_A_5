package com.gorong.backend.domain.event.entity;

import com.gorong.backend.domain.event.dto.TourItemDto;
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
        this.addr = dto.getAddr1();
        this.mapX = dto.getMapx();
        this.mapY = dto.getMapy();
        this.firstImage = dto.getFirstimage();
        if (dto.getFirstimage2() != null) this.firstImage2 = dto.getFirstimage2();

        this.parking = dto.getParking();
        this.elevator = dto.getElevator();
        this.restroom = dto.getRestroom();
        this.route = dto.getRoute();

        // 행사 기간
        if (dto.getEventStartDate() != null) this.eventStartDate = dto.getEventStartDate();
        if (dto.getEventEndDate() != null)   this.eventEndDate   = dto.getEventEndDate();

        // 문의 전화
        if (dto.getTel() != null) this.tel = dto.getTel();

        String apiCat = dto.getCat1();
        if (apiCat != null) {
            switch (apiCat) {
                case "A01": this.tourCategoryCode = "NA";  break;
                case "A02": this.tourCategoryCode = "VE";  break;
                case "A03": this.tourCategoryCode = "LS";  break;
                case "A04": this.tourCategoryCode = "SH";  break;
                case "A05": this.tourCategoryCode = "FD";  break;
                case "C01": this.tourCategoryCode = "C01"; break;
                default:    this.tourCategoryCode = "ETC";
            }
        }

        if (dto.getOverview() != null) {
            this.description = dto.getOverview();
        }
    }
}