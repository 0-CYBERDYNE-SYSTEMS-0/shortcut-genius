import type { Conversation } from './chat-types';
import { getNextConversationSelectionAfterDelete } from './conversation-state';

const makeConversation = (id: number): Conversation => ({
  id,
  userId: 1,
  title: `Conversation ${id}`,
  createdAt: new Date('2026-03-11T00:00:00Z'),
  messageCount: 0,
  metadata: {}
});

describe('getNextConversationSelectionAfterDelete', () => {
  it('selects the next available conversation after deleting the active one', () => {
    const conversationList = [makeConversation(22), makeConversation(11)];

    expect(getNextConversationSelectionAfterDelete(conversationList, 11, 11)).toBe(22);
  });

  it('clears selection when deleting the last active conversation', () => {
    expect(getNextConversationSelectionAfterDelete([], 11, 11)).toBeUndefined();
  });

  it('preserves the active conversation when deleting a different thread', () => {
    const conversationList = [makeConversation(11), makeConversation(33)];

    expect(getNextConversationSelectionAfterDelete(conversationList, 22, 11)).toBe(11);
  });
});
