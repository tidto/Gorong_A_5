package com.gorong.backend.domain.review.exception;

public class ReviewForbiddenException extends RuntimeException {
    public ReviewForbiddenException(String message) {
        super(message);
    }
}
