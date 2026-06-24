import { useState, useEffect, useRef } from "react";
import MainLayout from "../../layout/MainLayout";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { useNavigate } from "react-router-dom";

import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaDesktop,
  FaUsers,
  FaComments,
  FaPlus,
  FaSignInAlt,
  FaRobot,
  FaMagic,
} from "react-icons/fa";

const initialMessages = [
  {
    sender: "Jack Bron",
    text: "Hey, is the illustration done?",
    time: "10:00 AM",
    me: false,
  },
  {
    sender: "You",
    text: "Yes, we are testing the live system now!",
    time: "10:01 AM",
    me: true,
  },
];

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function generateAiReply(message) {
  const text = message.toLowerCase();

  if (
    text.includes("meeting") ||
    text.includes("meet") ||
    text.includes("call") ||
    text.includes("zoom")
  ) {
    return "Sure! I can help with that. Based on your message, this looks like a meeting request. You can start a new Flowio meeting or share the current room code with your team.";
  }

  if (
    text.includes("tomorrow") ||
    text.includes("today") ||
    text.includes("date") ||
    text.includes("time") ||
    text.includes("deadline")
  ) {
    return "Got it. I detected a time or deadline request. Please confirm the exact date and time so the team can stay aligned.";
  }

  if (
    text.includes("summary") ||
    text.includes("summarize") ||
    text.includes("notes")
  ) {
    return "I can help summarize the discussion. Once the meeting ends, Flowio AI can generate a clear summary with key points and action items.";
  }

  if (
    text.includes("task") ||
    text.includes("todo") ||
    text.includes("assign") ||
    text.includes("done")
  ) {
    return "This sounds like a task update. You can convert it into an assigned task and track its progress from the Kanban board.";
  }

  if (
    text.includes("file") ||
    text.includes("attach") ||
    text.includes("document")
  ) {
    return "You can attach related files to keep the meeting context organized and easy to review later.";
  }

  if (
    text.includes("hello") ||
    text.includes("hi") ||
    text.includes("hey")
  ) {
    return "Hi! I’m Flowio AI. I can help with meeting notes, tasks, summaries, and smart replies during the session.";
  }

  return "Thanks for the update. I’ll keep this in the meeting context and help turn important points into clear actions.";
}

