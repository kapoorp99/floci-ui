import {useState, useRef, useEffect, type KeyboardEvent} from 'react'
import {Sparkles, Send, X, Trash2, ChevronDown} from 'lucide-react'
import {useAiAgent, type ChatMessage} from './useAiAgent'

interface AiAgentChatProps {
    activeCloud: string
}

function formatResultPreview(result: unknown): string | null {
    if (!result) return null
    if (Array.isArray(result)) {
        if (result.length === 0) return '📭 No resources found.'
        const count = result.length
        const preview = result.slice(0, 5).map((item: Record<string, unknown>) => {
            const name = item.name || item.instanceId || item.vpcId || item.groupId || item.id || 'unnamed'
            const status = item.state || item.status || ''
            return `  • ${name}${status ? ` (${status})` : ''}`
        }).join('\n')
        return `📋 Found **${count}** resource${count !== 1 ? 's' : ''}:\n${preview}${count > 5 ? `\n  _… and ${count - 5} more_` : ''}`
    }
    if (typeof result === 'object' && result !== null) {
        const r = result as Record<string, unknown>
        if (r.ok && r.deleted) return `🗑️ Deleted: \`${r.deleted}\``
        const id = r.instanceId || r.vpcId || r.groupId || r.name || r.arn || r.id
        if (id) return `✅ Created: \`${id}\``
    }
    return null
}

function MessageBubble({msg}: {msg: ChatMessage}) {
    const isUser = msg.role === 'user'

    if (msg.isTyping) {
        return (
            <div className="ai-msg ai-msg-agent">
                <div className="ai-msg-bubble ai-msg-bubble-agent">
                    <div className="ai-typing-indicator">
                        <span /><span /><span />
                    </div>
                </div>
            </div>
        )
    }

    const resultPreview = !isUser ? formatResultPreview(msg.result) : null

    return (
        <div className={`ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-agent'}`}>
            <div className={`ai-msg-bubble ${isUser ? 'ai-msg-bubble-user' : 'ai-msg-bubble-agent'}`}>
                <div className="ai-msg-content">
                    {msg.content.split('\n').map((line, i) => {
                        // Simple markdown-ish rendering
                        const formatted = line
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/`(.+?)`/g, '<code>$1</code>')
                            .replace(/_(.+?)_/g, '<em>$1</em>')
                        return <p key={i} dangerouslySetInnerHTML={{__html: formatted || '&nbsp;'}} />
                    })}
                </div>
                {resultPreview && (
                    <div className="ai-msg-result">
                        {resultPreview.split('\n').map((line, i) => {
                            const formatted = line
                                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                .replace(/`(.+?)`/g, '<code>$1</code>')
                                .replace(/_(.+?)_/g, '<em>$1</em>')
                            return <p key={i} dangerouslySetInnerHTML={{__html: formatted || '&nbsp;'}} />
                        })}
                    </div>
                )}
                {msg.error && !msg.content.includes(msg.error) && (
                    <div className="ai-msg-error">⚠️ {msg.error}</div>
                )}
            </div>
            <span className="ai-msg-time">
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
            </span>
        </div>
    )
}

const SUGGESTIONS = [
    {label: '🪣 Create S3 Bucket', prompt: 'Create an S3 bucket called my-test-bucket'},
    {label: '📋 List Instances', prompt: 'List all EC2 instances'},
    {label: '🔒 Create VPC', prompt: 'Create a VPC with CIDR 10.0.0.0/16'},
    {label: '🔑 List Secrets', prompt: 'List all secrets'},
    {label: '📡 Check Status', prompt: 'Check the cloud connection status'},
]

export function AiAgentChat({activeCloud}: AiAgentChatProps) {
    const [isOpen, setIsOpen] = useState(false)
    const {messages, isProcessing, sendMessage, clearChat} = useAiAgent(activeCloud)
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
    }, [messages])

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300)
        }
    }, [isOpen])

    const handleSend = () => {
        if (!input.trim() || isProcessing) return
        sendMessage(input.trim())
        setInput('')
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleSuggestion = (prompt: string) => {
        sendMessage(prompt)
    }

    return (
        <>
            {/* Floating Action Button */}
            <button
                id="ai-agent-fab"
                className={`ai-agent-fab ${isOpen ? 'ai-agent-fab-active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Floci AI Assistant"
            >
                {isOpen ? <ChevronDown size={22} /> : <Sparkles size={22} />}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="ai-agent-panel" id="ai-agent-panel">
                    {/* Header */}
                    <div className="ai-panel-header">
                        <div className="ai-panel-title">
                            <Sparkles size={16} className="ai-panel-icon" />
                            <div>
                                <h3>Floci AI</h3>
                                <span className="ai-panel-subtitle">
                                    Cloud Assistant · {activeCloud.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div className="ai-panel-actions">
                            <button className="ai-panel-btn" onClick={clearChat} title="Clear chat">
                                <Trash2 size={14} />
                            </button>
                            <button className="ai-panel-btn" onClick={() => setIsOpen(false)} title="Close">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="ai-chat-messages" id="ai-chat-messages">
                        {messages.map(msg => (
                            <MessageBubble key={msg.id} msg={msg} />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestion Chips */}
                    {messages.length <= 2 && (
                        <div className="ai-suggestion-chips">
                            {SUGGESTIONS.map(s => (
                                <button
                                    key={s.label}
                                    className="ai-chip"
                                    onClick={() => handleSuggestion(s.prompt)}
                                    disabled={isProcessing}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="ai-input-area">
                        <div className="ai-input-wrapper">
                            <input
                                ref={inputRef}
                                id="ai-chat-input"
                                className="ai-input"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me to create resources…"
                                disabled={isProcessing}
                                autoComplete="off"
                            />
                            <button
                                className="ai-send-btn"
                                onClick={handleSend}
                                disabled={!input.trim() || isProcessing}
                                title="Send"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <span className="ai-input-hint">Powered by Gemini · Press Enter to send</span>
                    </div>
                </div>
            )}
        </>
    )
}
