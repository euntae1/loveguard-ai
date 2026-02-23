/* eslint-disable jsx-a11y/alt-text */
import React, { useState, useRef, useEffect } from 'react';
import { client } from "@gradio/client";
import './index.css';

/**
 * [컴포넌트] 결과 표시용 도넛 차트
 */
const DonutChart = ({ score, label, color }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 50; 
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    const timeout = setTimeout(() => setDisplayScore(score), 100);
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
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  const [analysisResult, setAnalysisResult] = useState({
    srmScore: null,
    pixelScore: null,
    graphImg: null,
    urlFaces: [], 
    realConfidence: null,
    comment: ""
  });

  // 진행 바 애니메이션
  const startProgress = () => {
    setProgress(0);
    clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setProgress(prev => (prev >= 95 ? prev : prev + 2));
    }, 100);
  };

  /**
   * [핵심 기능] 브라우저 창 선택 즉시 캡처 및 전송
   */
  const handleInstantCapture = async () => {
    try {
      // 1. 브라우저 창/탭 선택 팝업 실행
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: "browser" },
        audio: false 
      });

      setIsExtracting(true);
      startProgress();

      // 2. 비디오 객체를 생성하여 스트림의 한 프레임을 캡처
      const video = document.createElement('video');
      video.srcObject = stream;
      
      video.onloadedmetadata = () => {
        video.play();
        
        // 화면이 안정화될 때까지 아주 짧게 대기 후 캡처
        setTimeout(async () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // 3. 스트림 중지 (공유 종료)
          stream.getTracks().forEach(track => track.stop());

          // 4. 이미지 블롭 생성 및 백엔드 전송
          canvas.toBlob(async (blob) => {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

            try {
              const app = await client("euntaejang/deepfake");
              // 백엔드의 extract_url 엔드포인트 호출
              const result = await app.predict("/extract_url", [file]);

              // 5. 결과값 세팅 및 화면 갱신
              const score = parseFloat(result.data[0]) || 0;
              setAnalysisResult({
                realConfidence: score,
                urlFaces: result.data[1] || [],
                srmScore: score,
                pixelScore: 100 - score,
                comment: `[실시간 캡처 분석 완료] ${result.data[2]}`
              });

              clearInterval(progressTimer.current);
              setProgress(100);
            } catch (error) {
              console.error(error);
              alert("분석 실패: 서버 연결을 확인하세요.");
              setProgress(0);
            } finally {
              setIsExtracting(false);
            }
          }, 'image/jpeg');
        }, 500); 
      };
    } catch (err) {
      console.log("사용자가 창 선택을 취소함");
      setIsExtracting(false);
    }
  };

  const displayScore = analysisResult.realConfidence;

  return (
    <div className="min-h-screen forensic-grid p-6 text-[#00f2ff] bg-[#0a0e14]">
      {/* Header */}
      <header className="max-w-[1400px] mx-auto mb-8 flex justify-between items-center border-b-2 border-[#00f2ff] pb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#00f2ff] flex items-center justify-center rounded-sm shadow-[0_0_10px_#00f2ff]">
            <span className="text-black text-lg font-black">DB</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase font-mono">Deepfake Detector v2</h1>
        </div>
        <div className="text-[10px] font-mono animate-pulse">SYSTEM STATUS: OPERATIONAL</div>
      </header>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Control Panel */}
        <section className="lg:col-span-4 space-y-4">
          <div className="bg-[#121b28] border border-[#00f2ff]/30 p-6 rounded-lg shadow-xl">
            <h2 className="text-lg font-bold mb-4 border-l-4 border-[#00f2ff] pl-3">분석 도구 선택</h2>
            
            <div className="flex flex-col gap-4 mt-6">
              <button 
                onClick={handleInstantCapture}
                disabled={isExtracting}
                className={`w-full py-8 border-2 font-black text-xl transition-all flex flex-col items-center justify-center gap-2
                  ${isExtracting ? 'border-gray-500 text-gray-500 cursor-not-allowed' : 'border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black shadow-[0_0_15px_rgba(0,242,255,0.2)]'}`}
              >
                {isExtracting ? "ANALYZING..." : (
                  <>
                    <span className="text-2xl">📸</span>
                    <span>브라우저 창 선택 분석</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center opacity-60 font-mono">버튼 클릭 후 원하는 탭/창을 선택하면 즉시 판독합니다.</p>
            </div>
          </div>

          <div className="p-4 bg-black/60 border-l-2 border-[#00f2ff] font-mono text-sm italic min-h-[100px]">
            <span className="text-[#00f2ff] font-bold block mb-1 uppercase text-xs">AI Agent Comment:</span>
            {analysisResult.comment || "> 분석을 시작하려면 브라우저 창을 선택하십시오..."}
          </div>
        </section>

        {/* Right Side: Detection Monitor */}
        <section className="lg:col-span-8">
          <div className="bg-[#121b28] border border-[#00f2ff]/30 p-8 rounded-lg shadow-2xl relative min-h-[600px]">
            <div className="flex justify-between items-start mb-10">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#00f2ff]/50 tracking-[0.3em]">Integrity Confidence</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-black italic text-[#00f2ff]">
                    {displayScore !== null ? Math.floor(displayScore) : "00"}
                  </span>
                  <span className="text-2xl font-bold opacity-70">%</span>
                </div>
              </div>

              {displayScore !== null && (
                <div className={`px-8 py-4 text-2xl font-black border-2 shadow-lg ${
                  displayScore > 50 ? 'border-green-500 text-green-500 bg-green-500/5' : 'border-red-600 text-red-600 bg-red-600/5 animate-pulse'
                }`}>
                  {displayScore > 50 ? 'REAL IMAGE' : 'DEEPFAKE DETECTED'}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-10">
              <div className="h-1 bg-black border border-[#00f2ff]/10 relative overflow-hidden">
                <div 
                  className="h-full bg-[#00f2ff] shadow-[0_0_10px_#00f2ff] transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayScore !== null ? (
                <>
                  <DonutChart score={analysisResult.srmScore} label="주파수 대조 분석" color="#8b5cf6" />
                  <DonutChart score={analysisResult.pixelScore} label="노이즈 무결성 분석" color="#3b82f6" />
                  
                  {analysisResult.urlFaces.length > 0 && (
                    <div className="col-span-2 mt-6 p-4 bg-black/40 border border-[#00f2ff]/10">
                      <p className="text-[10px] mb-4 opacity-50 font-bold uppercase tracking-widest text-[#00f2ff]">Detected Object Patterns</p>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {analysisResult.urlFaces.map((face, i) => (
                          <div key={i} className="min-w-[100px] border border-[#00f2ff]/30 relative group">
                            <img src={`data:image/jpeg;base64,${face.face_img}`} className="w-full aspect-square object-cover" />
                            <div className="absolute bottom-0 w-full bg-[#00f2ff] text-black text-[9px] font-bold text-center">
                              {face.score}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="col-span-2 h-[300px] flex items-center justify-center border border-dashed border-[#00f2ff]/20">
                  <p className="text-xs uppercase tracking-[1em] opacity-30 animate-pulse">Waiting for Data Stream...</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;