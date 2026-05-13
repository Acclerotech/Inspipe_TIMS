package com.tims.exception;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
@ResponseStatus(HttpStatus.CONFLICT)
public class ImmutableEntityException extends RuntimeException {
    public ImmutableEntityException(String message) { super(message); }
}
