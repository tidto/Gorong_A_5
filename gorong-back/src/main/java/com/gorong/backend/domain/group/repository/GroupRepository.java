public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {
    // 특정 모임에 참여한 인원수 확인
    long countByGroupPostId(Long groupId);
    // 이미 참여한 유저인지 확인
    boolean existsByGroupPostIdAndUserId(Long groupId, Long userId);
}