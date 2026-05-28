package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

/**
 * GO_CAT.appearance_state JSON 일부 필드만 갱신합니다.
 * temperatureTotal / level / growthStage 는 활동 API가 관리하므로 이 DTO로 덮어쓰지 않습니다.
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

    /** 선택: 고양이 이름 변경 */
    private String catName;

    @Pattern(regexp = "BASIC_ROOM|FOREST_ROOM|NIGHT_ROOM", message = "roomBackground must be BASIC_ROOM, FOREST_ROOM, or NIGHT_ROOM")
    private String roomBackground;

    /** MVP 장착 — 카탈로그 itemCode (예: witch_hat) */
    private String headItemCode;

    private String accessoryItemCode;

    public void setRoomBackground(String roomBackground) {
        this.roomBackground = roomBackground == null ? null : roomBackground.trim().toUpperCase();
    }

    public void setHeadItemCode(String headItemCode) {
        this.headItemCode = headItemCode == null ? null : headItemCode.trim().toLowerCase();
    }

    public void setAccessoryItemCode(String accessoryItemCode) {
        this.accessoryItemCode = accessoryItemCode == null ? null : accessoryItemCode.trim().toLowerCase();
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
