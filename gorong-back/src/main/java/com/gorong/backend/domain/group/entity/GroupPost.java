@Entity
@Table(name = "group_post", schema = "gorong_schema") // 스키마 명시
@Getter @Setter
public class GroupPost {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    @Column(columnDefinition = "TEXT")
    private String content;

    private int maxCapacity; // 최대 인원
    private String status; // RECRUITING(모집중), CLOSED(마감)

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User author; // 작성자 (users 테이블 참조)

    @ManyToOne
    @JoinColumn(name = "event_id")
    private Event event; // 대상 행사 (events 테이블 참조)

    private LocalDateTime createdAt = LocalDateTime.now();
}