// 경로: domain/group/dto/PublicChatMessage.java
package com.gorong.backend.domain.group.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * 공개 그룹 채팅 WebSocket 메시지 DTO
 * - catName / characterType / catColor 포함 → 프론트 슬롯 UI에서 미니홈 캐릭터 렌더링
 * - senderId 추가 → 프론트에서 슬롯 클릭 시 /cattower/:userId 이동에 사용
 */
@Getter
@Setter
public class PublicChatMessage {

    /** 그룹 ID (String) */
    private String roomId;

    /** UserProfile 닉네임 */
    private String user;

    /** Firebase 이메일 (클라이언트 → 서버) */
    private String senderEmail;

    /** 유저 숫자 ID — 캣타워 링크(/cattower/:senderId)용 */
    private Long senderId;

    /** 고냥이 이름 (미니홈 GoCat.catName) */
    private String catName;

    /** 성장 단계: BASIC | TEEN | ADULT | MASTER */
    private String characterType;

    /** 고냥이 색상: ORANGE | CREAM | BLACK | GRAY | WHITE */
    private String catColor;

    /** 메시지 본문 */
    private String text;

    /** 전송 시각 HH:mm (KST) */
    private String sentAt;

    /** 제재 이력 기준 마스킹 여부 */
    private boolean masked;

    /** 마스킹 안내 문구 */
    private String maskedLabel;

    private MessageType type;

    public enum MessageType {
        CHAT, JOIN, LEAVE
    }
}
