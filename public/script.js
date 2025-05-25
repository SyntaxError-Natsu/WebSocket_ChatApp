const socket = io();

// DOM elements
const usernameInput = document.getElementById('username');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messagesContainer');
const editModal = document.getElementById('editModal');
const editInput = document.getElementById('editInput');
const saveEditButton = document.getElementById('saveEdit');
const cancelEditButton = document.getElementById('cancelEdit');

let currentEditingMessageId = null;
let currentUsername = '';

// Set default username with better randomization
usernameInput.value = 'User' + Math.floor(Math.random() * 9999);
currentUsername = usernameInput.value;

// Update username when changed
usernameInput.addEventListener('input', (e) => {
    currentUsername = e.target.value.trim() || 'Anonymous';
});

// Enhanced send message function
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText && currentUsername) {
        // Add visual feedback
        sendButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            sendButton.style.transform = '';
        }, 150);
        
        socket.emit('send_message', {
            text: messageText,
            username: currentUsername
        });
        messageInput.value = '';
    }
}

// Enhanced event listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize message input
messageInput.addEventListener('input', (e) => {
    // Add typing indicator effect
    if (e.target.value.length > 0) {
        sendButton.style.background = 'linear-gradient(135deg, #25d366 0%, #20bf55 100%)';
    } else {
        sendButton.style.background = 'linear-gradient(135deg, #ccc 0%, #999 100%)';
    }
});

// Socket event listeners with enhanced animations
socket.on('load_messages', (messages) => {
    messagesContainer.innerHTML = '';
    messages.forEach((message, index) => {
        setTimeout(() => {
            displayMessage(message);
        }, index * 50); // Staggered animation
    });
    scrollToBottom();
});

socket.on('new_message', (message) => {
    displayMessage(message);
    scrollToBottom();
    
    // Add notification sound effect (optional)
    if (message.socketId !== socket.id) {
        playNotificationSound();
    }
});

socket.on('message_updated', (message) => {
    const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
    if (messageElement) {
        const textElement = messageElement.querySelector('.message-text');
        textElement.innerHTML = message.text + ' <span class="edited">(edited)</span>';
        
        // Add update animation
        messageElement.style.animation = 'messageUpdate 0.5s ease-out';
        setTimeout(() => {
            messageElement.style.animation = '';
        }, 500);
    }
});

socket.on('message_deleted', (messageId) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        // Add delete animation
        messageElement.style.animation = 'messageDelete 0.3s ease-out forwards';
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    }
});

// Enhanced display message function
function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.socketId === socket.id ? 'own' : 'other'}`;
    messageDiv.setAttribute('data-message-id', message.id);
    
    const editedText = message.edited ? ' <span class="edited">(edited)</span>' : '';
    const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span><strong>${message.username}</strong></span>
            <span>${message.timestamp}</span>
        </div>
        <div class="message-text">${message.text}${editedText}</div>
        ${message.socketId === socket.id ? `
            <div class="message-actions">
                <button class="action-btn edit-btn" onclick="editMessage(${message.id}, '${escapeHtml(message.text)}')" title="Edit message">
                    ✏️
                </button>
                <button class="action-btn delete-btn" onclick="deleteMessage(${message.id})" title="Delete message">
                    🗑️
                </button>
            </div>
        ` : ''}
        <div class="message-status">
            ${message.socketId === socket.id ? '✓✓' : ''}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '&#39;');
}

// Enhanced edit message function
function editMessage(messageId, currentText) {
    currentEditingMessageId = messageId;
    // Remove any HTML entities and edited text
    const cleanText = currentText.replace(/&#39;/g, "'").replace(/<span class="edited">\(edited\)<\/span>/, '').trim();
    editInput.value = cleanText;
    editModal.style.display = 'block';
    
    // Focus and select text
    setTimeout(() => {
        editInput.focus();
        editInput.select();
    }, 100);
}

// Enhanced delete message function
function deleteMessage(messageId) {
    // Create custom confirmation dialog
    const confirmDelete = confirm('🗑️ Are you sure you want to delete this message?\n\nThis action cannot be undone.');
    if (confirmDelete) {
        socket.emit('delete_message', { id: messageId });
    }
}

// Enhanced modal event listeners
saveEditButton.addEventListener('click', () => {
    const newText = editInput.value.trim();
    if (newText && currentEditingMessageId && newText.length > 0) {
        socket.emit('update_message', {
            id: currentEditingMessageId,
            newText: newText
        });
        closeModal();
    }
});

cancelEditButton.addEventListener('click', closeModal);

function closeModal() {
    editModal.style.display = 'none';
    currentEditingMessageId = null;
    editInput.value = '';
}

// Enhanced modal interactions
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeModal();
    }
});

// Handle escape key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editModal.style.display === 'block') {
        closeModal();
    }
});

// Enhanced scroll function with smooth animation
function scrollToBottom() {
    setTimeout(() => {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

// Handle edit input enter key
editInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveEditButton.click();
    }
});

// Optional: Simple notification sound
function playNotificationSound() {
    // Create a simple beep sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Ignore if audio context is not supported
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes messageUpdate {
        0% { background-color: #fff3cd; transform: scale(1.02); }
        100% { background-color: initial; transform: scale(1); }
    }
    
    @keyframes messageDelete {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.8) translateX(100px); }
    }
`;
document.head.appendChild(style);

// Initialize with focus on message input
window.addEventListener('load', () => {
    messageInput.focus();
});

// Handle message input enter key
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize message input
messageInput.addEventListener('input', (e) => {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${e.target.scrollHeight}px`;
});

// Auto-resize message input on window resize
window.addEventListener('resize', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
});

// Auto-resize message input on focus
messageInput.addEventListener('focus', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
});

// Auto-resize message input on blur
messageInput.addEventListener('blur', () => {
    messageInput.style.height = 'auto';
});
