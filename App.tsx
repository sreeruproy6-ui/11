/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useEffect } from 'react';
import { VOICE_DATA } from './constants';
import Carousel3D from './components/Carousel3D';
import GridView from './components/GridView';
import FilterBar from './components/FilterBar';
import VoiceFinder from './components/VoiceFinder';
import AiResultCard from './components/AiResultCard';
import DocumentScriptStudio from './components/DocumentScriptStudio';
import { FilterState, AiRecommendation } from './types';
import { Info, Sparkles, GraduationCap } from 'lucide-react';

const App: React.FC = () => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiRecommendation | null>(null);
  const [isAiCardVisible, setIsAiCardVisible] = useState(false);
  const [showVoiceFinder, setShowVoiceFinder] = useState(false);
  const [showDocumentStudio, setShowDocumentStudio] = useState(false);
  const [scriptAuditionVoice, setScriptAuditionVoice] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Carousel state
  const [activeIndex, setActiveIndex] = useState(0);

  const [filters, setFilters] = useState<FilterState>({
    gender: 'All',
    pitch: 'All',
    search: '',
  });

  // Theme Management
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const uniqueGenders = useMemo(() => Array.from(new Set(VOICE_DATA.map(v => v.analysis.gender))).sort(), []);
  const uniquePitches = useMemo(() => Array.from(new Set(VOICE_DATA.map(v => v.analysis.pitch))).sort(), []);

  const filteredVoices = useMemo(() => {
    let baseData = VOICE_DATA;
    if (aiResult) {
       const recommended = aiResult.voiceNames
          .map(name => VOICE_DATA.find(v => v.name === name))
          .filter((v): v is typeof VOICE_DATA[0] => !!v);
       return recommended.length > 0 ? recommended : baseData;
    }

    return baseData.filter(voice => {
      const matchGender = filters.gender === 'All' || voice.analysis.gender === filters.gender;
      const matchPitch = filters.pitch === 'All' || voice.analysis.pitch === filters.pitch;
      
      const searchLower = filters.search.toLowerCase();
      const matchSearch = filters.search === '' || 
        voice.name.toLowerCase().includes(searchLower) || 
        voice.characteristics.some(c => c.toLowerCase().includes(searchLower)) ||
        voice.analysis.characteristics.some(c => c.toLowerCase().includes(searchLower)) ||
        voice.analysis.gender.toLowerCase().startsWith(searchLower) ||
        voice.pitch.toLowerCase().includes(searchLower) ||
        voice.analysis.pitch.toLowerCase().includes(searchLower);

      return matchGender && matchPitch && matchSearch;
    });
  }, [filters, aiResult]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filteredVoices.length]);

  const handlePlayToggle = (voiceName: string) => {
    setPlayingVoice(current => current === voiceName ? null : voiceName);
  };

  const clearAiResult = () => {
    setAiResult(null);
    setIsAiCardVisible(false);
    setFilters({ ...filters, search: '' });
  };

  const isModalOpen = showVoiceFinder || (aiResult && isAiCardVisible) || showDocumentStudio;

  return (
    <div className="h-screen w-screen bg-[#FDFDFD] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden flex flex-col relative transition-colors duration-300">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-50 dark:bg-blue-900/20 blur-3xl opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-50 dark:bg-purple-900/20 blur-3xl opacity-50"></div>
      </div>

      {/* Main App Content - aria-hidden and inert when modal is open */}
      <div 
        className="flex flex-col flex-1 overflow-hidden" 
        aria-hidden={isModalOpen}
        inert={isModalOpen}
        style={isModalOpen ? { pointerEvents: 'none' } : {}}
      >
        <FilterBar 
          filters={filters}
          onFilterChange={setFilters}
          uniqueGenders={uniqueGenders}
          uniquePitches={uniquePitches}
          onOpenAiCasting={() => setShowVoiceFinder(true)}
          onOpenDocumentStudio={() => {
            setScriptAuditionVoice(filteredVoices[activeIndex]?.name || 'Puck');
            setShowDocumentStudio(true);
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />

        {/* Featured Script Spotlight Bar */}
        <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-indigo-50/90 dark:from-indigo-950/40 dark:via-zinc-900/60 dark:to-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/30 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs z-10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-zinc-900 dark:text-white truncate">
                Featured Script: Dhaka College Multimedia Facilities Application
              </span>
              <span className="hidden lg:inline text-zinc-500 dark:text-zinc-400 truncate">
                • Audition & test the student petition across all Gemini voices
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setScriptAuditionVoice(filteredVoices[activeIndex]?.name || 'Puck');
              setShowDocumentStudio(true);
            }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition-all shadow-sm hover:scale-105 active:scale-95"
          >
            <span>Open Script Studio</span>
            <span className="text-[11px]">→</span>
          </button>
        </div>

        <main className="flex-1 relative flex flex-col overflow-hidden">
              {filteredVoices.length > 0 ? (
                  viewMode === 'carousel' ? (
                    <div className="w-full flex-1 flex items-center justify-center pb-8 min-h-0">
                         <Carousel3D 
                            voices={filteredVoices}
                            activeIndex={activeIndex}
                            onChange={setActiveIndex}
                            playingVoice={playingVoice}
                            onPlayToggle={handlePlayToggle}
                            onAuditionScript={(name) => {
                              setScriptAuditionVoice(name);
                              setShowDocumentStudio(true);
                            }}
                            disabled={isModalOpen}
                         />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      <GridView 
                          voices={filteredVoices}
                          playingVoice={playingVoice}
                          onPlayToggle={handlePlayToggle}
                          onAuditionScript={(name) => {
                            setScriptAuditionVoice(name);
                            setShowDocumentStudio(true);
                          }}
                      />
                    </div>
                  )
              ) : (
                  <div className="w-full h-full flex items-center justify-center pb-24">
                      <div className="text-center animate-fade-in">
                          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 mb-6 shadow-sm">
                              <Info size={32} className="text-zinc-300 dark:text-zinc-500" />
                          </div>
                          <h3 className="text-xl font-serif text-zinc-900 dark:text-white mb-2">No voices found</h3>
                          <p className="text-zinc-500 dark:text-zinc-400 mb-6">Try adjusting your filters or use AI Match.</p>
                          <button 
                              onClick={() => setShowVoiceFinder(true)}
                              className="px-4 py-2 bg-zinc-900 dark:bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-zinc-800 dark:hover:bg-indigo-500 transition-colors"
                          >
                              Open AI Casting
                          </button>
                      </div>
                  </div>
              )}
              
              {!aiResult && filteredVoices.length > 0 && viewMode === 'carousel' && (
                  <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium tracking-widest uppercase bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm inline-block px-3 py-1 rounded-full border border-white/50 dark:border-zinc-800">
                          {activeIndex + 1} / {filteredVoices.length}
                      </p>
                  </div>
              )}
        </main>
      </div>

      {/* Modals are rendered outside the aria-hidden container */}
      {showVoiceFinder && (
        <VoiceFinder 
            voices={VOICE_DATA}
            onRecommendation={(rec) => {
                if (rec) {
                    setAiResult(rec);
                    setIsAiCardVisible(true);
                    setFilters(prev => ({ ...prev, search: '' })); 
                }
                setShowVoiceFinder(false);
            }}
            onClose={() => setShowVoiceFinder(false)}
        />
      )}

      {aiResult && isAiCardVisible && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-result-title"
          >
             <div className="absolute inset-0" onClick={clearAiResult}></div>
             <div className="relative w-full max-w-5xl animate-slide-up max-h-[90vh] overflow-hidden rounded-2xl">
                 <AiResultCard 
                    result={aiResult} 
                    voices={filteredVoices} 
                    onClose={clearAiResult} 
                 />
             </div>
          </div>
      )}

      {showDocumentStudio && (
        <DocumentScriptStudio 
          voices={VOICE_DATA}
          initialVoiceName={scriptAuditionVoice}
          onClose={() => setShowDocumentStudio(false)}
          onApplyAiRecommendation={(rec) => {
            setAiResult(rec);
            setIsAiCardVisible(true);
            setShowDocumentStudio(false);
          }}
        />
      )}

    </div>
  );
};

export default App;