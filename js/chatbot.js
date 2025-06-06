// Chatbot API Configuration
const API_KEY = 'ebvJBWgVrO7qob6y8j5zF25OiffduTMJ6ScWpJsL';
const API_ENDPOINT = 'https://01cwcwm9vf.execute-api.us-east-1.amazonaws.com/api';
const UPLOAD_ENDPOINT = 'http://localhost:3000/api/upload'; // Add separate upload endpoint

class ChatbotAPI {
    constructor() {
        this.apiKey = API_KEY;
        this.apiEndpoint = API_ENDPOINT;
        this.uploadEndpoint = UPLOAD_ENDPOINT;
        this.conversationId = null;
        this.lastMessageId = null;
    }

    // Initialize the chatbot
    async initialize() {
        try {
            // Clear any existing conversation state
            this.conversationId = null;
            this.lastMessageId = null;
            
            // Clear any stored conversation data
            localStorage.removeItem('currentConversation');
            
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
            // Always ensure we're starting fresh
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
                        model: "claude-v3.5-sonnet-v2"
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Store new conversation ID
            localStorage.setItem('currentConversation', data.conversationId);
            
            return data;
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

    // Add page visibility change handler
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Reset conversation when page becomes visible (e.g., after refresh)
                this.initialize();
            }
        });
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
        this.chatStart = document.getElementById('chatStart');
        this.chatUserForm = document.getElementById('chatUserForm');
        this.chatInput = document.getElementById('chatInput');
        this.fileInput = null;
        
        // Load session data
        this.sessionData = this.loadSessionData();
        
        this.initializeEventListeners();
        this.setupFileUpload();
        this.setupVisibilityHandler(); // Add visibility handler
        this.restoreSession();
    }

    // Save session data to localStorage
    saveSessionData() {
        const sessionData = {
            userName: this.sessionData.userName,
            userEmail: this.sessionData.userEmail,
            userPhone: this.sessionData.userPhone,
            userCountry: this.sessionData.userCountry,
            userState: this.sessionData.userState,
            userCity: this.sessionData.userCity,
            userProgram: this.sessionData.userProgram,
            chatHistory: Array.from(this.chatMessages.children).map(msg => ({
                type: msg.classList.contains('user') ? 'user' : 'bot',
                content: msg.querySelector('p') ? msg.querySelector('p').innerHTML : '',
                isFile: msg.classList.contains('file-message'),
                fileData: msg.classList.contains('file-message') ? 
                    {
                        preview: msg.querySelector('.file-preview').innerHTML
                    } : null
            }))
        };
        localStorage.setItem('chatSession', JSON.stringify(sessionData));
    }

    // Load session data from localStorage
    loadSessionData() {
        const savedSession = localStorage.getItem('chatSession');
        return savedSession ? JSON.parse(savedSession) : { 
            userName: null, 
            userEmail: null, 
            userPhone: null, 
            userCountry: null, 
            userState: null, 
            userCity: null, 
            userProgram: null, 
            chatHistory: [] 
        };
    }

    // Restore previous session if exists
    restoreSession() {
        if (this.sessionData.userName && this.sessionData.userEmail) {
            // Add logout button
            this.addLogoutButton();
            
            // Hide start screens and show chat
            this.chatStart.style.display = 'none';
            this.chatUserForm.style.display = 'none';
            this.chatMessages.style.display = 'block';
            this.chatInput.style.display = 'flex';

            // Restore chat history
            this.chatMessages.innerHTML = ''; // Clear default welcome message
            this.sessionData.chatHistory.forEach(msg => {
                if (msg.isFile) {
                    const fileMessage = document.createElement('div');
                    fileMessage.className = `message ${msg.type} file-message`;
                    fileMessage.innerHTML = `<div class="file-preview">${msg.fileData.preview}</div>`;
                    this.chatMessages.appendChild(fileMessage);
                } else {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.type}`;
                    messageDiv.innerHTML = `<p>${msg.content}</p>`;
                    this.chatMessages.appendChild(messageDiv);
                }
            });

            this.scrollToBottom();
        }
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

        // Start conversation button
        const startBtn = this.chatStart.querySelector('.start-conversation-btn');
        startBtn.addEventListener('click', () => {
            this.chatStart.style.display = 'none';
            this.chatUserForm.style.display = 'flex';
            
            // Update form HTML with new fields including city
            this.chatUserForm.innerHTML = `
                <label for="userName">Name</label>
                <input type="text" id="userName" required>
                
                <label for="userEmail">Email</label>
                <input type="email" id="userEmail" required>
                
                <label for="userPhone">Phone</label>
                <input type="tel" id="userPhone" placeholder="e.g., +1 (123) 456-7890">
                
                <label for="userCountry">Country</label>
                <input type="text" id="userCountry" required>
                
                <label for="userState">Province/State</label>
                <input type="text" id="userState" required>
                
                <label for="userCity">City</label>
                <input type="text" id="userCity" required>
                
                <label for="userProgram">Interested Program</label>
                <input type="text" id="userProgram" placeholder="Enter your program of interest" required>
                
                <button type="submit">Continue</button>
            `;
        });

        // Handle form submission
        this.chatUserForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userName = document.getElementById('userName').value;
            const userEmail = document.getElementById('userEmail').value;
            const userPhone = document.getElementById('userPhone').value;
            const userCountry = document.getElementById('userCountry').value;
            const userState = document.getElementById('userState').value;
            const userCity = document.getElementById('userCity').value;
            const userProgram = document.getElementById('userProgram').value;
            
            if (userName && userEmail && userCountry && userState && userCity && userProgram) {
                // Add logout button
                this.addLogoutButton();
                
                // Store user data in session
                this.sessionData = {
                    userName,
                    userEmail,
                    userPhone,
                    userCountry,
                    userState,
                    userCity,
                    userProgram,
                    chatHistory: []
                };
                
                // Hide form and show chat
                this.chatUserForm.style.display = 'none';
                this.chatMessages.style.display = 'block';
                this.chatInput.style.display = 'flex';
                
                // Clear existing messages and add personalized welcome message
                this.chatMessages.innerHTML = '';
                const welcomeMessage = `👋 Hi ${userName} from ${userCity}, Welcome to RadiusX University! I see you're interested in our ${userProgram} program. I'm your virtual advisor, and I can communicate in multiple languages - feel free to chat with me in any language you're comfortable with! I'm here to help you with information about our programs, admissions, campus life, and more. How can I assist you today? 🌍`;
                this.addMessage(welcomeMessage, false);

                // Add language hint message
                setTimeout(() => {
                    const languageHint = "💡 Tip: You can type your messages in any language, and I'll understand and respond accordingly!";
                    this.addMessage(languageHint, false);
                }, 1000);
                
                // Save session
                this.saveSessionData();
            }
        });

        // Send message handlers
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Add window unload event to save session
        window.addEventListener('beforeunload', () => {
            this.saveSessionData();
        });
    }

    setupFileUpload() {
        // Create file input element
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.id = 'fileInput';
        this.fileInput.style.display = 'none';
        this.fileInput.multiple = true;
        this.fileInput.accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png';

        // Create upload button
        const uploadButton = document.createElement('button');
        uploadButton.type = 'button';
        uploadButton.className = 'upload-btn';
        uploadButton.innerHTML = '<i class="fas fa-paperclip"></i>';
        uploadButton.title = 'Upload File';

        // Insert elements into chat input
        this.chatInput.insertBefore(this.fileInput, this.sendButton);
        this.chatInput.insertBefore(uploadButton, this.sendButton);

        // Add event listeners
        uploadButton.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', () => this.handleFileUpload());
    }

    handleFileUpload() {
        const files = this.fileInput.files;
        if (!files.length) return;

        Array.from(files).forEach(file => {
            try {
                // Show uploading state
                const fileMessage = document.createElement('div');
                fileMessage.className = 'message user file-message';
                
                // Create file preview
                const filePreview = document.createElement('div');
                filePreview.className = 'file-preview';
                
                // Add file icon and name
                filePreview.innerHTML = `
                    <i class="fas ${this.getFileIcon(file.name)}"></i>
                    <span>${file.name}</span>
                    <small>${this.formatFileSize(file.size)}</small>
                `;
                
                // Add status indicator
                const status = document.createElement('div');
                status.className = 'upload-status';
                status.textContent = 'Reading file...';
                filePreview.appendChild(status);
                
                fileMessage.appendChild(filePreview);
                this.chatMessages.appendChild(fileMessage);
                this.scrollToBottom();

                // Read file as base64
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        // Get base64 data
                        const base64Data = reader.result;
                        
                        // Create file object to store
                        const fileData = {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            data: base64Data,
                            timestamp: new Date().toISOString()
                        };
                        
                        // Get existing files or initialize empty array
                        const storedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
                        
                        // Add new file
                        storedFiles.push(fileData);
                        
                        // Store back in localStorage
                        localStorage.setItem('uploadedFiles', JSON.stringify(storedFiles));
                        
                        // Update status
                        status.textContent = 'Stored successfully';
                        status.className = 'upload-status success';
                        
                        // Add success message
                        this.addMessage(`File "${file.name}" has been stored successfully. The file is ${this.formatFileSize(file.size)} in size.`, false);
                        
                    } catch (error) {
                        console.error('File storage failed:', error);
                        status.textContent = 'Storage failed';
                        status.className = 'upload-status error';
                        this.addMessage(`Sorry, I couldn't store the file "${file.name}". The file might be too large for browser storage.`, false);
                    }
                };
                
                reader.onerror = () => {
                    console.error('File reading failed');
                    status.textContent = 'Reading failed';
                    status.className = 'upload-status error';
                    this.addMessage(`Sorry, I couldn't read the file "${file.name}". Please try again with a different file.`, false);
                };
                
                // Start reading the file
                reader.readAsDataURL(file);
                
            } catch (error) {
                console.error('File handling failed:', error);
                this.addMessage(`Sorry, I couldn't process the file "${file.name}". Please try again with a different file.`, false);
            }
        });

        // Reset file input
        this.fileInput.value = '';
    }

    getFileIcon(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            pdf: 'fa-file-pdf',
            doc: 'fa-file-word',
            docx: 'fa-file-word',
            txt: 'fa-file-alt',
            jpg: 'fa-file-image',
            jpeg: 'fa-file-image',
            png: 'fa-file-image'
        };
        return iconMap[extension] || 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        
        // Save session after each message
        this.saveSessionData();
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

    // Modify clearSession method
    clearSession() {
        localStorage.removeItem('chatSession');
        this.sessionData = { 
            userName: null, 
            userEmail: null, 
            userPhone: null, 
            userCountry: null, 
            userState: null, 
            userCity: null, 
            userProgram: null, 
            chatHistory: [] 
        };
        this.chatMessages.innerHTML = '';
        
        // Close the chat window
        this.chatWindow.classList.remove('active');
        this.chatbotIcon.style.display = 'flex';
        
        // Reset the chat window state for next open
        setTimeout(() => {
            // Reset all elements to initial state
            this.chatMessages.style.display = 'none';
            this.chatUserForm.style.display = 'none';
            this.chatInput.style.display = 'none';
            this.chatStart.style.display = 'flex';
        }, 300);
        
        // Remove logout button
        const logoutButton = document.querySelector('.logout-chat');
        if (logoutButton) {
            logoutButton.remove();
        }
    }

    addLogoutButton() {
        const chatHeader = document.querySelector('.chat-header');
        const logoutButton = document.createElement('button');
        logoutButton.className = 'logout-chat';
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        logoutButton.title = 'End Chat Session';
        
        // Insert before the close button
        const closeButton = chatHeader.querySelector('.close-chat');
        chatHeader.insertBefore(logoutButton, closeButton);

        // Add click event
        logoutButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to end this chat session? This will clear the chat history.')) {
                this.clearSession();
            }
        });
    }

    // Add method to get stored files
    getStoredFiles() {
        return JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
    }

    // Add method to clear stored files
    clearStoredFiles() {
        localStorage.removeItem('uploadedFiles');
    }
}

// Initialize chatbot when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.chatbot = new ChatbotUI();
}); 