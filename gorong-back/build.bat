@echo off
:: 스크립트가 위치한 현재 폴더로 이동
cd /d "%~dp0"

:: 전체 빌드 로그를 파일로 저장
call gradlew.bat build > build_output.txt 2>&1

:: 터미널에는 빌드 성공/실패 여부만 요약 출력
type build_output.txt | findstr /i "BUILD"
