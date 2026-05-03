import { useEffect, useRef, useState } from 'react';
import NamePrompt from './UserModal';

function App() {
  const [name, setName] = useState("");
  const [vis, setVis] = useState(true);
  const [message, setMessage] = useState("");
  
  // 1. State to store chat history
  const [chatHistory, setChatHistory] = useState([]);
  
  // 2. Ref to hold the WebSocket instance
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket
    
   const ws = new WebSocket('wss://react-rust-chat-app.onrender.com.com');
    socketRef.current = ws;

    ws.onopen = () => console.log("Connected to Rustcord");
    
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      // 3. Update state array with new message
      setChatHistory((prev) => [...prev, data]);
      
      // Auto-scroll to bottom
      window.scrollTo(0, document.body.scrollHeight);
    };

    ws.onclose = () => console.log("Disconnected");

    // Cleanup connection when component unmounts
    return () => ws.close();
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() === "" || !socketRef.current) return;

    // Check if socket is open before sending
    if (socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          name: name,
          message: message,
        })
      );
      setMessage("");
    }
  };

  return (
    <>
      <NamePrompt vis={vis} name={name} setName={setName} setVis={setVis} />
      
      <div className="flex flex-row text-gray-100">
        <div className="w-full bg-slate-700 flex flex-col pb-5">
          
          <div className="w-full min-h-screen flex flex-col justify-end gap-4 pb-20">
            {/* Initial Welcome Message */}
            <div className="mx-8 chat-message bg-slate-600 rounded-xl w-fit inline-block px-5 py-4">
              <p>Hi! Welcome to Rustcord. Enjoy your stay!</p>
            </div>

            {/* 4. Map through chatHistory to render messages */}
            {chatHistory.map((chat, index) => (
              <div 
                key={index} 
                className="mx-8 break-all chat-message bg-slate-600 rounded-xl w-fit max-w-screen px-5 py-4"
              >
                <span className="text-gray-200 text-sm">{chat.name}</span>
                <p>{chat.message}</p>
              </div>
            ))}
          </div>

          <form 
            className="w-full h-10 fixed bottom-0 flex flex-row mb-5 px-5" 
            onSubmit={sendMessage}
          >
            <input
              name="message"
              type="text"
              className="bg-slate-400 w-full py-2 px-5 focus:outline-0 rounded-tl-xl rounded-bl-xl text-black"
              value={message}
              placeholder="Enter your message here..."
              onChange={(e) => setMessage(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-slate-400 px-4 active:translate-y-0.5 active:translate-x-0.5 hover:text-black transition-all rounded-tr-xl rounded-br-xl text-slate-800 font-bold"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default App;