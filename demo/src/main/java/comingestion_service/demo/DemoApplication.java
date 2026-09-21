package comingestion_service.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {
        "comingestion_service.demo",
        "controller",
        "service",
        "repository",
        "messaging",
        "config",
        "exception",
        "security"
})
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}