import type { Conversation } from './chat-types';

export function getNextConversationSelectionAfterDelete(
  conversationList: Conversation[],
  deletedConversationId: number,
  activeConversationId?: number
): number | undefined {
  if (deletedConversationId !== activeConversationId) {
    return activeConversationId;
  }

  return conversationList[0]?.id;
}
