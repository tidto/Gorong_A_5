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
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * 행사(축제) 카테고리 키워드에 따라 Go냥이 장식 아이템을 1회 지급합니다.
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

    private static final Map<String, String> REWARD_IMAGE_URLS = Map.of(
            "CHERRY_HAT", "/assets/cat/items/cherry-hat.svg",
            "BUNGEOPPANG_BADGE", "/assets/cat/items/bungeoppang-badge.svg",
            "STAR_NECKLACE", "/assets/cat/items/star-necklace.svg",
            "NEON_GLASSES", "/assets/cat/items/neon-glasses.svg",
            "HANBOK", "/assets/cat/items/hanbok.svg",
            "SHELL_ACCESSORY", "/assets/cat/items/shell-accessory.svg"
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

    /** 행사 참여 완료 등 — 키워드 기반 보상 지급 API */
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

    private Optional<RewardSpec> resolveReward(String raw) {
        String t = raw.toLowerCase(Locale.ROOT);
        if (containsAny(t, "벚꽃", "cherry", "벚꽃축제")) {
            return Optional.of(new RewardSpec("CHERRY_HAT", "벚꽃 화관", "HEAD"));
        }
        if (containsAny(t, "야시장", "night market", "야경시장", "night_market", "붕어빵")) {
            return Optional.of(new RewardSpec("BUNGEOPPANG_BADGE", "붕어빵 배지", "ACCESSORY"));
        }
        if (containsAny(t, "별축제", "star festival", "별 축제")) {
            return Optional.of(new RewardSpec("STAR_NECKLACE", "별 목걸이", "ACCESSORY"));
        }
        if (containsAny(t, "전통축제", "전통", "한복", "hanbok")) {
            return Optional.of(new RewardSpec("HANBOK", "한복", "BODY"));
        }
        if (containsAny(t, "바다축제", "바다", "해양", "해변", "shell", "조개")) {
            return Optional.of(new RewardSpec("SHELL_ACCESSORY", "조개 악세", "ACCESSORY"));
        }
        return Optional.empty();
    }

    private static boolean containsAny(String haystack, String... needles) {
        for (String n : needles) {
            if (haystack.contains(n.toLowerCase(Locale.ROOT))) return true;
        }
        return false;
    }

    /** @return true if newly granted, false if already owned */
    private boolean grantOnce(Long userId, RewardSpec spec) {
        Item item = itemRepository.findByItemCode(spec.itemCode()).orElseGet(() ->
                itemRepository.save(Item.builder()
                        .itemCode(spec.itemCode())
                        .itemName(spec.itemName())
                        .itemType(spec.itemType())
                        .imageUrl(REWARD_IMAGE_URLS.get(spec.itemCode()))
                        .build())
        );
        if (item.getImageUrl() == null || item.getImageUrl().isBlank()) {
            String url = REWARD_IMAGE_URLS.get(spec.itemCode());
            if (url != null) {
                item.setImageUrl(url);
                itemRepository.save(item);
            }
        }
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
