@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {
    private final GroupService groupService;
    private final GroupRepository groupRepository;

    @GetMapping
    public List<GroupPost> getList() {
        return groupRepository.findAll();
    }

    @PostMapping("/{groupId}/join")
    public ResponseEntity<String> join(@PathVariable Long groupId, @AuthenticationPrincipal User user) {
        String result = groupService.joinGroup(groupId, user);
        return ResponseEntity.ok(result);
    }
}

@GetMapping("/{id}")
public ResponseEntity<GroupPost> getGroup(@PathVariable Long id) {
    return groupRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
}