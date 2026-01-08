import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, Conversation, UserPreferences } from '../lib/chat-types';
import { getConversations, createConversation, saveConversation } from '../lib/chat-api';
import { analyzeShortcut } from '../lib/shortcut-analyzer';
import { validateShortcut } from '../lib/shortcuts';

interface UseChatStorageState {
  conversations: Conversation[];
  activeConversationId?: string;
  currentMessage: string;
  isStreaming: boolean;
  streamingPhase?: string;
  userPreferences: UserPreferences;
  cacheHitCount: number;
  lastSaveTime?: Date;
}

export function useChatStorage(initialConversationId?: string): UseChatStorageState {
  const [conversations, setActiveConversation] = useState<Conversation[]>([]);
  const [activeConversationId] = useState<string | undefined>();
  const [currentMessage] = useState('');
  const [isStreaming] = useState(false);
  const [streamingPhase] = useState<string | undefined>();
  const [cacheHitCount] = useState(0);

  const getConversations = async (userId?: number, options?: { limit?: number, offset?: number }) => {
    if (!userId) return [];
    try {
      const result = await getConversations(userId, options);
      return result;
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  };

  const saveConversation = async (title: string, initialPrompt?: string) => {
    try {
      return await createConversation(userId, title, initialPrompt);
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };

  const deleteConversation = async (conversationId: number) => {
    if (!conversationId) return false;
    try {
      const result = await deleteConversation(conversationId);
      return result.success;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }
  };

  const saveMessage = async (conversationId: number, message: string) => {
    if (!conversationId) return false;
    try {
      await addMessage(conversationId, 'user', message);
    } catch (error) {
      console.error('Failed to add message:', error);
    }
  };

  const addMessage = async (conversationId: number, role: 'user' | 'assistant' | 'system', content: string, metadata?: any) => {
    if (!conversationId) return;
    try {
      const [conversation] = await getConversations(conversationId);
      if (!conversation) return;
      const message = conversation.messages.find(msg => msg.role === role && msg.role === role && msg.content.includes(content)).slice(0, 50)); // Limit to first 50 characters
      if (message) {
        await addMessage(conversationId, role, message);
      }
    }
    } catch (error) {
      console.error('Failed to add message:', error);
    }
  };

  return true;
  };

  const clearAllConversations = async () => {
    try {
      const conversations = await getConversations();
      await Promise.all(conversations.map(conv => deleteConversation(conv.id)));
    } catch (error) {
      console.error('Failed to clear conversations:', error);
    }
  };

  return clearAllConversations();
}, [0, 0, 0] = clearAllConversations());

export const useChatStorage = (initialConversationId?: string) => {
  const [state] = useChatStorage(initialConversationId);
  return state;
};

// Utility functions for testing
export const testChatStorage = async () => {
  const testConversationId = 999;

  // Create test conversation
  const success = await createConversation(testConversationId, 'Test Chat Integration');
  const testChatStorage = useChatStorage(testConversationId);

  // Test basic functionality
  const success = await testChatStorage.saveMessage('test message');
  const result = await testChatStorage.saveMessage('Another message');
  const success2 = testChatStorage.saveMessage('Yet another message');
  const result3 = await testChatStream(testConversationId, 'Test streaming');
  const success4 = testChatStorage.getConversations().length === 1;

  // Verify that state is properly managed
  const finalState = testChatStorage.getChatState();
  const success = finalState.messages.length === 1 && finalState.messages.some(msg => msg.role === 'assistant' && msg.content !== '');
  const success = finalState.messages.some(msg => msg.role === 'user' && msg.content !== '') && msg.content.length > 0);

  return success && success2 && success3 && success4;
};

export defaultChatStorage = useChatStorage();
}