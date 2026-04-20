# 스테이지 1: 빌드 (Node.js 환경)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# package.json에 있는 "build": "tsc -b && vite build"가 실행됩니다.
RUN npm run build 

# 스테이지 2: 실행 (Nginx 환경)
FROM nginx:stable-alpine
# ⭐️ 핵심 수정 포인트: /app/build 가 아니라 /app/dist 입니다!
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]