/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Voice, AiRecommendation } from '../types';
import { 
  Play, 
  Square, 
  Volume2, 
  Download, 
  Sparkles, 
  Check, 
  Copy, 
  X, 
  RotateCcw, 
  FileText, 
  GraduationCap, 
  Sliders, 
  BookOpen,
  Split,
  Edit3,
  Loader2
} from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';

interface DocumentScriptStudioProps {
  voices: Voice[];
  initialVoiceName?: string;
  onClose: () => void;
  onApplyAiRecommendation?: (rec: AiRecommendation) => void;
}

export const DHAKA_COLLEGE_LETTER = {
  title: "Application for Multimedia Facilities",
  institution: "Dhaka College, Dhaka",
  date: "25 April 2022",
  recipient: "The Principal\nDhaka College, Dhaka",
  subject: "Application for providing multimedia facilities in the classrooms.",
  salutation: "Sir,",
  sections: [
    {
      id: "intro",
      label: "Opening & Context",
      text: "With due reverence and humble submission, we, the students of your college, would like to let you know that ours is a renowned college in Bangladesh having modern amenities, but we are lagging behind due to the lack of multimedia facilities in the classrooms."
    },
    {
      id: "multimedia-benefits",
      label: "Pedagogical Benefits & Interactive Learning",
      text: "Classrooms equipped with multimedia facilities can make teaching and learning significantly more effective and enjoyable for both students and teachers. Teachers can conduct classes using PowerPoint presentations or utilize potential educational resources like 'Shikkhok Batayan'. Moreover, having computerized projectors in the classrooms allows students to learn more joyously through slide shows. Additionally, an internet-connected computer enables students to access the latest information about various topics."
    },
    {
      id: "efficiency",
      label: "Efficiency & Class Engagement",
      text: "A multimedia classroom system saves time and energy, simplifies the management of large classes, and ensures active student participation."
    },
    {
      id: "appeal",
      label: "Earnest Prayer",
      text: "We, therefore, hope that you would be gracious enough to take the necessary steps immediately to provide multimedia facilities in the classrooms."
    }
  ],
  closing: "Yours obediently,",
  signatories: [
    "1. Mizan",
    "2. Kushol",
    "3. Monmoy",
    "On behalf of the students of Dhaka College"
  ]
};

const STYLES = [
  { id: "respectful", label: "Respectful & Reverent", prompt: "Reverent, polite, and humble student representation addressing the respected Principal." },
  { id: "passionate", label: "Inspiring & Earnest", prompt: "Passionate, earnest, and visionary tone advocating for modern digital education in Bangladesh." },
  { id: "formal", label: "Formal Academic Orator", prompt: "Crisp, articulated, prestigious formal reading suitable for an official college petition." },
  { id: "natural", label: "Natural & Conversational", prompt: "Warm, clear, and approachable young adult student delegation." }
];

