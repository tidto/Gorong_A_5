# 고롱 (Gorong) — 로컬 실행 버전

이 브랜치(`release`)는 **내 PC에서 직접 실행해 볼 수 있도록** 정리한 배포판입니다.
서버(AWS) 연결 없이, 본인이 발급한 API 키와 본인의 Firebase 프로젝트로 동작합니다.

## 구성

| 폴더 | 설명 | 기술 |
|---|---|---|
| `gorong-back` | 백엔드 API 서버 | Spring Boot, Java 25, PostgreSQL + PostGIS |
| `gorong-front` | 웹 | Vite, React, TypeScript (개발 서버 `http://localhost:3000`) |
| `gorong-app` | 모바일 앱 | Expo (Expo Go로 실행) |
| `docker-compose.yml` | 로컬 DB(PostgreSQL + PostGIS) 실행 | Docker |
| `firestore.rules` | Firestore 보안 규칙 | Firebase |

## 시작하기

👉 **[docs/00-overview.md](docs/00-overview.md)** 부터 순서대로 따라 하세요.

> ⚠️ 도로명주소와 공공데이터포털 키는 **승인에 시간이 걸릴 수 있습니다.**
> 다른 준비를 하기 전에 [02-api-keys.md](docs/02-api-keys.md)의 키 신청부터 먼저 해두세요.

| 문서 | 내용 |
|---|---|
| [00-overview](docs/00-overview.md) | 전체 흐름과 준비물 |
| [01-prerequisites](docs/01-prerequisites.md) | 설치할 프로그램 |
| [02-api-keys](docs/02-api-keys.md) | API 키 발급 방법 |
| [03-firebase](docs/03-firebase.md) | Firebase 프로젝트, 인증, Firestore 설정 |
| [04-database](docs/04-database.md) | 로컬 DB(PostgreSQL + PostGIS) 준비 |
| [05-env-setup](docs/05-env-setup.md) | `.env` 파일 채우기 |
| [06-run](docs/06-run.md) | 백엔드, 웹, 앱 실행 |
| [07-troubleshooting](docs/07-troubleshooting.md) | 자주 겪는 문제 |

## 주의

- `.env`, `serviceAccountKey.json` 등 **키가 들어 있는 파일은 절대 커밋하지 마세요.** (`.gitignore`에 등록되어 있습니다)
- 이 저장소의 키 파일은 비어 있습니다. 모든 키는 본인 계정에서 직접 발급해 사용합니다.
