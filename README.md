# RadiusX University Chatbot Demo Site

A demo website featuring an AI-powered chatbot integration for RadiusX University. The chatbot provides information about university programs, admissions, and campus life using the RadiusX Chatbot API.

## 🚀 Features

- **Interactive Chat Interface**
  - Real-time messaging
  - Smooth animations and transitions
  - Mobile-responsive design
  - Professional UI/UX

- **AI-Powered Responses**
  - Integration with Claude v3 Sonnet model
  - Context-aware conversations
  - Formatted message display
  - Error handling and recovery

- **University Website Demo**
  - Modern landing page
  - Navigation menu
  - Responsive design
  - Professional styling

## 📁 Project Structure

```
chatbot_demo_site/
├── index.html          # Main webpage and chat widget
├── styles.css         # Styling for website and chat
├── js/
│   └── chatbot.js    # Chatbot functionality and API integration
└── README.md         # Project documentation
```

## 🔧 Setup and Installation

1. **Clone the Repository**
   ```bash
   git clone [repository-url]
   cd chatbot_demo_site
   ```

2. **Configuration**
   - Open `index.html`
   - Update the API configuration:
     ```javascript
     const apiKey = 'YOUR_API_KEY';
     const apiEndpoint = 'YOUR_API_ENDPOINT';
     ```

3. **Running the Project**
   - Open `index.html` in a web browser
 
 
## 💻 Usage

### Chat Widget

- Click the chat icon in the bottom right corner to open the chat window
- Type your message and press Enter or click the send button
- The chatbot will respond with relevant information about RadiusX University

### API Integration

The chatbot uses a two-step process for communication:
1. POST request to start/update conversation
2. GET request to retrieve bot response

Example API call:
```javascript
POST /api/conversation
{
    "conversation_id": "new_conversation",
    "message": {
        "role": "user",
        "content": [{
            "content_type": "text",
            "body": "user message"
        }],
        "model": "claude-v3-sonnet"
    },
    "bot_id": "BOT_ID"
}
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

