package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoomDecorItemDto {

    private String id;

    @Pattern(regexp = "plant|frame|lamp|sofa|rug|toy", message = "type must be plant, frame, lamp, sofa, rug, or toy")
    private String type;

    private Double x;
    private Double y;
}
