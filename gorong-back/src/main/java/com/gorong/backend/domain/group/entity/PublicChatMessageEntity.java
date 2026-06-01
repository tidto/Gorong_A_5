// 경로: domain/group/entity/PublicChatMessageEntity.java
package com.gorong.backend.domain.group.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

/**
 * 공개 그룹 채팅 메시지 엔티티
 * - 참여 신청 없이 상세 글을 보는 누구나 이용 가능한 채팅방
 * - catName / characterType / catColor 컬럼 추가 → 슬롯 UI에서 미니홈 캐릭터 표시용
 */
@Entity
@Table(name = "public_chat_message", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicChatMessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "sender_email", nullable = false, columnDefinition = "TEXT")
    private String senderEmail;

    /** UserProfile 닉네임 (전송 시점 스냅샷) */
    @Column(name = "sender_nickname", columnDefinition = "TEXT")
    private String senderNickname;

    /** 고냥이 이름 (미니홈 GoCat.catName) */
    @Column(name = "cat_name", columnDefinition = "TEXT")
    private String catName;

    /** 성장 단계: BASIC | TEEN | ADULT | MASTER */
    @Column(name = "character_type", length = 20)
    private String characterType;

    /** 고냥이 색상: ORANGE | CREAM | BLACK | GRAY | WHITE */
    @Column(name = "cat_color", length = 20)
    private String catColor;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @CreationTimestamp
    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;
}