-- PostGIS 확장과 애플리케이션 스키마를 준비합니다. (컨테이너 최초 생성 시 1회 실행)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS gorong_schema;
