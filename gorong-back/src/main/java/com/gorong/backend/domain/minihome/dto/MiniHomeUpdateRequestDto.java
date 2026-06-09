package com.gorong.backend.domain.minihome.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MiniHomeUpdateRequestDto {
    private String description;
    private String themeCode;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private Boolean miniHomePublic;

    @JsonProperty("isPublic")
    public Boolean getIsPublic() {
        return miniHomePublic;
    }

    @JsonProperty("isPublic")
    public void setIsPublic(Boolean isPublic) {
        this.miniHomePublic = isPublic;
    }
}
