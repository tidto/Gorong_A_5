// 경로: domain/group/dto/ChatMessage.java
package com.gorong.backend.domain.group.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ChatMessage {
    private String roomId;
    private String user;
    private String senderEmail;  // ✅ 추가 - 발신자 이메일 (Firebase 기반 식별)
    private Long senderUserId;
    private String text;
    private String sentAt;       // ✅ 추가 - 전송 시각
    private MessageType type;    // ✅ 추가 - 메시지 타입

    public enum MessageType { CHAT, JOIN, LEAVE }
}
