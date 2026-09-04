# xxxxx 1. 자바 25 버전의 가벼운(slim) 환경을 베이스로 사용합니다.xxxxx 도커 이미지에없음.
# Amazon Corretto는 AWS 환경에 최적화된 안정적인 자바 배포판입니다.
FROM amazoncorretto:25-alpine

# 2. 그래들이 빌드한 jar 파일의 위치를 변수로 지정합니다.
ARG JAR_FILE=build/libs/*.jar

# 3. 그 jar 파일을 도커 컨테이너 안으로 가져와서 app.jar로 이름을 바꿉니다.
COPY ${JAR_FILE} app.jar

# 4. 컨테이너가 켜질 때 app.jar를 실행합니다.
ENTRYPOINT ["java", "-jar", "/app.jar"]