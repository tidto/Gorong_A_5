package com.gorong.backend.domain.minihome.exception;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 미니홈 도메인에서 발생하는 예외를 사용자 친화적인 응답(400/404)으로 변환합니다.
 * (전역 예외 처리 영역을 건드리지 않기 위해 도메인 내부에 둡니다.)
 */
@RestControllerAdvice
public class MiniHomeExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        List<Map<String, Object>> errors = e.getBindingResult().getFieldErrors().stream()
                .map(this::fieldErrorToMap)
                .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body("요청 값이 올바르지 않습니다.", errors));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body("요청 값이 올바르지 않습니다.", List.of(
                Map.of("message", e.getMessage())
        )));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body(e.getMessage(), List.of()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleNotReadable(HttpMessageNotReadableException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body("요청 본문(JSON)이 올바르지 않습니다.", List.of()));
    }

    @ExceptionHandler(MiniHomeNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleMiniHomeNotFound(MiniHomeNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body(e.getMessage(), List.of()));
    }

    @ExceptionHandler(GalleryNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleGalleryNotFound(GalleryNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body(e.getMessage(), List.of()));
    }

    private Map<String, Object> fieldErrorToMap(FieldError fe) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("field", fe.getField());
        m.put("message", fe.getDefaultMessage());
        return m;
    }

    private Map<String, Object> body(String message, List<Map<String, Object>> errors) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("message", message);
        m.put("errors", errors);
        return m;
    }
}

