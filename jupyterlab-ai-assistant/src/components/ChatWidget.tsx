import React, { useState, useEffect, useRef } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { IThemeManager } from '@jupyterlab/apputils';

import { ChatMessage } from './ChatMessage';
import { ModelSelector } from './ModelSelector';
import { getAvailableModels, sendChatMessage } from '../services/ollama';

import '../../style/ChatWidget.css';

interface ChatMessageType {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  themeManager?: IThemeManager;
}

export class ChatWidget extends ReactWidget {
  private _themeManager: IThemeManager | undefined;

  constructor(props: ChatWidgetProps = {}) {
    super();
    this._themeManager = props.themeManager;
    this.addClass('jp-AI-ChatWidget');
    this.id = 'jupyterlab-ai-assistant-chat';
    this.title.label = 'AI Assistant';
    this.title.closable = true;
  }

  render(): JSX.Element {
    return <ChatComponent themeManager={this._themeManager} />;
  }
}

function ChatComponent({ themeManager }: ChatWidgetProps): JSX.Element {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('llama2');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await getAvailableModels();
        setAvailableModels(models.map((model: any) => model.name));
        if (models.length > 0) {
          setSelectedModel(models[0].name);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };

    fetchModels();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    // Add loading placeholder
    const placeholderId = `assistant-${Date.now()}`;
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: placeholderId,
        role: 'assistant',
        content: '...',
        timestamp: new Date()
      }
    ]);

    try {
      // Format messages for API
      const apiMessages = messages
        .filter((msg) => msg.role !== 'system')
        .concat(userMessage)
        .map((msg) => ({
          role: msg.role,
          content: msg.content
        }));

      // Add system message
      const systemMessage = {
        role: 'system',
        content: 'You are an AI assistant helping with Jupyter notebooks. Be concise and helpful.'
      };

      // Send chat request
      const response = await sendChatMessage(
        selectedModel, 
        [systemMessage, ...apiMessages]
      );

      // Replace loading placeholder with response
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                content: response.message?.content || 'No response',
                timestamp: new Date()
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Update placeholder with error
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                content: 'Error: Failed to get response from AI',
                timestamp: new Date()
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isDarkTheme = themeManager?.theme
    ? themeManager.isLight(themeManager.theme) === false
    : false;

  return (
    <div className={`chat-container ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      <div className="chat-header">
        <h3>AI Assistant</h3>
        <ModelSelector
          models={availableModels}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isDarkTheme={isDarkTheme}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <textarea
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={isLoading}
          rows={3}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !currentMessage.trim()}
          className="send-button"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
} 