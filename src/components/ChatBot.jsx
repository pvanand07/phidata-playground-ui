import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChatMessages from './ChatMessages';
import MessageInput from './MessageInput';
import prompts from '../assets/prompts';
import { LLMClient } from '../api/llm-client';
import { phiDataService } from '../api/phidata';
import { FileEdit } from 'lucide-react';

const formatModelName = (fullName) => {
  return fullName.split('/')[1] || fullName;
};

const ChatBot = () => {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const scrollAreaRef = useRef(null);
  const llmClientRef = useRef(null);

  useEffect(() => {
    llmClientRef.current = new LLMClient();
    fetchAgents();

    // Try to get last used agent from localStorage
    const lastUsedAgentId = localStorage.getItem('lastUsedAgentId');
    if (lastUsedAgentId) {
      setSelectedAgent(agents.find(a => a.agent_id === lastUsedAgentId));
    }
  }, []);

  useEffect(() => {
    // When agents are loaded, select first agent if none is selected
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0]);
    }
  }, [agents]);

  const handleAgentChange = (agentId) => {
    const agent = agents.find(a => a.agent_id === agentId);
    setSelectedAgent(agent);
    // Store selected agent ID in localStorage
    localStorage.setItem('lastUsedAgentId', agentId);
  };

  const fetchAgents = async () => {
    try {
      const agentsData = await phiDataService.getAgents();
      setAgents(agentsData);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedAgent) return;

    const userMessage = { role: 'user', content: newMessage };
    const messageContent = newMessage;
    setNewMessage('');
    setIsLoading(true);

    setMessages(prev => [...prev, userMessage]);
    
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
        let contentBuffer = '';
        let toolCallBuffer = [];
        let hasToolCall = false;
        
        const assistantMessage = { role: 'assistant', content: '' };
        setMessages(prev => [...prev, assistantMessage]);

        await phiDataService.sendMessage(
            messageContent,
            selectedAgent.agent_id,
            {
                onContent: (content) => {
                    if (toolCallBuffer.length > 0) {
                        setMessages(prev => {
                            const newMessages = [...prev];
                            newMessages.push({ 
                                role: 'tool', 
                                content: toolCallBuffer.join('\n')
                            });
                            toolCallBuffer = [];
                            return [...newMessages, { role: 'assistant', content }];
                        });
                    } else {
                        contentBuffer += content;
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMessage = newMessages[newMessages.length - 1];
                            if (lastMessage.role === 'assistant') {
                                lastMessage.content = contentBuffer;
                            }
                            return newMessages;
                        });
                    }
                },
                onToolCall: (toolContent) => {
                    hasToolCall = true;
                    contentBuffer = '';
                    toolCallBuffer.push(toolContent);
                },
                onError: (error) => {
                    console.error('Error during message send:', error);
                    if (toolCallBuffer.length > 0) {
                        setMessages(prev => [...prev, { 
                            role: 'tool', 
                            content: toolCallBuffer.join('\n')
                        }]);
                    }
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: 'Sorry, an error occurred while processing your message.' 
                    }]);
                },
                onComplete: () => {
                    if (toolCallBuffer.length > 0) {
                        setMessages(prev => [...prev, { 
                            role: 'tool', 
                            content: toolCallBuffer.join('\n')
                        }]);
                    }
                    setIsLoading(false);
                    contentBuffer = '';
                    toolCallBuffer = [];
                    hasToolCall = false;
                }
            }
        );
    } catch (error) {
        console.error('Error sending message:', error);
        setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setMessages([]);
  };

  return (
    <div className="relative h-full flex overflow-hidden">
      <div className={`flex flex-col w-full transition-all duration-300 relative min-w-0 overflow-hidden`}>
        <div className="absolute inset-x-0 top-0 z-20">
          <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
            <div className="flex items-center space-x-4">
              <Select 
                value={selectedAgent?.agent_id} 
                onValueChange={handleAgentChange}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue>
                    {selectedAgent ? selectedAgent.name : "Select an agent"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.agent_id} value={agent.agent_id}>
                      <div className="flex items-center w-full min-w-0">
                        <span className="truncate">
                          {agent.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <button
                onClick={handleNewSession}
                className="p-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="New Session"
              >
                <FileEdit className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gray-50 z-10" />
        
        <ScrollArea ref={scrollAreaRef} className="flex-1 w-full">
          <div className="pb-32 w-full overflow-hidden flex justify-center">
            <div className="w-full max-w-[800px]">
              <ChatMessages messages={messages} />
            </div>
          </div>
        </ScrollArea>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-50 pt-10">
          <div className="p-4 flex justify-center">
            <div className="w-full max-w-[800px]">
              <MessageInput 
                inputMessage={newMessage}
                setInputMessage={setNewMessage}
                handleSendMessage={sendMessage}
                isLoading={isLoading}
              />
              <div className="text-xs text-center mt-2 text-gray-500">
                Powered by GPT-4. Messages are processed through a secure API.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;