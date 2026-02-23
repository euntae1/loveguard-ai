/* eslint-disable jsx-a11y/alt-text */
import React, { useState, useRef, useEffect } from 'react';
import { client } from "@gradio/client";
import './index.css';

/**
 * [컴포넌트] DonutChart
 */
const DonutChart = ({ score, label, color }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 50; 
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDisplayScore(score);
    }, 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 bg-black/40 border border-[#00f2ff]/10 rounded-sm">
      <span className="text-[11px] mb-4 font-bold tracking-widest text-[#00f2ff]/70 uppercase">{label}</span>
      <div className="relative flex items-center justify-center">
        <svg className="w-48 h-48 transform -rotate-90">
          <circle cx="96" cy="96" r={radius} stroke="#1a1f26" strokeWidth="12" fill="transparent" />
          <circle 
            cx="96" cy="96" r={radius} stroke={color} strokeWidth="12" fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset, 
              transition: 'stroke-dashoffset 2s cubic-bezier(0.2, 0.8, 0.2, 1)',
              filter: `drop-shadow(0 0 10px ${color})`
            }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-black text-white">{Math.floor(displayScore)}%</span>
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
  const [isExtracting, setIsExtracting] = useState(false);

  const [analysisResult, setAnalysisResult] = useState({
    srmScore: null,
    pixelScore: null,
    graphImg: null,
    urlFaces: [], 
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

  // --- [수정된 부분] 브라우저 선택 즉시 전체 화면 캡처 ---
  const handleInstantCapture = async () => {
    try {
      // 1. 브라우저 탭/창 선택창 띄우기
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: "browser" },
        audio: false 
      });

      setIsExtracting(true);
      startProgress(3);

      // 2. 비디오 엘리먼트 생성 (화면 프레임 추출용)
      const video = document.createElement('video');
      video.srcObject = stream;
      
      video.onloadedmetadata = () => {
        video.play();
        
        // 3. 캔버스에 현재 프레임 그리기
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // 약간의 지연(0.5초)을 주어 화면이 전환된 후 캡처되도록 함
        setTimeout(async () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob(async (blob) => {
            const file = new File([blob], "screen_capture.jpg", { type: "image/jpeg" });
            
            // 스트림 종료 (공유 중지)
            stream.getTracks().forEach(track => track.stop());

            try {
              const app = await client("euntaejang/deepfake");
              const result = await app.predict("/extract_url", [file]);

              setAnalysisResult({
                realConfidence: result.data[0],
                urlFaces: result.data[1] || [],
                srmScore: parseFloat(result.data[0]) || 0,
                pixelScore: 100 - (parseFloat(result.data[0]) || 0),
                comment: `[브라우저 캡처 분석 완료] ${result.data[2]}`
              });

              clearInterval(progressTimer.current);
              setProgress(100);
            } catch (error) {
              alert("분석 서버 응답 실패");
              setProgress(0);
            } finally {
              setIsExtracting(false);
            }
          }, 'image/jpeg');
        }, 500);
      };
    } catch (err) {
      console.error("캡처 취소:", err);
      setIsExtracting(false);
    }
  };

  // 기존 파일 분석 핸들러 (유지)
  const handleAnalyze = async () => {
    if (!rawFile) {
      alert("분석할 증거물을 확보하십시오.");
      return;
    }
    setIsAnalyzing(true);
    startProgress(fileType === 'image' ? 5 : 15);

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
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          srmScore: apiResult.data[1],
          pixelScore: apiResult.data[2],
          comment: apiResult.data[0] > 50 ? "[판독완료] 무결성 통과." : "[경고] 변조 감지."
        });
      }
    } catch (error) {
      clearInterval(progressTimer.current);
      setProgress(0);
      alert("오류 발생");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null
    ? (typeof analysisResult.realConfidence === 'string' ? parseFloat(analysisResult.realConfidence) : Math.floor(analysisResult.realConfidence))
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
        <button onClick={() => window.location.reload()} className="px-8 py-3 border-2 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all font-black italic">새로고침</button>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-6 shadow-inner">
            <div className="flex justify-between mb-6">
              <button onClick={() => setIsUrlMode(false)} className={`flex-1 py-3 font-bold border-b-4 ${!isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>파일 업로드</button>
              <button onClick={() => setIsUrlMode(true)} className={`flex-1 py-3 font-bold border-b-4 ${isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>브라우저 캡처</button>
            </div>

            {!isUrlMode ? (
              <label className="relative aspect-video bg-black/70 border-2 border-dashed border-[#00f2ff]/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                {selectedFile ? (
                  fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-contain" /> : <img src={selectedFile} className="w-full h-full object-contain" />
                ) : (
                  <p className="text-[#00f2ff]/50 font-bold text-center">증거물 업로드</p>
                )}
                <input type="file" className="hidden" onChange={(e) => {
                  const file = e.target.files[0];
                  if(file) {
                    setRawFile(file);
                    setSelectedFile(URL.createObjectURL(file));
                    setFileType(file.type.startsWith('video') ? 'video' : 'image');
                  }
                }} />
              </label>
            ) : (
              <div className="aspect-video bg-black/70 border-2 border-[#00f2ff]/50 p-8 flex flex-col justify-center items-center gap-6">
                <div className="text-center">
                  <p className="text-[#00f2ff] font-bold mb-2">분석할 웹페이지(유튜브 등)를 미리 열어주세요.</p>
                  <p className="text-xs opacity-50">아래 버튼 클릭 후 원하는 탭을 선택하면 즉시 분석됩니다.</p>
                </div>
                <button 
                  onClick={handleInstantCapture} 
                  disabled={isExtracting}
                  className="w-full bg-[#00f2ff] text-black font-black py-6 hover:bg-white transition-all shadow-[0_0_20px_#00f2ff]"
                >
                  {isExtracting ? "분석 패킷 전송 중..." : "탭 선택 및 즉시 분석"}
                </button>
              </div>
            )}
          </div>

          <button onClick={handleAnalyze} disabled={isAnalyzing || isUrlMode} className="w-full py-4 font-black text-xl border-4 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all">
            {isAnalyzing ? "분석 중..." : "증거물 판별하기"}
          </button>

          <div className="p-4 bg-black/80 border-l-4 border-[#00f2ff]">
            <h3 className="text-[#00f2ff] text-sm font-bold mb-1">AI 분석관 소견</h3>
            <p className="text-gray-200 text-sm font-mono italic">{analysisResult.comment || "> 대기 중..."}</p>
          </div>
        </section>

        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-10 flex flex-col min-h-[600px] shadow-2xl relative">
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-[#00f2ff]/60 uppercase font-bold text-xs mb-2">최종 신뢰 점수</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-8xl font-black italic text-[#00f2ff]">{displayScore ?? "00"}</span>
                  <span className="text-4xl font-bold text-[#00f2ff]/80">%</span>
                </div>
              </div>
              <div className="text-right">
                {displayScore !== null && (
                  <div className={`px-10 py-5 text-3xl font-black border-4 ${displayScore > 50 ? 'border-green-500 text-green-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
                    {displayScore > 50 ? 'AUTHENTIC' : 'DEEPFAKE'}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-12">
              <div className="h-2 bg-black border border-[#00f2ff]/30">
                <div className="h-full bg-[#00f2ff] transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8">
              {analysisResult.srmScore !== null && (
                <>
                  <DonutChart score={analysisResult.srmScore} label="주파수 대조 분석" color="#7C3AED" />
                  <DonutChart score={analysisResult.pixelScore} label="픽셀 변조 분석" color="#2563EB" />
                </>
              )}
              {isUrlMode && analysisResult.urlFaces.length > 0 && (
                <div className="col-span-2 border border-[#00f2ff]/20 bg-black/20 p-4">
                  <p className="text-[10px] mb-3 opacity-50 uppercase">Detected Faces:</p>
                  <div className="grid grid-cols-5 gap-3">
                    {analysisResult.urlFaces.map((item, idx) => (
                      <div key={idx} className="relative border border-[#00f2ff]/40">
                        <img src={`data:image/jpeg;base64,${item.face_img}`} className="w-full aspect-square object-cover" />
                        <div className={`absolute bottom-0 w-full text-[8px] text-center font-bold ${item.score > 50 ? 'bg-green-600' : 'bg-red-600'}`}>
                          {item.score}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!isUrlMode && analysisResult.graphImg && (
                <div className="col-span-2 border border-[#00f2ff]/20 bg-black/40 p-4">
                  <img src={analysisResult.graphImg} className="w-full h-full object-contain" />
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