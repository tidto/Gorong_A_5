# 06. 실행

실행 전에 아래가 끝나 있어야 합니다.

- [x] DB 실행 중 ([04-database](04-database.md))
- [x] `serviceAccountKey.json` 배치 ([03-firebase](03-firebase.md))
- [x] 세 개의 `.env` 작성 ([05-env-setup](05-env-setup.md))

터미널을 **3개** 열어 각각 실행합니다.

## 1. 백엔드 (터미널 1)

```bash
cd gorong-back
bash run-local.sh
```

- `.env`를 읽어 환경변수로 설정한 뒤 서버를 실행합니다. 필수 키가 비어 있으면 어떤 변수를 채워야 하는지 알려 줍니다.
- 처음에는 의존성을 내려받느라 몇 분 걸릴 수 있습니다.
- 로그에 `Started ... Application in ... seconds`가 나오면 성공입니다. 주소는 `http://localhost:8080` 입니다.
- Windows는 **Git Bash**에서 실행하세요. (Git 설치 시 함께 설치됩니다)

> **테이블 최초 생성**: `.env`의 `JPA_DDL_AUTO=update` 상태로 처음 한 번 실행한 뒤, `none`으로 되돌리세요. ([04-database](04-database.md) 참고)

## 2. 웹 (터미널 2)

```bash
cd gorong-front
npm install
npm run dev
```

브라우저가 열리면 `http://localhost:3000` 입니다. 웹의 `/api` 요청은 개발 서버가 `localhost:8080` 백엔드로 전달합니다.

## 3. 앱 (터미널 3)

```bash
cd gorong-app
npm install
npm start
```

1. 터미널에 **QR 코드**가 표시됩니다.
2. 휴대폰의 **Expo Go**를 엽니다.
   - Android: Expo Go에서 **Scan QR code**
   - iPhone: 기본 **카메라 앱**으로 QR을 스캔
3. 앱이 로딩되면 실행됩니다.

> 앱이 서버에 접속하지 못하면 `gorong-app/.env`의 `EXPO_PUBLIC_API_BASE_URL`이 `http://내IP:8080/api/v1`인지, PC와 휴대폰이 같은 Wi-Fi인지 확인하세요.
> QR 접속이 안 될 때는 `npx expo start --tunnel`을 시도할 수 있습니다. (이 방법은 앱 화면 전달만 돕고, 백엔드 접속은 여전히 `내IP`가 필요합니다)

## 정상 동작 체크리스트

- [ ] 백엔드 콘솔에 `Started ...` 로그
- [ ] 웹(`http://localhost:3000`)에서 회원가입 → 로그인
- [ ] Firebase 콘솔 → Authentication → 사용자에 계정이 보임
- [ ] 지도가 표시됨 (Kakao 키, 도메인 등록 확인)
- [ ] 행사 목록이 표시됨 (TourAPI)
- [ ] 챗봇 응답이 나옴 (Gemini)
- [ ] 주소 검색이 동작함 (도로명주소)
- [ ] 이미지 업로드 후 이미지가 표시됨
- [ ] 앱(Expo Go)에서 로그인됨

문제가 생기면 [07-troubleshooting](07-troubleshooting.md)을 확인하세요.

## 종료

각 터미널에서 `Ctrl + C`. DB는 `docker compose --env-file gorong-back/.env stop`.
