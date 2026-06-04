package com.gorong.backend.domain.minihome.service;

import com.gorong.backend.domain.minihome.entity.Item;
import com.gorong.backend.domain.minihome.entity.UserItem;
import com.gorong.backend.domain.minihome.repository.ActivityLogRepository;
import com.gorong.backend.domain.minihome.repository.ItemRepository;
import com.gorong.backend.domain.minihome.repository.UserItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * 조건 달성 시 user_item에 보상 아이템을 1회 지급합니다.
 * 기본 아이템(witch_hat, pink_bow)은 Go냥이 생성 시 별도 지급됩니다.
 */
@Service
@RequiredArgsConstructor
public class GoCatItemUnlockService {

    private static final Map<String, String> ITEM_IMAGE_URLS = Map.ofEntries(
            Map.entry("WITCH_HAT", "/assets/cat/overlays/witch_hat_aligned.png"),
            Map.entry("PINK_BOW", "/assets/cat/overlays/pink_bow_neck_aligned.png"),
            Map.entry("CROWN", "/assets/cat/overlays/crown_aligned.png"),
            Map.entry("ROUND_GLASSES", "/assets/cat/overlays/round_glasses_aligned.png"),
            Map.entry("BLUE_CAP", "/assets/cat/overlays/blue_cap_aligned.png")
    );

    private final ActivityLogRepository activityLogRepository;
    private final ItemRepository itemRepository;
    private final UserItemRepository userItemRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void syncUnlocksForUser(Long userId) {
        if (userId == null || userId <= 0) return;

        grantOnce(userId, "WITCH_HAT", "마녀 모자", "HEAD");
        grantOnce(userId, "PINK_BOW", "목 리본", "NECK");

        long eventCount = activityLogRepository.countEventParticipations(userId);
        long reviewCount = activityLogRepository.countReviewActivities(userId);

        if (eventCount >= 1) {
            grantOnce(userId, "BLUE_CAP", "파란 캡모자", "HEAD");
        }
        if (eventCount >= 3) {
            grantOnce(userId, "CROWN", "왕관", "HEAD");
        }
        if (reviewCount >= 3) {
            grantOnce(userId, "ROUND_GLASSES", "동그란 안경", "FACE");
        }
    }

    @Transactional
    public boolean grantOnce(Long userId, String itemCode, String itemName, String itemType) {
        String code = itemCode.trim().toUpperCase();
        Item item = itemRepository.findByItemCode(code).orElseGet(() ->
                itemRepository.save(Item.builder()
                        .itemCode(code)
                        .itemName(itemName)
                        .itemType(itemType)
                        .imageUrl(ITEM_IMAGE_URLS.get(code))
                        .build())
        );
        if (item.getImageUrl() == null || item.getImageUrl().isBlank()) {
            String url = ITEM_IMAGE_URLS.get(code);
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
}
