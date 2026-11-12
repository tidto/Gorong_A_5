# 03. Firebase 설정

고롱은 Firebase를 아래 용도로 사용합니다. 본인 계정에서 **새 프로젝트**를 만들어 사용합니다.

| 기능 | 용도 |
|---|---|
| Authentication | 회원가입, 로그인 (백엔드가 로그인 토큰을 검증) |
| Firestore | 행사장 익명 채팅, 모임 채팅, 위치 공유 |

> 웹과 앱은 **같은 Firebase 프로젝트**를 사용합니다. 백엔드의 서비스 계정 키도 **같은 프로젝트**에서 받아야 합니다.

## 1. 프로젝트 만들기

1. https://console.firebase.google.com 에 Google 계정으로 로그인합니다.
2. **프로젝트 만들기** (또는 *프로젝트 추가*)를 누릅니다.
3. 프로젝트 이름에 `gorong` 을 입력합니다. (프로젝트 ID는 `gorong-xxxxx`처럼 자동으로 붙습니다)
4. Google 애널리틱스는 **사용 안 함**으로 해도 됩니다.
5. **프로젝트 만들기**를 누르고 완료될 때까지 기다립니다.

## 2. 웹 앱 등록 (웹, 앱 공용 설정값 받기)

1. 프로젝트 개요 화면에서 웹 아이콘 **`</>`** 을 누릅니다.
2. 앱 닉네임에 `gorong-web` 을 입력합니다. **Firebase Hosting은 체크하지 않습니다.**
3. **앱 등록**을 누르면 `firebaseConfig` 코드가 나옵니다. 아래 6개 값을 복사해 둡니다.

| firebaseConfig 항목 | 웹 `.env` | 앱 `.env` |
|---|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` | `EXPO_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` | `EXPO_PUBLIC_FIREBASE_APP_ID` |

나중에 다시 보려면 **프로젝트 설정(톱니바퀴) → 일반 → 내 앱**에서 확인할 수 있습니다.

> 앱(Expo)도 **같은 웹 앱의 설정값**을 사용합니다. 앱용으로 따로 등록할 필요가 없습니다.

## 3. Authentication (로그인)

1. 왼쪽 메뉴 **빌드 → Authentication** → **시작하기**
2. **Sign-in method(로그인 방법)** 탭에서 **이메일/비밀번호**를 선택해 **사용 설정** 후 저장합니다.
3. **설정 → 승인된 도메인**에 `localhost`가 있는지 확인합니다. (기본으로 들어 있습니다. 없으면 추가하세요)

> 회원가입을 해 본 뒤 **Authentication → 사용자** 탭에 계정이 보이면 정상입니다.

## 4. Firestore (채팅, 위치 공유)

1. 왼쪽 메뉴 **빌드 → Firestore Database** → **데이터베이스 만들기**
2. 데이터베이스 ID는 `(default)` 그대로 둡니다.
3. 위치는 **asia-northeast3 (서울)** 을 선택합니다.
4. 보안 규칙 모드는 **프로덕션 모드로 시작**을 선택하고 **만들기**를 누릅니다.
5. 생성이 끝나면 **규칙** 탭을 엽니다.
6. 저장소 루트의 **`firestore.rules`** 파일 내용을 **전부 복사**해 규칙 편집창의 내용을 모두 지우고 붙여 넣은 뒤 **게시**를 누릅니다.

규칙 요약:

| 컬렉션 | 허용 |
|---|---|
| `anonymous_chats/{행사장}/messages` | 로그인한 사용자가 읽기, 본인 ID로 메시지 작성(수정/삭제 불가) |
| `group_rooms` | 로그인한 사용자가 읽기, 멤버만 생성/수정(삭제 불가) |
| `group_locations/{그룹}/members/{사용자}` | 로그인한 사용자가 읽기, 본인 위치만 쓰기 |
| 그 외 | 전부 거부 |

## 5. 서비스 계정 키 (백엔드용)

백엔드가 로그인 토큰을 검증하는 데 사용합니다.

1. **프로젝트 설정(톱니바퀴) → 서비스 계정** 탭을 엽니다.
2. **새 비공개 키 생성**을 누르고 JSON 파일을 내려받습니다.
3. 파일 이름을 **`serviceAccountKey.json`** 으로 바꿉니다.
4. 아래 위치에 넣습니다.

```
gorong-back/src/main/resources/serviceAccountKey.json
```

> 🔒 이 파일은 **프로젝트 전체 권한을 가진 비밀 키**입니다. `.gitignore`에 등록되어 있지만, 절대 공유하거나 커밋하지 마세요.
> 파일이 없으면 백엔드가 `Firebase Admin SDK 초기화 실패!` 오류로 시작되지 않습니다.

## 완료 체크리스트

- [ ] 프로젝트 `gorong` 생성
- [ ] 웹 앱 등록 후 설정값 6개 메모
- [ ] 이메일/비밀번호 로그인 사용 설정
- [ ] Firestore 데이터베이스 생성 + `firestore.rules` 게시
- [ ] `serviceAccountKey.json`을 `gorong-back/src/main/resources/`에 배치

다음: [04-database](04-database.md)
