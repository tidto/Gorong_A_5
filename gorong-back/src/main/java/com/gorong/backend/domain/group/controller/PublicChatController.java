// 경로: domain/group/controller/PublicChatController.java
package com.gorong.backend.domain.group.controller;

import com.gorong.backend.domain.group.dto.PublicChatMessage;
import com.gorong.backend.domain.group.entity.PublicChatMessageEntity;
import com.gorong.backend.domain.group.repository.PublicChatMessageRepository;
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

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 공개 그룹 채팅 컨트롤러
 *
 * [WebSocket 흐름]
 *  클라이언트 → SEND /app/public.send/{groupId}   (메시지 전송)
 *  서버       → BROADCAST /topic/public/{groupId}  (모든 구독자에게)
 *
 * [REST]
 *  GET /api/public-chat/{groupId}/history → 최근 60개 이력 (catName/characterType/catColor 포함)
 *
 * catName / characterType / catColor 는 클라이언트가 미니홈 API를 통해 미리 조회한 뒤 전송합니다.
 * 서버는 그 값을 그대로 DB 저장하고 브로드캐스트합니다.
 */
@Controller
@RequiredArgsConstructor
public class PublicChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final PublicChatMessageRepository publicChatMessageRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    // ── 닉네임 조회 헬퍼 ──────────────────────────────────────────────
    private String resolveNickname(String email) {
        if (email == null || email.isBlank()) return "익명";
        return userRepository.findByEmail(email)
                .flatMap(user -> userProfileRepository.findByUserId(user.getId()))
                .map(UserProfile::getNickname)
                .orElse(email);
    }

    // ── WebSocket: 공개 메시지 전송 ──────────────────────────────────
    @MessageMapping("/public.send/{groupId}")
    public void sendPublicMessage(
            @DestinationVariable String groupId,
            @Payload PublicChatMessage msg
    ) {
        Long gid = Long.parseLong(groupId);
        String email       = msg.getSenderEmail();
        String displayName = resolveNickname(email);

        // catName 없으면 닉네임으로 fallback
        String catName = (msg.getCatName() != null && !msg.getCatName().isBlank())
                ? msg.getCatName()
                : displayName;

        // ── DB 저장 ──
        publicChatMessageRepository.save(
                PublicChatMessageEntity.builder()
                        .groupId(gid)
                        .senderEmail(email != null ? email : "anonymous")
                        .senderNickname(displayName)
                        .catName(catName)
                        .characterType(msg.getCharacterType())
                        .catColor(msg.getCatColor())
                        .content(msg.getText())
                        .build()
        );

        // ── 응답 메시지 구성 ──
        String koreaTime = ZonedDateTime.now(ZoneId.of("Asia/Seoul"))
                .format(DateTimeFormatter.ofPattern("HH:mm"));

        msg.setRoomId(groupId);
        msg.setUser(displayName);
        msg.setCatName(catName);
        msg.setSentAt(koreaTime);
        msg.setType(PublicChatMessage.MessageType.CHAT);

        // ── 전체 구독자에게 브로드캐스트 ──
        messagingTemplate.convertAndSend("/topic/public/" + groupId, msg);
    }

    // ── REST: 공개 채팅 이력 조회 ─────────────────────────────────────
    @GetMapping("/api/public-chat/{groupId}/history")
    @ResponseBody
    public ResponseEntity<List<PublicChatMessage>> getHistory(
            @PathVariable Long groupId
    ) {
        List<PublicChatMessage> history = publicChatMessageRepository
                .findTop60ByGroupIdOrderBySentAtAsc(groupId)
                .stream()
                .map(entity -> {
                    PublicChatMessage msg = new PublicChatMessage();
                    msg.setRoomId(String.valueOf(entity.getGroupId()));
                    msg.setSenderEmail(entity.getSenderEmail());
                    msg.setUser(
                            entity.getSenderNickname() != null && !entity.getSenderNickname().isBlank()
                                    ? entity.getSenderNickname()
                                    : entity.getSenderEmail()
                    );
                    msg.setCatName(entity.getCatName());
                    msg.setCharacterType(entity.getCharacterType());
                    msg.setCatColor(entity.getCatColor());
                    msg.setText(entity.getContent());
                    String koreaTime = entity.getSentAt()
                            .atZone(ZoneId.of("UTC"))
                            .withZoneSameInstant(ZoneId.of("Asia/Seoul"))
                            .format(DateTimeFormatter.ofPattern("HH:mm"));
                    msg.setSentAt(koreaTime);
                    msg.setType(PublicChatMessage.MessageType.CHAT);
                    return msg;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(history);
    }
}