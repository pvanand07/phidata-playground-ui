import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

const MessageInput = ({ inputMessage, setInputMessage, handleSendMessage, isLoading }) => (
  <form onSubmit={handleSendMessage} className="flex gap-2 items-end bg-white rounded-lg border shadow-lg">
    <Textarea
      value={inputMessage}
      onChange={(e) => setInputMessage(e.target.value)}
      placeholder="Message ChatBot..."
      disabled={isLoading}
      className="min-h-[60px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage(e);
        }
      }}
    />
    <div className="p-2">
      <Button 
        type="submit" 
        size="icon"
        disabled={isLoading}
        className="h-8 w-8 rounded-lg"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  </form>
);

export default MessageInput; 