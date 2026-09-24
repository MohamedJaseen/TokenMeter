import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, KeyRound, Loader2, Sparkles, UserRound } from "lucide-react";
import { generateAiResponse } from "../api/endpoints/ai";
import { Card } from "../components/ui/Card";
import { cn } from "../components/ui/Button";

const KEY_STORAGE = "metering.ai.playground.apiKey";

function formatError(error) {
    return error?.response?.data?.message
        || error?.response?.data?.error
        || (error?.response?.status === 401 ? "This API key is invalid or revoked." : "The AI service could not answer right now.");
}

export default function AiPlayground() {
    const [apiKey, setApiKey] = useState("");
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");
    const endRef = useRef(null);

    useEffect(() => {
        setApiKey(sessionStorage.getItem(KEY_STORAGE) || "");
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isSending]);

    const submit = async (event) => {
        event.preventDefault();
        const trimmedPrompt = prompt.trim();
        const trimmedKey = apiKey.trim();
        if (!trimmedPrompt || !trimmedKey || isSending) return;

        sessionStorage.setItem(KEY_STORAGE, trimmedKey);
        setMessages((current) => [...current, { role: "user", text: trimmedPrompt }]);
        setPrompt("");
        setError("");
        setIsSending(true);

        try {
            const response = await generateAiResponse(trimmedKey, trimmedPrompt);
            setMessages((current) => [...current, {
                role: "assistant",
                text: response.text || "The model returned an empty response.",
                usage: {
                    input: response.inputTokens ?? 0,
                    output: response.outputTokens ?? 0,
                    total: response.totalTokens ?? 0,
                },
                model: response.model,
            }]);
        } catch (requestError) {
            setError(formatError(requestError));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex min-h-full flex-col gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-[#2d2a18] p-2 text-[#f0c82d]"><Sparkles className="h-4 w-4" /></div>
                    <div>
                        <h1 className="font-serif text-xl font-bold text-[#f1d766]">AI playground</h1>
                        <p className="mt-1 text-[11px] text-[#8290a8]">Try a metered AI request and see its usage instantly.</p>
                    </div>
                </div>
            </div>

            <Card className="border-[#3c3a2b] bg-[#121b2b]">
                <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[#c5cfde]">
                    <KeyRound className="h-3.5 w-3.5 text-[#e0b91c]" /> Tenant API key
                </label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="Paste the secret key created in API keys"
                    className="w-full rounded-md border border-[#34435b] bg-[#0d1523] px-3 py-2 text-xs text-[#e9eef7] outline-none transition placeholder:text-[#64728a] focus:border-[#d1a91c]"
                    autoComplete="off"
                />
                <p className="mt-2 text-[10px] text-[#71809b]">Stored only in this browser session and sent as an X-API-KEY header.</p>
            </Card>

            <Card className="flex min-h-[440px] flex-1 flex-col overflow-hidden p-0">
                <div className="flex items-center gap-3 border-b border-[#263249] px-5 py-4">
                    <div className="rounded-full bg-[#25334a] p-2 text-[#e0b91c]"><Bot className="h-4 w-4" /></div>
                    <div><p className="text-xs font-semibold text-[#e5ebf5]">Metering assistant</p><p className="text-[10px] text-[#71809b]">Powered by your tenant’s AI quota</p></div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
                    {messages.length === 0 && (
                        <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                            <div className="mb-3 rounded-full border border-[#4a4222] bg-[#2d2a18] p-3 text-[#f0c82d]"><Sparkles className="h-5 w-5" /></div>
                            <h2 className="text-sm font-semibold text-[#e5ebf5]">What would you like to explore?</h2>
                            <p className="mt-1 max-w-sm text-[11px] leading-5 text-[#8290a8]">Ask a question below. Every response is metered to the API key you provide.</p>
                        </div>
                    )}
                    {messages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className={cn("flex gap-3", message.role === "user" && "justify-end")}>
                            {message.role === "assistant" && <div className="mt-1 rounded-full bg-[#25334a] p-2 text-[#e0b91c]"><Bot className="h-3.5 w-3.5" /></div>}
                            <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-5", message.role === "user" ? "rounded-br-sm bg-[#d1a91c] text-[#121722]" : "rounded-bl-sm border border-[#2d3b54] bg-[#182438] text-[#dce5f2]")}>
                                <p className="whitespace-pre-wrap">{message.text}</p>
                                {message.usage && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#344762] pt-2 text-[10px] text-[#8e9db5]"><span>{message.model || "AI model"}</span><span>{message.usage.total.toLocaleString()} tokens</span><span>{message.usage.input.toLocaleString()} in / {message.usage.output.toLocaleString()} out</span></div>}
                            </div>
                            {message.role === "user" && <div className="mt-1 rounded-full bg-[#d1a91c] p-2 text-[#121722]"><UserRound className="h-3.5 w-3.5" /></div>}
                        </div>
                    ))}
                    {isSending && <div className="flex items-center gap-3 text-[11px] text-[#8290a8]"><div className="rounded-full bg-[#25334a] p-2 text-[#e0b91c]"><Bot className="h-3.5 w-3.5" /></div><span className="flex items-center gap-2">Thinking <Loader2 className="h-3.5 w-3.5 animate-spin" /></span></div>}
                    <div ref={endRef} />
                </div>

                {error && <p className="mx-4 mb-2 rounded-md border border-[#713f3a] bg-[#301f27] px-3 py-2 text-[11px] text-[#f0a18d]">{error}</p>}
                <form onSubmit={submit} className="border-t border-[#263249] p-3 sm:p-4">
                    <div className="flex items-end gap-2 rounded-xl border border-[#34435b] bg-[#0d1523] p-2 focus-within:border-[#d1a91c]">
                        <textarea
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(event); } }}
                            placeholder="Message the metering assistant..."
                            rows={2}
                            className="max-h-32 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-1 text-xs leading-5 text-[#e9eef7] outline-none placeholder:text-[#64728a]"
                        />
                        <button type="submit" disabled={!apiKey.trim() || !prompt.trim() || isSending} aria-label="Send prompt" className="rounded-lg bg-[#d1a91c] p-2.5 text-[#121722] transition hover:bg-[#f0c82d] disabled:cursor-not-allowed disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                    </div>
                    <p className="mt-2 text-center text-[10px] text-[#64728a]">Enter to send · Shift + Enter for a new line</p>
                </form>
            </Card>
        </div>
    );
}
