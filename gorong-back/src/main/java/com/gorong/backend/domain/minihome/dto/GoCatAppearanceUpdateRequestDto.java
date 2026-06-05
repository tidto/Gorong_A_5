package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * GO_CAT.appearance_state JSON 일부 필드만 갱신합니다.
 */
@Getter
@Setter
public class GoCatAppearanceUpdateRequestDto {

    @Pattern(regexp = "SLIM|NORMAL|CHUBBY", message = "bodyType must be SLIM, NORMAL, or CHUBBY")
    private String bodyType;

    @Pattern(regexp = "SOLID|STRIPE|SPOT|CALICO", message = "pattern must be SOLID, STRIPE, SPOT, or CALICO")
    private String pattern;

    @Pattern(regexp = "WHITE|BLACK|GRAY|BROWN|ORANGE|CREAM", message = "invalid color code")
    private String color;

    private String catName;

    @Pattern(regexp = "BASIC_ROOM|FOREST_ROOM|NIGHT_ROOM", message = "roomBackground must be BASIC_ROOM, FOREST_ROOM, or NIGHT_ROOM")
    private String roomBackground;

    @Valid
    private List<RoomItemPlacementDto> roomItems;

    private String headItemCode;
    private String faceItemCode;
    private String neckItemCode;
    private String badgeItemCode;

    /** @deprecated face/neck/badge로 분리 */
    private String accessoryItemCode;

    public void setRoomBackground(String roomBackground) {
        this.roomBackground = roomBackground == null ? null : roomBackground.trim().toUpperCase();
    }

    public void setHeadItemCode(String headItemCode) {
        this.headItemCode = normalizeCode(headItemCode);
    }

    public void setFaceItemCode(String faceItemCode) {
        this.faceItemCode = normalizeCode(faceItemCode);
    }

    public void setNeckItemCode(String neckItemCode) {
        this.neckItemCode = normalizeCode(neckItemCode);
    }

    public void setBadgeItemCode(String badgeItemCode) {
        this.badgeItemCode = normalizeCode(badgeItemCode);
    }

    public void setAccessoryItemCode(String accessoryItemCode) {
        this.accessoryItemCode = normalizeCode(accessoryItemCode);
    }

    private static String normalizeCode(String code) {
        return code == null ? null : code.trim().toLowerCase();
    }

    public void setBodyType(String bodyType) {
        this.bodyType = bodyType == null ? null : bodyType.trim().toUpperCase();
    }

    public void setPattern(String pattern) {
        this.pattern = pattern == null ? null : pattern.trim().toUpperCase();
    }

    public void setColor(String color) {
        if (color == null) {
            this.color = null;
            return;
        }
        String normalized = color.trim().toUpperCase();
        this.color = switch (normalized) {
            case "CHEESE" -> "CREAM";
            case "CALICO" -> "ORANGE";
            default -> normalized;
        };
    }
}
