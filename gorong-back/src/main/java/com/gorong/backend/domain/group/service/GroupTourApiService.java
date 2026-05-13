package com.gorong.backend.domain.group.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.net.URI;

@Service
public class GroupTourApiService {

    @Value("${TOUR_API_KEY}")
    private String serviceKey;

    public String getTourEvents() {
        try {
            RestTemplate restTemplate = new RestTemplate();

            // 📌 핵심: 공공데이터 API는 '이미 인코딩된 키'를 주소에 그대로 이어 붙이는 걸 좋아합니다.
            // UriComponentsBuilder를 쓰지 말고, String으로 주소를 만든 뒤 URI.create()를 쓰세요.
            String urlString = "http://apis.data.go.kr/B551011/KorService1/searchFestival1?"
                    + "serviceKey=" + serviceKey  // 여기에 들어가는 키가 핵심입니다.
                    + "&_type=json"
                    + "&MobileOS=ETC"
                    + "&MobileApp=Gorong"
                    + "&listYN=Y"
                    + "&arrange=A"
                    + "&eventStartDate=20240101";

            URI uri = URI.create(urlString); // 📌 자동 인코딩을 방지하고 문자열 그대로 사용

            System.out.println("최종 호출 URL: " + urlString);

            return restTemplate.getForObject(uri, String.class);

        } catch (Exception e) {
            e.printStackTrace();
            return "{\"error\": \"API 호출 중 에러 발생: " + e.getMessage() + "\"}";
        }
    }
}