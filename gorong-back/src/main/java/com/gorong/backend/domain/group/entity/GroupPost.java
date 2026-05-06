package com.gorong.backend.domain.group.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class GroupPost {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String content;
    private String location;
    private Integer maxCapacity;
    private String event;
    private String condition;
    private String meetingDate;
    private String meetingTime;
    private int currentCapacity = 1; // 기본 호스트 1명 시작
    private int waitingCount = 0;    // 대기자 수
}