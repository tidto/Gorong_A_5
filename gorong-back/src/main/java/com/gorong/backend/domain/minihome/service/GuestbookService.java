package com.gorong.backend.domain.minihome.service;

import com.gorong.backend.domain.minihome.dto.GuestbookCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GuestbookResponseDto;
import com.gorong.backend.domain.minihome.entity.Guestbook;
import com.gorong.backend.domain.minihome.exception.GuestbookNotFoundException;
import com.gorong.backend.domain.minihome.repository.GuestbookRepository;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GuestbookService {

    private final GuestbookRepository guestbookRepository;
    private final MiniHomeService miniHomeService;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final GoCatItemUnlockService goCatItemUnlockService;

    public List<GuestbookResponseDto> listByRoomOwner(Long roomOwnerId, Long viewerUserId) {
        requireUserId(roomOwnerId);
        miniHomeService.requireViewableMiniHome(roomOwnerId, viewerUserId);

        return guestbookRepository
                .findByRoomOwnerUserIdAndParentGuestbookIdIsNullOrderByCreateAtDesc(roomOwnerId)
                .stream()
                .map(GuestbookResponseDto::from)
                .toList();
    }

    @Transactional
    public GuestbookResponseDto create(Long authorUserId, GuestbookCreateRequestDto request) {
        requireUserId(authorUserId);
        Long roomOwnerId = requireUserId(request.getRoomOwnerId());
        String content = requireContent(request.getContent());

        if (authorUserId.equals(roomOwnerId)) {
            throw new IllegalArgumentException("본인 캣타워에는 방명록을 남길 수 없습니다.");
        }

        miniHomeService.requireViewableMiniHome(roomOwnerId, authorUserId);
        ensureAuthorExists(authorUserId);

        AuthorProfile authorProfile = resolveAuthorProfile(authorUserId);

        Guestbook saved = guestbookRepository.save(Guestbook.builder()
                .roomOwnerUserId(roomOwnerId)
                .authorUserId(authorUserId)
                .authorNickname(authorProfile.nickname())
                .authorProfileImageUrl(authorProfile.profileImageUrl())
                .content(content)
                .parentGuestbookId(null)
                .build());

        goCatItemUnlockService.syncUnlocksForUser(roomOwnerId);

        return GuestbookResponseDto.from(saved);
    }

    @Transactional
    public void delete(Long guestbookId, Long requesterUserId) {
        requireUserId(requesterUserId);

        Guestbook entry = guestbookRepository.findById(guestbookId)
                .orElseThrow(() -> new GuestbookNotFoundException("방명록을 찾을 수 없습니다. id=" + guestbookId));

        boolean isAuthor = requesterUserId.equals(entry.getAuthorUserId());
        boolean isRoomOwner = requesterUserId.equals(entry.getRoomOwnerUserId());

        if (!isAuthor && !isRoomOwner) {
            throw new IllegalArgumentException("방명록을 삭제할 권한이 없습니다.");
        }

        guestbookRepository.delete(entry);
    }

    private void ensureAuthorExists(Long authorUserId) {
        if (!userRepository.existsById(authorUserId)) {
            throw new IllegalArgumentException("작성자 정보를 찾을 수 없습니다.");
        }
    }

    private AuthorProfile resolveAuthorProfile(Long authorUserId) {
        return userProfileRepository.findByUserId(authorUserId)
                .map(profile -> new AuthorProfile(
                        profile.getNickname(),
                        profile.getProfileImageUrl()
                ))
                .orElse(new AuthorProfile("집사", null));
    }

    private static Long requireUserId(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId가 올바르지 않습니다.");
        }
        return userId;
    }

    private static String requireContent(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("내용은 필수입니다.");
        }
        return content.trim();
    }

    private record AuthorProfile(String nickname, String profileImageUrl) {}
}
