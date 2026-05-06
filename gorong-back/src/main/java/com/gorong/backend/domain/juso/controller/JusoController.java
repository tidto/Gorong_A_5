package com.gorong.backend.domain.juso.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/v1/juso")
@RequiredArgsConstructor
public class JusoController {

    @Value("${juso.api.key}")
    private String jusoApiKey;

    @Value("${juso.coord.key}")
    private String jusoCoordApiKey;

    // ==========================================
    // 주소 검색
    // ==========================================
    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        try {
            String rawUrl = "https://business.juso.go.kr/addrlink/addrLinkApi.do"
                    + "?currentPage=" + page
                    + "&countPerPage=" + size
                    + "&keyword=" + URLEncoder.encode(keyword, StandardCharsets.UTF_8)
                    + "&confmKey=" + jusoApiKey
                    + "&resultType=json";

            RestTemplate restTemplate = new RestTemplate();
            Object result = restTemplate.getForObject(new URI(rawUrl), Object.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("주소 검색 실패: " + e.getMessage());
        }
    }

    // ==========================================
    // 좌표 검색 + UTM-K → WGS84 변환
    // ==========================================
    @GetMapping("/coord")
    public ResponseEntity<?> coord(@RequestParam String roadAddr) {
        try {
            String encodedAddr = URLEncoder.encode(roadAddr, StandardCharsets.UTF_8);

            String rawUrl = "https://business.juso.go.kr/addrlink/addrCoordApi.do"
                    + "?roadAddr=" + encodedAddr
                    + "&confmKey=" + jusoCoordApiKey
                    + "&resultType=json";

            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> response = (Map<String, Object>) restTemplate.getForObject(new URI(rawUrl), Object.class);

            // UTM-K 좌표 추출
            Map<String, Object> results = (Map<String, Object>) response.get("results");
            java.util.List<Map<String, Object>> jusoList = (java.util.List<Map<String, Object>>) results.get("juso");

            if (jusoList == null || jusoList.isEmpty()) {
                return ResponseEntity.ok(Map.of("lat", 0.0, "lng", 0.0));
            }

            Map<String, Object> juso = jusoList.get(0);
            double utmX = Double.parseDouble(juso.get("entX").toString());
            double utmY = Double.parseDouble(juso.get("entY").toString());

            // UTM-K → WGS84 변환
            double[] wgs84 = convertUtmkToWgs84(utmX, utmY);

            Map<String, Object> result = new HashMap<>();
            result.put("lat", wgs84[0]);  // 위도
            result.put("lng", wgs84[1]);  // 경도
            result.put("roadAddr", roadAddr);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("좌표 변환 실패: " + e.getMessage());
        }
    }

    // ==========================================
    // UTM-K(EPSG:5179) → WGS84(EPSG:4326) 변환
    // ==========================================
    private double[] convertUtmkToWgs84(double utmX, double utmY) {
        // UTM-K 파라미터
        double a = 6378137.0;           // 장반경
        double f = 1 / 298.257222101;   // 편평률
        double b = a * (1 - f);         // 단반경
        double e2 = 1 - (b * b) / (a * a);
        double e = Math.sqrt(e2);

        double k0 = 0.9996;
        double originLat = Math.toRadians(38.0);   // 기준 위도
        double originLng = Math.toRadians(127.5);  // 기준 경도
        double falseEasting = 1000000.0;
        double falseNorthing = 2000000.0;

        double x = utmX - falseEasting;
        double y = utmY - falseNorthing;

        double M0 = calcM(originLat, a, e2);
        double M = M0 + y / k0;

        double mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));

        double e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
        double phi1 = mu
                + (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu)
                + (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu)
                + (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu)
                + (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);

        double N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
        double T1 = Math.tan(phi1) * Math.tan(phi1);
        double C1 = e2 / (1 - e2) * Math.cos(phi1) * Math.cos(phi1);
        double R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
        double D = x / (N1 * k0);

        double lat = phi1
                - (N1 * Math.tan(phi1) / R1)
                * (D * D / 2
                - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e2 / (1 - e2)) * Math.pow(D, 4) / 24
                + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e2 / (1 - e2) - 3 * C1 * C1) * Math.pow(D, 6) / 720);

        double lng = originLng + (D
                - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6
                + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e2 / (1 - e2) + 24 * T1 * T1) * Math.pow(D, 5) / 120)
                / Math.cos(phi1);

        return new double[]{ Math.toDegrees(lat), Math.toDegrees(lng) };
    }

    private double calcM(double lat, double a, double e2) {
        return a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * Math.pow(e2, 3) / 256) * lat
                - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * Math.pow(e2, 3) / 1024) * Math.sin(2 * lat)
                + (15 * e2 * e2 / 256 + 45 * Math.pow(e2, 3) / 1024) * Math.sin(4 * lat)
                - (35 * Math.pow(e2, 3) / 3072) * Math.sin(6 * lat));
    }
}