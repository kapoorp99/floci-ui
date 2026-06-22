import {useState, useCallback, useRef} from 'react'
import {API_BASE_URL} from '@/api/api'

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    result?: unknown
    error?: string
    isTyping?: boolean
}

interface GeminiChatMessage {
    role: 'user' | 'model'
    parts: Array<{text: string}>
}

interface AiResponse {
    reply: string
    action?: {type: string; cloud?: string; service?: string; params?: Record<string, unknown>}
    result?: unknown
    error?: string
}

let messageCounter = 0
function nextId(): string {
    return `msg-${Date.now()}-${++messageCounter}`
}

export function useAiAgent(activeCloud: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `👋 Hi! I'm **Floci AI**, your cloud infrastructure assistant.\n\nI can help you create, list, and manage cloud resources using natural language. Try things like:\n\n• "Create an S3 bucket called my-data"\n• "List all EC2 instances"\n• "Create a VPC with CIDR 10.0.0.0/16"\n• "Show me all secrets"\n\nWhat would you like to do?`,
            timestamp: new Date(),
        },
    ])
    const [isProcessing, setIsProcessing] = useState(false)
    const historyRef = useRef<GeminiChatMessage[]>([])

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isProcessing) return

        const userMsg: ChatMessage = {
            id: nextId(),
            role: 'user',
            content: text,
            timestamp: new Date(),
        }

        const typingMsg: ChatMessage = {
            id: 'typing',
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isTyping: true,
        }

        setMessages(prev => [...prev, userMsg, typingMsg])
        setIsProcessing(true)

        try {
            const res = await fetch(`${API_BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    message: text,
                    history: historyRef.current,
                    cloud: activeCloud,
                }),
            })

            const data: AiResponse = await res.json()

            // Update history for multi-turn context
            historyRef.current = [
                ...historyRef.current,
                {role: 'user', parts: [{text}]},
                {role: 'model', parts: [{text: JSON.stringify({reply: data.reply, action: data.action})}]},
            ]

            // Keep history manageable (last 20 turns)
            if (historyRef.current.length > 40) {
                historyRef.current = historyRef.current.slice(-40)
            }

            const assistantMsg: ChatMessage = {
                id: nextId(),
                role: 'assistant',
                content: data.reply,
                timestamp: new Date(),
                result: data.result,
                error: data.error,
            }

            setMessages(prev => prev.filter(m => m.id !== 'typing').concat(assistantMsg))
        } catch (err) {
            const errorMsg: ChatMessage = {
                id: nextId(),
                role: 'assistant',
                content: `Sorry, I couldn't process that request. ${err instanceof Error ? err.message : 'Please try again.'}`,
                timestamp: new Date(),
                error: err instanceof Error ? err.message : 'Unknown error',
            }
            setMessages(prev => prev.filter(m => m.id !== 'typing').concat(errorMsg))
        } finally {
            setIsProcessing(false)
        }
    }, [activeCloud, isProcessing])

    const clearChat = useCallback(() => {
        historyRef.current = []
        setMessages([{
            id: 'welcome-reset',
            role: 'assistant',
            content: '🔄 Chat cleared! How can I help you?',
            timestamp: new Date(),
        }])
    }, [])

    return {messages, isProcessing, sendMessage, clearChat}
}
