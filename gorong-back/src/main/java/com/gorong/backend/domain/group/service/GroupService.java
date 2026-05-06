@Service
@RequiredArgsConstructor
@Transactional
public class GroupService {
    private final GroupRepository groupRepository;
    private final GroupMemberRepository memberRepository;

    // 모임 만들기
    public GroupPost createGroup(GroupPost groupPost) {
        return groupRepository.save(groupPost);
    }

    // 모임 참여하기 (핵심 로직)
    public String joinGroup(Long groupId, User user) {
        GroupPost group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 모임입니다."));

        // 1. 이미 참여했는지 확인
        if (memberRepository.existsByGroupPostIdAndUserId(groupId, user.getId())) {
            return "이미 참여 중인 모임입니다.";
        }

        // 2. 정원 초과 확인
        long currentCount = memberRepository.countByGroupPostId(groupId);
        if (currentCount >= group.getMaxCapacity()) {
            return "정원이 초과되었습니다.";
        }

        // 3. 참여 등록
        GroupMember member = new GroupMember(group, user);
        memberRepository.save(member);
        return "참여 신청이 완료되었습니다.";
    }
}