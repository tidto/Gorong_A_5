// 경로: domain/group/controller/ChatController.java
package com.gorong.backend.domain.group.controller;

import com.gorong.backend.domain.group.dto.ChatMessage;
import com.gorong.backend.domain.group.entity.ChatMessageEntity;
import com.gorong.backend.domain.group.repository.ChatMessageRepository;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import java.time.ZoneId;
import java.time.ZonedDateTime;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;             // ✅ 추가
    private final UserProfileRepository userProfileRepository; // ✅ 추가

    // ✅ 이메일 → 닉네임 조회 헬퍼
    private String getNicknameByEmail(String email) {
        if (email == null || email.isBlank()) return null;
        return userRepository.findByEmail(email)
                .flatMap(user -> userProfileRepository.findByUserId(user.getId()))
                .map(UserProfile::getNickname)
                .orElse(null);
    }

    // ── 메시지 전송 (WebSocket) ─────────────────────────────────────
    @MessageMapping("/chat.sendMessage/{roomId}")
    public void sendMessage(
            @DestinationVariable String roomId,
            @Payload ChatMessage chatMessage
    ) {
        Long groupId = Long.parseLong(roomId);
        String senderEmail = chatMessage.getSenderEmail();

        String nickname = getNicknameByEmail(senderEmail);
        String displayName = (nickname != null) ? nickname : (senderEmail != null ? senderEmail : "익명");

        chatMessageRepository.save(ChatMessageEntity.builder()
                .groupId(groupId)
                .senderEmail(senderEmail)
                .senderNickname(displayName)
                .content(chatMessage.getText())
                .build());

        // ✅ UTC+9 한국 시간으로 변환
        String koreaTime = ZonedDateTime.now(ZoneId.of("Asia/Seoul"))
                .format(DateTimeFormatter.ofPattern("HH:mm"));

        chatMessage.setRoomId(roomId);
        chatMessage.setSenderEmail(senderEmail);
        chatMessage.setUser(displayName);
        chatMessage.setSentAt(koreaTime);  // ← 여기
        chatMessage.setType(ChatMessage.MessageType.CHAT);

        messagingTemplate.convertAndSend("/topic/group/" + roomId, chatMessage);
    }

    // ── 채팅 이력 조회 (REST) ───────────────────────────────────────
    @GetMapping("/api/chat/{groupId}/history")
    @ResponseBody
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable Long groupId) {
        List<ChatMessage> history = chatMessageRepository
                .findByGroupIdOrderBySentAtAsc(groupId)
                .stream()
                .map(entity -> {
                    ChatMessage msg = new ChatMessage();
                    msg.setRoomId(String.valueOf(entity.getGroupId()));
                    msg.setSenderEmail(entity.getSenderEmail());
                    String displayName = (entity.getSenderNickname() != null && !entity.getSenderNickname().isBlank())
                            ? entity.getSenderNickname()
                            : entity.getSenderEmail();
                    msg.setUser(displayName);
                    msg.setText(entity.getContent());

                    // ✅ DB에 저장된 UTC 시간을 한국 시간(UTC+9)으로 변환해서 반환
                    String koreaTime = entity.getSentAt()
                            .atZone(ZoneId.of("UTC"))
                            .withZoneSameInstant(ZoneId.of("Asia/Seoul"))
                            .format(DateTimeFormatter.ofPattern("HH:mm"));
                    msg.setSentAt(koreaTime);  // ← 여기

                    msg.setType(ChatMessage.MessageType.CHAT);
                    return msg;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(history);
    }
}