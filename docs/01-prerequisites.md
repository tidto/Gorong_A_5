# 01. 설치할 프로그램

| 프로그램 | 버전 | 용도 | 설치 확인 |
|---|---|---|---|
| Git | 최신 | 저장소 내려받기 | `git --version` |
| JDK | **25** | 백엔드 실행 | `java -version` |
| Node.js | 20 LTS 이상 | 웹, 앱 실행 | `node -v` / `npm -v` |
| Docker Desktop | 최신 | 로컬 DB(PostGIS) 실행 | `docker --version` |
| VS Code | 최신 (선택) | 코드/파일 편집 | - |
| DBeaver Community | 최신 (선택) | DB 내용 확인 | - |
| Expo Go (휴대폰) | SDK 54 지원 버전 | 앱 실행 | - |

## 설치 링크

- Git: https://git-scm.com/downloads
- JDK 25: https://adoptium.net (Eclipse Temurin 25)
- Node.js: https://nodejs.org (LTS)
- Docker Desktop: https://www.docker.com/products/docker-desktop
- DBeaver: https://dbeaver.io/download

> JDK는 반드시 **25**여야 합니다. 이 버전보다 낮으면 백엔드 빌드가 실패합니다.
> Docker를 쓰지 않으려면 [04-database](04-database.md)의 "방법 B(직접 설치)"를 따르세요.

## Expo Go (휴대폰)

이 프로젝트는 **Expo SDK 54**입니다. Expo Go는 한 번에 하나의 SDK 버전만 지원합니다.

- **iPhone**: App Store의 Expo Go를 설치하면 SDK 54를 지원합니다.
- **Android**: Play 스토어의 Expo Go를 설치해 보고, "Project is incompatible with this version of Expo Go" 오류가 나면 https://expo.dev/go 에서 **SDK 54**용 Expo Go를 내려받아 설치하세요.

## 저장소 내려받기

```bash
git clone -b release https://github.com/tidto/Gorong_A_5.git
cd Gorong_A_5
```

ZIP으로 받는 경우: 저장소 페이지에서 `release` 브랜치를 선택한 뒤 **Code → Download ZIP**.

## 설치 확인

```bash
git --version
java -version      # 25 로 시작해야 합니다
node -v
docker --version
```
