import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, BorderRadius, Spacing } from '../../lib/theme';
import { Send } from 'lucide-react-native';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onTyping, disabled = false }) => {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleChangeText = (val: string) => {
    setText(val);
    if (onTyping) {
      onTyping(val.length > 0);
    }
  };

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    if (onTyping) onTyping(false);
    onSend(text.trim());
    setText('');
  };

  const bottomPadding = isKeyboardVisible
    ? Spacing.md
    : Math.max(Spacing.sm, Platform.OS === 'ios' ? insets.bottom : Spacing.sm);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.textInput}
          placeholder="Message flatmates..."
          placeholderTextColor={Colors.grayBlack}
          value={text}
          onChangeText={handleChangeText}
          multiline
          maxLength={1000}
          cursorColor={Colors.navy}
          selectionColor={Colors.paleSky}
          underlineColorAndroid="transparent"
          textAlignVertical="center"
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          style={[
            styles.sendButton,
            text.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
          ]}
        >
          <Send
            size={18}
            color={text.trim() ? Colors.white : Colors.grayBlack}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.xs : 4,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    ...Typography.Body,
    color: Colors.black,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  sendButtonActive: {
    backgroundColor: Colors.navy,
  },
  sendButtonInactive: {
    backgroundColor: 'transparent',
  },
});
