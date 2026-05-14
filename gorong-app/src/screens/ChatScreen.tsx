import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native'
import { useChat } from '../hooks/useChat'

export default function ChatScreen() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, isConnected } = useChat()

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 현장 채팅</Text>
        <Text style={styles.headerSub}>
          {isConnected ? '📍 행사장 내 익명 채팅' : '행사장에 입장하면 채팅 가능'}
        </Text>
      </View>

      {/* 메시지 목록 */}
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        style={styles.messageList}
        renderItem={({ item }) => (
          <View style={styles.messageBubble}>
            <Text style={styles.nickname}>{item.nickname}</Text>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />

      {/* 입력창 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={isConnected ? '메시지 입력...' : '행사장 진입 후 이용 가능'}
          editable={isConnected}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !isConnected && styles.sendBtnDisabled]}
          onPress={() => { if (input.trim()) { sendMessage(input); setInput('') } }}
          disabled={!isConnected}
        >
          <Text style={styles.sendBtnText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    backgroundColor: '#FF6B35', paddingTop: 60, paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#fff', fontSize: 12, marginTop: 4, opacity: 0.85 },
  messageList: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  messageBubble: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 10, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  nickname: { fontSize: 11, color: '#FF6B35', fontWeight: '600', marginBottom: 3 },
  messageText: { fontSize: 14, color: '#333' },
  inputRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14,
  },
  sendBtn: {
    backgroundColor: '#FF6B35', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendBtnText: { color: '#fff', fontWeight: '600' },
})