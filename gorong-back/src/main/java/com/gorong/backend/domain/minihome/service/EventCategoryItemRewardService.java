package com.gorong.backend.domain.minihome.service;

import com.gorong.backend.domain.event.repository.EventRepository;
import com.gorong.backend.domain.minihome.dto.ItemRewardResponseDto;
import com.gorong.backend.domain.minihome.entity.Item;
import com.gorong.backend.domain.minihome.entity.UserItem;
import com.gorong.backend.domain.minihome.repository.ItemRepository;
import com.gorong.backend.domain.minihome.repository.UserItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * 행사(축제) 카테고리 키워드에 따라 Go냥이 장식 아이템을 1회 지급합니다.
 * (장식/BADGE·퇴역 NECK 보상은 제외 — HEAD·FACE·NECK 카탈로그만)
 */
@Service
@RequiredArgsConstructor
public class EventCategoryItemRewardService {

    private static final Set<String> REWARD_ACTIVITY_TYPES = Set.of(
            "REVIEW_WRITTEN",
            "EVENT_ATTEND",
            "EVENT_CHECKIN",
            "FESTIVAL_JOIN",
            "EVENT_PARTICIPATION"
    );

    private final EventRepository eventRepository;
    private final ItemRepository itemRepository;
    private final UserItemRepository userItemRepository;

    @Transactional
    public void tryGrantForActivity(
            Long userId,
            String activityType,
            Long referenceId,
            String title,
            String description
    ) {
        if (userId == null) return;
        String type = activityType == null ? "" : activityType.trim().toUpperCase(Locale.ROOT);
        if (!REWARD_ACTIVITY_TYPES.contains(type) && referenceId == null) {
            return;
        }

        StringBuilder haystack = buildHaystack(title, description);
        if (referenceId != null) {
            eventRepository.findById(referenceId)
                    .ifPresent(e -> haystack.append(' ').append(nullToEmpty(e.getTitle())).append(' ')
                            .append(nullToEmpty(e.getDescription())));
        }

        resolveReward(haystack.toString()).ifPresent(spec -> grantOnce(userId, spec));
    }

    @Transactional
    public ItemRewardResponseDto grantForEventKeywords(Long userId, String eventTitle, String description) {
        if (userId == null) {
            throw new IllegalArgumentException("userId는 필수입니다.");
        }
        StringBuilder haystack = buildHaystack(eventTitle, description);
        Optional<RewardSpec> specOpt = resolveReward(haystack.toString());
        if (specOpt.isEmpty()) {
            return ItemRewardResponseDto.builder()
                    .granted(false)
                    .message("해당 행사에 매칭되는 보상 아이템이 없습니다.")
                    .build();
        }

        RewardSpec spec = specOpt.get();
        boolean newlyGranted = grantOnce(userId, spec);
        return ItemRewardResponseDto.builder()
                .granted(true)
                .itemCode(spec.itemCode())
                .itemName(spec.itemName())
                .message(newlyGranted
                        ? spec.itemName() + " 아이템을 획득했습니다!"
                        : "이미 보유한 아이템입니다.")
                .build();
    }

    private StringBuilder buildHaystack(String title, String description) {
        StringBuilder sb = new StringBuilder();
        sb.append(nullToEmpty(title)).append(' ').append(nullToEmpty(description));
        return sb;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    /** 퇴역 BADGE·NECK 보상 제거 — 필요 시 HEAD/NECK 키워드만 추가 */
    private Optional<RewardSpec> resolveReward(String raw) {
        return Optional.empty();
    }

    /** 다른 캣타워 첫 방문 — 장식 보상 없음 */
    @Transactional
    public void tryGrantVisitorReward(Long visitorUserId) {
        /* no-op: visitor_ribbon retired */
    }

    private boolean grantOnce(Long userId, RewardSpec spec) {
        Item item = itemRepository.findByItemCode(spec.itemCode()).orElseGet(() ->
                itemRepository.save(Item.builder()
                        .itemCode(spec.itemCode())
                        .itemName(spec.itemName())
                        .itemType(spec.itemType())
                        .build())
        );
        if (userItemRepository.existsByUserIdAndItemId(userId, item.getItemId())) {
            return false;
        }
        userItemRepository.save(UserItem.builder()
                .userId(userId)
                .itemId(item.getItemId())
                .build());
        return true;
    }

    private record RewardSpec(String itemCode, String itemName, String itemType) {}
}
