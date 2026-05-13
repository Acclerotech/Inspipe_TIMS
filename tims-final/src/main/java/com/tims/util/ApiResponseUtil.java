package com.tims.util;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Utility class for building consistent API responses.
 *
 * Use sparingly — most endpoints return typed DTOs directly.
 * Use this for simple success/error confirmation responses.
 */
public final class ApiResponseUtil {

    private ApiResponseUtil() {}

    /**
     * Wraps a simple success message.
     * { "status": "success", "message": "...", "timestamp": "..." }
     */
    public static ResponseEntity<Map<String, Object>> success(String message) {
        return ResponseEntity.ok(buildBody("success", message));
    }

    /**
     * Wraps a success message with HTTP 201 Created.
     */
    public static ResponseEntity<Map<String, Object>> created(String message) {
        return ResponseEntity.status(HttpStatus.CREATED).body(buildBody("success", message));
    }

    /**
     * Wraps a payload with a status wrapper.
     * { "status": "success", "data": <payload>, "timestamp": "..." }
     */
    public static <T> ResponseEntity<Map<String, Object>> ok(T data) {
        var body = new LinkedHashMap<String, Object>();
        body.put("status",    "success");
        body.put("data",      data);
        body.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.ok(body);
    }

    private static Map<String, Object> buildBody(String status, String message) {
        var body = new LinkedHashMap<String, Object>();
        body.put("status",    status);
        body.put("message",   message);
        body.put("timestamp", LocalDateTime.now().toString());
        return body;
    }
}
