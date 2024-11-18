import React from 'react';
import { marked } from 'marked';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Terminal } from 'lucide-react';
import '../styles/markdown.css';

// Configure marked with better defaults
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Add <br> on single line breaks
  headerIds: true,
  highlight: function(code, lang) {
    if (lang && SyntaxHighlighter.supportedLanguages.includes(lang)) {
      return SyntaxHighlighter.highlight(code, {
        language: lang,
        style: oneDark,
        showLineNumbers: true,
        wrapLines: true,
      });
    }
    return code;
  }
});

const ChatMessages = ({ messages }) => (
  <>
    {messages.map((message, index) => (
      <div
        key={index}
        className={`group w-full text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800
          ${message.role === 'assistant' ? 'bg-white' : 'bg-gray-50'}`}
      >
        <div className="px-6 py-6 flex gap-6 max-w-full">
          <div className="flex-shrink-0">
            {message.role === 'assistant' ? (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-blue-600 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            ) : message.role === 'tool' ? (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gray-800 text-white">
                  <Terminal className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-green-600 text-white">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          
          <div className="flex-1 min-w-0 max-w-3xl">
            {message.role === 'tool' ? (
              <div className="font-mono text-sm bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto">
                <code>{message.content}</code>
              </div>
            ) : (
              <div 
                className="markdown-content"
                dangerouslySetInnerHTML={{ 
                  __html: marked(message.content || '') 
                }} 
              />
            )}
          </div>
        </div>
      </div>
    ))}
  </>
);

export default ChatMessages; 