import axios from "axios";
import { API_BASE } from "../../lib/constants";

export async function generateAiResponse(apiKey, prompt) {
    const res = await axios.post(
        `${API_BASE}/api/v1/ai/generate`,
        { prompt },
        {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-API-KEY": apiKey,
            },
        }
    );
    return res.data;
}
