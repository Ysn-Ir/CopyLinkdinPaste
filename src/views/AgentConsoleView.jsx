import React, { useState } from 'react'
import {
  Bot,
  Send,
  Terminal,
  Activity,
  Layers,
  Cpu,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react'
import { AgentOrchestrator } from '../services/agentOrchestrator.js'

export function AgentConsoleView({
  offers = [],
  cvList = [],
  candidateProfile,
  aiConfig,
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your PFE & Career Agent Orchestrator powered by Groq. I automatically parse incoming offers, classify roles, select candidate CV variants, and draft targeted outreach.\n\nAsk me anything about your current pipeline, offers, or career strategy:',
      timestamp: new Date().toLocaleTimeString(),
    },
  ])
  const [inputMsg, setInputMsg] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile')
  const [selectedTrace, setSelectedTrace] = useState(AgentOrchestrator.traces[0] || null)

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMsg.trim()) return

    const userPrompt = inputMsg.trim()
    setInputMsg('')

    const updated = [
      ...messages,
      { role: 'user', content: userPrompt, timestamp: new Date().toLocaleTimeString() },
    ]
    setMessages(updated)
    setIsProcessing(true)

    try {
      const response = await AgentOrchestrator.chat(userPrompt, updated, {
        offers,
        cvList,
        candidateProfile,
        aiConfig: { ...(aiConfig || {}), model: selectedModel, provider: 'groq' },
      })

      setMessages((prev) => [...prev, response])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error running agent tool: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="workspace-view" style={{ padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', height: 'calc(100vh - 120px)' }}>
        {/* Left Column: Interactive Chat & Tool Execution */}
        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
          {/* Header */}
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color="#ffffff" />
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Autonomous Career Agent</h2>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Groq High-Speed Tool Loop • Grounded Pipeline Execution
                </span>
              </div>
            </div>

            {/* Model Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={13} color="#f59e0b" />
              <select
                className="form-select"
                style={{ width: 'auto', height: '26px', fontSize: '11px' }}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="llama-3.3-70b-versatile">Groq Llama 3.3 70B (Default)</option>
                <option value="llama-3.1-8b-instant">Groq Llama 3.1 8B (Ultra-Fast)</option>
                <option value="mixtral-8x7b-32768">Groq Mixtral 8x7B (Long Context)</option>
              </select>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '8px 0',
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? '#27272a' : '#141417',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span>{m.role === 'user' ? 'You' : 'Assistant (Grounded)'}</span>
                  <span>{m.timestamp}</span>
                </div>
                <div style={{ whiteSpace: 'pre-line' }}>{m.content}</div>

                {/* Tool calls execution chip */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {m.toolCalls.map((t, i) => (
                      <span key={i} className="skill-tag" style={{ color: '#10b981' }}>
                        ⚙️ {t.name} ({t.duration}ms)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, height: '34px' }}
              placeholder="Ask: 'Show email offers for AI', 'Which CV is for Data?', 'Summarize active interviews'..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              disabled={isProcessing}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ height: '34px' }}
              disabled={isProcessing || !inputMsg.trim()}
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {/* Right Column: Execution Traces & Cost Log */}
        <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', overflowY: 'auto' }}>
          <div className="section-header">
            <span className="section-title">
              <Terminal size={16} color="var(--text-secondary)" />
              <span>Agent Run Traces & Cost Log</span>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {AgentOrchestrator.traces.length} execution runs
            </span>
          </div>

          {/* Traces List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {AgentOrchestrator.traces.length === 0 ? (
              <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px' }}>
                No ingestion traces recorded yet. Ingest an offer or link to inspect live tool execution traces.
              </div>
            ) : (
              AgentOrchestrator.traces.map((trace) => (
                <div
                  key={trace.id}
                  onClick={() => setSelectedTrace(trace)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '4px',
                    background: selectedTrace?.id === trace.id ? 'var(--bg-surface-hover)' : 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>{trace.timestamp}</span>
                    <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)' }}>{trace.costEst}</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    "{trace.input}..."
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <span className="skill-tag">Tokens: {trace.tokens}</span>
                    <span className="skill-tag">Conf: {trace.confidence}</span>
                    <span className="skill-tag">Tools: {trace.toolCalls?.length}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Trace Inspector Box */}
          {selectedTrace && (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="form-label">Selected Trace Details:</span>
              <div className="trace-box">
                {JSON.stringify(selectedTrace, null, 2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