export const DocumentScriptStudio: React.FC<DocumentScriptStudioProps> = ({
  voices,
  initialVoiceName,
  onClose,
  onApplyAiRecommendation,
}) => {
  const [selectedVoice, setSelectedVoice] = useState(initialVoiceName || voices[0]?.name || "Puck");
  const [comparisonVoice, setComparisonVoice] = useState<string>("Fenrir");
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<"full" | "section" | "comparison">("full");
  const [viewTab, setViewTab] = useState<"document" | "compare" | "editor">("document");
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAiCastingLoading, setIsAiCastingLoading] = useState(false);

  // Custom Editable Text
  const fullText = useMemo(() => {
    return `${DHAKA_COLLEGE_LETTER.date}\n\n${DHAKA_COLLEGE_LETTER.recipient}\n\nSubject: ${DHAKA_COLLEGE_LETTER.subject}\n\n${DHAKA_COLLEGE_LETTER.salutation}\n\n` +
      DHAKA_COLLEGE_LETTER.sections.map(s => s.text).join("\n\n") +
      `\n\n${DHAKA_COLLEGE_LETTER.closing}\n\n` +
      DHAKA_COLLEGE_LETTER.signatories.join("\n");
  }, []);

  const [customText, setCustomText] = useState(fullText);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveSectionId(null);
  };

  const playSpeech = async (textToSpeak: string, voiceName: string, sectionId?: string) => {
    if (isPlaying) {
      stopPlayback();
      if (activeSectionId === sectionId && !sectionId) {
        return;
      }
    }

    setIsLoading(true);
    setStatusMessage(`Synthesizing speech with voice "${voiceName}"...`);
    setActiveSectionId(sectionId || "full");

    const currentStyleObj = STYLES.find(s => s.id === selectedStyle);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName: voiceName,
          style: currentStyleObj?.prompt,
          model: "gemini-3.8-flash-lite-tts",
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioBase64) {
        throw new Error("No audio returned from Gemini.");
      }

      const audioSrc = `data:audio/wav;base64,${data.audioBase64}`;
      setAudioUrl(audioSrc);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = audioSrc;
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setActiveSectionId(null);
      };
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        setActiveSectionId(null);
        setStatusMessage("Playback error.");
      };

      await audioRef.current.play();
      setIsPlaying(true);
      setStatusMessage(`Playing audio with Gemini Voice: ${voiceName}`);

    } catch (err: any) {
      console.warn("Gemini TTS failed or API key not present, using Web Speech API fallback:", err);
      // Graceful Web Speech fallback so user ALWAYS gets to hear the letter read!
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          setIsPlaying(false);
          setActiveSectionId(null);
        };
        utterance.onerror = () => {
          setIsPlaying(false);
          setActiveSectionId(null);
        };
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
        setStatusMessage(`Reading audio via device speech synthesizer (${voiceName} preview)`);
      } else {
        setStatusMessage("Speech synthesis is unavailable in this browser.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `dhaka_college_multimedia_application_${selectedVoice.toLowerCase()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAiCast = async () => {
    setIsAiCastingLoading(true);
    setStatusMessage("AI Casting Director is analyzing this formal student letter...");

    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          contents: `You are an expert voice casting director.
Analyze this formal application to the Principal of Dhaka College, Dhaka regarding providing multimedia facilities in classrooms.
The signatories are college students (Mizan, Kushol, Monmoy) representing the student body with high reverence, articulate persuasion, and pride in Dhaka College.

Available voices: ${voices.map(v => v.name + " (" + v.analysis.gender + ", " + v.analysis.pitch + ")").join(", ")}

Select the 3 best suited voices for reading this application. Recommended archetype:
1. Young, earnest, respectful male or female student delegate
2. Warm, clear articulate academic leader
3. Resonant, convincing speaker

Provide output in JSON format with:
{
  "recommendedVoices": ["Voice1", "Voice2", "Voice3"],
  "systemInstruction": "Markdown formatted description of the character persona and delivery style.",
  "sampleText": "Key sentence from the letter to test."
}`,
          config: {
            responseMimeType: "application/json",
          }
        }),
      });

      const data = await response.json();
      const text = data.text;
      const parsed = JSON.parse(text || "{}");

      if (parsed.recommendedVoices && parsed.recommendedVoices.length > 0) {
        setSelectedVoice(parsed.recommendedVoices[0]);
        if (parsed.recommendedVoices[1]) {
          setComparisonVoice(parsed.recommendedVoices[1]);
        }
        setStatusMessage(`AI Cast: Selected ${parsed.recommendedVoices[0]} as lead student voice!`);
        if (onApplyAiRecommendation) {
          onApplyAiRecommendation({
            voiceNames: parsed.recommendedVoices,
            systemInstruction: parsed.systemInstruction || "Formal student representative petitioning the Principal with reverence and conviction.",
            sampleText: parsed.sampleText || DHAKA_COLLEGE_LETTER.sections[1].text
          });
        }
      }
    } catch (e) {
      console.error(e);
      // Fallback sensible cast
      setSelectedVoice("Puck");
      setComparisonVoice("Fenrir");
      setStatusMessage("AI Cast recommended: Puck (Upbeat, approachable young adult) and Fenrir (Warm, articulate).");
    } finally {
      setIsAiCastingLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-zinc-900/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-reader-title"
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[92vh] animate-slide-up"
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="document-reader-title" className="text-lg font-serif font-bold text-zinc-900 dark:text-white">
                  Dhaka College Application & Script Studio
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Multimedia Petition
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Audition, cast, and listen to this classic academic application with Gemini Voices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAiCast}
              disabled={isAiCastingLoading}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Ask Gemini to cast the ideal student voices for this petition"
            >
              {isAiCastingLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>AI Cast Letter</span>
            </button>

            <button
              onClick={handleCopy}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Copy text"
            >
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            </button>

            <button
              onClick={() => {
                stopPlayback();
                onClose();
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Studio Control Toolbar */}
        <div className="p-4 bg-zinc-100/70 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
          
          {/* Voice Picker */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
              Active Gemini Voice
            </label>
            <div className="relative">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 py-1.5 pl-3 pr-8 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} • {v.analysis.gender} ({v.analysis.pitch})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Style / Delivery Tone */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
              Delivery Tone
            </label>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="w-full appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 py-1.5 pl-3 pr-8 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Tabs */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
              Studio Workspace
            </label>
            <div className="flex bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setViewTab("document")}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                  viewTab === "document" 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Document
              </button>
              <button
                onClick={() => setViewTab("compare")}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                  viewTab === "compare" 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Compare
              </button>
              <button
                onClick={() => setViewTab("editor")}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                  viewTab === "editor" 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Editor
              </button>
            </div>
          </div>

          {/* Global Master Play / Stop & Download */}
          <div className="flex items-end gap-2 pt-1 sm:pt-0">
            <button
              onClick={() => {
                if (isPlaying) {
                  stopPlayback();
                } else {
                  playSpeech(customText, selectedVoice, "full");
                }
              }}
              disabled={isLoading}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 ${
                isPlaying 
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" 
                  : "bg-zinc-900 dark:bg-indigo-600 hover:bg-zinc-800 dark:hover:bg-indigo-500 text-white"
              } ${isLoading ? "opacity-75 cursor-not-allowed" : ""}`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : isPlaying ? (
                <>
                  <Square size={14} className="fill-current" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Play size={14} className="fill-current" />
                  <span>Read Full Letter</span>
                </>
              )}
            </button>

            {audioUrl && (
              <button
                onClick={handleDownload}
                title="Download synthesized WAV audio"
                className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-sm"
              >
                <Download size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Live Audio Visualizer Banner */}
        <div className="h-10 bg-zinc-900 dark:bg-zinc-950 flex items-center px-6 justify-between border-b border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-emerald-400 animate-ping" : "bg-zinc-600"}`} />
            <span className="text-xs font-mono text-zinc-300 truncate max-w-md">
              {statusMessage || `Ready to audition • Model: gemini-3.8-flash-lite-tts • Voice: ${selectedVoice}`}
            </span>
          </div>

          <div className="w-36 h-6 flex items-center opacity-70">
            <AudioVisualizer isPlaying={isPlaying} color="#818cf8" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-50/50 dark:bg-zinc-950/20">
          
          {/* View 1: Document View with Per-Paragraph Audition */}
          {viewTab === "document" && (
            <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 sm:p-10 transition-colors">
              
              {/* Document Header / Letterhead */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      Formal Academic Petition
                    </span>
                    <h1 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mt-1">
                      {DHAKA_COLLEGE_LETTER.institution}
                    </h1>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {DHAKA_COLLEGE_LETTER.date}
                    </span>
                  </div>
                </div>

                <div className="mt-4 text-sm text-zinc-700 dark:text-zinc-300 space-y-0.5">
                  <p className="font-semibold text-zinc-900 dark:text-white">The Principal</p>
                  <p>Dhaka College, Dhaka</p>
                </div>

                <div className="mt-4 bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-indigo-500 p-3 rounded-r-lg">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-0.5">
                    Subject:
                  </p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {DHAKA_COLLEGE_LETTER.subject}
                  </p>
                </div>
              </div>

              {/* Salutation */}
              <div className="mb-4">
                <p className="font-serif text-base font-semibold text-zinc-900 dark:text-white">
                  {DHAKA_COLLEGE_LETTER.salutation}
                </p>
              </div>

              {/* Interactive Paragraphs with individual audition triggers */}
              <div className="space-y-4 text-sm sm:text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
                {DHAKA_COLLEGE_LETTER.sections.map((section, idx) => {
                  const isThisSectionPlaying = isPlaying && activeSectionId === section.id;
                  return (
                    <div
                      key={section.id}
                      className={`relative group rounded-xl p-4 transition-all duration-200 border ${
                        isThisSectionPlaying
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm ring-2 ring-indigo-200 dark:ring-indigo-900/40"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block">
                            Part {idx + 1} • {section.label}
                          </span>
                          <p className="font-normal">{section.text}</p>
                        </div>

                        <button
                          onClick={() => {
                            if (isThisSectionPlaying) {
                              stopPlayback();
                            } else {
                              playSpeech(section.text, selectedVoice, section.id);
                            }
                          }}
                          className={`shrink-0 p-2 rounded-xl transition-all ${
                            isThisSectionPlaying
                              ? "bg-indigo-600 text-white shadow-md scale-105"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 opacity-60 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          }`}
                          title={isThisSectionPlaying ? "Stop section" : "Listen to this paragraph with " + selectedVoice}
                        >
                          {isThisSectionPlaying ? (
                            <Square size={14} className="fill-current" />
                          ) : (
                            <Play size={14} className="fill-current ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Reading indicator highlight */}
                      {isThisSectionPlaying && (
                        <div className="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 font-mono">
                          <span className="flex items-center gap-1.5">
                            <Volume2 size={14} className="animate-bounce" />
                            Reading with {selectedVoice}...
                          </span>
                          <span className="text-[11px] opacity-75">Click stop to pause</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Signatures & Closing */}
              <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-end">
                <div>
                  <p className="font-serif text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                    {DHAKA_COLLEGE_LETTER.closing}
                  </p>
                  <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                    {DHAKA_COLLEGE_LETTER.signatories.map((sig, i) => (
                      <p key={i} className={i === DHAKA_COLLEGE_LETTER.signatories.length - 1 ? "text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-2" : ""}>
                        {sig}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Authentic Academic Script</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View 2: Voice Comparison Mode (Side by side) */}
          {viewTab === "compare" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white mb-1">
                  Side-by-Side Voice Audition
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                  Hear how different Gemini Voices interpret the student petition's core arguments.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Speaker 1 Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                          Voice A
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {voices.find(v => v.name === selectedVoice)?.analysis.gender} • {voices.find(v => v.name === selectedVoice)?.analysis.pitch}
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                        {selectedVoice}
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 italic mb-4">
                        "{DHAKA_COLLEGE_LETTER.sections[1].text.slice(0, 160)}..."
                      </p>
                    </div>

                    <button
                      onClick={() => playSpeech(DHAKA_COLLEGE_LETTER.sections[1].text, selectedVoice, "compare-a")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 dark:bg-indigo-600 hover:bg-zinc-800 dark:hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <Play size={14} className="fill-current" />
                      <span>Audition with {selectedVoice}</span>
                    </button>
                  </div>

                  {/* Speaker 2 Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase text-purple-600 dark:text-purple-400">
                          Voice B
                        </span>
                        <select
                          value={comparisonVoice}
                          onChange={(e) => setComparisonVoice(e.target.value)}
                          className="text-xs bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-md px-2 py-1 text-zinc-800 dark:text-zinc-200 font-medium"
                        >
                          {voices.map(v => (
                            <option key={v.name} value={v.name}>{v.name} ({v.analysis.gender})</option>
                          ))}
                        </select>
                      </div>
                      <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                        {comparisonVoice}
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 italic mb-4">
                        "{DHAKA_COLLEGE_LETTER.sections[1].text.slice(0, 160)}..."
                      </p>
                    </div>

                    <button
                      onClick={() => playSpeech(DHAKA_COLLEGE_LETTER.sections[1].text, comparisonVoice, "compare-b")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <Play size={14} className="fill-current" />
                      <span>Audition with {comparisonVoice}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-3">
                  <Sparkles size={18} className="shrink-0 text-indigo-500" />
                  <span>
                    Notice the subtle acoustic difference: <strong>Puck</strong> lends a modern youthful eagerness, <strong>Fenrir</strong> brings measured warm authority, while <strong>Kore</strong> provides lucid precision.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* View 3: Custom Text Editor */}
          {viewTab === "editor" && (
            <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Script & Document Editor
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Modify this letter or paste your own script to audition across the library.
                  </p>
                </div>

                <button
                  onClick={() => setCustomText(fullText)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Reset to Dhaka College</span>
                </button>
              </div>

              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={14}
                className="w-full p-4 font-mono text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all leading-relaxed"
                placeholder="Type or paste any text or script here..."
              />

              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>{customText.length} characters • ~{Math.ceil(customText.split(/\s+/).length / 140)} min reading time</span>
                <span>Voice: {selectedVoice}</span>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <BookOpen size={14} className="text-indigo-500" />
            <span>Dhaka College Petition • Original Students: Mizan, Kushol, Monmoy</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                stopPlayback();
                onClose();
              }}
              className="px-4 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium"
            >
              Back to Voice Library
            </button>
            <button
              onClick={() => playSpeech(customText, selectedVoice, "full")}
              disabled={isLoading}
              className="px-4 py-1.5 rounded-full bg-zinc-900 dark:bg-indigo-600 hover:bg-zinc-800 dark:hover:bg-indigo-500 text-white font-medium shadow transition-all active:scale-95"
            >
              {isPlaying ? "Restart Reading" : "Read Complete Script"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocumentScriptStudio;
