# 04. 로컬 DB 준비 (PostgreSQL + PostGIS)

고롱은 **PostgreSQL + PostGIS 확장**이 필요합니다. (행사장 도착 인증에서 거리 계산에 PostGIS를 사용합니다)
**방법 A(Docker, 권장)** 가 가장 쉽습니다. Docker를 쓰지 않는다면 **방법 B**를 따르세요.

> DBeaver는 DB를 **들여다보는 도구**입니다. DB 자체는 아래 방법으로 따로 실행해야 합니다.

---

## 방법 A. Docker (권장)

`postgis/postgis` 이미지를 사용하므로 PostGIS를 따로 설치할 필요가 없습니다.

### 1) 백엔드 `.env` 만들기

저장소 루트에서 실행합니다. (DB 관련 값은 기본값 그대로 사용해도 됩니다)

```bash
cp gorong-back/.env.example gorong-back/.env
```

### 2) DB 실행

Docker Desktop을 켠 상태에서 실행합니다.

```bash
docker compose --env-file gorong-back/.env up -d
```

처음 실행하면 이미지를 내려받느라 시간이 걸립니다. 이 과정에서 PostGIS 확장과 `gorong_schema` 스키마가 자동으로 만들어집니다.

### 3) 확인

```bash
docker ps --filter name=gorong-db
docker exec gorong-db psql -U gorong -d gorong_db -c "SELECT postgis_version();" -c "\dn"
```

- PostGIS 버전(`3.4 ...`)이 출력되고
- 스키마 목록에 `gorong_schema`가 보이면 정상입니다.

### 자주 쓰는 명령

| 하고 싶은 일 | 명령 |
|---|---|
| DB 중지 | `docker compose --env-file gorong-back/.env stop` |
| 다시 시작 | `docker compose --env-file gorong-back/.env start` |
| **DB 완전 초기화(데이터 삭제)** | `docker compose --env-file gorong-back/.env down -v` 후 다시 `up -d` |

> 이미 PC에서 PostgreSQL이 `5432` 포트를 쓰고 있으면 충돌합니다.
> `gorong-back/.env`의 `DB_PORT=5433`처럼 다른 포트로 바꾸고 다시 실행하세요.

---

## 방법 B. 직접 설치 (Docker를 쓰지 않는 경우)

### macOS (Homebrew)

```bash
brew install postgresql@16 postgis
brew services start postgresql@16
```

### Windows

1. https://www.postgresql.org/download/windows 에서 PostgreSQL 16 이상을 설치합니다.
2. 설치 마지막에 **Stack Builder**를 실행해 **Spatial Extensions → PostGIS**를 설치합니다.

### 공통: 사용자, DB, 확장 만들기

`psql` 또는 DBeaver의 SQL 편집기에서 실행합니다. (`.env.example`의 기본값과 동일하게 만듭니다)

```sql
CREATE USER gorong WITH PASSWORD 'gorong1234';
CREATE DATABASE gorong_db OWNER gorong;
```

그다음 **`gorong_db`에 접속한 상태에서** 실행합니다. (PostGIS 확장은 슈퍼유저 권한이 필요합니다)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS gorong_schema AUTHORIZATION gorong;
```

---

## DBeaver로 접속해서 보기 (선택)

1. DBeaver 실행 → **새 데이터베이스 연결** → **PostgreSQL**
2. 아래와 같이 입력합니다. (`.env`의 값과 같아야 합니다)

| 항목 | 값 |
|---|---|
| Host | `localhost` |
| Port | `5432` (`DB_PORT`를 바꿨다면 그 값) |
| Database | `gorong_db` |
| Username | `gorong` |
| Password | `gorong1234` |

3. 처음 접속하면 드라이버 다운로드 창이 뜹니다. **다운로드**를 누릅니다.
4. **연결 테스트**가 성공하면 **완료**를 누릅니다.
5. `gorong_db → 스키마 → gorong_schema → 테이블`에서 테이블을 볼 수 있습니다.

---

## 테이블 만들기 (최초 1회)

고롱은 DB 테이블을 **백엔드가 처음 실행될 때 자동으로 생성**하게 합니다.

1. `gorong-back/.env`에서 아래 값을 바꿉니다.

   ```
   JPA_DDL_AUTO=update
   ```

2. [06-run](06-run.md)의 방법으로 **백엔드를 한 번 실행**합니다. (`Started ...` 로그가 나오면 테이블이 만들어진 것입니다)
3. DBeaver나 아래 명령으로 `gorong_schema`에 테이블이 생겼는지 확인합니다.

   ```bash
   docker exec gorong-db psql -U gorong -d gorong_db -c "\dt gorong_schema.*"
   ```

4. 확인이 끝나면 `gorong-back/.env`를 다시 `JPA_DDL_AUTO=none`으로 되돌립니다.

> 테이블 생성 후에도 `review` 테이블의 컬럼이 없다는 오류가 나면 `gorong-back/sql/` 폴더의 SQL 파일을 DBeaver에서 열어 실행하세요.

다음: [05-env-setup](05-env-setup.md)
