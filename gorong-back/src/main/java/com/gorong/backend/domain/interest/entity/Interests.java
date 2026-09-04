package com.gorong.backend.domain.interest.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "interests")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Interests {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "interest_id")
    private Long id;

    @Column(name = "tour_category_code", nullable = false, unique = true, columnDefinition = "TEXT")
    private String tourCategoryCode;

    @Column(name = "interest_name", nullable = false, columnDefinition = "TEXT")
    private String interestName;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;
}