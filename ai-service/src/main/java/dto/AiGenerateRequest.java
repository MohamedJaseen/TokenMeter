package dto;

import jakarta.validation.constraints.NotBlank;

public record AiGenerateRequest(
        @NotBlank(message = "prompt must not be blank")
        String prompt,
        String provider,
        String model
) {
    public AiGenerateRequest(String prompt) {
        this(prompt, null, null);
    }
}