const DEV_URL = 'http://localhost:7777/v1/playground/agent';
const PROD_URL = 'https://phidata-api.elevatics.cloud/v1/playground/agent';

const BASE_URL = PROD_URL;

export class PhiDataService {
    constructor() {
        this.sessionId = crypto.randomUUID();
        this.userId = 'user-' + Date.now();
    }

    async getAgents() {
        try {
            console.log('Fetching agents...');
            const response = await fetch(`${BASE_URL}/get`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching agents:', error);
            throw error;
        }
    }

    async sendMessage(message, agentId, callbacks = {}) {
        const {
            onStart = () => {},
            onContent = () => {},
            onToolCall = () => {},
            onError = () => {},
            onComplete = () => {}
        } = callbacks;

        try {
            console.log('Sending message...');
            const response = await fetch(`${BASE_URL}/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    agent_id: agentId,
                    stream: true,
                    monitor: true,
                    session_id: this.sessionId,
                    user_id: this.userId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let jsonBuffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                
                jsonBuffer = this.processChunk(chunk, jsonBuffer, {
                    onContent,
                    onToolCall,
                });
            }

            onComplete();
        } catch (error) {
            console.error('Error during message send:', error);
            onError(error);
            throw error;
        }
    }

    processChunk(chunk, jsonBuffer, callbacks) {
        let buffer = jsonBuffer;
        const lines = chunk.split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('data: ')) {
                line = line.substring(6);
            }
            if (!line) return;

            buffer += line;

            while (buffer) {
                const jsonObj = this.extractJsonObject(buffer);
                if (!jsonObj.success) break;

                buffer = jsonObj.remainingBuffer;
                
                let processedObj = jsonObj.data;
                if (!processedObj.event && !processedObj.content) {
                    const entries = Object.entries(processedObj);
                    if (entries.length === 1) {
                        const [event, content] = entries[0];
                        processedObj = { event, content };
                    }
                }
                
                this.handleJsonObject(processedObj, callbacks);
            }
        });

        return buffer;
    }

    extractJsonObject(buffer) {
        const startIdx = buffer.indexOf('{');
        if (startIdx === -1) return { success: false };

        let depth = 0;
        let endIdx = -1;

        for (let i = startIdx; i < buffer.length; i++) {
            if (buffer[i] === '{') depth++;
            else if (buffer[i] === '}') {
                depth--;
                if (depth === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        if (endIdx === -1) return { success: false };

        try {
            const jsonStr = buffer.substring(startIdx, endIdx + 1);
            const data = JSON.parse(jsonStr);
            const remainingBuffer = buffer.substring(endIdx + 1);
            // console.log('Extracted JSON:', data);
            return { success: true, data, remainingBuffer };
        } catch (e) {
            return { success: false };
        }
    }

    handleJsonObject(jsonObj, callbacks) {
        const { onContent, onToolCall } = callbacks;

        if (jsonObj.event && jsonObj.content) {
            switch (jsonObj.event) {
                case 'RunResponse':
                    console.log('RunResponse:', jsonObj.content);
                    onContent(jsonObj.content);
                    break;
                case 'ToolCallStarted':
                    console.log('ToolCallStarted:', jsonObj.content);
                    onToolCall(jsonObj.content);
                    break;
            }
            return;
        }

        if (jsonObj.content) {
            onContent(jsonObj.content);
        }
    }

    isSystemMessage(jsonObj) {
        return jsonObj.content === 'Updating memory' || 
               jsonObj.content === 'Run started' ||
               jsonObj.event === 'UpdatingMemory' ||
               jsonObj.event === 'RunCompleted';
    }
}

export const phiDataService = new PhiDataService();