import { buildCreateConversationPayload } from './chat-api';

describe('buildCreateConversationPayload', () => {
  it('does not include an initial prompt for a blank conversation title', () => {
    expect(buildCreateConversationPayload('New Chat', 1)).toEqual({
      title: 'New Chat',
      userId: 1
    });
  });

  it('includes an initial prompt only when explicitly provided', () => {
    expect(buildCreateConversationPayload('Shortcut API Chat', 7, 'Build a shortcut that calls an authenticated API')).toEqual({
      title: 'Shortcut API Chat',
      userId: 7,
      initialPrompt: 'Build a shortcut that calls an authenticated API'
    });
  });
});
