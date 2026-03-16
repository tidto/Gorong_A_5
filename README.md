# Gorong
ABA 4조 레파지토리

고롱(Gorong) 
go + road + ing

프로젝트 최신 기술 스택 정리

1. 개발 및 빌드 환경 (IDE & Build Tool)
IDE: IntelliJ IDEA (Java 및 Spring Boot 개발 생산성 극대화)
Build Tool: Gradle (유연한 빌드 스크립트 관리 및 Maven 대비 빠른 빌드 속도 확보) 
Version Control: Git / GitHub (Gorong_A_5 레파지토리 활용)

2. 백엔드 아키텍처 (Backend)
Framework: Spring Boot (모듈화된 MVC 구조를 통한 확장성 확보)
Language: Java 25
Database (Polyglot Persistence):
RDBMS: Oracle
DB Management Tool: DBeaver 
Persistence Framework: MyBatis (Mapper를 통한 효율적인 SQL 관리)

4. 프론트엔드 및 인터랙션 (Frontend)
Hybrid Framework: React Native (웹과 앱의 하이브리드 환경 최적화 및 코드 재사용성 확보)
Animation Engine: Rive (사용자 입력에 실시간 반응하는 상태 머신 기반 고냥이 캐릭터 구현)

5. 인프라 및 CI/CD (Infrastructure)
Cloud: AWS EC2 (안정적인 클라우드 컴퓨팅 인프라 제공)
CI/CD: Jenkins (지속적인 통합 및 자동 배포 환경 구축을 통한 품질 관리)
Server: Apache Tomcat

6. 주요 API 연동
문화 정보: 한국관광공사 TourAPI 4.0 (공공데이터 기반 전국 축제 정보 수집)
위치 서비스: Kakao Local API (장소 검색 및 지오펜싱 정확도 향상)

--------------------------------------------------------------------------------
🔍 코드 리뷰 (뱅크샐러드) 채택
출처 - https://blog.banksalad.com/tech/banksalad-code-review-culture/

*효율적인 피드백을 위한 Pn 룰(P1~P5) 적용
온라인 텍스트 기반 소통에서 발생할 수 있는 오해를 줄이고, 리뷰의 강도를 명확히 전달하기 위해 Pn 룰을 사용했습니다.

P1: 꼭 반영해주세요 (Request changes)
리뷰어는 PR의 내용이 서비스에 중대한 오류를 발생할 수 있는 가능성을 잠재하고 있는 등 중대한 코드 수정이 반드시 필요하다고 판단되는 경우, P1 태그를 통해 리뷰 요청자에게 수정을 요청합니다. 리뷰 요청자는 p1 태그에 대해 리뷰어의 요청을 반영하거나, 반영할 수 없는 합리적인 의견을 통해 리뷰어를 설득할 수 있어야 합니다.

P2: 적극적으로 고려해주세요 (Request changes)
작성자는 P2에 대해 수용하거나 만약 수용할 수 없는 상황이라면 적합한 의견을 들어 토론할 것을 권장합니다.

P3: 웬만하면 반영해 주세요 (Comment)
작성자는 P3에 대해 수용하거나 만약 수용할 수 없는 상황이라면 반영할 수 없는 이유를 들어 설명하거나 다음에 반영할 계획을 명시적으로(JIRA 티켓 등으로) 표현할 것을 권장합니다. Request changes 가 아닌 Comment 와 함께 사용됩니다.

P4: 반영해도 좋고 넘어가도 좋습니다 (Approve)
작성자는 P4에 대해서는 아무런 의견을 달지 않고 무시해도 괜찮습니다. 해당 의견을 반영하는 게 좋을지 고민해 보는 정도면 충분합니다.

P5: 그냥 사소한 의견입니다 (Approve)
작성자는 P5에 대해 아무런 의견을 달지 않고 무시해도 괜찮습니다.

우선순위 관리를 위한 D-n 룰 도입
개발 생산성이 높은 시기에 여러 리뷰 요청이 겹치는 문제를 해결하기 위해, PR이 머지되어야 하는 일정을 명시했습니다.

리뷰 우선순위 판단을 돕는 D-n 룰
코드 생산성이 폭발하는 날, 하루에 여러 개의 PR 리뷰 요청이 오기도 합니다. 쌓여있는 코드 리뷰 요청 목록은 고객 임팩트만 보고 달려가는 개발자들의 마음을 불편하게 합니다.

리뷰어는 리뷰를 요청하는 시점에 PR 이 Merge 되어야 하는 일정을 공유하여 리뷰어가 Working day 안에서 스스로 우선순위를 결정하고 개발에 집중할 수 있는 시간을 환경을 만들어 나가고 있습니다.

DD-0 (ASAP)
긴급한 수정사항으로 바로 리뷰해 주세요. 앱의 오류로 인해 장애가 발생하거나, 빌드가 되지 않는 등 긴급 이슈가 발생할 때 사용합니다.

D-N (Within N days)
“Working Day 기준으로 N일 이내에 리뷰해 주세요”

일반적으로 D-2 태그를 많이 사용하며, 중요도가 낮거나 일정이 여유 있는 경우 D-3 ~ D-5 를 사용하기도 합니다.


** 온라인 상에 코드 리뷰를 최소화 하고,바로 묻고 답할 수 있는 현장에 모여서 진행하는 것을 주로 택함**
