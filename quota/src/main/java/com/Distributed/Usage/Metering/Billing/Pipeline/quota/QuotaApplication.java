package com.Distributed.Usage.Metering.Billing.Pipeline.quota;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(basePackages = {
        "com.Distributed.Usage.Metering.Billing.Pipeline.quota",
        "controller",
        "service",
        "domain",
        "dto",
        "repository",
        "redis",
        "alert",
        "exception",
        "config",
        "security"
})
@EntityScan("domain")
@EnableJpaRepositories("repository")
public class QuotaApplication {

    public static void main(String[] args) {
        System.setProperty("user.timezone", "UTC");
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(QuotaApplication.class, args);
    }
}