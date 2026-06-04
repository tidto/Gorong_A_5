package com.gorong.backend.domain.minihome.dto;

import com.gorong.backend.domain.minihome.entity.Guestbook;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class GuestbookResponseDto {

    private Long guestbookId;
    private Long roomOwnerUserId;
    private Long authorUserId;
    private String authorNickname;
    private String authorProfileImageUrl;
    private String content;
    private Long parentGuestbookId;
    private OffsetDateTime createAt;

    public static GuestbookResponseDto from(Guestbook entity) {
        return GuestbookResponseDto.builder()
                .guestbookId(entity.getGuestbookId())
                .roomOwnerUserId(entity.getRoomOwnerUserId())
                .authorUserId(entity.getAuthorUserId())
                .authorNickname(entity.getAuthorNickname())
                .authorProfileImageUrl(entity.getAuthorProfileImageUrl())
                .content(entity.getContent())
                .parentGuestbookId(entity.getParentGuestbookId())
                .createAt(entity.getCreateAt())
                .build();
    }
}