export default function Meetings() {
  const navigate = useNavigate();
  const [inMeeting, setInMeeting] = useState(false);
  const [endModal, setEndModal] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [dbMeetingId, setDbMeetingId] = useState("");

  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [screen, setScreen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(false);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [jitsiApi, setJitsiApi] = useState(null);

  const [autoAiReply, setAutoAiReply] = useState(true);
  const [aiTyping, setAiTyping] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  const startMeeting = async () => {
    try {
      const mockBackendResponse = {
        success: true,
        data: {
          _id: "65f1a2b3c4d5e6f7a8b9c0d1",
          roomId: "kmz-way-877-aa",
          title: "Week 2 - Product Designer X Illustrator",
        },
      };

      const meeting = mockBackendResponse.data;
      setRoomId(meeting.roomId);
      setDbMeetingId(meeting._id);
      setInMeeting(true);
      startAudioRecording();
    } catch (err) {
      console.error("Failed to start meeting via backend:", err);
    }
  };

  const joinMeeting = async () => {
    if (!roomId.trim()) {
      alert("Please enter meeting code");
      return;
    }

    try {
      setDbMeetingId("65f1a2b3c4d5e6f7a8b9c0d1");
      setInMeeting(true);
    } catch (err) {
      console.error("Meeting not found in archive:", err);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await uploadAudioToAI(audioBlob);
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("Microphone access denied for AI Recording:", err);
    }
  };

  const endMeeting = async () => {
    if (jitsiApi) jitsiApi.executeCommand("hangup");

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setEndModal(true);
  };

  const uploadAudioToAI = async (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "meeting-rec.webm");
    console.log("Uploading audio to backend for AI processing...");
  };

  const toggleMic = () => {
    if (jitsiApi) jitsiApi.executeCommand("toggleAudio");
    setMic(!mic);
  };

  const toggleCamera = () => {
    if (jitsiApi) jitsiApi.executeCommand("toggleVideo");
    setCamera(!camera);
  };

  const toggleShareScreen = () => {
    if (jitsiApi) jitsiApi.executeCommand("toggleShareScreen");
    setScreen(!screen);
  };

  const sendMessage = () => {
    const cleanMessage = input.trim();
    if (!cleanMessage) return;

    const userMessage = {
      sender: "You",
      text: cleanMessage,
      time: getTime(),
      me: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    if (autoAiReply) {
      setAiTyping(true);

      setTimeout(() => {
        const aiReply = {
          sender: "Flowio AI",
          text: generateAiReply(cleanMessage),
          time: getTime(),
          me: false,
          ai: true,
        };

        setMessages((prev) => [...prev, aiReply]);
        setAiTyping(false);
      }, 900);
    }
  };

  const addSmartMeetingSuggestion = () => {
    const aiReply = {
      sender: "Flowio AI",
      text: "Suggested action: Create a follow-up meeting, assign tasks to team members, and generate a meeting summary after the call ends.",
      time: getTime(),
      me: false,
      ai: true,
    };

    setMessages((prev) => [...prev, aiReply]);
  };

 const backToStart = () => {
  setEndModal(false);
  setInMeeting(false);
  setRoomId("");
  setMessages(initialMessages);
  setAiTyping(false);

  navigate("/summary", {
  state: {
    source: "meeting",
    meeting: {
      title: roomId,
      type: "Meeting",
      time: "Just now",
      summary: messages.map((m) => m.text),
    },
  },
});
};

  const ControlButton = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-[14px] text-sm font-bold transition-all duration-300 hover:-translate-y-1 ${
        active
          ? "bg-gradient-to-r from-[#6eb5ff] to-[#5b7dff] text-white shadow-[0_0_18px_rgba(95,150,255,.35)]"
          : "bg-white text-[#0b1246] hover:bg-white/90"
      }`}
    >
      {children}
    </button>
  );

  return (
    <MainLayout>
      <div className="min-h-0 text-white lg:h-full lg:overflow-hidden">
        {!inMeeting ? (
          <div className="grid h-full place-items-center">
            <div className="w-[620px] max-w-full rounded-[34px] border border-blue-300/10 bg-gradient-to-br from-[#151e66]/95 to-[#070b2d]/95 p-8 shadow-[0_24px_65px_rgba(0,0,0,.35)]">
              <div className="mb-8 text-center">
                <h2 className="text-[30px] font-extrabold">
                  Start or Join Meeting
                </h2>
                <p className="mt-2 text-sm text-white/55">
                  Create a new Flowio meeting room integrated with AI Summarizer.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <button
                  onClick={startMeeting}
                  className="group rounded-[26px] border border-blue-300/10 bg-[#10184c]/80 p-6 text-left transition hover:-translate-y-1 hover:bg-[#151f62]"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-r from-[#6eb5ff] to-[#5b7dff] text-xl">
                    <FaPlus />
                  </div>
                  <h3 className="text-lg font-bold">Start New Meeting</h3>
                  <p className="mt-2 text-xs text-white/50">
                    Generates secure ID & enables background AI audio capture.
                  </p>
                </button>

                <div className="rounded-[26px] border border-blue-300/10 bg-[#10184c]/80 p-6">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-blue-400/15 text-xl text-[#78aaff]">
                    <FaSignInAlt />
                  </div>
                  <h3 className="text-lg font-bold">Join Meeting</h3>
                  <input
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter code..."
                    className="mt-5 h-11 w-full rounded-[15px] border border-blue-300/10 bg-[#141d66]/90 px-4 text-sm text-white outline-none"
                  />
                  <button
                    onClick={joinMeeting}
                    className="mt-4 h-11 w-full rounded-[15px] bg-gradient-to-r from-[#6eb5ff] to-[#5b7dff] text-sm font-bold"
                  >
                    Join Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col rounded-[32px] border border-blue-300/10 bg-gradient-to-br from-[#151e66]/95 to-[#070b2d]/95 p-6 shadow-[0_24px_65px_rgba(0,0,0,.35)]">
            <div className="mb-5 flex shrink-0 items-center justify-between">
              <div>
                <h2 className="text-[24px] font-extrabold tracking-[-0.4px]">
                  Week 2 - Product Designer X Illustrator
                </h2>
                <p className="mt-1 text-xs text-white/45">
                  Live session Linked to AI Log ID: {dbMeetingId}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-10 items-center gap-3 rounded-[14px] border border-red-400/20 bg-red-500/10 px-4">
                  <span className="h-3 w-3 animate-pulse rounded-[4px] bg-red-500" />
                  <span className="text-sm font-semibold text-white/85">
                    REC & ARCHIVING
                  </span>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[1fr_330px] xl:gap-6">
              <div className="flex min-h-0 flex-col">
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-[26px] border border-blue-300/20 bg-[#0b1246] shadow-inner">
                  <JitsiMeeting
                    domain="meet.jit.si"
                    roomName={roomId}
                    configOverwrite={{
                      startWithAudioMuted: !mic,
                      startWithVideoMuted: !camera,
                      prejoinPageEnabled: false,
                      toolbarButtons: [],
                      disableDeepLinking: true,
                    }}
                    interfaceConfigOverwrite={{
                      SHOW_JITSI_WATERMARK: false,
                      filmStripOnly: false,
                    }}
                    userInfo={{ displayName: "Fatma Moataz" }}
                    onApiReady={(api) => setJitsiApi(api)}
                    getIFrameRef={(iframe) => {
                      iframe.style.height = "100%";
                      iframe.style.width = "100%";
                      iframe.style.border = "none";
                    }}
                  />
                </div>

                <div className="mt-5 flex shrink-0 items-center justify-between">
                  <div className="rounded-[14px] border border-blue-300/10 bg-[#10184c]/90 px-5 py-3 font-mono text-sm font-semibold text-yellow-400">
                    Room Code: {roomId}
                  </div>

                  <div className="flex items-center gap-3">
                    <ControlButton active={mic} onClick={toggleMic}>
                      {mic ? <FaMicrophone /> : <FaMicrophoneSlash />}
                    </ControlButton>

                    <ControlButton active={camera} onClick={toggleCamera}>
                      {camera ? <FaVideo /> : <FaVideoSlash />}
                    </ControlButton>

                    <ControlButton active={screen} onClick={toggleShareScreen}>
                      <FaDesktop />
                    </ControlButton>

                    <ControlButton active onClick={() => alert("Attach file")}>
                      <FaPaperclip />
                    </ControlButton>

                    <ControlButton active onClick={() => alert("Emoji picker")}>
                      <FaSmile />
                    </ControlButton>

                    <button
                      onClick={endMeeting}
                      className="ml-2 h-11 rounded-[14px] bg-red-500 px-6 text-sm font-bold text-white shadow-[0_0_20px_rgba(255,60,80,.35)] transition hover:bg-red-600"
                    >
                      End Meeting
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <ControlButton
                      active={peopleOpen}
                      onClick={() => {
                        setPeopleOpen(true);
                        setChatOpen(false);
                      }}
                    >
                      <FaUsers />
                    </ControlButton>

                    <ControlButton
                      active={chatOpen}
                      onClick={() => {
                        setChatOpen(true);
                        setPeopleOpen(false);
                      }}
                    >
                      <FaComments />
                    </ControlButton>
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-hidden rounded-[26px] border border-blue-300/10 bg-[#10184c]/80 p-4">
                {chatOpen ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-[16px] font-bold">
                        Flowio Custom Chat
                      </h3>

                      <button
                        type="button"
                        onClick={() => setAutoAiReply((prev) => !prev)}
                        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${
                          autoAiReply
                            ? "bg-blue-400/20 text-[#78aaff]"
                            : "bg-white/10 text-white/45"
                        }`}
                      >
                        <FaRobot />
                        AI Auto Reply {autoAiReply ? "ON" : "OFF"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={addSmartMeetingSuggestion}
                      className="mb-3 flex h-9 items-center justify-center gap-2 rounded-[14px] border border-blue-300/10 bg-[#0b1246]/80 text-[11px] font-bold text-[#78aaff] transition hover:bg-[#151f62]"
                    >
                      <FaMagic />
                      Generate Smart Meeting Suggestion
                    </button>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                      {messages.map((msg, index) => (
                        <div
                          key={index}
                          className={`rounded-[16px] p-3 text-[12px] ${
                            msg.me
                              ? "ml-8 bg-[#0b1246] text-white"
                              : msg.ai
                              ? "mr-8 border border-blue-300/10 bg-gradient-to-br from-[#151e66] to-[#0b1246] text-white"
                              : "mr-8 bg-white text-[#10184c]"
                          }`}
                        >
                          <div className="mb-1 flex justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              {msg.ai && <FaRobot className="text-[#78aaff]" />}
                              {msg.sender}
                            </span>
                            <span className="text-[10px] opacity-50">
                              {msg.time}
                            </span>
                          </div>
                          <p>{msg.text}</p>
                        </div>
                      ))}

                      {aiTyping && (
                        <div className="mr-8 rounded-[16px] border border-blue-300/10 bg-gradient-to-br from-[#151e66] to-[#0b1246] p-3 text-[12px] text-white">
                          <div className="mb-1 flex items-center gap-2 font-bold">
                            <FaRobot className="text-[#78aaff]" />
                            Flowio AI
                          </div>
                          <p className="animate-pulse text-white/55">
                            Typing smart reply...
                          </p>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>

                    <div className="mt-4 flex h-12 shrink-0 items-center gap-3 rounded-[16px] bg-white px-4">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Write Message..."
                        className="flex-1 bg-transparent text-sm text-[#10184c] outline-none"
                      />

                      <button
                        onClick={sendMessage}
                        className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#11194c] text-white"
                      >
                        <FaPaperPlane />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    <h3 className="mb-4 text-center text-[16px] font-bold">
                      Active Stream
                    </h3>
                    <p className="mt-10 text-center text-xs text-white/50">
                      Jitsi engine is automatically managing active participant
                      layouts.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {endModal && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/65 backdrop-blur-md">
                <div className="w-full max-w-[390px] rounded-[24px] bg-gradient-to-b from-[#151f68] to-[#0a113d] p-5 text-center sm:rounded-[28px] sm:p-7">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-green-400">
                    <FaPhoneSlash />
                  </div>
                  <h3 className="text-2xl font-bold">Meeting Archived!</h3>
                  <p className="mt-2 text-sm text-white/55">
                    The session has ended. Audio file was uploaded successfully
                    to AI Summarizer. Check your logs tab for the results soon!
                  </p>
                  <button
                    onClick={backToStart}
                    className="mt-6 h-11 w-full rounded-[16px] bg-gradient-to-r from-[#6eb5ff] to-[#5b7dff] text-sm font-bold"
                  >
                   Open Meeting Summary
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}