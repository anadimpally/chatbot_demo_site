// Chatbot API Configuration
const API_KEY = 'tJ4W9nHwTT1uhdbu8RXAL5EZBBNufqNayzDFIIZh';
const API_ENDPOINT = 'https://sbimxqdrc0.execute-api.us-east-1.amazonaws.com/api';

class ChatbotAPI {
    constructor() {
        this.apiKey = API_KEY;
        this.apiEndpoint = API_ENDPOINT;
        this.conversationId = null;
        this.lastMessageId = null;
    }

    // Initialize the chatbot
    async initialize() {
        try {
            // Start a new conversation with an empty message to get initial bot state
            const response = await this.startNewConversation("");
            this.conversationId = response.conversationId;
            this.lastMessageId = response.messageId;
            
            // Get initial response
            const initialResponse = await this.getConversationResponse();
            return initialResponse;
        } catch (error) {
            console.error('Failed to initialize chatbot:', error);
            throw error;
        }
    }

    // Start a new conversation
    async startNewConversation(message) {
        try {
            const response = await fetch(`${this.apiEndpoint}/conversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey
                },
                body: JSON.stringify({
                    conversation_id: "new_conversation",
                    message: {
                        role: "user",
                        content: [
                            {
                                content_type: "text",
                                body: message
                            }
                        ],
                        model: "claude-v3-sonnet"
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to start conversation:', error);
            throw error;
        }
    }

    // Get conversation response
    async getConversationResponse() {
        try {
            const response = await fetch(`${this.apiEndpoint}/conversation/${this.conversationId || 'new_conversation'}`, {
                method: 'GET',
                headers: {
                    'x-api-key': this.apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Extract the last assistant message
            const messages = Object.values(data.messageMap || {});
            const lastAssistantMessage = messages
                .filter(msg => msg.role === 'assistant')
                .pop();

            if (!lastAssistantMessage) {
                console.warn('No assistant message found in response:', data);
                return {
                    message: "I'm having trouble processing your request. Please try again."
                };
            }

            return {
                message: lastAssistantMessage.content[0]?.body || "I'm sorry, I couldn't generate a response."
            };
        } catch (error) {
            console.error('Failed to get conversation response:', error);
            throw error;
        }
    }

    // Send message to API and get response
    async sendMessage(message) {
        try {
            // Send the message
            const response = await this.startNewConversation(message);
            this.conversationId = response.conversationId;
            this.lastMessageId = response.messageId;

            // Get the response
            const chatResponse = await this.getConversationResponse();
            
            // Log the response for debugging
            console.log('Chat response:', chatResponse);
            
            return chatResponse;
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    }
}

// Chatbot UI Handler
class ChatbotUI {
    constructor() {
        this.chatbot = new ChatbotAPI();
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendMessage');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatbotIcon = document.getElementById('chatbotIcon');
        this.chatWindow = document.getElementById('chatWindow');
        this.closeChat = document.getElementById('closeChat');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Toggle chat window
        this.chatbotIcon.addEventListener('click', () => {
            this.chatWindow.classList.add('active');
            this.chatbotIcon.style.display = 'none';
        });

        // Close chat window
        this.closeChat.addEventListener('click', () => {
            this.chatWindow.classList.remove('active');
            this.chatbotIcon.style.display = 'flex';
        });

        // Send message handlers
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    // Add a message to the chat UI
    addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;

        // Format the message if it's from the bot
        if (!isUser) {
            message = this.formatBotMessage(message);
        }

        messageDiv.innerHTML = `<p>${this.escapeHtml(message)}</p>`;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    // Format bot message for better readability
    formatBotMessage(message) {
        let formattedMessage = message;

        // Replace multiple consecutive newlines with two newlines
        formattedMessage = formattedMessage.replace(/\n\s*\n\s*\n/g, '\n\n');

        // Format lists
        formattedMessage = formattedMessage.replace(/(?:^|\n)[-•]\s+([^\n]+)/g, '\n• $1');
        
        // Add line breaks before sections
        formattedMessage = formattedMessage.replace(/((?:^|\n)(?:Admission Requirements|Application Process|Tuition and Fees):)/g, '\n\n$1');

        // Format numbered lists
        formattedMessage = formattedMessage.replace(/(?:^|\n)(\d+)\.\s+([^\n]+)/g, '\n$1. $2');

        // Highlight important terms
        const importantTerms = ['Admission Requirements:', 'Application Process:', 'Tuition and Fees:', 'Important:', 'Note:'];
        importantTerms.forEach(term => {
            formattedMessage = formattedMessage.replace(
                new RegExp(`(${term})`, 'g'),
                '<strong>$1</strong>'
            );
        });

        return formattedMessage;
    }

    // Escape HTML but preserve line breaks and formatting
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\n/g, "<br>")
            .replace(/<br>\s*<br>/g, "<br><br>") // Preserve paragraph breaks
            .replace(/&lt;strong&gt;/g, "<strong>") // Preserve strong tags
            .replace(/&lt;\/strong&gt;/g, "</strong>");
    }

    // Send message and handle response
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        try {
            // Add user message to UI
            this.addMessage(message, true);
            this.messageInput.value = '';

            // Show typing indicator
            this.showTypingIndicator();

            // Get response from API
            const response = await this.chatbot.sendMessage(message);

            // Remove typing indicator and add bot response
            this.removeTypingIndicator();
            this.addMessage(response.message);
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('Sorry, I encountered an error. Please try again later.', false);
        }
    }

    // Show typing indicator
    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing';
        typingDiv.innerHTML = '<p>Typing...</p>';
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    // Remove typing indicator
    removeTypingIndicator() {
        const typingIndicator = this.chatMessages.querySelector('.typing');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Scroll chat to bottom
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Initialize chatbot when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.chatbot = new ChatbotUI();
}); 