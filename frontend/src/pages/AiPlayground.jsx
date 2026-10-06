import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Check, Copy, KeyRound, Loader2, RotateCcw, Sparkles, UserRound } from "lucide-react";
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
    const [copiedMessage, setCopiedMessage] = useState(null);
    const [actionError, setActionError] = useState("");
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

    const copyResponse = async (text, index) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessage(index);
            setActionError("");
            window.setTimeout(() => setCopiedMessage(null), 1600);
        } catch {
            setActionError("Could not copy to clipboard. Select the response text and copy it manually.");
        }
    };

    return (
        <div className="flex min-h-full flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="rounded-xl border border-[#d6b65e]/20 bg-[#d6b65e]/10 p-2.5 text-[#e7c86d]"><Sparkles className="h-4 w-4" /></div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-[#edf2f8]">AI Playground</h1>
                        <p className="mt-1 text-xs text-[#8291a4]">Prompt, generate, and inspect the token usage returned by your model.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => { setMessages([]); setPrompt(""); setError(""); setActionError(""); }}
                    disabled={isSending || (!messages.length && !prompt && !error)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#304155] px-3 text-xs font-medium text-[#aebaca] hover:bg-[#1a2735] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Clear conversation
                </button>
            </div>

            <Card className="border-[#2b3b4e] bg-[#111b28]">
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

            <Card className="flex min-h-[440px] flex-1 flex-col overflow-hidden p-0 sm:min-h-[520px]">
                <div className="flex items-center gap-3 border-b border-[#263249] px-5 py-4">
                    <div className="rounded-xl bg-[#243347] p-2 text-[#d6b65e]"><Bot className="h-4 w-4" /></div>
                    <div><p className="text-sm font-semibold text-[#e5ebf5]">Metered response</p><p className="text-[11px] text-[#8291a4]">Usage is associated with the API key above</p></div>
                    {messages.length > 0 && <span className="ml-auto text-[11px] text-[#8291a4]">{messages.filter((message) => message.role === "assistant").length} response(s)</span>}
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
                        <div key={`${message.role}-${index}`} className={cn("flex min-w-0 gap-3", message.role === "user" && "justify-end")}>
                            {message.role === "assistant" && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#243347] text-[#d6b65e]"><Bot className="h-4 w-4" /></div>}
                            <div className={cn("min-w-0 max-w-[min(90%,720px)] rounded-2xl px-4 py-3 text-xs leading-6 sm:text-sm", message.role === "user" ? "rounded-br-md bg-[#d6b65e] text-[#171a20]" : "rounded-bl-md border border-[#2d3b4e] bg-[#151f2c] text-[#dce5f2]")}>
                                <p className="whitespace-pre-wrap">{message.text}</p>
                                {message.usage && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#344762] pt-3">
                                        <span className="rounded-full border border-[#37485d] px-2.5 py-1 text-[10px] text-[#b2c0d0]">{message.model || "AI model"}</span>
                                        <span className="rounded-full border border-[#37485d] px-2.5 py-1 font-mono text-[10px] text-[#d9e2ec]">{message.usage.total.toLocaleString()} tokens</span>
                                        <span className="text-[10px] text-[#8e9db5]">{message.usage.input.toLocaleString()} in / {message.usage.output.toLocaleString()} out</span>
                                        <button type="button" onClick={() => void copyResponse(message.text, index)} className="ml-auto inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 text-[10px] text-[#aab8c8] hover:bg-[#243347] hover:text-white" aria-label="Copy AI response">
                                            {copiedMessage === index ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                            {copiedMessage === index ? "Copied" : "Copy"}
                                        </button>
                                    </div>
                                )}
                            </div>
                            {message.role === "user" && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#d6b65e] text-[#171a20]"><UserRound className="h-4 w-4" /></div>}
                        </div>
                    ))}
                    {isSending && <div role="status" className="flex items-center gap-3 text-xs text-[#9aabbe]"><div className="rounded-xl bg-[#243347] p-2 text-[#d6b65e]"><Bot className="h-4 w-4" /></div><span className="flex items-center gap-2">Waiting for model response <Loader2 className="h-3.5 w-3.5 animate-spin" /></span></div>}
                    <div ref={endRef} />
                </div>

                {error && <p role="alert" className="mx-4 mb-2 rounded-lg border border-[#713f3a] bg-[#301f27] px-3 py-2 text-xs text-[#f0a18d]">{error}</p>}
                {actionError && <p role="status" className="mx-4 mb-2 text-xs text-[#e5bd76]">{actionError}</p>}
                <form onSubmit={submit} className="border-t border-[#263249] p-3 sm:p-4">
                    <div className="flex items-end gap-2 rounded-xl border border-[#34435b] bg-[#0d1523] p-2 focus-within:border-[#d1a91c]">
                        <textarea
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(event); } }}
                            placeholder="Message the metering assistant..."
                            rows={2}
                            aria-label="Enter a prompt"
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
