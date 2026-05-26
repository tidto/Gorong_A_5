package com.gorong.backend.domain.minihome.service;

import com.gorong.backend.domain.minihome.dto.ActivityCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GalleryCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GalleryImageCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeEquipRequestDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeEquipmentsSaveRequestDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeEquipmentDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeItemDto;
import com.gorong.backend.domain.minihome.dto.MiniHomePageResponseDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeResponseDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeUpdateRequestDto;
import com.gorong.backend.domain.minihome.entity.ActivityLog;
import com.gorong.backend.domain.minihome.entity.CatEquip;
import com.gorong.backend.domain.minihome.entity.GalleryImage;
import com.gorong.backend.domain.minihome.entity.GoCat;
import com.gorong.backend.domain.minihome.entity.Item;
import com.gorong.backend.domain.minihome.entity.MiniHome;
import com.gorong.backend.domain.minihome.entity.MiniHomeGallery;
import com.gorong.backend.domain.minihome.entity.UserItem;
import com.gorong.backend.domain.minihome.exception.GalleryNotFoundException;
import com.gorong.backend.domain.minihome.exception.MiniHomeNotFoundException;
import com.gorong.backend.domain.minihome.repository.ActivityLogRepository;
import com.gorong.backend.domain.minihome.repository.CatEquipRepository;
import com.gorong.backend.domain.minihome.repository.GalleryImageRepository;
import com.gorong.backend.domain.minihome.repository.GoCatRepository;
import com.gorong.backend.domain.minihome.repository.ItemRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeGalleryRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeRepository;
import com.gorong.backend.domain.minihome.repository.UserItemRepository;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MiniHomeService {

    private static final Set<String> ALLOWED_SLOTS = Set.of("HEAD", "BODY", "ACCESSORY");

    private final MiniHomeRepository miniHomeRepository;
    private final GoCatRepository goCatRepository;
    private final ActivityLogRepository activityLogRepository;
    private final MiniHomeGalleryRepository miniHomeGalleryRepository;
    private final GalleryImageRepository galleryImageRepository;
    private final CatEquipRepository catEquipRepository;
    private final ItemRepository itemRepository;
    private final UserItemRepository userItemRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    public MiniHomeResponseDto getMiniHome(Long userId) {
        requireUserId(userId);
        MiniHome miniHome = miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(userId)
                .orElseThrow(() -> new MiniHomeNotFoundException("미니홈피가 없습니다. userId=" + userId));
        GoCat cat = goCatRepository.findByMiniHomeId(miniHome.getMiniHomeId()).orElse(null);
        return MiniHomeResponseDto.from(miniHome, cat);
    }

    @Transactional
    public MiniHomeResponseDto createMiniHome(Long userId) {
        requireUserId(userId);

        MiniHome miniHome = miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(userId).orElseGet(() ->
                miniHomeRepository.save(MiniHome.builder()
                        .userId(userId)
                        .userId2(userId)
                        .themeCode("BASIC")
                        .isPublic(true)
                        .build())
        );

        GoCat cat = goCatRepository.findByMiniHomeId(miniHome.getMiniHomeId()).orElseGet(() ->
                goCatRepository.save(GoCat.builder()
                        .userId(userId)
                        .miniHomeId(miniHome.getMiniHomeId())
                        .catName("고냥이")
                        .characterType("BASIC")
                        .appearanceState(defaultAppearance())
                        .build())
        );

        seedStarterItems(userId);

        return MiniHomeResponseDto.from(miniHome, cat);
    }

    @Transactional
    public MiniHomePageResponseDto getOrCreateMiniHomePage(Long userId) {
        if (miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(userId).isEmpty()) {
            createMiniHome(userId);
        } else {
            seedStarterItems(userId);
        }
        return getMiniHomePage(userId);
    }

    @Transactional
    public MiniHomeResponseDto updateMiniHome(Long userId, MiniHomeUpdateRequestDto req) {
        requireUserId(userId);
        if (req == null) throw new IllegalArgumentException("요청 본문이 비어 있습니다.");

        MiniHome miniHome = miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(userId)
                .orElseThrow(() -> new MiniHomeNotFoundException("미니홈피가 없습니다. userId=" + userId));

        if (req.getDescription() != null) miniHome.setDescription(req.getDescription());
        if (req.getThemeCode() != null) miniHome.setThemeCode(req.getThemeCode());
        if (req.getIsPublic() != null) miniHome.setIsPublic(req.getIsPublic());

        miniHomeRepository.save(miniHome);
        GoCat cat = goCatRepository.findByMiniHomeId(miniHome.getMiniHomeId()).orElse(null);
        return MiniHomeResponseDto.from(miniHome, cat);
    }

    public MiniHomePageResponseDto getMiniHomePage(Long userId) {
        requireUserId(userId);

        MiniHome miniHome = miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(userId)
                .orElseThrow(() -> new MiniHomeNotFoundException("미니홈피가 없습니다. userId=" + userId));
        GoCat cat = goCatRepository.findByMiniHomeId(miniHome.getMiniHomeId()).orElse(null);

        List<ActivityLog> activities = activityLogRepository.findByUserIdOrderByCreateAtDesc(
                userId,
                PageRequest.of(0, 30)
        );
        long activityCount = activityLogRepository.countByUserId(userId);

        int temperatureTotal = cat != null ? readTemperatureTotal(cat) : 0;
        int level = calcLevel(temperatureTotal);
        String growthStage = growthStageFromExp(temperatureTotal);

        String ownerNickname = userProfileRepository.findByUserId(userId)
                .map(UserProfile::getNickname)
                .orElse("사용자");

        List<MiniHomeGallery> galleries = miniHomeGalleryRepository.findByMiniHomeIdOrderByCreateAtDesc(miniHome.getMiniHomeId());
        Map<Long, List<GalleryImage>> imagesByGalleryId = galleries.stream().collect(
                java.util.stream.Collectors.toMap(
                        MiniHomeGallery::getGalleryId,
                        g -> galleryImageRepository.findByGalleryIdOrderByCreateAtDesc(g.getGalleryId())
                )
        );

        List<CatEquip> equips = cat != null
                ? catEquipRepository.findByGoCatIdAndIsActiveOrderByEquippedAtDesc(cat.getGoCatId(), true)
                : List.of();

        Map<Long, Item> items = equips.stream()
                .map(CatEquip::getItemId)
                .distinct()
                .map(id -> itemRepository.findById(id).orElse(null))
                .filter(i -> i != null)
                .collect(java.util.stream.Collectors.toMap(Item::getItemId, i -> i));

        return MiniHomePageResponseDto.builder()
                .miniHome(MiniHomeResponseDto.from(miniHome, cat))
                .ownerNickname(ownerNickname)
                .stats(MiniHomePageResponseDto.StatsDto.builder()
                        .activityCount(activityCount)
                        .temperatureTotal(temperatureTotal)
                        .level(level)
                        .growthStage(growthStage)
                        .galleryCount(galleries.size())
                        .build())
                .activities(activities.stream().map(MiniHomePageResponseDto.ActivityDto::from).toList())
                .galleries(galleries.stream().map(g -> MiniHomePageResponseDto.GalleryDto.from(
                        g,
                        imagesByGalleryId.getOrDefault(g.getGalleryId(), List.of())
                )).toList())
                .activeEquips(equips.stream().map(e -> MiniHomePageResponseDto.EquipDto.from(e, items.get(e.getItemId()))).toList())
                .build();
    }

    @Transactional
    public MiniHomePageResponseDto.ActivityDto createActivity(Long userId, ActivityCreateRequestDto req) {
        requireUserId(userId);
        if (req == null) throw new IllegalArgumentException("요청 본문이 비어 있습니다.");
        if (req.getActivityType() == null || req.getActivityType().trim().isEmpty()) {
            throw new IllegalArgumentException("activityType은 필수입니다.");
        }

        return recordActivity(
                userId,
                req.getActivityType(),
                req.getReferenceId(),
                req.getTemperatureChange(),
                req.getTitle(),
                req.getDescription()
        );
    }

    private MiniHomePageResponseDto.ActivityDto recordActivity(
            Long userId,
            String activityType,
            Long referenceId,
            Integer temperatureChange,
            String title,
            String description
    ) {
        int delta = temperatureChange != null ? temperatureChange : defaultTempForType(activityType);
        String normalizedType = activityType == null ? "" : activityType.trim().toUpperCase();
        String resolvedTitle = title != null && !title.isBlank() ? title : defaultTitleForType(normalizedType);
        String resolvedDescription = description;

        ActivityLog saved = activityLogRepository.save(ActivityLog.builder()
                .userId(userId)
                .activityType(normalizedType)
                .referenceId(referenceId)
                .temperatureChange(delta)
                .build());

        applyExpToCat(userId, delta);

        MiniHomePageResponseDto.ActivityDto dto = MiniHomePageResponseDto.ActivityDto.from(saved);
        if ((title != null && !title.isBlank()) || (description != null && !description.isBlank())) {
            return MiniHomePageResponseDto.ActivityDto.builder()
                    .activityId(dto.getActivityId())
                    .activityType(dto.getActivityType())
                    .referenceId(dto.getReferenceId())
                    .temperatureChange(dto.getTemperatureChange())
                    .title(resolvedTitle)
                    .description(resolvedDescription)
                    .createAt(dto.getCreateAt())
                    .build();
        }
        return dto;
    }

    private void applyExpToCat(Long userId, int delta) {
        GoCat cat = goCatRepository.findFirstByUserIdOrderByGoCatIdAsc(userId).orElse(null);
        if (cat == null) return;

        int total = readTemperatureTotal(cat) + delta;
        String stage = growthStageFromExp(total);
        Map<String, Object> state = cat.getAppearanceState() != null ? new HashMap<>(cat.getAppearanceState()) : defaultAppearance();
        state.put("temperatureTotal", total);
        state.put("level", calcLevel(total));
        state.put("growthStage", stage);
        cat.setAppearanceState(state);
        cat.setCharacterType(stage);
        goCatRepository.save(cat);
    }

    @Transactional
    public MiniHomePageResponseDto.GalleryDto createGallery(Long userId, GalleryCreateRequestDto req) {
        requireUserId(userId);
        if (req == null) throw new IllegalArgumentException("요청 본문이 비어 있습니다.");
        if (req.getTitle() == null || req.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("title은 필수입니다.");
        }
        if (req.getTitle().length() > 100) {
            throw new IllegalArgumentException("title은 100자 이하여야 합니다.");
        }

        MiniHome miniHome = miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(userId)
                .orElseThrow(() -> new MiniHomeNotFoundException("미니홈피가 없습니다. userId=" + userId));

        MiniHomeGallery gallery = miniHomeGalleryRepository.save(MiniHomeGallery.builder()
                .miniHomeId(miniHome.getMiniHomeId())
                .title(req.getTitle())
                .description(req.getDescription())
                .build());

        return MiniHomePageResponseDto.GalleryDto.from(gallery, List.of());
    }

    @Transactional
    public MiniHomePageResponseDto.GalleryImageDto addGalleryImage(Long galleryId, GalleryImageCreateRequestDto req) {
        if (galleryId == null || galleryId <= 0) throw new IllegalArgumentException("galleryId는 필수입니다.");
        if (req == null) throw new IllegalArgumentException("요청 본문이 비어 있습니다.");
        if (req.getImageUrl() == null || req.getImageUrl().trim().isEmpty()) {
            throw new IllegalArgumentException("imageUrl은 필수입니다.");
        }

        MiniHomeGallery gallery = miniHomeGalleryRepository.findById(galleryId)
                .orElseThrow(() -> new GalleryNotFoundException("갤러리를 찾을 수 없습니다. galleryId=" + galleryId));

        GalleryImage image = galleryImageRepository.save(GalleryImage.builder()
                .galleryId(gallery.getGalleryId())
                .imageUrl(req.getImageUrl())
                .locationName(req.getLocationName())
                .takenAt(req.getTakenAt())
                .build());

        miniHomeRepository.findById(gallery.getMiniHomeId()).ifPresent(mh ->
                recordActivity(
                        mh.getUserId(),
                        "GALLERY_UPLOADED",
                        image.getGalleryImageId(),
                        20,
                        "갤러리 업로드",
                        req.getImageUrl()
                )
        );

        return MiniHomePageResponseDto.GalleryImageDto.from(image);
    }

    public List<MiniHomeItemDto> getUserItems(Long userId) {
        requireUserId(userId);

        List<UserItem> userItems = userItemRepository.findByUserIdOrderByAcquiredAtDesc(userId);
        if (userItems.isEmpty()) return List.of();

        Map<Long, Item> items = itemRepository.findAllById(userItems.stream().map(UserItem::getItemId).distinct().toList())
                .stream()
                .collect(java.util.stream.Collectors.toMap(Item::getItemId, i -> i));

        return userItems.stream()
                .map(ui -> MiniHomeItemDto.from(ui, items.get(ui.getItemId())))
                .toList();
    }

    public List<MiniHomeEquipmentDto> getEquipments(Long userId) {
        requireUserId(userId);

        GoCat cat = goCatRepository.findFirstByUserIdOrderByGoCatIdAsc(userId)
                .orElseThrow(() -> new IllegalArgumentException("고양이 정보를 찾을 수 없습니다. userId=" + userId));

        List<CatEquip> equips = catEquipRepository.findByGoCatIdAndIsActiveOrderByEquippedAtDesc(cat.getGoCatId(), true);
        if (equips.isEmpty()) return List.of();

        Map<Long, Item> items = itemRepository.findAllById(equips.stream().map(CatEquip::getItemId).distinct().toList())
                .stream()
                .collect(java.util.stream.Collectors.toMap(Item::getItemId, i -> i));

        return equips.stream()
                .map(e -> MiniHomeEquipmentDto.from(e, items.get(e.getItemId())))
                .toList();
    }

    @Transactional
    public MiniHomeEquipmentDto equip(Long userId, MiniHomeEquipRequestDto req) {
        requireUserId(userId);
        if (req == null) throw new IllegalArgumentException("요청 본문이 비어 있습니다.");
        if (req.getItemId() == null) throw new IllegalArgumentException("itemId는 필수입니다.");
        if (req.getSlotType() == null || req.getSlotType().trim().isEmpty()) throw new IllegalArgumentException("slotType은 필수입니다.");

        String slot = normalizeSlot(req.getSlotType());
        if (!ALLOWED_SLOTS.contains(slot)) {
            throw new IllegalArgumentException("slotType은 HEAD, BODY, ACCESSORY 중 하나여야 합니다.");
        }

        // 사용자 보유 아이템 검증(보유하지 않은 아이템 착용 방지)
        if (!userItemRepository.existsByUserIdAndItemId(userId, req.getItemId())) {
            throw new IllegalArgumentException("사용자가 보유하지 않은 아이템입니다. itemId=" + req.getItemId());
        }

        Item item = itemRepository.findById(req.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("아이템을 찾을 수 없습니다. itemId=" + req.getItemId()));

        GoCat cat = goCatRepository.findFirstByUserIdOrderByGoCatIdAsc(userId)
                .orElseThrow(() -> new IllegalArgumentException("고양이 정보를 찾을 수 없습니다. userId=" + userId));

        // 기존 슬롯 착용 해제(소프트 비활성화)
        List<CatEquip> actives = catEquipRepository.findByGoCatIdAndIsActiveAndSlotTypeOrderByEquippedAtDesc(cat.getGoCatId(), true, slot);
        if (!actives.isEmpty()) {
            actives.forEach(e -> e.setIsActive(false));
            catEquipRepository.saveAll(actives);
        }

        CatEquip saved = catEquipRepository.save(CatEquip.builder()
                .goCatId(cat.getGoCatId())
                .itemId(item.getItemId())
                .slotType(slot)
                .isActive(true)
                .build());

        return MiniHomeEquipmentDto.from(saved, item);
    }

    @Transactional
    public void saveEquipments(Long userId, List<MiniHomeEquipmentsSaveRequestDto.SlotEquipDto> equipments) {
        requireUserId(userId);
        if (equipments == null || equipments.isEmpty()) {
            throw new IllegalArgumentException("장착할 슬롯 정보가 필요합니다.");
        }

        for (MiniHomeEquipmentsSaveRequestDto.SlotEquipDto slotEquip : equipments) {
            String slot = normalizeSlot(slotEquip.getSlotType());
            if (!ALLOWED_SLOTS.contains(slot)) {
                throw new IllegalArgumentException("slotType은 HEAD, BODY, ACCESSORY 중 하나여야 합니다.");
            }
            if (slotEquip.getItemId() == null) {
                unequip(userId, slot);
            } else {
                MiniHomeEquipRequestDto equipReq = new MiniHomeEquipRequestDto();
                equipReq.setItemId(slotEquip.getItemId());
                equipReq.setSlotType(slot);
                equip(userId, equipReq);
            }
        }
    }

    @Transactional
    public void unequip(Long userId, String slotType) {
        requireUserId(userId);
        String slot = normalizeSlot(slotType);
        if (!ALLOWED_SLOTS.contains(slot)) {
            throw new IllegalArgumentException("slotType은 HEAD, BODY, ACCESSORY 중 하나여야 합니다.");
        }

        GoCat cat = goCatRepository.findFirstByUserIdOrderByGoCatIdAsc(userId)
                .orElseThrow(() -> new IllegalArgumentException("고양이 정보를 찾을 수 없습니다. userId=" + userId));

        catEquipRepository.findFirstByGoCatIdAndIsActiveAndSlotTypeOrderByEquippedAtDesc(cat.getGoCatId(), true, slot)
                .ifPresent(e -> {
                    e.setIsActive(false);
                    catEquipRepository.save(e);
                });
    }

    private void seedStarterItems(Long userId) {
        grantStarterItem(userId, "STARTER_HAT", "기본 모자", "HEAD");
        grantStarterItem(userId, "STARTER_BODY", "기본 옷", "BODY");
        grantStarterItem(userId, "STARTER_ACC", "기본 리본", "ACCESSORY");
    }

    private void grantStarterItem(Long userId, String itemCode, String itemName, String itemType) {
        Item item = itemRepository.findByItemCode(itemCode).orElseGet(() ->
                itemRepository.save(Item.builder()
                        .itemCode(itemCode)
                        .itemName(itemName)
                        .itemType(itemType)
                        .build())
        );
        if (!userItemRepository.existsByUserIdAndItemId(userId, item.getItemId())) {
            userItemRepository.save(UserItem.builder()
                    .userId(userId)
                    .itemId(item.getItemId())
                    .build());
        }
    }

    private static Map<String, Object> defaultAppearance() {
        Map<String, Object> m = new HashMap<>();
        m.put("temperatureTotal", 0);
        m.put("level", 1);
        m.put("growthStage", "BASIC");
        return m;
    }

    private static int readTemperatureTotal(GoCat cat) {
        if (cat.getAppearanceState() == null) return 0;
        Object v = cat.getAppearanceState().get("temperatureTotal");
        if (v instanceof Number) return ((Number) v).intValue();
        return 0;
    }

    static String growthStageFromExp(int exp) {
        if (exp >= 600) return "MASTER";
        if (exp >= 300) return "ADULT";
        if (exp >= 100) return "TEEN";
        return "BASIC";
    }

    private static int calcLevel(int temperatureTotal) {
        return Math.max(1, (temperatureTotal / 100) + 1);
    }

    private static int defaultTempForType(String type) {
        if (type == null) return 0;
        String t = type.trim().toUpperCase();
        return switch (t) {
            case "REVIEW_WRITTEN", "REVIEW_WRITE", "REVIEW_CREATED" -> 30;
            case "EVENT_PARTICIPATED", "EVENT_PARTICIPATION" -> 50;
            case "GALLERY_UPLOADED", "GALLERY_UPLOAD" -> 20;
            case "ITEM_EQUIP" -> 5;
            default -> 10;
        };
    }

    private static String defaultTitleForType(String type) {
        return switch (type) {
            case "REVIEW_WRITTEN", "REVIEW_WRITE", "REVIEW_CREATED" -> "리뷰 작성";
            case "EVENT_PARTICIPATED", "EVENT_PARTICIPATION" -> "행사 참여";
            case "GALLERY_UPLOADED", "GALLERY_UPLOAD" -> "갤러리 업로드";
            case "ITEM_EQUIP" -> "아이템 장착";
            default -> "활동 기록";
        };
    }

    private static void requireUserId(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId는 필수입니다.");
        }
    }

    private static String normalizeSlot(String slotType) {
        return slotType == null ? "" : slotType.trim().toUpperCase();
    }
}

