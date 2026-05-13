package com.tims.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Utility helpers for building consistent Pageable objects.
 */
public final class PageUtil {

    private PageUtil() {}

    public static Pageable defaultPage() {
        return PageRequest.of(0, 20);
    }

    public static Pageable ofSize(int size) {
        return PageRequest.of(0, size);
    }

    public static Pageable sortedBy(String field, int size) {
        return PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, field));
    }

    public static Pageable sortedByAsc(String field, int size) {
        return PageRequest.of(0, size, Sort.by(Sort.Direction.ASC, field));
    }
}
