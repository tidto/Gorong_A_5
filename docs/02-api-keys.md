# 02. API 키 발급

> ⏱ **도로명주소, 공공데이터포털은 승인에 시간이 걸릴 수 있습니다. 가장 먼저 신청하세요.**
> 회사명, 소속 입력란은 **개인**으로, 앱(서비스) 이름은 **Gorong**으로 입력합니다.

## 한눈에 보기

| 서비스 | 발급처 | 백엔드 `.env` | 웹 `.env` | 앱 `.env` | 승인 대기 |
|---|---|---|---|---|---|
| 도로명주소 검색 API | [business.juso.go.kr](https://business.juso.go.kr/jst/jstAddressApiList) | `JUSO_API_KEY` | - | - | 있을 수 있음 |
| 도로명주소 좌표제공 검색 API | [business.juso.go.kr](https://business.juso.go.kr/jst/jstAddressApiList) | `JUSO_COORD_API_KEY` | - | - | 있을 수 있음 |
| 한국관광공사 TourAPI | [data.go.kr](https://www.data.go.kr) | `TOUR_API_KEY` | `VITE_TOUR_API_KEY` | - | 있을 수 있음 |
| Kakao 지도 (JavaScript 키) | [developers.kakao.com](https://developers.kakao.com) | - | `VITE_KAKAO_API_KEY` | `EXPO_PUBLIC_KAKAO_MAP_KEY` | 즉시 |
| Gemini | [aistudio.google.com](https://aistudio.google.com/apikey) | `GEMINI_API_KEY` | - | - | 즉시 |
| OpenWeatherMap (선택) | [openweathermap.org](https://home.openweathermap.org/api_keys) | `WEATHER_API_KEY` | `VITE_WEATHER_API_KEY` | `EXPO_PUBLIC_WEATHER_API_KEY` | 즉시~수 시간 |
| Firebase | [console.firebase.google.com](https://console.firebase.google.com) | 서비스 계정 파일 | `VITE_FIREBASE_*` | `EXPO_PUBLIC_FIREBASE_*` | 즉시 → [03-firebase](03-firebase.md) |

발급받은 키는 메모장 등에 모아 두었다가 [05-env-setup](05-env-setup.md)에서 `.env`에 입력합니다.

---

## 1. 도로명주소 (주소기반산업지원서비스)

주소 검색과 좌표 변환에 사용합니다. **승인키가 2개** 필요합니다.

1. [도로명주소 개발자센터 API 신청 페이지](https://business.juso.go.kr/jst/jstAddressApiList)에 접속해 로그인(회원가입)합니다.
2. 아래 **두 가지 API**를 각각 신청합니다.

| 신청할 API | `.env` 변수 |
|---|---|
| **도로명주소 검색 API** | `JUSO_API_KEY` |
| **좌표제공 검색 API** | `JUSO_COORD_API_KEY` |

3. 신청 화면의 안내에 따라 승인키를 발급받고 키를 복사합니다.

> ⚠️ **"팝업 API"는 신청하지 않습니다.** 팝업 API는 브라우저에 주소 검색 창을 띄우는 방식이고, 고롱은 서버가 직접 호출하는 **검색 API**를 사용합니다. 이름에 "팝업"이 붙은 항목을 고르지 않도록 주의하세요.
>
> 개발용 승인키는 **유효기간이 있습니다.** 주소 검색이 갑자기 실패하면 승인키 만료 여부를 확인하고 재발급하세요.

## 2. 한국관광공사 TourAPI (공공데이터포털)

관광지, 행사 정보를 불러옵니다.

1. [공공데이터포털](https://www.data.go.kr)에 가입하고 로그인합니다.
2. 아래 **두 서비스**를 검색해 각각 **활용신청**합니다.
   - **한국관광공사 국문 관광정보 서비스**
   - **한국관광공사 무장애 여행정보 서비스**
3. 활용 목적을 간단히 적고 신청합니다. (승인까지 시간이 걸릴 수 있습니다)
4. **마이페이지 → 데이터활용 → Open API** 에서 승인된 서비스를 확인하고, **일반 인증키(Decoding)** 를 복사합니다.

> **일반 인증키(Decoding)** 를 복사해 넣으세요. Encoding 키와 Decoding 키가 **같은 문자열**이면 어느 쪽이든 상관없습니다.
> 두 키가 서로 다르고 인증 오류(`SERVICE_KEY_IS_NOT_REGISTERED_ERROR`)가 나면, 다른 쪽 키로 바꿔서 시도해 보세요.
> 공공데이터포털에는 이름이 비슷한 **이전 버전 서비스**가 함께 보일 수 있습니다. 현재 제공 중인 서비스(활용신청 버튼이 있는 항목)를 신청하세요. 고롱은 `KorService2`, `KorWithService2` 주소를 사용합니다.
> 같은 키 하나를 백엔드(`TOUR_API_KEY`)와 웹(`VITE_TOUR_API_KEY`)에 모두 넣습니다.

## 3. Kakao 지도

웹과 앱의 지도 화면에 사용합니다.

1. [Kakao Developers](https://developers.kakao.com)에 접속해 로그인합니다.
2. 상단 **[앱]** → **[+ 앱 생성]** 을 누르고 입력합니다.
   - 앱 이름: `Gorong`
   - 회사명: 개인 (본인 이름)
   - 카테고리: 알맞은 항목 선택
   - **저장**
3. 왼쪽 메뉴 **[카카오맵]** 에서 **사용 설정을 ON** 으로 바꿉니다.
4. 왼쪽 메뉴 **[앱 → 플랫폼 키]** 에서 **JavaScript 키**를 눌러 키를 복사합니다.
5. 같은 화면의 **[JavaScript SDK 도메인]** 에 접속 주소를 등록합니다.
   - 웹 기본값: `http://localhost:3000`
   - 다른 포트로 실행하면 **본인이 접속하는 주소(포트)** 로 등록하세요.

> 같은 JavaScript 키를 웹(`VITE_KAKAO_API_KEY`)과 앱(`EXPO_PUBLIC_KAKAO_MAP_KEY`)에 넣습니다.
> 지도가 보이지 않으면 대부분 **도메인 등록 누락**입니다. [07-troubleshooting](07-troubleshooting.md)을 확인하세요.

## 4. Gemini (챗봇)

1. [Google AI Studio API 키 페이지](https://aistudio.google.com/apikey)에 Google 계정으로 로그인합니다.
2. **API 키 만들기**를 눌러 프로젝트를 선택(또는 새로 만들기)하고 키를 복사합니다.
3. 모델 이름은 기본값 `gemini-2.5-flash`를 사용합니다. 실행 시 "모델을 찾을 수 없음" 오류가 나면 AI Studio의 모델 목록에서 현재 사용 가능한 이름으로 `GEMINI_MODEL`을 바꾸세요.

## 5. OpenWeatherMap (날씨, 선택)

날씨 기반 추천에 사용합니다. 키가 없어도 실행은 되지만 날씨 정보가 비어 있을 수 있습니다.

1. [OpenWeatherMap](https://openweathermap.org)에서 회원가입 후 로그인합니다.
2. 우측 상단 프로필 → **My API keys**([바로가기](https://home.openweathermap.org/api_keys))에서 키를 복사합니다.

> 발급 직후에는 키가 활성화되기까지 시간이 걸려 **401 오류**가 날 수 있습니다. 잠시 후 다시 시도하세요.

---

## 다음 단계

키 신청이 끝났다면 [01-prerequisites](01-prerequisites.md)(아직이라면) 또는 [03-firebase](03-firebase.md)로 이동하세요.
