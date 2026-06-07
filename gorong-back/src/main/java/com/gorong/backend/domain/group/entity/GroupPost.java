package com.gorong.backend.domain.group.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gorong.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
public class GroupPost {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne // 그룹과 유저는 다대일 관계
    @JoinColumn(name = "user_id")
    private User author; // 작성자 정보

    private String title;
    private String content;
    private String location;
    private Integer maxCapacity;
    private String event;

    /** TourAPI contentId (행사 선택 시 저장, 직접 입력 시 null) */
    @Column(name = "event_content_id")
    private String eventContentId;

    private String condition;
    private String meetingDate;
    private String meetingTime;
    private int currentCapacity = 0; // 기본 호스트 1명 시작
    private int waitingCount = 0;// 대기자 수

    @Transient
    private String authorNickname;

    @JsonProperty("authorName")
    public String getAuthorName() {
        if (authorNickname != null && !authorNickname.isBlank()) return authorNickname;
        return (this.author != null) ? this.author.getEmail() : "익명";
    }

    // GroupPost.java에 추가
    private String status = "RECRUITING"; // RECRUITING, CLOSED, FINISHED 등
}