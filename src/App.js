/* eslint-disable jsx-a11y/alt-text */
import React, { useState, useRef, useEffect } from 'react';
import { client } from "@gradio/client";
import './index.css';

/**
 * [컴포넌트] 도넛 차트
 */
const DonutChart = ({ score, label, color }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 50; 
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    const timeout = setTimeout(() => setDisplayScore(score || 0), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 bg-black/40 border border-[#00f2ff]/10 rounded-sm">
      <span className="text-[11px] mb-4 font-bold tracking-widest text-[#00f2ff]/70 uppercase">{label}</span>
      <div className="relative flex items-center justify-center">
        <svg className="w-40 h-40 transform -rotate-90">
          <circle cx="80" cy="80" r={radius} stroke="#1a1f26" strokeWidth="10" fill="transparent" />
          <circle 
            cx="80" cy="80" r={radius} stroke={color} strokeWidth="10" fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset, 
              transition: 'stroke-dashoffset 1.5s ease-out',
              filter: `drop-shadow(0 0 8px ${color})`
            }}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-3xl font-black text-white">{Math.floor(displayScore)}%</span>
      </div>
    </div>
  );
};

function App() {
  // 에러 원인이었던 unused vars 제거 완료
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  const [analysisResult, setAnalysisResult] = useState({
    srmScore: null,
    pixelScore: null,
    urlFaces: [], 
    realConfidence: null,
    comment: ""
  });

  const startProgress = () => {
    setProgress(0);
    clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setProgress(prev => (prev >= 95 ? prev : prev + 2));
    }, 100);
  };

  const handleInstantCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: "browser" },
        audio: false 
      });

      setIsExtracting(true);
      startProgress();

      const video = document.createElement('video');
      video.srcObject = stream;
      
      video.onloadedmetadata = () => {
        video.play();
        
        setTimeout(async () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0);
          
          stream.getTracks().forEach(track => track.stop());

          canvas.toBlob(async (blob) => {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

            try {
              // 본인의 Hugging Face ID로 확인 필요
              const app = await client("euntaejang/deepfake");
              const result = await app.predict("/extract_url", [file]);

              const score = parseFloat(result.data[0]) || 0;
              setAnalysisResult({
                realConfidence: score,
                urlFaces: result.data[1] || [],
                srmScore: score,
                pixelScore: 100 - score,
                comment: `[캡처 분석 완료] ${result.data[2]}`
              });

              clearInterval(progressTimer.current);
              setProgress(100);
            } catch (error) {
              alert("백엔드 서버 응답 없음");
              setProgress(0);
            } finally {
              setIsExtracting(false);
            }
          }, 'image/jpeg');
        }, 500); 
      };
    } catch (err) {
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 text-[#00f2ff] bg-[#0a0e14] font-mono">
      <header className="max-w-[1200px] mx-auto mb-8 flex justify-between items-center border-b border-[#00f2ff]/30 pb-4">
        <h1 className="text-2xl font-black italic tracking-tighter">DEEPFAKE DETECTOR SYSTEM</h1>
        <div className="text-[10px] opacity-50">STABLE CONNECTION</div>
      </header>

      <main className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="bg-[#121b28] border border-[#00f2ff]/20 p-6 rounded">
            <h2 className="text-sm font-bold mb-4 opacity-70">CONTROL UNIT</h2>
            <button 
              onClick={handleInstantCapture}
              disabled={isExtracting}
              className={`w-full py-10 border-2 font-black text-lg transition-all
                ${isExtracting ? 'border-gray-700 text-gray-700' : 'border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black shadow-[0_0_15px_rgba(0,242,255,0.1)]'}`}
            >
              {isExtracting ? "SCANNING..." : "SELECT BROWSER TAB"}
            </button>
          </div>
          <div className="p-4 bg-black/40 border-l-2 border-[#00f2ff] text-xs italic">
            {analysisResult.comment || "> 시스템 대기 중. 브라우저 창을 선택하세요."}
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#121b28] border border-[#00f2ff]/20 p-8 rounded relative">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] opacity-50 mb-1 uppercase tracking-widest">Confidence Score</p>
              <span className="text-6xl font-black text-[#00f2ff]">
                {analysisResult.realConfidence !== null ? Math.floor(analysisResult.realConfidence) : "00"}%
              </span>
            </div>
            {analysisResult.realConfidence !== null && (
              <div className={`px-6 py-2 border-2 font-black ${analysisResult.realConfidence > 50 ? 'border-green-500 text-green-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
                {analysisResult.realConfidence > 50 ? 'AUTHENTIC' : 'DEEPFAKE'}
              </div>
            )}
          </div>

          <div className="h-1 bg-black mb-8">
            <div className="h-full bg-[#00f2ff] transition-all" style={{ width: `${progress}%` }}></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {analysisResult.realConfidence !== null ? (
              <>
                <DonutChart score={analysisResult.srmScore} label="SRM ANALYSIS" color="#8b5cf6" />
                <DonutChart score={analysisResult.pixelScore} label="PIXEL INTEGRITY" color="#3b82f6" />
                
                <div className="col-span-2 mt-4 flex gap-2 overflow-x-auto pb-2">
                  {analysisResult.urlFaces.map((face, i) => (
                    <div key={i} className="min-w-[80px] border border-[#00f2ff]/20">
                      <img src={`data:image/jpeg;base64,${face.face_img}`} className="w-full aspect-square object-cover" />
                      <div className="text-[9px] text-center bg-[#00f2ff] text-black font-bold">{face.score}%</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="col-span-2 h-40 flex items-center justify-center opacity-20 border border-dashed border-[#00f2ff]">
                NO DATA RECEIVED
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;