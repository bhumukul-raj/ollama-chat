import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  };
  isDarkTheme: boolean;
}

export const ChatMessage: React.FC<MessageProps> = ({ message, isDarkTheme }) => {
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Define styles based on theme
  const codeBackgroundColor = isDarkTheme ? '#1e1e1e' : '#f5f5f5';
  const codeColor = isDarkTheme ? '#d4d4d4' : '#333333';

  return (
    <div className={`message-container ${message.role}`}>
      <div className="message-header">
        <span className="message-role">
          {message.role === 'user' ? 'You' : 'AI Assistant'}
        </span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
      
      <div className="message-content">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <div className="syntax-highlighter-wrapper">
                  <pre style={{ 
                    backgroundColor: codeBackgroundColor, 
                    color: codeColor,
                    padding: '1em', 
                    borderRadius: '5px', 
                    overflow: 'auto' 
                  }}>
                    <code className={className} {...props}>
                      {String(children).replace(/\n$/, '')}
                    </code>
                  </pre>
                </div>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}; 