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
        this.addr = dto.getAddr1(); // DTO의 addr1 -> Entity의 addr
        this.mapX = dto.getMapx();  // DTO의 mapx -> Entity의 mapX
        this.mapY = dto.getMapy();  // DTO의 mapy -> Entity의 mapY
        this.firstImage = dto.getFirstimage();

        this.parking = dto.getParking();
        this.elevator = dto.getElevator();
        this.restroom = dto.getRestroom();
        this.route = dto.getRoute();

        String apiCat = dto.getCat1();
        if (apiCat != null) {
            switch (apiCat) {
                case "A01": this.tourCategoryCode = "NA"; break; // 자연관광
                case "A02": this.tourCategoryCode = "VE"; break; // 문화/역사
                case "A03": this.tourCategoryCode = "LS"; break; // 레포츠
                case "A04": this.tourCategoryCode = "SH"; break; // 쇼핑
                case "A05": this.tourCategoryCode = "FD"; break; // 음식
                case "C01": this.tourCategoryCode = "C01"; break; // 추천코스
                default: this.tourCategoryCode = "ETC";
            }
        }

        if (dto.getOverview() != null) {
            this.description = dto  .getOverview();
        }
    }
}