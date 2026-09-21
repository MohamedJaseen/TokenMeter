package com.Distributed.Usage.Metering.Billing.Pipeline.project;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan(basePackages = {
        "com.Distributed.Usage.Metering.Billing.Pipeline.project",
        "processing",
        "persistence",
        "domain",
        "controller",
        "service",
        "config",
        "exception",
        "security"
})
@EntityScan("persistence.entity")
@EnableJpaRepositories("persistence.repository")
@EnableScheduling
public class ProjectApplication {

	public static void main(String[] args) {
		System.setProperty("user.timezone", "UTC");
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
		SpringApplication.run(ProjectApplication.class, args);
	}

}
