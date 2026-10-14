import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Vibration,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { THEME } from '../theme'
import { ApiService } from '../services/api'

export function AgentScreen({ onNavigateTab }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "👋 Hello! I am your Autonomous Career Agent powered by Groq Llama 3.3 70B.\n\nI have direct access to your live career offers, candidate profile, and vault captures. Ask me anything about your pipeline, role evaluations, or outreach drafting:",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputMsg, setInputMsg] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const scrollViewRef = useRef(null)

  const quickPrompts = [
    { label: '📊 Summarize Offers', prompt: 'Summarize my current active career offers and their application channels.' },
    { label: '🎯 Top Matches', prompt: 'Based on my engineering candidate profile, which active offers are the strongest matches?' },
    { label: '✉️ Draft Outreach', prompt: 'Draft a high-impact, direct application pitch message for a Software Engineering role.' },
    { label: '💡 Interview Prep', prompt: 'What are the top 5 technical and behavioral questions I should prepare for my target roles?' },
    { label: '🔍 Vault Takeaways', prompt: 'What key technical takeaways and tools should I highlight in my resume from my saved vault items?' },
  ]

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const handleSendMessage = async (textToSend = null) => {
    const prompt = (textToSend || inputMsg).trim()
    if (!prompt || isProcessing) return

    setInputMsg('')
    const userMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsProcessing(true)

    // Haptic feedback
    try {
      Vibration.vibrate(40)
    } catch {}

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await ApiService.chatAgent(apiMessages)

      if (res && res.success && res.response) {
        const agentMessage = {
          role: 'assistant',
          content: res.response.content || res.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, agentMessage])
        try {
          Vibration.vibrate([0, 60, 40, 80])
        } catch {}
      } else {
        const errorMsg = res?.error || 'Unable to connect to AI server. Ensure backend is running.'
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Agent Error: ${errorMsg}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Connection Error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopyMessage = async (content) => {
    await Clipboard.setStringAsync(content)
    try {
      Vibration.vibrate(30)
    } catch {}
    Alert.alert('Copied 📋', 'Response text copied to clipboard.')
  }

  const handleClearChat = () => {
    Alert.alert(
      'Clear Conversation',
      'Reset conversation history with the agent?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([
              {
                role: 'assistant',
                content: 'Conversation reset. How can I assist your career search today?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          },
        },
      ]
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.agentAvatar}>
            <Text style={{ fontSize: 16 }}>🤖</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>AI Career Copilot</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Groq 70B</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Autonomous Career & Pipeline Copilot</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.clearBtn} onPress={handleClearChat} activeOpacity={0.7}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Prompts Bar */}
      <View style={styles.quickPromptsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPromptsList}
        >
          {quickPrompts.map((qp, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickPromptChip}
              onPress={() => handleSendMessage(qp.prompt)}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Text style={styles.quickPromptText}>{qp.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user'
          return (
            <View
              key={index}
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              {!isUser && (
                <View style={styles.assistantAvatarSmall}>
                  <Text style={{ fontSize: 12 }}>🤖</Text>
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isUser ? styles.userMessageText : styles.assistantMessageText,
                  ]}
                  selectable
                >
                  {msg.content}
                </Text>

                <View style={styles.messageFooter}>
                  <Text style={styles.timestampText}>{msg.timestamp}</Text>
                  {!isUser && (
                    <TouchableOpacity
                      onPress={() => handleCopyMessage(msg.content)}
                      style={styles.copyBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.copyBtnText}>Copy 📋</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )
        })}

        {isProcessing && (
          <View style={[styles.messageRow, styles.messageRowAssistant]}>
            <View style={styles.assistantAvatarSmall}>
              <Text style={{ fontSize: 12 }}>🤖</Text>
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble, styles.thinkingBubble]}>
              <ActivityIndicator size="small" color={THEME.colors.accent} />
              <Text style={styles.thinkingText}>Groq Agent analyzing pipeline & drafting...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Message Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask anything about offers, CVs, or outreach..."
          placeholderTextColor="#71717a"
          value={inputMsg}
          onChangeText={setInputMsg}
          multiline
          maxLength={1000}
          editable={!isProcessing}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!inputMsg.trim() || isProcessing) && styles.sendBtnDisabled,
          ]}
          onPress={() => handleSendMessage()}
          disabled={!inputMsg.trim() || isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#09090b" />
          ) : (
            <Text style={styles.sendBtnText}>➔</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.bgDark,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  agentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#a1a1aa',
    marginTop: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
  },
  clearBtnText: {
    fontSize: 11,
    color: '#a1a1aa',
    fontWeight: '600',
  },
  quickPromptsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#121214',
    paddingVertical: 8,
  },
  quickPromptsList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickPromptChip: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  quickPromptText: {
    fontSize: 11,
    color: '#e4e4e7',
    fontWeight: '500',
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  assistantAvatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#27272a',
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderBottomLeftRadius: 2,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  thinkingText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  userMessageText: {
    color: '#ffffff',
  },
  assistantMessageText: {
    color: '#f4f4f5',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  timestampText: {
    fontSize: 9,
    color: '#71717a',
  },
  copyBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  copyBtnText: {
    fontSize: 10,
    color: '#a1a1aa',
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#121214',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#27272a',
  },
  sendBtnText: {
    color: '#09090b',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
