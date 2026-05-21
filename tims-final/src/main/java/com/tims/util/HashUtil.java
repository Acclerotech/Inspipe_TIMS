package com.tims.util;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * SHA-256 hashing utility used by the ingestion pipeline (AT-021).
 *
 * Usage:
 *   String hash = HashUtil.sha256(inputStream);
 *   String hash = HashUtil.sha256(byteArray);
 */
@Slf4j
public final class HashUtil {

    private HashUtil() {}

    /**
     * Compute SHA-256 of an InputStream.
     * The stream is fully consumed but NOT closed.
     */
    public static String sha256(InputStream inputStream) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (DigestInputStream dis = new DigestInputStream(inputStream, digest)) {
                byte[] buffer = new byte[8192];
                //noinspection StatementWithEmptyBody
                while (dis.read(buffer) != -1) { /* consume */ }
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        } catch (IOException e) {
            log.error("Failed to compute SHA-256: {}", e.getMessage());
            throw new RuntimeException("SHA-256 computation failed", e);
        }
    }

    /**
     * Compute SHA-256 of a byte array.
     */
    public static String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
