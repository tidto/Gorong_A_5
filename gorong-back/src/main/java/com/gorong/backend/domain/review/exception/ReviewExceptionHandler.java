package com.gorong.backend.domain.review.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 리뷰 도메인에서 발생하는 예외를 사용자 친화적인 응답(400/403)으로 변환합니다.
 * (전역 예외 처리 영역을 건드리지 않기 위해 미니홈과 동일하게 도메인 내부에 둡니다.)
 */
@Slf4j
@RestControllerAdvice(basePackages = "com.gorong.backend.domain.review.controller")
public class ReviewExceptionHandler {

    @ExceptionHandler(ReviewForbiddenException.class)
    public ResponseEntity<Map<String, Object>> handleReviewForbidden(ReviewForbiddenException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body(e.getMessage(), List.of()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body(e.getMessage(), List.of()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleNotReadable(HttpMessageNotReadableException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body("요청 본문(JSON)이 올바르지 않습니다.", List.of()));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> handleDataAccess(DataAccessException e) {
        log.error("[Review] DB error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(body("리뷰 데이터 처리 중 오류가 발생했습니다.", List.of()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception e) {
        log.error("[Review] Unhandled error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(body("리뷰 처리 중 오류가 발생했습니다.", List.of()));
    }

    private Map<String, Object> body(String message, List<Map<String, Object>> errors) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("message", message);
        m.put("errors", errors);
        return m;
    }
}
