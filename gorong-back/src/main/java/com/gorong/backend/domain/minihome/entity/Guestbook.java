package com.gorong.backend.domain.minihome.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/**
 * 캣타워 방명록 — 최상위 글(parentGuestbookId=null).
 * 추후 답글은 동일 테이블에 parentGuestbookId를 설정해 확장합니다.
 */
@Entity
@Table(name = "GUESTBOOK", schema = "gorong_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Guestbook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "GUESTBOOK_ID")
    private Long guestbookId;

    /** 방 주인(캣타워 소유자) DB userId */
    @Column(name = "ROOM_OWNER_USER_ID", nullable = false)
    private Long roomOwnerUserId;

    /** 작성자 DB userId */
    @Column(name = "AUTHOR_USER_ID", nullable = false)
    private Long authorUserId;

    @Column(name = "AUTHOR_NICKNAME", nullable = false, columnDefinition = "TEXT")
    private String authorNickname;

    @Column(name = "AUTHOR_PROFILE_IMAGE_URL", columnDefinition = "TEXT")
    private String authorProfileImageUrl;

    @Column(name = "CONTENT", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** null = 최상위 방명록, non-null = 추후 답글 */
    @Column(name = "PARENT_GUESTBOOK_ID")
    private Long parentGuestbookId;

    @CreationTimestamp
    @Column(name = "CREATE_AT", updatable = false)
    private OffsetDateTime createAt;
}
