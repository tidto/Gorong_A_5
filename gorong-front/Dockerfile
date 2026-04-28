# 스테이지 1: 빌드 (팀장님의 로컬 환경 v22.18.0에 맞춘 Node.js 22 사용)
FROM node:22-alpine AS build
WORKDIR /app

# 의존성 설치 (캐시 활용을 위해 분리)
COPY package*.json ./
RUN npm install

# 전체 소스 코드 복사 및 빌드
COPY . .
# package.json의 "build": "vite build"를 실행하여 'dist' 폴더를 생성합니다.
RUN npm run build 

# 스테이지 2: 실행 (경량화된 Nginx 환경)
FROM nginx:stable-alpine

# 기존의 기본 설정 파일을 삭제하고, 우리가 만든 리버스 프록시 설정(nginx.conf)을 주입합니다.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/

# 빌드 스테이지에서 생성된 'dist' 폴더의 내용물을 Nginx의 웹 루트 경로로 복사합니다.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]