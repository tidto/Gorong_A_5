@echo off
cd "C:\3AB-A_2101117\Gorong_A_5\gorong-front"
npm run build 2>&1 | findstr /i "error" > frontend_build_output.txt || true
type frontend_build_output.txt
echo.
echo BUILD COMPLETE