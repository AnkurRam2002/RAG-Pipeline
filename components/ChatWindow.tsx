"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, X, FileText, Loader2 } from "lucide-react";

type Chunk = { fileName: string; text: string };

type Message = {
  role: "user" | "assistant";
  content: string;
  chunks?: Chunk[];
};

export default function ChatWindow({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<Chunk | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, userId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Chat request failed");
      }

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      let rawStream = "";
      let metadataParsed = false;
      let assistantMessage = "";
      let chunks: Chunk[] = [];

      setMessages((prev) => [...prev, { role: "assistant", content: "", chunks: [] }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        rawStream += textChunk;

        if (!metadataParsed) {
          const splitIndex = rawStream.indexOf("__METADATA_END__\n\n");
          if (splitIndex !== -1) {
            const metaString = rawStream.slice(0, splitIndex);
            try {
              chunks = JSON.parse(metaString).chunks;
            } catch (e) {
              console.error("Failed to parse metadata", e);
            }
            assistantMessage = rawStream.slice(splitIndex + "__METADATA_END__\n\n".length);
            metadataParsed = true;
          }
        } else {
          assistantMessage += textChunk;
        }

        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = assistantMessage;
          newMessages[newMessages.length - 1].chunks = chunks;
          return newMessages;
        });
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `**Error**: ${err?.message || "Sorry, an error occurred while processing your request."}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const preprocessMarkdown = (content: string) => {
    return content.replace(/\[(\d+)\]/g, "[$1](#chunk-$1)");
  };

  return (
    <div className="flex flex-col h-[600px] lg:h-[700px] bg-[#111] border border-[#333] relative overflow-hidden">
      <div className="p-4 border-b border-[#333] bg-[#1a1a1a] z-10 relative flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-widest uppercase">
          <FileText className="w-4 h-4 text-white" />
          DOCUMENT SEARCH
        </h2>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar scroll-smooth bg-[#111]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-6 animate-in fade-in duration-500">
            <p className="text-center italic text-xl text-gray-300 font-serif">
              Initialize Knowledge Query
            </p>
            <p className="text-center font-mono text-xs uppercase tracking-widest max-w-sm leading-relaxed">
              Upload reference documents to the knowledge base or execute a semantic search using the command interface.
            </p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[90%] md:max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 ${
              msg.role === "user"
                ? "self-end items-end"
                : "self-start items-start"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5 px-1">
              {msg.role === "user" ? (
                <>
                  <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest border border-white px-1.5 py-0.5">USER</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest border border-[#333] px-1.5 py-0.5">SYSTEM</span>
                </>
              )}
            </div>
            
            <div className={`p-4 md:p-5 ${
              msg.role === "user"
                ? "bg-[#2a2a2a] text-white border border-[#444]"
                : "bg-[#1a1a1a] border border-[#333] text-gray-200 prose prose-invert prose-p:leading-relaxed max-w-none"
            }`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => {
                      const match = props.href?.match(/#chunk-(\d+)/);
                      if (match) {
                        const idx = parseInt(match[1], 10) - 1;
                        const chunk = msg.chunks?.[idx];
                        if (chunk) {
                          return (
                            <button
                              onClick={() => setSelectedChunk(chunk)}
                              className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#333] hover:bg-[#555] border border-[#555] text-white inline-flex items-center justify-center cursor-pointer transition-colors no-underline ml-1 uppercase"
                            >
                              [REF {idx + 1}]
                            </button>
                          );
                        }
                      }
                      return <a {...props} className="text-gray-300 hover:text-white underline decoration-[#555] underline-offset-4 transition-colors font-medium" />;
                    }
                  }}
                >
                  {preprocessMarkdown(msg.content)}
                </ReactMarkdown>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex flex-col max-w-[85%] self-start items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest border border-[#333] px-1.5 py-0.5">SYSTEM</span>
            </div>
            <div className="p-4 bg-[#1a1a1a] border border-[#333] text-gray-200 flex items-center gap-3">
               <Loader2 className="w-4 h-4 text-white animate-spin" />
               <span className="text-xs font-mono tracking-widest uppercase animate-pulse">PROCESSING DATA...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-[#111] border-t border-[#333] z-10 relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ENTER COMMAND..."
            className="w-full pl-4 pr-16 py-3 bg-[#1a1a1a] border border-[#333] text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors font-mono text-sm uppercase tracking-wider"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-1.5 p-2 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white transition-colors border border-white"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Citation Modal */}
      {selectedChunk && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-[#111] border border-[#333] max-w-lg w-full flex flex-col max-h-[80%] overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-[#333] bg-[#1a1a1a] flex justify-between items-center">
              <h3 className="font-mono font-bold text-white truncate pr-4 text-[10px] tracking-widest uppercase flex items-center gap-2">
                <FileText className="w-3 h-3" />
                REF // {selectedChunk.fileName}
              </h3>
              <button 
                onClick={() => setSelectedChunk(null)}
                className="text-gray-400 hover:text-white border border-transparent hover:border-[#555] p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-mono">
              {selectedChunk.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
