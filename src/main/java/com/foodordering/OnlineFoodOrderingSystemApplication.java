package com.foodordering;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class OnlineFoodOrderingSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(OnlineFoodOrderingSystemApplication.class, args);
    }
}
