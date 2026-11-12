# 05. `.env` 파일 채우기

각 폴더의 `.env.example`을 복사해 `.env`를 만들고, 앞에서 발급받은 키를 붙여 넣습니다.
`.env` 파일은 `.gitignore`에 등록되어 있어 git에 올라가지 않습니다.

## 1. 파일 복사

저장소 루트에서 실행합니다.

```bash
cp gorong-back/.env.example  gorong-back/.env
cp gorong-front/.env.example gorong-front/.env
cp gorong-app/.env.example   gorong-app/.env
```

Windows(PowerShell)라면 `cp` 대신 `Copy-Item`을 사용하세요.

## 2. 내 PC의 로컬 IP 확인 (앱, 이미지에 필요)

휴대폰은 `localhost`로 PC에 접속할 수 없습니다. PC의 **로컬 IP**가 필요합니다.

| OS | 명령 |
|---|---|
| macOS | `ipconfig getifaddr en0` (Wi-Fi 기준) |
| Windows | `ipconfig` → 사용 중인 어댑터의 **IPv4 주소** |
| Linux | `hostname -I` |

예: `192.168.0.10` (이 문서에서는 `내IP`라고 부릅니다)

> PC와 휴대폰은 **같은 Wi-Fi**여야 합니다. IP는 공유기를 다시 켜면 바뀔 수 있습니다.

## 3. `gorong-back/.env` (백엔드)

| 변수 | 넣을 값 | 출처 |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` | 기본값 그대로 | [04-database](04-database.md) |
| `DB_USERNAME` / `DB_PASSWORD` | 기본값 그대로 (`gorong` / `gorong1234`) | [04-database](04-database.md) |
| `TOUR_API_KEY` | TourAPI **Decoding** 키 | [02-api-keys](02-api-keys.md) |
| `JUSO_API_KEY` | 도로명주소 **검색 API** 승인키 | [02-api-keys](02-api-keys.md) |
| `JUSO_COORD_API_KEY` | **좌표제공 검색 API** 승인키 | [02-api-keys](02-api-keys.md) |
| `GEMINI_API_KEY` | Gemini 키 | [02-api-keys](02-api-keys.md) |
| `GEMINI_MODEL` | 기본값 `gemini-2.5-flash` | [02-api-keys](02-api-keys.md) |
| `WEATHER_API_KEY` | OpenWeatherMap 키 (선택) | [02-api-keys](02-api-keys.md) |
| `APP_STORAGE_BASE_URL` | `http://내IP:8080` | 위 2번 |
| `APP_STORAGE_LOCAL_DIR` | 기본값 `./uploads` | - |
| `JPA_DDL_AUTO` | 테이블 최초 생성 시에만 `update`, 이후 `none` | [04-database](04-database.md) |

> `APP_STORAGE_BASE_URL`은 업로드한 이미지의 주소 기준입니다. `내IP`로 설정하면 PC 브라우저와 휴대폰 모두에서 이미지가 보입니다.
> IP가 바뀌면 **이전에 업로드한 이미지는 주소가 맞지 않아 보이지 않을 수 있습니다.**

백엔드 `.env`에는 필수 키가 비어 있으면 실행 스크립트가 어떤 변수가 비었는지 알려 줍니다.

## 4. `gorong-front/.env` (웹)

| 변수 | 넣을 값 |
|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/api` (기본값) |
| `VITE_FIREBASE_*` 6개 | Firebase 웹 앱 설정값 ([03-firebase](03-firebase.md)) |
| `VITE_KAKAO_API_KEY` | Kakao **JavaScript 키** |
| `VITE_TOUR_API_KEY` | TourAPI **Decoding** 키 (백엔드와 같은 키) |
| `VITE_WEATHER_API_KEY` | OpenWeatherMap 키 (선택) |

## 5. `gorong-app/.env` (앱)

| 변수 | 넣을 값 |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `http://내IP:8080/api/v1` |
| `EXPO_PUBLIC_FIREBASE_*` 6개 | 웹과 **같은** Firebase 설정값 |
| `EXPO_PUBLIC_KAKAO_MAP_KEY` | Kakao **JavaScript 키** (웹과 같은 키) |
| `EXPO_PUBLIC_WEATHER_API_KEY` | OpenWeatherMap 키 (선택) |

> 웹과 앱의 `.env`를 수정한 뒤에는 **개발 서버를 다시 시작**해야 반영됩니다.

## 6. 파일 위치 확인

```
Gorong_A_5/
├─ gorong-back/
│  ├─ .env                                       ← 백엔드 설정
│  └─ src/main/resources/serviceAccountKey.json  ← Firebase 서비스 계정 키
├─ gorong-front/.env                             ← 웹 설정
└─ gorong-app/.env                               ← 앱 설정
```

다음: [06-run](06-run.md)
