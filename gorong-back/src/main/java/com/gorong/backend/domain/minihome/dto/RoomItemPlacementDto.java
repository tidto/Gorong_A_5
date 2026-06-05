package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoomItemPlacementDto {

    @NotBlank
    private String itemId;

    @Pattern(regexp = "BACKGROUND|FURNITURE|DECOR", message = "type must be BACKGROUND, FURNITURE, or DECOR")
    private String type;

    @Min(0)
    @Max(100)
    private Double x;

    @Min(0)
    @Max(100)
    private Double y;

    private Boolean visible = true;
}
