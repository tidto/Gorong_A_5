@echo off
cd "C:\3AB-A_2101117\Gorong_A_5\gorong-back"
gradlew build 2>&1 | findstr /i "BUILD" > build_output.txt
type build_output.txt