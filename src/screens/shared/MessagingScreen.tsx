import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, Message } from '../../types';
import { Colors, Spacing, FontSize, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import SafetyBanner from '../../components/SafetyBanner';
type Props = NativeStackScreenProps<RootStackParamList, 'Messaging'>;

export default function MessagingScreen({ navigation, route }: Props) {
  const { otherUserId, otherUserName } = route.params;
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();

      const channel = supabase
        .channel(`messaging-${profile?.id}-${otherUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'buddyline',
            table: 'messages',
            filter: `receiver_id=eq.${profile?.id}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === otherUserId) {
              setMessages((prev) => [...prev, newMsg]);
              setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }, [profile?.id, otherUserId])
  );

  const fetchMessages = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${profile.id},receiver_id.eq.${otherUserId}),` +
        `and(sender_id.eq.${otherUserId},receiver_id.eq.${profile.id})`
      )
      .order('created_at', { ascending: true });

    setMessages(data || []);

    // Mark received messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', profile.id)
      .eq('sender_id', otherUserId);
  };

  const sendMessage = async () => {
    if (!input.trim() || !profile) return;
    const content = input.trim();
    setInput('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: profile.id,
        receiver_id: otherUserId,
        content,
        is_read: false,
      })
      .select('*')
      .single();

    if (error) {
      setInput(content);
      return;
    }

    if (data) {
      setMessages((prev) => [...prev, data]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{initials(otherUserName)}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{otherUserName}</Text>
              <Text style={styles.headerSub}>Buddyline</Text>
            </View>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => navigation.navigate('Report', { reportedId: otherUserId, reportedName: otherUserName })}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={Colors.accentLight} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <SafetyBanner />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          renderItem={({ item, index }) => {
            const isMe = item.sender_id === profile?.id;
            const prevMsg = messages[index - 1];
            const showAvatar = !isMe && (!prevMsg || prevMsg.sender_id !== item.sender_id);

            return (
              <View style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}>
                {!isMe && (
                  <View style={styles.bubbleAvatarWrap}>
                    {showAvatar ? (
                      <View style={styles.bubbleAvatar}>
                        <Text style={styles.bubbleAvatarText}>{initials(otherUserName)}</Text>
                      </View>
                    ) : (
                      <View style={styles.bubbleAvatarSpacer} />
                    )}
                  </View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                    {formatTime(item.created_at)}
                    {isMe && <Text> · {item.is_read ? '✓✓' : '✓'}</Text>}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: Colors.surface }}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { backgroundColor: Colors.primaryDeep },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF40',
  },
  headerAvatarText: { color: Colors.primaryDeep, fontWeight: '800', fontSize: FontSize.sm },
  headerInfo: { flex: 1 },
  headerName: { fontSize: FontSize.md, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: FontSize.xs, color: Colors.accentLight, marginTop: 1 },
  reportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: { padding: Spacing.md, paddingBottom: Spacing.lg, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2 },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  bubbleAvatarWrap: { width: 32, marginRight: 6 },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleAvatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bubbleAvatarSpacer: { width: 28 },
  bubble: {
    maxWidth: '72%',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bubbleMe: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: { fontSize: FontSize.md, color: Colors.text, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: Colors.textMuted, marginTop: 3, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.65)' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: Colors.border,
    color: Colors.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: Colors.border, shadowOpacity: 0 },
});
