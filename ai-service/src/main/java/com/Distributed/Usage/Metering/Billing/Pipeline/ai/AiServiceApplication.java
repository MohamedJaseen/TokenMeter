package com.Distributed.Usage.Metering.Billing.Pipeline.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(basePackages = {
        "com.Distributed.Usage.Metering.Billing.Pipeline.ai",
        "controller",
        "service",
        "dto",
        "config",
        "exception",
        "security",
        "persistence"
})
@EntityScan("persistence.entity")
@EnableJpaRepositories("persistence.repository")
public class AiServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiServiceApplication.class, args);
    }
}