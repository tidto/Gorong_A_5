package com.gorong.backend.domain.chatbot.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 사용자별 최근 챗봇 추천 eventId (중복 추천 방지).
 */
@Service
public class ChatRecommendationHistoryService {

    private static final int MAX_PER_USER = 30;
    private static final int STRICT_EXCLUDE = 9;

    private final Map<Long, Deque<Long>> historyByUser = new ConcurrentHashMap<>();

    public Set<Long> resolveExcludeIds(Long userId, List<Long> clientExclude) {
        LinkedHashSet<Long> out = new LinkedHashSet<>();
        if (clientExclude != null) {
            for (Long id : clientExclude) {
                if (id != null && id > 0) {
                    out.add(id);
                }
            }
        }
        if (userId != null && userId > 0) {
            Deque<Long> deque = historyByUser.get(userId);
            if (deque != null) {
                out.addAll(deque);
            }
        }
        return out;
    }

    /** 후보가 부족할 때 최근 N개만 제외하고 나머지는 다시 허용 */
    public Set<Long> strictExcludeOnly(Long userId, List<Long> clientExclude) {
        LinkedHashSet<Long> out = new LinkedHashSet<>();
        if (clientExclude != null) {
            int fromClient = Math.min(3, clientExclude.size());
            for (int i = Math.max(0, clientExclude.size() - fromClient); i < clientExclude.size(); i++) {
                Long id = clientExclude.get(i);
                if (id != null && id > 0) {
                    out.add(id);
                }
            }
        }
        if (userId != null && userId > 0) {
            Deque<Long> deque = historyByUser.get(userId);
            if (deque != null) {
                int n = 0;
                for (Long id : deque) {
                    if (n >= STRICT_EXCLUDE) {
                        break;
                    }
                    out.add(id);
                    n++;
                }
            }
        }
        return out;
    }

    public void recordRecommended(Long userId, List<Long> eventIds) {
        if (userId == null || userId <= 0 || eventIds == null || eventIds.isEmpty()) {
            return;
        }
        Deque<Long> deque = historyByUser.computeIfAbsent(userId, k -> new ArrayDeque<>());
        synchronized (deque) {
            for (Long id : eventIds) {
                if (id == null || id <= 0) {
                    continue;
                }
                deque.remove(id);
                deque.addFirst(id);
            }
            while (deque.size() > MAX_PER_USER) {
                deque.removeLast();
            }
        }
    }
}
