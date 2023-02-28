import React from "react";
import "./Chat.css";
import teacher from "../static/teacher.svg";
import student from "../static/student.svg";
import send from "../static/send.svg";
import { useState, useEffect } from "react";
import useWebSocket from "react-use-websocket";

export default function Chat(props) {
    // this function generates a random string , it is called only when we need to generate a new unique websocket url
    const randomString = (length) => {
      let result = "";
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
    };
    // 
    const [socketUrl, setSocketUrl] = useState(
      "ws://127.0.0.1:8765/" + randomString(5)
    );
  // this is the message that I am currently typing 
  const [myMessage, setMessage] = useState("");
  // when whe send a query to the webhook/server isTyping turns true
  const [isTyping, setIsTyping] = useState(false);
  
  const [messageHistory, setMessageHistory] = useState([
    {
      from: "ai",
      content:
        "Hi there! 🤗 I'm your virtual teacher. \nI'm here to help you learn and have fun in the process 🤩 \nFeel free to ask me any questions you may have, and I'll do my best to answer them. 😊",
    }

  ]);


  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);


  // a useeffect hook that changes the message history when we have incoming messages from the server
  useEffect(() => {
    if (lastMessage !== null) {
      setMessageHistory((prev) =>
        prev.concat({ from: "ai", content: lastMessage.data })
      );
      const element = document.getElementsByClassName("internal-effect")[0];
      element.scrollTop = element.scrollHeight;
      setIsTyping(false);
    }
  }, [lastMessage, setMessageHistory]);

  // a useeffect hook that scrolls down when the conversation is updated
  useEffect(() => {
    const element = document.getElementsByClassName("internal-effect")[0];
    element.scrollTop = element.scrollHeight;
  }, [messageHistory]);
  
  // a function to add the human message to the list of messages
  const add_human_message = () => {
    if (myMessage.length === 0) return;
    setMessageHistory((prev) =>
      prev.concat({ from: "human", content: myMessage })
    );
    sendMessage(myMessage);
    setMessage("");
    document.getElementsByClassName("input-text")[0].value = "";
    setIsTyping(true);
  };
  // another version of the function above , this gets triggered when someone presses enter while typing
  function add_human_message_2() {
    let message = document.getElementsByClassName("input-text")[0].value;
    if (message.length === 0) return;
    setMessageHistory((prev) =>
      prev.concat({ from: "human", content: message })
    );
    sendMessage(message);
    setMessage("");
    document.getElementsByClassName("input-text")[0].value = "";
    document.getElementsByClassName("send-icon")[0].classList.toggle('active')
    setIsTyping(true);
  }
  // a useeffect hook that adds the "enter key" event listener to the text input box
  useEffect(() => {
    document
      .getElementsByClassName("input-text")[0]
      .addEventListener("keyup", (e) => {
        if (e.keyCode === 13) {
          add_human_message_2();
        }
      });
  }, []);

  return (
    <div className="chat shadow-effect">

      <div className="internal-effect">
        {messageHistory.map((message) => {
          {
            return (
              <div
                className={
                  message.from === "ai" ? "ai-message" : "human-message"
                }
              >
                <div
                  className={
                    message.from === "ai"
                      ? "ai-message-text"
                      : "human-message-text"
                  }
                >
                  {message.content.split("\n").map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
                <img
                  src={message.from === "ai" ? teacher : student}
                  height={51}
                  className={
                    message.from === "ai"
                      ? "ai-message-img"
                      : "human-message-img"
                  }
                />
              </div>
            );
          }
        })}
      </div>
      <div className="input-box">
        <input
          onChange={(e) => {
            setMessage(e.target.value);
          }}
          className="input-text"
          placeholder="Text message"
        />
        <div
          className="send-button"
          onClick={(e) => {
            add_human_message();
          }}
        >
          {isTyping ? (
            <div className="snippet" data-title="dot-elastic">
              <div className="stage">
                <div className="dot-elastic"></div>
              </div>
            </div>
          ) : (
            <img className="send-icon active" src={send} height={35} />
          )}
        </div>
      </div>
    </div>
  );
}
