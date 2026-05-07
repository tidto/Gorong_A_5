package com.gorong.backend.domain.group.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ChatMessage {
    private String roomId; // 그룹(방) ID
    private String user;   // 보낸 사람
    private String text;   // 메시지 내용
}