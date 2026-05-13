'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, MapPin, CheckSquare, PackageCheck, Sprout, Leaf, Truck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface Message {
  id: string;
  sender_uid: string;
  sender_name: string;
  text: string;
  type: 'text' | 'system' | 'action';
  action_type?: string;
  timestamp: string;
}

interface InboxChatWindowProps {
  orders: any[];
  onStatusUpdate: (newStatus: string) => void;
  otherName?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function InboxChatWindow({ 
  orders, 
  onStatusUpdate,
  otherName = 'User'
}: InboxChatWindowProps) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [isLocating, setIsLocating] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isFirstLoad = useRef(true)

  // Sort orders by created_at desc to find the latest one
  const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestOrder = sortedOrders[0];
  const isFarmer = latestOrder ? latestOrder.farmer_uid === user?.uid : false;
  const status = latestOrder ? latestOrder.status : 'open';

  const shortcuts = isFarmer ? [
    "I'm working on it.",
    "The crop is growing well!",
    "I'll deliver it soon."
  ] : [
    "Where are you now?",
    "When will it be ready?",
    "How is the crop?"
  ]

  const fetchMessages = async () => {
    try {
      const allMessages: Message[] = [];
      
      for (const order of orders) {
        const res = await fetch(`${API_URL}/api/marketplace/orders/${order.id}/messages`)
        if (res.ok) {
          const data = await res.json()
          allMessages.push(...data)
        }
      }
      
      allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(allMessages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const orderIds = orders.map(o => o.id).join(',');
  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [orderIds])

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

      if (isFirstLoad.current || isNearBottom) {
        container.scrollTop = container.scrollHeight;
        if (messages.length > 0) {
          isFirstLoad.current = false;
        }
      }
    }
  }, [messages])

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault()
    const text = customText || input
    if (!text.trim()) return

    if (!customText) setInput('')

    if (!latestOrder) return;

    try {
      await fetch(`${API_URL}/api/marketplace/orders/${latestOrder.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_uid: user?.uid,
          sender_name: profile?.username || 'User',
          text,
          type: 'text'
        })
      })
      fetchMessages()
    } catch (err) {
      console.error(err)
    }
  }

  const handleLocation = () => {
    setIsLocating(true)
    setTimeout(() => {
      handleSend(undefined, "Shared location: Tasik UTM, Skudai")
      setIsLocating(false)
    }, 1000)
  }

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <span className="chat-status-dot"></span>
          <div>
            <h3>{otherName}</h3>
            <span className="chat-subtitle">
              {latestOrder?.plant_emoji} {latestOrder?.plant_name}
              {orders.length > 1 && ` (+${orders.length - 1} other order${orders.length > 2 ? 's' : ''})`}
            </span>
          </div>
        </div>

      </div>

      <div className="chat-messages" ref={scrollRef}>
        {loading && messages.length === 0 ? (
          <div className="chat-empty">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">Start a conversation to coordinate delivery details!</div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="msg-system">
                  <span>{msg.text}</span>
                </div>
              )
            }
            if (msg.type === 'action') {
              const textContent = msg.text.replace('Marked order as ', '')
              const [newStatus, oldStatus] = textContent.split('|')
              return (
                <div key={msg.id} className="msg-action">
                  <div className="msg-action-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div><strong>{msg.sender_name}</strong> updated status: <span className="action-tag">{newStatus}</span></div>
                    {oldStatus && (
                      <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>
                        Status updated from <span style={{ fontWeight: 600 }}>{oldStatus}</span> to <span style={{ fontWeight: 600 }}>{newStatus}</span>.
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            const isMe = msg.sender_uid === user?.uid
            return (
              <div key={msg.id} className={`msg-bubble-wrapper ${isMe ? 'me' : 'them'}`}>
                <div className="msg-bubble">
                  {!isMe && <div className="msg-sender">{msg.sender_name}</div>}
                  <div className="msg-text">{msg.text}</div>
                  <div className="msg-time">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="chat-shortcuts">
        {shortcuts.map(s => (
          <button key={s} type="button" className="shortcut-btn" onClick={() => handleSend(undefined, s)}>
            {s}
          </button>
        ))}
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <button type="button" className="chat-tool-btn" onClick={handleLocation} disabled={isLocating}>
          <MapPin size={20} className={isLocating ? 'spin' : ''} />
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="chat-send-btn" disabled={!input.trim()}>
          <Send size={20} />
        </button>
      </form>

      <style jsx>{`
        .chat-window {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .chat-header {
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-header-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .chat-status-dot {
          width: 8px;
          height: 8px;
          background: #4ade80;
          border-radius: 50%;
          box-shadow: 0 0 8px #4ade80;
        }

        .chat-header h3 {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
          color: white;
        }

        .chat-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .chat-actions-bar {
          display: flex;
          gap: 8px;
        }

        .chat-wf-btn {
          background: rgba(94, 196, 130, 0.1);
          border: 1px solid rgba(94, 196, 130, 0.3);
          color: #5ec482;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chat-wf-btn:hover {
          background: #5ec482;
          color: #020d06;
        }

        .chat-wf-btn.success {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .chat-wf-btn.success:hover {
          background: #10b981;
          color: white;
        }

        .chat-messages {
          flex-grow: 1;
          padding: 20px 20px 0px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(0, 0, 0, 0.1);
          min-height: 0;
        }

        .chat-empty {
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
          margin-top: 40px;
        }

        .msg-bubble-wrapper {
          display: flex;
          width: 100%;
        }

        .msg-bubble-wrapper.me {
          justify-content: flex-end;
        }

        .msg-bubble-wrapper.them {
          justify-content: flex-start;
        }

        .msg-bubble {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 16px;
          position: relative;
          font-size: 0.8rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .me .msg-bubble {
          background: #5ec482;
          color: #020d06;
          border-bottom-right-radius: 4px;
          font-weight: 500;
        }

        .them .msg-bubble {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .msg-sender {
          font-size: 0.7rem;
          font-weight: 700;
          color: #5ec482;
          margin-bottom: 2px;
        }

        .msg-time {
          font-size: 0.6rem;
          opacity: 0.7;
          text-align: right;
          margin-top: 4px;
        }

        .msg-system {
          align-self: center;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 4px 0;
          border: 1px solid rgba(255, 255, 255, 0.02);
        }

        .msg-action {
          align-self: center;
          background: rgba(94, 196, 130, 0.05);
          border: 1px dashed rgba(94, 196, 130, 0.3);
          padding: 6px 16px;
          border-radius: 12px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin: 4px 0;
        }

        .action-tag {
          font-weight: 700;
          color: #5ec482;
          text-transform: uppercase;
          margin-left: 6px;
        }

        .chat-shortcuts {
          display: flex;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.1);
          overflow: hidden;
          flex-shrink: 0;
        }

        .shortcut-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.8);
          padding: 4px 10px;
          border-radius: 50px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 34px;
        }

        .shortcut-btn:hover {
          background: rgba(94, 196, 130, 0.1);
          border-color: #5ec482;
          color: #5ec482;
        }

        .chat-input-area {
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid var(--glass-border);
          display: flex;
          gap: 12px;
          align-items: center;
          flex-shrink: 0;
        }

        .chat-input-area input[type="text"] {
          flex-grow: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 10px 16px;
          color: white;
          outline: none;
          transition: border-color 0.2s;
        }

        .chat-input-area input[type="text"]:focus {
          border-color: #5ec482;
        }

        .chat-tool-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-tool-btn:hover {
          color: #5ec482;
        }

        .chat-send-btn {
          background: #5ec482;
          border: none;
          color: #020d06;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .chat-send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          background: #4ab36d;
        }

        .chat-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
