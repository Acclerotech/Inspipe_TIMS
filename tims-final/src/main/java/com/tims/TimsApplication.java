package com.tims;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TimsApplication {
    public static void main(String[] args) {
        SpringApplication.run(TimsApplication.class, args);
    }
}
