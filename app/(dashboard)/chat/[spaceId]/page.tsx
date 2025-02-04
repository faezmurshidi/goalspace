'use client';

import { useEffect, useState } from 'react';
import { ChatWithMentor } from '@/components/chat-with-mentor';
import { useSpaceStore } from '@/lib/store';

export default function ChatPage({
  params,
}: {
  params: { spaceId: string };
}) {
  const { addMessage } = useSpaceStore();

  useEffect(() => {
    // Check if there's a task to assist with
    const assistTask = localStorage.getItem('assistWithTask');
    if (assistTask) {
      // Add the task message to the chat
      addMessage(params.spaceId, {
        role: 'user',
        content: assistTask,
      });
      // Clear the stored task after adding it
      localStorage.removeItem('assistWithTask');
    }
  }, [params.spaceId, addMessage]);

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="flex h-full flex-col">
        <div className="flex-none border-b p-4">
          <h1 className="text-xl font-semibold">AI Mentor Chat</h1>
          <p className="text-sm text-gray-500">Get assistance with your tasks</p>
        </div>
        
        <div className="flex-1">
          <ChatWithMentor spaceId={params.spaceId} />
        </div>
      </div>
    </div>
  );
} 