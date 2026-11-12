# 07. 자주 겪는 문제

## 백엔드

| 증상 | 원인과 해결 |
|---|---|
| `Firebase Admin SDK 초기화 실패!` | `gorong-back/src/main/resources/serviceAccountKey.json`이 없거나 파일 이름이 다릅니다. [03-firebase](03-firebase.md) 5번을 다시 확인하세요. |
| `Set XXX in gorong-back/.env` | 해당 변수가 비어 있습니다. `.env`를 채우세요. |
| DB 연결 실패 (`Connection refused`) | DB가 꺼져 있거나 포트가 다릅니다. `docker ps`로 `gorong-db`가 떠 있는지, `.env`의 `DB_PORT`가 맞는지 확인하세요. |
| `5432` 포트 충돌 | PC의 다른 PostgreSQL이 사용 중입니다. `.env`에서 `DB_PORT=5433`으로 바꾸고 DB를 다시 실행하세요. |
| `relation "..." does not exist` | 테이블이 없습니다. `JPA_DDL_AUTO=update`로 한 번 실행하세요. ([04-database](04-database.md)) |
| `type "geometry" does not exist` | PostGIS 확장이 없습니다. `CREATE EXTENSION IF NOT EXISTS postgis;`를 `gorong_db`에서 실행하세요. |
| `Port 8080 was already in use` | 다른 프로그램이 8080을 쓰고 있습니다. 해당 프로그램을 종료하세요. |
| 빌드 시 Java 버전 오류 | JDK 25가 설치되어 있는지 `java -version`으로 확인하세요. |
| Windows에서 `run-local.sh`가 실행되지 않음 | PowerShell 대신 **Git Bash**에서 `bash run-local.sh`를 실행하세요. |

## 로그인, 인증

| 증상 | 원인과 해결 |
|---|---|
| 로그인은 되는데 API가 **401** | 웹/앱의 Firebase 설정과 백엔드의 `serviceAccountKey.json`이 **서로 다른 Firebase 프로젝트**일 때 생깁니다. 같은 프로젝트에서 받았는지 확인하세요. |
| 회원가입/로그인 창에서 오류 | Authentication에서 **이메일/비밀번호**를 사용 설정했는지, 승인된 도메인에 `localhost`가 있는지 확인하세요. |
| 채팅이 안 열리고 `permission-denied` | Firestore 규칙이 게시되지 않았습니다. `firestore.rules`를 규칙 탭에 붙여 넣고 **게시**했는지 확인하세요. |

## 지도 (Kakao)

| 증상 | 원인과 해결 |
|---|---|
| 지도가 하얗게 나오거나 보이지 않음 | ① **JavaScript 키**를 넣었는지(REST 키가 아님) ② 카카오맵 **사용 설정 ON** ③ **JavaScript SDK 도메인**에 `http://localhost:3000`을 등록했는지 확인하세요. |
| 포트를 바꿔 실행했는데 지도가 안 나옴 | 접속 주소(포트)를 JavaScript SDK 도메인에 다시 등록하세요. |
| 앱(Expo Go)에서만 지도가 안 나옴 | 앱 지도는 WebView에서 불러옵니다. 위 항목을 확인한 뒤, JavaScript SDK 도메인에 앱에서 사용하는 주소도 등록해 보세요. |

## 외부 API

| 증상 | 원인과 해결 |
|---|---|
| 주소 검색이 안 됨 | **검색 API** 승인키를 넣었는지(팝업 API 아님), 승인키가 **만료**되지 않았는지 확인하세요. |
| 행사/관광 정보가 비어 있음 | 공공데이터포털에서 서비스가 **승인**되었는지, **Decoding** 키를 넣었는지 확인하세요. 승인 직후에는 몇 분~수 시간 걸릴 수 있습니다. |
| 응답에 `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` (등록되지 않은 서비스키) | 키가 틀렸거나, 해당 서비스를 **활용신청하지 않은** 경우입니다. 국문 관광정보 서비스와 무장애 여행정보 서비스를 모두 신청했는지 확인하세요. |
| 응답에 `NO_OPENAPI_SERVICE_ERROR` (서비스가 없거나 폐기됨) | 폐기된 이전 버전 주소를 호출하는 경우입니다. 고롱은 `KorService2`, `KorWithService2`를 사용합니다. |
| 챗봇이 503 또는 모델 오류 | `GEMINI_API_KEY`가 비어 있거나, `GEMINI_MODEL` 이름이 더 이상 제공되지 않는 모델일 수 있습니다. AI Studio에서 현재 모델 이름을 확인해 바꾸세요. |
| 날씨가 표시되지 않음 | OpenWeatherMap 키는 발급 직후 활성화까지 시간이 걸려 401이 날 수 있습니다. 잠시 뒤 다시 시도하세요. 날씨 키는 선택 사항입니다. |

## 앱 (Expo Go)

| 증상 | 원인과 해결 |
|---|---|
| `Project is incompatible with this version of Expo Go` | Expo Go와 프로젝트의 SDK 버전이 다릅니다. 이 프로젝트는 **SDK 54**입니다. [01-prerequisites](01-prerequisites.md)의 Expo Go 항목을 확인하세요. |
| QR을 스캔해도 연결되지 않음 | PC와 휴대폰이 **같은 Wi-Fi**인지 확인하세요. 회사/학교/공용 Wi-Fi는 기기 간 통신을 막는 경우가 있습니다. 휴대폰 핫스팟으로 PC를 연결해 보는 방법도 있습니다. |
| 앱에서 서버 요청이 실패(타임아웃) | `EXPO_PUBLIC_API_BASE_URL`이 `http://내IP:8080/api/v1`인지 확인하세요. 휴대폰 브라우저에서 `http://내IP:8080`을 열어 응답이 오는지 확인하고, 안 오면 PC **방화벽**에서 8080 포트를 허용하세요. |
| `.env`를 고쳤는데 반영되지 않음 | Expo를 종료하고 `npx expo start -c`로 다시 시작하세요. |
| 푸시 알림이 동작하지 않음 | Expo Go에서는 **원격 푸시 알림이 지원되지 않습니다.** 푸시 관련 경고는 무시해도 되며, 알림 기능은 별도 개발 빌드가 필요합니다. |

## 이미지

| 증상 | 원인과 해결 |
|---|---|
| 업로드한 이미지가 보이지 않음 | `APP_STORAGE_BASE_URL`의 주소가 접속 기기에서 열리는 주소인지 확인하세요. 휴대폰에서는 `http://내IP:8080`이어야 합니다. |
| IP를 바꾼 뒤 이전 이미지가 깨짐 | 이미지 주소가 업로드 당시 IP로 저장되어 있기 때문입니다. 새로 업로드하세요. |
| 이미지 주소가 401 | 백엔드를 최신 상태로 다시 실행했는지 확인하세요. (`/uploads/**`는 로그인 없이 열려 있어야 합니다) |

## 그래도 해결되지 않으면

- 백엔드 콘솔 로그의 **오류 메시지 첫 줄**을 확인하세요.
- 웹 브라우저에서 `F12 → Console / Network` 탭의 오류를 확인하세요.
- DB를 처음부터 다시 만들려면: `docker compose --env-file gorong-back/.env down -v` 후 [04-database](04-database.md)부터 다시 진행하세요.
