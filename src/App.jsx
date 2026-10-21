import React, { useState, useRef, useEffect } from "react";
import { 
  Volume2, VolumeX, Sparkles, Sun, Moon, CloudRain, 
  Play, Pause, RotateCcw, Coffee, BookOpen, Settings2,
  Send, Bot, CheckCircle2, X, History, Flame, CheckSquare,
  Square, Plus, Trash2, ListTodo, Maximize2, Minimize2, ChevronRight, ChevronLeft
} from "lucide-react";

// 場景設定：對應 public/backgrounds/ 的 mp4 與 public/audio/ 的本地音效
const SCENES = [
  {
    id: "garden",
    name: "日式庭院",
    icon: Sun,
    videoSrc: "/backgrounds/garden.mp4",
    audioSrc: "/audio/garden.mp3",
    blur: "blur-[1px]",
    overlay: "bg-black/20",
  },
  {
    id: "night",
    name: "深夜暖光",
    icon: Moon,
    videoSrc: "/backgrounds/night.mp4",
    audioSrc: "/audio/night.mp3",
    blur: "blur-[1.5px]",
    overlay: "bg-black/30",
  },
  {
    id: "rain",
    name: "窗外落雨",
    icon: CloudRain,
    videoSrc: "/backgrounds/rain.mp4",
    audioSrc: "/audio/rain.mp3",
    blur: "blur-[1px]",
    overlay: "bg-black/25",
  },
];

const PRESET_MINUTES = [15, 25, 45, 60];

