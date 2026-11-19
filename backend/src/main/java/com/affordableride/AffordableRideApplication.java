package com.affordableride;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AffordableRideApplication {

    public static void main(String[] args) {
        SpringApplication.run(AffordableRideApplication.class, args);
    }
}
