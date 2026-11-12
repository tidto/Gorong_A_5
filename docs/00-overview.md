# 00. 시작하기 (전체 흐름)

고롱을 내 PC에서 실행하기까지의 전체 흐름입니다. 위에서부터 순서대로 진행하세요.

## 전체 구조

```
 [휴대폰 Expo Go] ─┐
                   ├─→ [백엔드 :8080] ─→ [PostgreSQL + PostGIS (Docker)]
 [웹 브라우저 :3000]┘        │
        │                    ├─→ Gemini / 도로명주소 / 관광공사 API
        └──────────────→ [Firebase: 로그인(Authentication), 채팅(Firestore)]
```

- 백엔드는 로그인 토큰 검증에 **Firebase 서비스 계정 키**를 사용합니다.
- 웹과 앱은 **같은 Firebase 프로젝트**를 사용해야 합니다.
- 업로드한 이미지는 백엔드 PC의 `gorong-back/uploads/` 폴더에 저장됩니다.

## 진행 순서

| 순서 | 할 일 | 문서 | 대기 시간 |
|---|---|---|---|
| 1 | **API 키 신청** (도로명주소, 공공데이터포털은 승인 대기가 있을 수 있음) | [02-api-keys](02-api-keys.md) | 즉시 ~ 며칠 |
| 2 | 프로그램 설치 | [01-prerequisites](01-prerequisites.md) | 20~40분 |
| 3 | Firebase 프로젝트 만들기 | [03-firebase](03-firebase.md) | 20분 |
| 4 | 로컬 DB 실행 | [04-database](04-database.md) | 10분 |
| 5 | `.env` 파일 채우기 | [05-env-setup](05-env-setup.md) | 10분 |
| 6 | 실행 | [06-run](06-run.md) | 10분 |

> 💡 **키 승인을 기다리는 동안** 2~4번을 먼저 진행하면 시간을 아낄 수 있습니다.

## 준비물 체크리스트

- [ ] Google 계정 (Firebase, Gemini)
- [ ] 카카오 계정 (Kakao Developers)
- [ ] 공공데이터포털(data.go.kr) 계정
- [ ] 도로명주소 개발자센터(business.juso.go.kr) 계정
- [ ] OpenWeatherMap 계정 (선택)
- [ ] GitHub 계정 (웹의 GitHub 로그인을 쓸 경우, 선택)
- [ ] 휴대폰에 Expo Go 설치 (앱을 실행해 볼 경우)
- [ ] PC와 휴대폰이 **같은 Wi-Fi**에 연결

## 알아두기

- 모든 키와 Firebase 프로젝트는 **본인 계정**으로 만듭니다. 이 저장소에는 키가 들어 있지 않습니다.
- 회사명, 소속 입력란은 **개인**으로, 서비스(앱) 이름은 **Gorong**으로 입력하면 됩니다.
- `.env`와 `serviceAccountKey.json`은 외부에 공유하거나 커밋하지 마세요.
