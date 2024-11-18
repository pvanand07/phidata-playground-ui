import { useState, useEffect } from 'react'
import ChatBot from './components/ChatBot.jsx'
import './styles/markdown.css';

function App() {
    return (
        <div className="w-screen h-screen bg-gray-50">
            <main className="w-full h-full">
                <ChatBot />
            </main>
        </div>
    )
}

export default App
    