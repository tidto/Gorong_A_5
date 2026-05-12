package com.gorong.backend.domain.group.entity;

import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "group_participant", schema = "gorong_schema") // 📌 스키마 명시
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupParticipant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private GroupPost groupPost;

    private LocalDateTime joinedAt;
}