// ─────────────────────────────────────────────────────────────────
// LoginScreen.tsx — 로그인 화면
//
// Expo Go 호환: Firebase JS SDK (firebase/auth)만 사용
// 흐름: 이메일/비밀번호 입력 → Firebase 로그인 → 백엔드 체크 (authStore)
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../config/firebaseConfig'
import { useAuthStore } from '../../store/authStore'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '../../navigation/AppNavigator'

// 네비게이션 타입 (AuthStack 내 화면)
type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // 백엔드 로그인 확인 함수
  const { checkBackendLogin } = useAuthStore()

  // ─── 로그인 처리 ──────────────────────────────
  const handleLogin = async () => {
    // 기본 유효성 검사
    if (!email.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해 주세요.')
      return
    }
    if (!password.trim()) {
      Alert.alert('입력 오류', '비밀번호를 입력해 주세요.')
      return
    }

    setLoading(true)
    try {
      // 1. Firebase 이메일/비밀번호 로그인
      await signInWithEmailAndPassword(auth, email.trim(), password)

      // 2. 백엔드 등록 여부 확인
      //    → checkBackendLogin 내부에서 needsSignup / user 세팅
      //    → App.tsx의 onAuthStateChanged가 상태 변화를 감지해 화면 전환
      await checkBackendLogin()
    } catch (error: any) {
      // Firebase 에러 코드 한국어 안내
      const msg = parseFirebaseError(error.code)
      Alert.alert('로그인 실패', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        {/* 로고 영역 */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>🐾 고롱</Text>
          <Text style={styles.tagLine}>지역 문화, 함께 걸어요</Text>
        </View>

        {/* 입력 폼 */}
        <View style={styles.form}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="gorong@example.com"
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            // Expo Go에서 자동완성 방지
            textContentType="emailAddress"
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호 입력"
            placeholderTextColor="#aaa"
            secureTextEntry
            textContentType="password"
          />

          {/* 로그인 버튼 */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>로그인</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 회원가입 이동 */}
        <View style={styles.signupRow}>
          <Text style={styles.signupHint}>아직 고롱 회원이 아닌가요?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLink}> 회원가입</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Firebase 에러 코드 → 한국어 안내 ─────────
function parseFirebaseError(code?: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return '이메일 또는 비밀번호가 올바르지 않습니다.'
    case 'auth/wrong-password':
      return '비밀번호가 올바르지 않습니다.'
    case 'auth/invalid-email':
      return '올바른 이메일 형식이 아닙니다.'
    case 'auth/user-disabled':
      return '비활성화된 계정입니다. 관리자에게 문의해 주세요.'
    case 'auth/too-many-requests':
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.'
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인해 주세요.'
    default:
      return '로그인에 실패했습니다. 다시 시도해 주세요.'
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },

  // ─── 로고 ───
  logoArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FF6B35',
  },
  tagLine: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },

  // ─── 폼 ───
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#222',
    backgroundColor: '#fafafa',
  },
  loginBtn: {
    marginTop: 28,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ─── 회원가입 링크 ───
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupHint: {
    fontSize: 13,
    color: '#999',
  },
  signupLink: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
  },
})