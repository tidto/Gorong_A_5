package com.gorong.backend.domain.group.controller;

import com.gorong.backend.domain.group.dto.ChatMessage;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    @MessageMapping("/chat.sendMessage/{roomId}") // 1. 여기서 roomId를 변수로 받습니다.
    @SendTo("/topic/group/{roomId}")             // 2. 받은 roomId 경로로 그대로 돌려줍니다.
    public ChatMessage sendMessage(@DestinationVariable String roomId, @Payload ChatMessage chatMessage) {
        // 프론트에서 받은 데이터에 roomId를 한 번 더 확실히 세팅
        chatMessage.setRoomId(roomId);
        return chatMessage;
    }
}