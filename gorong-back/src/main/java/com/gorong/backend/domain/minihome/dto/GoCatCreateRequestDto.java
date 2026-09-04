package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

/**
 * 미니홈·고냥이 최초 생성 시 외형·이름을 함께 지정합니다.
 */
@Getter
@Setter
public class GoCatCreateRequestDto {

    @Pattern(regexp = "SLIM|NORMAL|CHUBBY", message = "bodyType must be SLIM, NORMAL, or CHUBBY")
    private String bodyType;

    @Pattern(regexp = "SOLID|STRIPE|SPOT|CALICO", message = "pattern must be SOLID, STRIPE, SPOT, or CALICO")
    private String pattern;

    @Pattern(regexp = "WHITE|BLACK|GRAY|BROWN|ORANGE|CREAM", message = "invalid color code")
    private String color;

    private String catName;

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

    public boolean hasAppearanceFields() {
        return (bodyType != null && !bodyType.isBlank())
                || (pattern != null && !pattern.isBlank())
                || (color != null && !color.isBlank());
    }
}
