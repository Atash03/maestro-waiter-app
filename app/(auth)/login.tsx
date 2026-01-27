import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiClientError } from '@/src/services/api/client';
import { useAuthStore } from '@/src/stores/authStore';
import MaestroLogo from '@/components/common/maestro-logo';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { login, isLoggingIn, clearError, error: storeError } = useAuthStore();

  // Show store errors
  if (storeError && !errorMessage) {
    setErrorMessage(storeError);
  }

  const validateForm = (): boolean => {
    let isValid = true;
    setUsernameError(null);
    setPasswordError(null);
    setErrorMessage(null);

    if (!username.trim()) {
      setUsernameError('Username is required');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    clearError();
    setErrorMessage(null);

    try {
      await login({ username: username.trim(), password });
      // Navigation happens via useEffect watching isAuthenticated
    } catch (error) {
      let message = 'Login failed. Please try again.';

      if (error instanceof ApiClientError) {
        if (error.status === 401) {
          message = 'Invalid username or password';
        } else if (error.status === 403) {
          // Device limit exceeded
          message = error.message || 'Too many devices. Please contact your administrator.';
        } else if (error.code === 'NETWORK_ERROR') {
          message = 'Unable to connect to server. Please check your connection.';
        } else if (error.code === 'TIMEOUT') {
          message = 'Connection timed out. Please try again.';
        } else {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      setErrorMessage(message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <MaestroLogo />
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Username Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, usernameError && styles.inputError]}
              placeholder="Enter your username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (usernameError) setUsernameError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoggingIn}
              testID="username-input"
            />
            {usernameError && <Text style={styles.fieldError}>{usernameError}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, passwordError && styles.inputError]}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError(null);
              }}
              secureTextEntry
              editable={!isLoggingIn}
              testID="password-input"
            />
            {passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
          </View>

          {/* Login Button */}
          <Pressable
            style={[
              styles.loginButton,
              isLoggingIn && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoggingIn}
            testID="login-button"
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#FFFFFF" testID="login-loading" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  formContainer: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  fieldError: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: '#F94623',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#FB9A89',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
