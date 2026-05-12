package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "MINI_HOME_GALLERY", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MiniHomeGallery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "GALLERY_ID")
    private Long galleryId;

    @Column(name = "MINI_HOME_ID", nullable = false)
    private Long miniHomeId;

    @Column(name = "TITLE", length = 100)
    private String title;

    @Column(name = "DESCRIPTION", columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "CREATE_AT", updatable = false)
    private OffsetDateTime createAt;
}

