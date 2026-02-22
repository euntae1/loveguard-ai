/* eslint-disable jsx-a11y/alt-text */
import React, { useState, useRef } from 'react';
import { client } from "@gradio/client";
import './index.css';

/**
 * [컴포넌트] DonutChart
 * 백엔드에서 받은 수치를 바탕으로 프론트엔드에서 직접 차트를 렌더링합니다.
 */
const DonutChart = ({ score, label, color }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  
  // 점수 애니메이션 효과
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDisplayScore(score);
    }, 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 bg-black/40 border border-[#00f2ff]/20 shadow-[0_0_15px_rgba(0,242,255,0.05)]">
      <span className="text-[11px] text-[#00f2ff]/70 mb-4 font-mono uppercase tracking-[0.2em]">{label}</span>
      <div className="relative flex items-center justify-center">
        <svg className="w-32 h-32 transform -rotate-90">
          {/* 배경 원 가이드 */}
          <circle 
            cx="64" cy="64" r={radius} 
            stroke="#1a1f26" strokeWidth="8" fill="transparent" 
          />
          {/* 실제 데이터 게이지 */}
          <circle 
            cx="64" cy="64" r={radius} 
            stroke={color} strokeWidth="8" fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset, 
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 5px ${color})`
            }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-black text-white">{Math.floor(displayScore)}%</span>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  const [isUrlMode, setIsUrlMode] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const [analysisResult, setAnalysisResult] = useState({
    srmScore: null,     // 백엔드에서 받은 수치 (freq.pt 결과)
    pixelScore: null,   // 백엔드에서 받은 수치 (image.pth 결과)
    graphImg: null,
    urlGridImg: null,
    realConfidence: null,
    comment: ""
  });

  const newsData = [
    { id: 1, src: "/image/news_1.png", label: "EVIDENCE_01" },
    { id: 2, src: "/image/news_2.jpeg", label: "EVIDENCE_02" },
    { id: 3, src: "/image/news_3.jpg", label: "EVIDENCE_03" }
  ];

  const startProgress = (seconds) => {
    clearInterval(progressTimer.current);
    setProgress(0);
    const interval = 100;
    const step = 100 / (seconds * (1000 / interval));

    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressTimer.current);
          return prev;
        }
        return prev + step;
      });
    }, interval);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setSelectedFile(URL.createObjectURL(file));
      const isVideo = file.type.startsWith('video');
      setFileType(isVideo ? 'video' : 'image');
      setAnalysisResult({ srmScore: null, pixelScore: null, graphImg: null, urlGridImg: null, realConfidence: null, comment: "" });
      setProgress(0);
      clearInterval(progressTimer.current);
    }
  };

  const handleUrlAnalyze = async () => {
    if (!inputUrl) {
      alert("타겟 URL을 입력하십시오.");
      return;
    }
    setIsExtracting(true);
    setAnalysisResult({ srmScore: null, pixelScore: null, graphImg: null, urlGridImg: null, realConfidence: null, comment: "" });
    startProgress(10);

    try {
      const app = await client("euntaejang/deepfake");
      const result = await app.predict("/extract_url", [inputUrl]);
      
      if (result.data) {
        clearInterval(progressTimer.current);
        setProgress(100);
        setAnalysisResult({
          realConfidence: result.data[0], // "7/12" 같은 문자열 혹은 수치
          urlGridImg: result.data[1]?.url,
          comment: `[원격분석완료] ${result.data[2]}`
        });
      }
    } catch (error) {
      clearInterval(progressTimer.current);
      setProgress(0);
      alert("URL 분석 실패");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!rawFile) {
      alert("분석할 증거물을 확보하십시오.");
      return;
    }
    setIsAnalyzing(true);
    
    if (fileType === 'image') {
      startProgress(5);
    } else {
      const tempVideo = document.createElement('video');
      tempVideo.src = selectedFile;
      tempVideo.onloadedmetadata = () => {
        const duration = tempVideo.duration || 10;
        startProgress(duration * 2);
      };
    }

    try {
      const app = await client("euntaejang/deepfake");
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      const apiResult = await app.predict(endpoint, [rawFile]);

      clearInterval(progressTimer.current);
      setProgress(100);

      if (fileType === 'video') {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          graphImg: apiResult.data[1]?.url,
          comment: "[영상 타임라인 분석 완료] 데이터 무결성 검증됨."
        });
      } else {
        // 백엔드에서 수치 3개를 보내주므로 (Final, SRM, Pixel)
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          srmScore: apiResult.data[1],
          pixelScore: apiResult.data[2],
          comment: apiResult.data[0] > 50 
            ? "[판독완료] 픽셀 및 주파수 무결성 통과." 
            : "[경고] 생성 노이즈 및 주파수 변조 감지."
        });
      }
    } catch (error) {
      clearInterval(progressTimer.current);
      setProgress(0);
      alert("분석 도중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null
    ? (isUrlMode ? analysisResult.realConfidence : Math.floor(analysisResult.realConfidence))
    : null;

  return (
    <div className="min-h-screen forensic-grid p-6 md:p-12 text-[#00f2ff] bg-[#0a0e14]">
      {/* Header */}
      <header className="max-w-[1600px] mx-auto mb-10 flex justify-between items-center border-b-4 border-[#00f2ff] pb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-[#00f2ff] flex items-center justify-center rounded-sm shadow-[0_0_15px_#00f2ff]">
            <span className="text-black text-xl font-black">dbdb</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">디비디비딥페이크</h1>
        </div>
        <button onClick={() => window.location.reload()} className="px-8 py-3 border-2 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all font-black italic">
          새로고침
        </button>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Section: Upload & Input */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-6 shadow-inner">
            <div className="flex justify-between mb-6">
              <button onClick={() => { setIsUrlMode(false); setProgress(0); }} className={`flex-1 py-3 font-bold border-b-4 ${!isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>사진/동영상</button>
              <button onClick={() => { setIsUrlMode(true); setProgress(0); }} className={`flex-1 py-3 font-bold border-b-4 ${isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>URL링크</button>
            </div>

            {!isUrlMode ? (
              <label className="relative aspect-video bg-black/70 border-2 border-dashed border-[#00f2ff]/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                {selectedFile ? (
                  fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-contain" /> : <img src={selectedFile} className="w-full h-full object-contain" />
                ) : (
                  <p className="text-[#00f2ff]/50 font-bold text-center group-hover:text-[#00f2ff] transition-colors">증거물을 업로드하세요..</p>
                )}
                {isAnalyzing && <div className="scan-line"></div>}
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="aspect-video bg-black/70 border-2 border-[#00f2ff]/50 p-8 flex flex-col justify-center gap-5">
                <input 
                  type="text" 
                  placeholder="분석할 웹페이지 URL을 입력하세요..."
                  className="bg-black border-2 border-[#00f2ff]/50 p-4 outline-none text-[#00f2ff] font-mono placeholder:text-[#00f2ff]/30"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
                <button onClick={handleUrlAnalyze} disabled={isExtracting} className="bg-[#00f2ff] text-black font-black py-4 hover:bg-white transition-all disabled:bg-gray-600">
                  {isExtracting ? "수사팀 진입 중..." : "해당 URL 수사 개시"}
                </button>
              </div>
            )}
          </div>

          <button onClick={handleAnalyze} disabled={isAnalyzing || isUrlMode} className="w-full py-4 font-black text-xl border-4 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all disabled:opacity-50">
            {isAnalyzing ? "데이터 정밀 분석 중..." : "증거물 판별하기"}
          </button>

          <div className="grid grid-cols-3 gap-4 opacity-50">
            {newsData.map((news) => (
              <div key={news.id} className="border-2 border-[#00f2ff]/30 bg-black overflow-hidden">
                <img src={news.src} className="w-full h-24 object-cover grayscale hover:grayscale-0 transition-all" />
                <p className="text-[10px] text-center font-bold py-1 bg-[#00f2ff]/10 tracking-tighter">{news.label}</p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-black/80 border-l-4 border-[#00f2ff] shadow-lg">
            <h3 className="text-[#00f2ff] text-sm font-bold mb-1 underline tracking-widest uppercase">AI 분석관의 소견</h3>
            <p className="text-gray-200 text-sm font-mono italic leading-relaxed">{analysisResult.comment || "> 디지털 지문 분석 대기 중..."}</p>
          </div>
        </section>

        {/* Right Section: Results Visualization */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-10 flex flex-col min-h-[650px] shadow-2xl relative overflow-hidden">
            
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-[#00f2ff]/60 uppercase font-bold mb-2 tracking-[0.3em] text-xs">최종 신뢰 점수</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-9xl font-black italic text-[#00f2ff] drop-shadow-[0_0_20px_rgba(0,242,255,0.4)]">
                    {displayScore ?? "00"}
                  </span>
                  {!isUrlMode && <span className="text-4xl font-bold text-[#00f2ff]/80">%</span>}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-[#00f2ff]/60 mb-4 font-bold uppercase tracking-widest">분석 결과 상태</p>
                {!isUrlMode && displayScore !== null && (
                  <div className={`px-10 py-5 text-3xl font-black border-4 shadow-lg transition-all ${
                     displayScore > 50
                    ? 'border-green-500 text-green-500 bg-green-500/10'
                    : 'border-red-600 text-red-600 bg-red-600/10 animate-pulse'
                    }`}>
                    {displayScore > 50 ? 'AUTHENTIC' : 'DEEPFAKE'}
                  </div>
                )}

                {isUrlMode && displayScore && (
                  <div className="px-10 py-5 text-2xl font-black border-4 border-[#00f2ff] text-[#00f2ff] bg-[#00f2ff]/10">
                    URL 탐색 완료
                  </div>
                )}                
              </div>
            </div>

            {/* Analysis Progress Bar */}
            <div className="mb-12">
              <div className="flex justify-between text-[10px] mb-2 font-mono tracking-widest">
                <span>SYSTEM PROCESSING UNIT</span>
                <span>{Math.floor(progress)}%</span>
              </div>
              <div className="h-2 bg-black border border-[#00f2ff]/30 relative overflow-hidden">
                <div 
                  className="h-full bg-[#00f2ff] shadow-[0_0_15px_#00f2ff] transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
                <div className="absolute top-0 left-0 w-full h-full scan-bar-light"></div>
              </div>
            </div>

            {/* Main Screen: Dynamic Content */}
            <div className="flex-grow">
              <p className="text-xs mb-6 text-[#00f2ff] font-bold border-l-4 border-[#00f2ff] pl-3 uppercase tracking-[0.4em]">
                DETECTION MONITOR
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                {/* 1. 이미지 모드일 때: 수치를 기반으로 도넛 차트 렌더링 */}
                {!isUrlMode && fileType === 'image' && analysisResult.srmScore !== null && (
                  <>
                    <DonutChart score={analysisResult.srmScore} label="주파수(SRM) 대조 분석" color="#7C3AED" />
                    <DonutChart score={analysisResult.pixelScore} label="픽셀(Pixel) 변조 분석" color="#2563EB" />
                  </>
                )}

                {/* 2. 비디오 모드일 때: 기존 타임라인 그래프 이미지 */}
                {!isUrlMode && fileType === 'video' && analysisResult.graphImg && (
                  <div className="col-span-2 border border-[#00f2ff]/20 bg-black/40 p-4">
                    <img src={analysisResult.graphImg} className="w-full h-full object-contain" />
                  </div>
                )}

                {/* 3. URL 모드일 때: 이미지 그리드 결과 */}
                {isUrlMode && analysisResult.urlGridImg && (
                  <div className="col-span-2 border border-[#00f2ff]/20 bg-black/40 p-4 overflow-auto max-h-[400px]">
                    <img src={analysisResult.urlGridImg} className="w-full h-auto" />
                  </div>
                )}

                {/* 대기 화면 */}
                {(!analysisResult.srmScore && !analysisResult.graphImg && !analysisResult.urlGridImg) && (
                  <div className="col-span-2 aspect-video bg-gray-900/20 border border-dashed border-[#00f2ff]/10 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-[#00f2ff]/20 border-t-[#00f2ff] rounded-full animate-spin"></div>
                    <span className="text-xs opacity-40 uppercase tracking-[0.5em]">데이터 패킷 수신 대기 중...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;