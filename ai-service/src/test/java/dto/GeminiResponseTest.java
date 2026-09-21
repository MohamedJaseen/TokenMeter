package dto;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GeminiResponseTest {

    @Test
    void bindsGeminiGenerateContentPayload() throws Exception {

        String json = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          { "text": "Hello from Redis Streams" }
                        ]
                      }
                    }
                  ],
                  "usageMetadata": {
                    "promptTokenCount": 15,
                    "candidatesTokenCount": 25,
                    "totalTokenCount": 40
                  },
                  "modelVersion": "gemini-2.5-flash"
                }
                """;

        GeminiResponse response =
                new ObjectMapper().readValue(json, GeminiResponse.class);

        assertEquals("gemini-2.5-flash", response.modelVersion());

        List<GeminiResponse.Candidate> candidates = response.candidates();
        assertNotNull(candidates);
        assertEquals(1, candidates.size());
        assertEquals(
                "Hello from Redis Streams",
                candidates.get(0).content().parts().get(0).text());

        GeminiResponse.UsageMetadata usage = response.usageMetadata();
        assertNotNull(usage);
        assertEquals(15, usage.promptTokenCount());
        assertEquals(25, usage.candidatesTokenCount());
        assertEquals(40, usage.totalTokenCount());
    }
}