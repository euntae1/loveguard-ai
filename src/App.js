import React, { useState } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('file');
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlResults, setUrlResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const [analysisResult, setAnalysisResult] = useState({
    graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: ""
  });

  // 초기화 함수
  const handleReset = () => {
    setSelectedFile(null);
    setRawFile(null);
    setFileType('');
    setUrlInput('');
    setUrlResults([]);
    setAnalysisResult({ graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: "" });
    setProgress(0);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setSelectedFile(URL.createObjectURL(file));
      const isVideo = file.type.startsWith('video');
      setFileType(isVideo ? 'video' : 'image');
      if (isVideo) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => setVideoDuration(video.duration);
        video.src = URL.createObjectURL(file);
      }
      setAnalysisResult({ graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: "" });
      setProgress(0);
    }
  };

  const startProgress = (estimatedSeconds) => {
    setProgress(0);
    const intervalTime = 100;
    const totalSteps = (estimatedSeconds * 1000) / intervalTime;
    const stepIncrement = 100 / totalSteps;
    return setInterval(() => {
      setProgress((prev) => (prev >= 98 ? 98 : prev + stepIncrement));
    }, intervalTime);
  };

  const handleAnalyzeFile = async () => {
    if (!rawFile) return;
    setIsAnalyzing(true);
    const timer = startProgress(fileType === 'video' ? Math.max(videoDuration * 2, 8) : 5);
    try {
      const app = await client("euntaejang/deepfake");
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      const apiResult = await app.predict(endpoint, [rawFile]);
      clearInterval(timer);
      setProgress(100);
      setAnalysisResult({
        realConfidence: apiResult.data[0],
        graphImg: fileType === 'video' ? apiResult.data[1]?.url : null,
        freqImg: fileType !== 'video' ? apiResult.data[1]?.url : null,
        detectImg: fileType !== 'video' ? apiResult.data[2]?.url : null,
        comment: apiResult.data[0] > 50 ? "인증됨: 데이터 변조 징후 없음" : "위험: 비정상적 아티팩트 검출"
      });
    } catch (error) {
      clearInterval(timer);
      alert("System Error: 분석 엔진에 접근할 수 없습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeUrl = async () => {
    if (!urlInput) return;
    setIsAnalyzing(true);
    const timer = startProgress(10); 
    try {
      const app = await client("euntaejang/deepfake");
      const apiResult = await app.predict("/predict_url", [urlInput]);
      clearInterval(timer);
      setProgress(100);
      const resultData = apiResult.data[0];
      if (resultData && resultData.length > 0) setUrlResults(resultData);
      else alert("No Data: 식별 가능한 인물이 없습니다.");
    } catch (error) {
      clearInterval(timer);
      alert("Network Error: 원격 도메인 연결 실패");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null ? Math.floor(analysisResult.realConfidence) : null;

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-8 font-mono text-slate-300">
      {/* GNB: Cyber Security Style */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 flex items-center justify-center rounded-sm shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <span className="text-white text-2xl font-bold font-sans">V</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">DeepTrace <span className="text-blue-500">Forensics</span></h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold tracking-widest">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> CORE ENGINE v4.2 // STATUS: SECURE
            </div>
          </div>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-700 p-1">
          <button onClick={() => { setActiveTab('file'); handleReset(); }} className={`px-6 py-2 text-xs font-bold transition-all ${activeTab === 'file' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>FILESYSTEM</button>
          <button onClick={() => { setActiveTab('url'); handleReset(); }} className={`px-6 py-2 text-xs font-bold transition-all ${activeTab === 'url' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>NETWORK_SCAN</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Operations Panel */}
        <section className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            <h2 className="text-[10px] font-black text-blue-500 mb-4 tracking-[0.2em]">COMMAND_CENTER</h2>
            
            {activeTab === 'file' ? (
              <div className="space-y-4">
                <label className="relative aspect-video bg-black/40 border border-slate-700 flex flex-col items-center justify-center group-hover:border-blue-500/50 transition-all cursor-pointer">
                  {selectedFile ? (
                    fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-contain" /> : <img src={selectedFile} alt="Source" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 font-bold">DRAG_AND_DROP_ASSET</p>
                    </div>
                  )}
                  <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleAnalyzeFile} disabled={isAnalyzing || !rawFile} className="py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-[10px] font-black tracking-widest transition-all">START_ANALYSIS</button>
                  <button onClick={handleReset} className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black tracking-widest">RESET_SYSTEM</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="SOURCE_URL_INPUT..." className="w-full bg-black border border-slate-700 p-3 text-xs text-blue-400 font-mono focus:border-blue-500 outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleAnalyzeUrl} disabled={isAnalyzing || !urlInput} className="py-3 bg-blue-600 text-white text-[10px] font-black tracking-widest">INITIATE_CRAWL</button>
                  <button onClick={handleReset} className="py-3 bg-slate-800 text-slate-300 text-[10px] font-black tracking-widest">RESET_SCAN</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 font-mono">
            <div className="text-[9px] text-slate-500 mb-2 border-b border-slate-800 pb-1">KERNEL_LOG</div>
            <div className="text-[10px] space-y-1">
              <p className="text-emerald-500 leading-tight tracking-tighter">&gt; Analysis engine standing by...</p>
              {isAnalyzing && <p className="text-blue-400 animate-pulse leading-tight">&gt; Scanning neural layers...</p>}
              {displayScore && <p className="text-white leading-tight">&gt; Integrity: {displayScore}% detected.</p>}
            </div>
          </div>
        </section>

        {/* Right: Data Visualization */}
        <section className="lg:col-span-8 bg-black/40 border border-slate-800 relative">
          <div className="p-1 bg-slate-800 flex justify-between px-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Analysis_Output_Dashboard</span>
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500/20"></span>
              <span className="w-2 h-2 rounded-full bg-yellow-500/20"></span>
              <span className="w-2 h-2 rounded-full bg-green-500/20"></span>
            </div>
          </div>

          <div className="p-6 md:p-10">
            {/* Analysis Progress */}
            {(isAnalyzing || progress > 0) && (
              <div className="mb-8 border border-blue-900/30 bg-blue-900/5 p-4">
                <div className="flex justify-between text-[10px] font-black text-blue-500 mb-2 tracking-widest">
                  <span>PROCESSING_NEURAL_PIXELS</span>
                  <span>{Math.floor(progress)}%</span>
                </div>
                <div className="h-1 bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6] transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {activeTab === 'file' ? (
              <div className="space-y-8">
                {displayScore !== null ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border border-slate-800 p-6 bg-slate-900/30">
                    <div className="space-y-4">
                      <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Detection_Confidence</div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-6xl font-black ${displayScore > 50 ? 'text-emerald-500' : 'text-red-600'}`}>{displayScore}%</span>
                        <span className="text-xs font-bold text-slate-600">CERT_VAL</span>
                      </div>
                      <div className={`text-[10px] font-bold px-3 py-1 inline-block border ${displayScore > 50 ? 'border-emerald-500 text-emerald-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
                        RESULT: {displayScore > 50 ? 'AUTHENTIC_CONTENT' : 'DEEPFAKE_VULNERABILITY'}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 leading-relaxed font-sans bg-black/40 p-4 border-l-2 border-slate-700">
                      시스템 분석 결과 해당 객체는 {displayScore > 50 ? "인위적인 픽셀 변조 징후가 희박하며, 주파수 도메인 상의 데이터가 원본 기기 특성과 일치합니다." : "고도화된 생성형 인공지능에 의한 특징점 왜곡이 발견되었습니다. 무단 배포 및 신뢰에 주의하십시오."}
                    </div>
                  </div>
                ) : (
                  !isAnalyzing && <div className="text-center py-20 border border-dashed border-slate-800 opacity-30 text-xs">AWAITING_INPUT_DATA...</div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fileType === 'video' ? (
                    analysisResult.graphImg && <div className="col-span-2 border border-slate-800 p-1"><img src={analysisResult.graphImg} className="w-full grayscale opacity-80 hover:grayscale-0 transition-all" alt="Analysis" /></div>
                  ) : (
                    <>
                      {analysisResult.freqImg && <div className="border border-slate-800 p-1 bg-black"><img src={analysisResult.freqImg} className="w-full" alt="Freq" /></div>}
                      {analysisResult.detectImg && <div className="border border-slate-800 p-1 bg-black"><img src={analysisResult.detectImg} className="w-full" alt="Detect" /></div>}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 italic">
                  <span>&gt; CRAWLED_ASSETS_INDEX</span>
                  <div className="h-[1px] flex-1 bg-slate-800"></div>
                </div>
                {urlResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {urlResults.map((res, index) => (
                      <div key={index} className="bg-slate-900 border border-slate-800 group hover:border-blue-500 transition-all">
                        <div className="aspect-square relative overflow-hidden bg-black">
                          <img src={res.url} alt="Scanned" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                          <div className={`absolute bottom-0 left-0 w-full p-2 text-[9px] font-black text-white text-center ${res.score > 50 ? 'bg-emerald-600' : 'bg-red-600'}`}>
                            {res.score > 50 ? 'SECURE' : 'DETECTED'} / {res.score}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isAnalyzing && <div className="text-center py-20 opacity-20 text-[10px] tracking-[0.5em]">NETWORK_IDLE</div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 border-t border-slate-900 pt-6 flex justify-between text-[9px] text-slate-600 font-bold tracking-widest uppercase">
        <div>System_Auth: X-TRACE-ENCRYPTION-ACTIVE</div>
        <div>Encrypted_Connection: TLS_1.3_AES_256_GCM</div>
      </footer>
    </div>
  );
}

export default App;