package com.gorong.backend.domain.group.service;

import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.SendResponse;
import com.gorong.backend.domain.app.entity.AppPushToken;
import com.gorong.backend.domain.app.repository.AppPushTokenRepository;
import com.gorong.backend.domain.group.repository.GroupParticipantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class GroupChatPushNotificationService {
    private final GroupParticipantRepository participantRepository;
    private final AppPushTokenRepository tokenRepository;

    @Async
    public void notifyOtherParticipants(Long groupId, Long senderId, String senderName, String text) {
        if (senderId == null || groupId == null || text == null || text.isBlank()) return;

        try {
            List<Long> recipientIds = participantRepository.findOtherParticipantUserIdsByGroupId(groupId, senderId);
            if (recipientIds.isEmpty()) return;

            List<AppPushToken> registrations = tokenRepository.findByUserIdIn(recipientIds);
            List<String> tokens = registrations.stream()
                    .map(AppPushToken::getToken)
                    .filter(token -> token != null && !token.isBlank())
                    .distinct()
                    .toList();
            if (tokens.isEmpty()) return;

            String body = (senderName == null || senderName.isBlank() ? "새 메시지" : senderName) + ": " + text;
            if (body.length() > 160) body = body.substring(0, 157) + "...";

            MulticastMessage message = MulticastMessage.builder()
                    .addAllTokens(tokens)
                    .setNotification(Notification.builder().setTitle("모임 채팅").setBody(body).build())
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .setNotification(AndroidNotification.builder()
                                    .setChannelId("group-chat")
                                    .build())
                            .build())
                    .putData("type", "GROUP_CHAT")
                    .putData("groupId", String.valueOf(groupId))
                    .build();

            BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
            if (response.getFailureCount() > 0) {
                removeInvalidTokens(tokens, response.getResponses());
                log.warn("모임 채팅 푸시 일부 실패: groupId={}, success={}, failure={}",
                        groupId, response.getSuccessCount(), response.getFailureCount());
            }
        } catch (Exception e) {
            // 알림 실패가 WebSocket 채팅 전송을 방해하지 않게 한다.
            log.warn("모임 채팅 푸시 전송 실패: groupId={}", groupId, e);
        }
    }

    private void removeInvalidTokens(List<String> tokens, List<SendResponse> responses) {
        for (int i = 0; i < responses.size(); i++) {
            SendResponse sendResponse = responses.get(i);
            if (sendResponse.isSuccessful() || sendResponse.getException() == null) continue;
            FirebaseMessagingException exception = sendResponse.getException();
            if (exception.getMessagingErrorCode() != null
                    && "UNREGISTERED".equals(exception.getMessagingErrorCode().name())) {
                tokenRepository.findByToken(tokens.get(i)).ifPresent(tokenRepository::delete);
            }
        }
    }
}
