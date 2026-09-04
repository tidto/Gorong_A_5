// 경로: domain/group/controller/PublicChatController.java
package com.gorong.backend.domain.group.controller;

import com.gorong.backend.domain.admin.entity.UserBan;
import com.gorong.backend.domain.admin.service.AdminService;
import com.gorong.backend.domain.group.dto.PublicChatMessage;
import com.gorong.backend.domain.group.entity.PublicChatMessageEntity;
import com.gorong.backend.domain.group.repository.PublicChatMessageRepository;
import com.gorong.backend.domain.minihome.entity.GoCat;
import com.gorong.backend.domain.minihome.repository.GoCatRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeRepository;
import com.gorong.backend.domain.user.entity.User;
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
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class PublicChatController {

    private final SimpMessagingTemplate       messagingTemplate;
    private final PublicChatMessageRepository publicChatMessageRepository;
    private final AdminService                adminService;
    private final UserRepository              userRepository;
    private final UserProfileRepository       userProfileRepository;
    private final GoCatRepository             goCatRepository;
    private final MiniHomeRepository          miniHomeRepository;

    // ── 닉네임 조회 ──────────────────────────────────────────────────
    private String resolveNickname(String email) {
        if (email == null || email.isBlank()) return "익명";
        return userRepository.findByEmail(email)
                .flatMap(user -> userProfileRepository.findByUserId(user.getId()))
                .map(UserProfile::getNickname)
                .orElse(email);
    }

    // ── email → User ID 조회 ─────────────────────────────────────────
    private Long resolveUserId(String email) {
        if (email == null || email.isBlank()) return null;
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElse(null);
    }

    // ── DB에서 GoCat 조회 ────────────────────────────────────────────
    private GoCat resolveGoCat(String email) {
        if (email == null || email.isBlank()) return null;
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return null;
        Long userId = userOpt.get().getId();

        return miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(userId)
                .flatMap(mh -> goCatRepository.findByMiniHomeId(mh.getMiniHomeId()))
                .orElseGet(() ->
                        goCatRepository.findFirstByUserIdOrderByGoCatIdAsc(userId).orElse(null)
                );
    }

    // ── appearanceState 에서 color 추출 ─────────────────────────────
    private String extractColor(GoCat cat) {
        if (cat == null) return "CREAM";
        Map<String, Object> state = cat.getAppearanceState();
        if (state == null) return "CREAM";
        Object color = state.get("color");
        return color != null ? color.toString().toUpperCase() : "CREAM";
    }

    // ── temperatureTotal 기반 성장 단계 계산 ─────────────────────────
    private String growthStage(GoCat cat) {
        if (cat == null) return "BASIC";
        Map<String, Object> state = cat.getAppearanceState();
        if (state == null) return "BASIC";
        Object t = state.get("temperatureTotal");
        int exp = (t instanceof Number) ? ((Number) t).intValue() : 0;
        if (exp >= 600) return "MASTER";
        if (exp >= 300) return "ADULT";
        if (exp >= 100) return "TEEN";
        return "BASIC";
    }

    private UserBan resolveLatestBan(String email) {
        return adminService.getLatestBanByEmail(email);
    }

    private String buildMaskedLabel(UserBan latestBan) {
        if (latestBan == null) {
            return null;
        }
        if (latestBan.getBanDays() != null && latestBan.getBanDays() == 0) {
            return "영구정지된 유저입니다.";
        }
        return "임시차단된 유저입니다.";
    }

    private void applyMaskIfNeeded(PublicChatMessage message, UserBan latestBan) {
        if (latestBan == null || message == null || message.getType() != PublicChatMessage.MessageType.CHAT) {
            return;
        }
        message.setMasked(true);
        message.setMaskedLabel(buildMaskedLabel(latestBan));
        message.setText(message.getMaskedLabel());
    }

    // ── WebSocket: 공개 메시지 수신 ──────────────────────────────────
    @MessageMapping("/public.send/{groupId}")
    public void sendPublicMessage(
            @DestinationVariable String groupId,
            @Payload PublicChatMessage msg
    ) {
        Long   gid         = Long.parseLong(groupId);
        String email       = msg.getSenderEmail();
        String displayName = resolveNickname(email);
        String koreaTime   = ZonedDateTime.now(ZoneId.of("Asia/Seoul"))
                .format(DateTimeFormatter.ofPattern("HH:mm"));
        UserBan latestBan  = resolveLatestBan(email);

        // ── senderId: 항상 DB에서 조회해서 신뢰할 수 있는 값으로 덮어씀 ──
        Long senderId = resolveUserId(email);

        msg.setRoomId(groupId);
        msg.setUser(displayName);
        msg.setSentAt(koreaTime);
        msg.setSenderId(senderId);  // 클라이언트 값 무시, 서버에서 직접 설정

        // ── JOIN: DB에서 GoCat 조회 후 브로드캐스트 (DB 저장 안 함) ──
        if (PublicChatMessage.MessageType.JOIN.equals(msg.getType())) {
            GoCat cat = resolveGoCat(email);
            msg.setCatName(cat != null ? cat.getCatName() : displayName);
            msg.setCharacterType(growthStage(cat));
            msg.setCatColor(extractColor(cat));
            messagingTemplate.convertAndSend("/topic/public/" + groupId, msg);
            return;
        }

        // ── CHAT: catColor/characterType 없으면 DB에서 보완 ──────────
        GoCat cat = resolveGoCat(email);

        String catName = (msg.getCatName() != null && !msg.getCatName().isBlank())
                ? msg.getCatName() : (cat != null ? cat.getCatName() : displayName);
        String characterType = (msg.getCharacterType() != null && !msg.getCharacterType().isBlank())
                ? msg.getCharacterType() : growthStage(cat);
        String catColor = (msg.getCatColor() != null && !msg.getCatColor().isBlank())
                ? msg.getCatColor() : extractColor(cat);

        msg.setCatName(catName);
        msg.setCharacterType(characterType);
        msg.setCatColor(catColor);
        msg.setType(PublicChatMessage.MessageType.CHAT);
        applyMaskIfNeeded(msg, latestBan);

        // ── DB 저장 (senderId 포함) ──
        publicChatMessageRepository.save(
                PublicChatMessageEntity.builder()
                        .groupId(gid)
                        .senderEmail(email != null ? email : "anonymous")
                        .senderId(senderId)
                        .senderNickname(displayName)
                        .catName(catName)
                        .characterType(characterType)
                        .catColor(catColor)
                        .content(msg.getText())
                        .build()
        );

        messagingTemplate.convertAndSend("/topic/public/" + groupId, msg);
    }

    // ── REST: 채팅 이력 조회 ─────────────────────────────────────────
    @GetMapping("/api/public-chat/{groupId}/history")
    @ResponseBody
    public ResponseEntity<List<PublicChatMessage>> getHistory(@PathVariable Long groupId) {
        List<PublicChatMessage> history = publicChatMessageRepository
                .findTop60ByGroupIdOrderBySentAtAsc(groupId)
                .stream()
                .map(entity -> {
                    PublicChatMessage m = new PublicChatMessage();
                    m.setRoomId(String.valueOf(entity.getGroupId()));
                    m.setSenderEmail(entity.getSenderEmail());
                    m.setSenderId(entity.getSenderId());   // ← 추가: 이력에도 senderId 포함
                    m.setUser(entity.getSenderNickname() != null && !entity.getSenderNickname().isBlank()
                            ? entity.getSenderNickname() : entity.getSenderEmail());
                    m.setCatName(entity.getCatName());
                    m.setCharacterType(entity.getCharacterType());
                    m.setCatColor(entity.getCatColor());
                    m.setText(entity.getContent());
                    m.setSentAt(entity.getSentAt()
                            .atZone(ZoneId.of("UTC"))
                            .withZoneSameInstant(ZoneId.of("Asia/Seoul"))
                            .format(DateTimeFormatter.ofPattern("HH:mm")));
                    m.setType(PublicChatMessage.MessageType.CHAT);
                    applyMaskIfNeeded(m, resolveLatestBan(entity.getSenderEmail()));
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(history);
    }
}