export default function App() {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef(null);

  const [mode, setMode] = useState("focus");
  const [customFocusMinutes, setCustomFocusMinutes] = useState(25);
  const [customBreakMinutes, setCustomBreakMinutes] = useState(5);
  const [showSettings, setShowSettings] = useState(false);

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const targetEndTimeRef = useRef(null);

  // --- 全螢幕與側邊欄抽屜狀態 ---
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTodoDrawerOpen, setIsTodoDrawerOpen] = useState(true);

  // --- AI 規劃與 To-Do List 狀態 ---
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [subjectInput, setSubjectInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [isPlanningLoading, setIsPlanningLoading] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");

  const [todoList, setTodoList] = useState(() => {
    try {
      const saved = localStorage.getItem("focus_todos");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- AI 覆盤與學習記錄狀態 ---
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [reflectionInput, setReflectionInput] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [studyHistory, setStudyHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("focus_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [totalMinutes, setTotalMinutes] = useState(() => {
    return parseInt(localStorage.getItem("focus_total_mins") || "0", 10);
  });

  useEffect(() => {
    localStorage.setItem("focus_todos", JSON.stringify(todoList));
  }, [todoList]);

  useEffect(() => {
    localStorage.setItem("focus_history", JSON.stringify(studyHistory));
  }, [studyHistory]);

  useEffect(() => {
    localStorage.setItem("focus_total_mins", totalMinutes.toString());
  }, [totalMinutes]);

  const currentScene = SCENES[currentSceneIndex];

  // 全螢幕切換
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // 音訊開關
  const toggleSound = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlayingSound) {
      audio.pause();
      setIsPlayingSound(false);
    } else {
      audio.volume = volume;
      audio
        .play()
        .then(() => setIsPlayingSound(true))
        .catch((err) => {
          console.error("播放音訊失敗:", err);
          setIsPlayingSound(false);
        });
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) audioRef.current.volume = newVol;
  };

  // 場景切換時換音樂
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const wasPlaying = isPlayingSound;
    audio.pause();
    audio.src = currentScene.audioSrc;
    audio.loop = true;
    audio.volume = volume;
    audio.load();

    if (wasPlaying || isRunning) {
      audio
        .play()
        .then(() => setIsPlayingSound(true))
        .catch((err) => console.warn("瀏覽器限制自動播放:", err));
    }
  }, [currentSceneIndex]);

  // 開始 / 暫停 與音樂連動
  const toggleTimer = () => {
    const audio = audioRef.current;

    if (!isRunning) {
      targetEndTimeRef.current = Date.now() + timeLeft * 1000;
      setIsRunning(true);

      if (audio) {
        audio.volume = volume;
        audio
          .play()
          .then(() => setIsPlayingSound(true))
          .catch((err) => console.warn("播放被阻擋:", err));
      }
    } else {
      setIsRunning(false);
      targetEndTimeRef.current = null;

      if (audio) {
        audio.pause();
        setIsPlayingSound(false);
      }
    }
  };

  // 重置計時器
  const resetTimer = () => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimeLeft(mode === "focus" ? customFocusMinutes * 60 : customBreakMinutes * 60);

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlayingSound(false);
    }
  };

  // 計時器邏輯
  useEffect(() => {
    let timerId = null;

    if (isRunning) {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + timeLeft * 1000;
      }

      timerId = setInterval(() => {
        const remaining = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          clearInterval(timerId);
          setIsRunning(false);
          targetEndTimeRef.current = null;

          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlayingSound(false);
          }

          if (mode === "focus") {
            setTotalMinutes((prev) => prev + customFocusMinutes);
            setShowReflectionModal(true);
            setMode("break");
            setTimeLeft(customBreakMinutes * 60);
          } else {
            setMode("focus");
            setTimeLeft(customFocusMinutes * 60);
          }
        }
      }, 500);
    } else {
      targetEndTimeRef.current = null;
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isRunning, mode, timeLeft, customFocusMinutes, customBreakMinutes]);

  const switchMode = (newMode) => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingSound(false);
    }
    setMode(newMode);
    setTimeLeft(newMode === "focus" ? customFocusMinutes * 60 : customBreakMinutes * 60);
  };

  const setPresetTime = (mins) => {
    if (isRunning) return;
    setCustomFocusMinutes(mins);
    if (mode === "focus") setTimeLeft(mins * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // --- AI 拆解 To-Do List ---
  const handleGenerateTodos = async (e) => {
    e.preventDefault();
    if (!subjectInput.trim() || !goalInput.trim() || isPlanningLoading) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("請確認 .env.local 檔案內有填寫 VITE_GEMINI_API_KEY！");
      return;
    }

    setIsPlanningLoading(true);

    const prompt = `你是一個專業的學習規劃助手。
使用者正在準備學習以下科目與目標：
【科目】：${subjectInput}
【目標】：${goalInput}

請為他拆解出 3 到 5 個具體、循序漸進且適合單次專注執行的「待辦小任務（To-Do item）」。
要求：
1. 僅回傳合法的 JSON 字串陣列，不要有 markdown 語法（例如 \`\`\`json 等標籤）、不要有其他說明文字。
2. 範例格式：["完成範例題目 1 到 3 題", "整理筆記關鍵概念", "撰寫總結"]`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 300 },
          }),
        }
      );

      const data = await response.json();
      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

      const parsedTasks = JSON.parse(rawText);
      if (Array.isArray(parsedTasks)) {
        const newItems = parsedTasks.map((task) => ({
          id: Date.now() + Math.random(),
          text: task,
          completed: false,
        }));
        setTodoList((prev) => [...prev, ...newItems]);
      }
      setShowTodoModal(false);
      setSubjectInput("");
      setGoalInput("");
      setIsTodoDrawerOpen(true); // 自動展開清單
    } catch (err) {
      console.error(err);
      alert("AI 規劃時出了點問題，請檢查網路連線或 API Key！");
    } finally {
      setIsPlanningLoading(false);
    }
  };

  const toggleTodoItem = (id) => {
    setTodoList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const deleteTodoItem = (id) => {
    setTodoList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddManualTodo = (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    setTodoList((prev) => [
      ...prev,
      { id: Date.now(), text: newTodoText.trim(), completed: false },
    ]);
    setNewTodoText("");
  };

  // --- AI 覆盤 ---
  const handleAskGemini = async (e) => {
    e.preventDefault();
    if (!reflectionInput.trim() || isAiLoading) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setAiFeedback("請確認 .env.local 檔案內有填寫 VITE_GEMINI_API_KEY！");
      return;
    }

    setIsAiLoading(true);
    setAiFeedback("");

    const systemPrompt = `你是一個溫暖、精簡的自習伴讀夥伴（Focus Companion）。
使用者剛完成一段專注學習，請依據他的心得給出 100 字內的繁體中文回饋（包含一句鼓勵，以及一個深化概念的小思考）。`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\n使用者心得：${reflectionInput}` }],
              },
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
          }),
        }
      );

      const data = await response.json();
      const feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || "專注本身就是最大的累積！";
      setAiFeedback(feedback);

      const newEntry = {
        id: Date.now(),
        date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        topic: reflectionInput,
        feedback: feedback,
        duration: customFocusMinutes,
      };
      setStudyHistory((prev) => [newEntry, ...prev]);
    } catch (err) {
      console.error(err);
      setAiFeedback("連線稍有延遲，但你剛才的專注已經記錄下來囉！");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans select-none text-white">
      <audio ref={audioRef} preload="metadata" />

      {/* 動態影片背景 */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <video
          key={currentScene.videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-1000 scale-105 filter ${currentScene.blur}`}
          src={currentScene.videoSrc}
        />
      </div>

      <div className={`fixed inset-0 -z-10 transition-colors duration-700 ${currentScene.overlay}`} />

      {/* 頂部導航列 */}
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/10">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="text-xs font-medium tracking-wide text-white/90">Focus Companion</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* AI 定位目標按鈕 */}
          <button
            onClick={() => setShowTodoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/30 hover:bg-emerald-500/40 backdrop-blur-sm border border-emerald-400/40 text-xs transition-all text-emerald-200"
            title="請 AI 拆解學習目標"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI 定位目標</span>
          </button>

          {/* 待辦清單抽屜切換按鈕 */}
          <button
            onClick={() => setIsTodoDrawerOpen(!isTodoDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm border text-xs transition-all ${
              isTodoDrawerOpen
                ? "bg-white/20 border-white/30 text-white"
                : "bg-black/25 border-white/10 text-gray-300 hover:text-white"
            }`}
            title={isTodoDrawerOpen ? "收起待辦清單" : "展開待辦清單"}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">待辦</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] text-emerald-300">
              {todoList.filter((t) => t.completed).length}/{todoList.length}
            </span>
          </button>

          {/* 學習時長歷史 */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/25 backdrop-blur-sm border border-white/10 text-xs hover:bg-white/10 transition-all text-amber-300"
            title="查看覆盤歷史"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>{totalMinutes}m</span>
          </button>

          {/* 音量控制 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/25 backdrop-blur-sm border border-white/10">
            <button
              onClick={toggleSound}
              className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
              title={isPlayingSound ? "靜音" : "播放白噪音"}
            >
              {isPlayingSound ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-gray-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-12 h-1 accent-emerald-400 bg-white/30 rounded-lg cursor-pointer"
            />
          </div>

          {/* 全螢幕切換按鈕 */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-black/25 backdrop-blur-sm border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all"
            title={isFullscreen ? "結束全螢幕" : "進入全螢幕"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 主體區塊：中央計時器 + 側邊滑動 To-Do 清單 */}
      <main className="flex items-center justify-center min-h-[68vh] px-4">
        
        {/* 中央番茄鐘面板 */}
        <div className="w-full max-w-lg py-5 px-7 rounded-2xl bg-black/25 backdrop-blur-md border border-white/15 shadow-xl flex flex-col items-center gap-3.5 transition-all">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center p-0.5 rounded-full bg-black/30 border border-white/10 text-xs">
              <button
                onClick={() => switchMode("focus")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${
                  mode === "focus" ? "bg-white text-black font-semibold shadow" : "text-gray-300 hover:text-white"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                專注
              </button>
              <button
                onClick={() => switchMode("break")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${
                  mode === "break" ? "bg-white text-black font-semibold shadow" : "text-gray-300 hover:text-white"
                }`}
              >
                <Coffee className="w-3 h-3" />
                休息
              </button>
            </div>

            {mode === "focus" && !isRunning && (
              <div className="flex items-center gap-1.5">
                {PRESET_MINUTES.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setPresetTime(mins)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                      customFocusMinutes === mins
                        ? "bg-emerald-500/30 border border-emerald-400/60 text-emerald-300 font-medium"
                        : "bg-black/30 hover:bg-black/40 text-gray-300 border border-white/5"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {showSettings && !isRunning && (
            <div className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-around text-xs text-gray-200">
              <div className="flex items-center gap-2">
                <span>專注:</span>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customFocusMinutes}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setCustomFocusMinutes(val);
                    if (mode === "focus") setTimeLeft(val * 60);
                  }}
                  className="w-12 px-1.5 py-0.5 text-center bg-black/60 border border-white/20 rounded text-white"
                />
                <span className="text-gray-400">分</span>
              </div>
              <div className="flex items-center gap-2">
                <span>休息:</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={customBreakMinutes}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setCustomBreakMinutes(val);
                    if (mode === "break") setTimeLeft(val * 60);
                  }}
                  className="w-12 px-1.5 py-0.5 text-center bg-black/60 border border-white/20 rounded text-white"
                />
                <span className="text-gray-400">分</span>
              </div>
            </div>
          )}

          <div className="text-6xl font-extralight tracking-tight tabular-nums text-white drop-shadow-sm my-1">
            {formatTime(timeLeft)}
          </div>

          <div className="text-[11px] text-gray-300/80 tracking-wider">
            {isRunning ? (mode === "focus" ? "讀書中，享受平靜..." : "放鬆一下，深呼吸...") : "準備好就隨時開始"}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTimer}
              className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 shadow-md ${
                isRunning
                  ? "bg-amber-500/80 hover:bg-amber-500 text-white"
                  : "bg-emerald-500/90 hover:bg-emerald-500 text-white hover:scale-105"
              }`}
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              onClick={resetTimer}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 border border-white/10 text-gray-300 hover:text-white transition-all"
              title="重置"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setTotalMinutes((prev) => prev + customFocusMinutes);
                setShowReflectionModal(true);
              }}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-emerald-300 flex items-center gap-1.5 transition-all border border-white/10"
              title="完成專注並覆盤"
            >
              <CheckCircle2 className="w-4 h-4" />
              完成
            </button>
          </div>
        </div>
      </main>

      {/* --- 右側彈出 / 收合 To-Do 抽屜面板 --- */}
      <aside
        className={`fixed top-24 right-6 w-80 max-h-[calc(100vh-180px)] p-4 rounded-2xl bg-zinc-900/85 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col gap-3 transition-all duration-500 z-40 ${
          isTodoDrawerOpen ? "translate-x-0 opacity-100" : "translate-x-[110%] opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium tracking-wide">今日學習待辦</span>
          </div>
          <button
            onClick={() => setIsTodoDrawerOpen(false)}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            title="收起清單"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 任務清單卷軸 */}
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[220px] pr-1">
          {todoList.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400 flex flex-col items-center gap-2">
              <span>尚未建立任務目標</span>
              <button
                onClick={() => setShowTodoModal(true)}
                className="text-emerald-400 hover:underline text-[11px]"
              >
                ✨ 讓 AI 幫你拆解任務
              </button>
            </div>
          ) : (
            todoList.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                  item.completed ? "bg-white/5 opacity-50" : "bg-black/40 hover:bg-black/50"
                }`}
              >
                <button
                  onClick={() => toggleTodoItem(item.id)}
                  className="flex items-center gap-2 text-left flex-1 mr-2"
                >
                  {item.completed ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  )}
                  <span className={item.completed ? "line-through text-gray-400" : "text-gray-200"}>
                    {item.text}
                  </span>
                </button>
                <button
                  onClick={() => deleteTodoItem(item.id)}
                  className="p-1 hover:text-rose-400 text-gray-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 手動快速新增 */}
        <form onSubmit={handleAddManualTodo} className="flex gap-1.5 pt-2 border-t border-white/10">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="新增自訂小任務..."
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </aside>

      {/* 當抽屜被收起時，右側邊緣顯示快速喚醒按鈕 */}
      {!isTodoDrawerOpen && (
        <button
          onClick={() => setIsTodoDrawerOpen(true)}
          className="fixed top-24 right-0 px-2 py-3 rounded-l-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border-l border-y border-white/15 text-emerald-400 hover:text-emerald-300 transition-all shadow-xl z-30 flex items-center"
          title="展開待辦抽屜"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* --- AI 規劃科目與目標彈窗 --- */}
      {showTodoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col gap-4 relative text-white">
            <button
              onClick={() => setShowTodoModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-medium">AI 學習目標定位</h2>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              告訴伴讀夥伴你今天要讀什麼科目與預期達成的目標，AI 會自動為你切分成好執行的待辦清單：
            </p>

            <form onSubmit={handleGenerateTodos} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">科目名稱：</label>
                <input
                  type="text"
                  required
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  placeholder="例如：資料結構與演算法 / 英文多益 / 微積分"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">今日核心目標：</label>
                <textarea
                  rows={2}
                  required
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="例如：搞懂 QuickSort 的原理並實作出來，再寫兩題 LeetCode"
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isPlanningLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-all text-white shadow-md mt-1"
              >
                {isPlanningLoading ? (
                  <span>AI 拆解任務中...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    生成今日待辦清單
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- AI 伴讀覆盤彈窗 --- */}
      {showReflectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col gap-4 relative text-white">
            <button
              onClick={() => {
                setShowReflectionModal(false);
                setAiFeedback("");
                setReflectionInput("");
              }}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-medium">學習覆盤・伴讀回饋</h2>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              剛才完成了專注時光！寫下一句剛才理解的概念，伴讀夥伴會為你梳理覆盤：
            </p>

            <form onSubmit={handleAskGemini} className="flex flex-col gap-3">
              <textarea
                rows={3}
                value={reflectionInput}
                onChange={(e) => setReflectionInput(e.target.value)}
                placeholder="例如：弄清楚了快速排序的分治（Divide and Conquer）邏輯..."
                className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 resize-none"
              />

              <button
                type="submit"
                disabled={isAiLoading || !reflectionInput.trim()}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-all text-white shadow-md"
              >
                {isAiLoading ? (
                  <span>伴讀思考中...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    送出給伴讀夥伴
                  </>
                )}
              </button>
            </form>

            {aiFeedback && (
              <div className="mt-1 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
                <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  伴讀夥伴的回饋：
                </div>
                {aiFeedback}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 歷史記錄抽屜 --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[75vh] p-6 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col gap-4 relative text-white">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-medium">伴讀覆盤歷史記錄</h2>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 text-xs">
              {studyHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  尚未有覆盤記錄，完成一次專注時段試試看吧！
                </div>
              ) : (
                studyHistory.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-gray-400 text-[11px]">
                      <span>{item.date}</span>
                      <span className="text-emerald-400 font-medium">+{item.duration} 分鐘</span>
                    </div>
                    <div className="text-white font-medium">{item.topic}</div>
                    <div className="p-2.5 rounded-lg bg-black/40 text-emerald-300 text-[11px] leading-relaxed">
                      💡 {item.feedback}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 底部場景切換 */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 p-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/10 shadow-lg">
          {SCENES.map((scene, index) => {
            const Icon = scene.icon;
            const isActive = index === currentSceneIndex;
            return (
              <button
                key={scene.id}
                onClick={() => setCurrentSceneIndex(index)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-white text-black shadow"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {scene.name}
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}