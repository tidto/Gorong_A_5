package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "GALLERY_IMAGE", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GalleryImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "GALLERY_IMAGE_ID")
    private Long galleryImageId;

    @Column(name = "GALLERY_ID", nullable = false)
    private Long galleryId;

    @Column(name = "IMAGE_URL", nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "LOCATION_NAME", columnDefinition = "TEXT")
    private String locationName;

    @Column(name = "TAKEN_AT")
    private OffsetDateTime takenAt;

    @CreationTimestamp
    @Column(name = "CREATE_AT", updatable = false)
    private OffsetDateTime createAt;
}

