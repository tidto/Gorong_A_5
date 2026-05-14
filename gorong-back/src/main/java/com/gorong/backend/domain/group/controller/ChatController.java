// 경로: domain/group/controller/ChatController.java
package com.gorong.backend.domain.group.controller;

import com.gorong.backend.domain.group.dto.ChatMessage;
import com.gorong.backend.domain.group.entity.ChatMessageEntity;
import com.gorong.backend.domain.group.repository.ChatMessageRepository;
import com.gorong.backend.domain.group.service.GroupService;
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

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final GroupService groupService;

    // ✅ 메시지 전송 - DB 저장 후 브로드캐스트
    @MessageMapping("/chat.sendMessage/{roomId}")
    public void sendMessage(
            @DestinationVariable String roomId,
            @Payload ChatMessage chatMessage
    ) {
        Long groupId = Long.parseLong(roomId);

        String senderEmail = chatMessage.getSenderEmail();
        String senderDisplay = (senderEmail != null && !senderEmail.isBlank())
                ? senderEmail
                : (chatMessage.getUser() != null ? chatMessage.getUser() : "익명");

        // ✅ DB 저장
        ChatMessageEntity entity = ChatMessageEntity.builder()
                .groupId(groupId)
                .senderEmail(senderDisplay)
                .senderNickname(chatMessage.getUser())
                .content(chatMessage.getText())
                .build();
        chatMessageRepository.save(entity);

        // 응답 구성 후 브로드캐스트
        chatMessage.setRoomId(roomId);
        chatMessage.setSenderEmail(senderDisplay);
        chatMessage.setUser(senderDisplay);
        chatMessage.setSentAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm")));
        chatMessage.setType(ChatMessage.MessageType.CHAT);

        messagingTemplate.convertAndSend("/topic/group/" + roomId, chatMessage);
    }

    // ✅ 채팅 이력 조회 REST API (입장 시 이전 메시지 불러오기용)
    @GetMapping("/api/chat/{groupId}/history")
    @ResponseBody
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable Long groupId) {
        List<ChatMessage> history = chatMessageRepository
                .findByGroupIdOrderBySentAtAsc(groupId)
                .stream()
                .map(entity -> {
                    ChatMessage msg = new ChatMessage();
                    msg.setRoomId(String.valueOf(entity.getGroupId()));
                    msg.setUser(entity.getSenderEmail());
                    msg.setSenderEmail(entity.getSenderEmail());
                    msg.setText(entity.getContent());
                    msg.setSentAt(entity.getSentAt()
                            .format(DateTimeFormatter.ofPattern("HH:mm")));
                    msg.setType(ChatMessage.MessageType.CHAT);
                    return msg;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(history);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        // 💡 [수정] 레포지토리의 deleteById 대신 서비스의 안전 삭제 로직 호출
        try {
            groupService.deleteGroupSafely(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            // 만약 해당 id의 게시글이 없거나 삭제 중 오류가 나면 500 대신 깔끔하게 처리
            e.printStackTrace(); // 콘솔에 에러 원인 출력
            return ResponseEntity.internalServerError().build();
        }
    }
}