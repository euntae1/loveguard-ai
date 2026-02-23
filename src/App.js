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
          <circle 
            cx="96" cy="96" r={radius} 
            stroke="#1a1f26" strokeWidth="12" fill="transparent" 
          />
          <circle 
            cx="96" cy="96" r={radius} 
            stroke={color} strokeWidth="12" fill="transparent"
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

  // 화면 캡처 관련 State
  const [isCaptureOverlay, setIsCaptureOverlay] = useState(false);
  const videoRef = useRef(null);
  const [selection, setSelection] = useState({ startX: 0, startY: 0, endX: 0, endY: 0, active: false });

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setSelectedFile(URL.createObjectURL(file));
      const isVideo = file.type.startsWith('video');
      setFileType(isVideo ? 'video' : 'image');
      setAnalysisResult({ srmScore: null, pixelScore: null, graphImg: null, urlFaces: [], realConfidence: null, comment: "" });
      setProgress(0);
      clearInterval(progressTimer.current);
    }
  };

  // --- [새로운 핵심 기능: 화면 캡처 로직] ---
  const startScreenCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } });
      videoRef.current.srcObject = stream;
      setIsCaptureOverlay(true);
      setAnalysisResult({ srmScore: null, pixelScore: null, graphImg: null, urlFaces: [], realConfidence: null, comment: "" });
    } catch (err) {
      console.error(err);
      alert("화면 공유 권한이 거부되었습니다.");
    }
  };

  const handleMouseDown = (e) => {
    const rect = e.target.getBoundingClientRect();
    setSelection({ ...selection, startX: e.clientX - rect.left, startY: e.clientY - rect.top, active: true });
  };

  const handleMouseMove = (e) => {
    if (!selection.active) return;
    const rect = e.target.getBoundingClientRect();
    setSelection({ ...selection, endX: e.clientX - rect.left, endY: e.clientY - rect.top });
  };

  const handleMouseUp = async () => {
    if (!selection.active) return;
    setSelection({ ...selection, active: false });
    
    setIsExtracting(true);
    startProgress(3);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = Math.abs(selection.endX - selection.startX);
    const height = Math.abs(selection.endY - selection.startY);
    const left = Math.min(selection.startX, selection.endX);
    const top = Math.min(selection.startY, selection.endY);

    canvas.width = width;
    canvas.height = height;

    // 비디오 해상도와 표시 크기 비율 계산
    const scaleX = video.videoWidth / video.offsetWidth;
    const scaleY = video.videoHeight / video.offsetHeight;

    ctx.drawImage(video, left * scaleX, top * scaleY, width * scaleX, height * scaleY, 0, 0, width, height);
    
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      
      // 스트림 중지
      video.srcObject.getTracks().forEach(track => track.stop());
      setIsCaptureOverlay(false);

      try {
        const app = await client("euntaejang/deepfake");
        // 서버의 extract_url 엔드포인트(process_capture 함수) 호출
        const result = await app.predict("/extract_url", [file]);

        setAnalysisResult(prev => ({
          ...prev,
          realConfidence: result.data[0], 
          urlFaces: result.data[1] || [],
          comment: `[캡처 분석 완료] ${result.data[2]}`
        }));
        
        clearInterval(progressTimer.current);
        setProgress(100);
      } catch (error) {
        alert("분석 실패: 서버 연결을 확인하세요.");
        setProgress(0);
      } finally {
        setIsExtracting(false);
      }
    }, 'image/jpeg');
  };

  // 기존 파일 분석 핸들러 (유지)
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
    ? (typeof analysisResult.realConfidence === 'string' 
        ? parseFloat(analysisResult.realConfidence) 
        : Math.floor(analysisResult.realConfidence))
    : null;

  return (
    <div className="min-h-screen forensic-grid p-6 md:p-12 text-[#00f2ff] bg-[#0a0e14]">
      
      {/* 캡처 모드 오버레이 */}
      {isCaptureOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="mb-4 text-white font-black bg-red-600 px-6 py-2 animate-pulse rounded-full shadow-[0_0_20px_red]">
            [CAPTURE MODE] 분석할 영역을 드래그하세요
          </div>
          <div className="relative border-2 border-[#00f2ff] overflow-hidden cursor-crosshair max-w-full"
               onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            <video ref={videoRef} autoPlay className="max-w-[90vw] max-h-[80vh] block" />
            {selection.active && (
              <div className="absolute border-2 border-red-500 bg-red-500/20 shadow-[0_0_10px_red]"
                   style={{
                     left: Math.min(selection.startX, selection.endX),
                     top: Math.min(selection.startY, selection.endY),
                     width: Math.abs(selection.endX - selection.startX),
                     height: Math.abs(selection.endY - selection.startY)
                   }} />
            )}
          </div>
          <button onClick={() => {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            setIsCaptureOverlay(false);
          }} className="mt-6 text-white/50 hover:text-white underline font-mono">분석 취소 (ESC)</button>
        </div>
      )}

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
        {/* Left Section */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-6 shadow-inner">
            <div className="flex justify-between mb-6">
              <button onClick={() => { setIsUrlMode(false); setProgress(0); }} className={`flex-1 py-3 font-bold border-b-4 ${!isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>사진/동영상 업로드</button>
              <button onClick={() => { setIsUrlMode(true); setProgress(0); }} className={`flex-1 py-3 font-bold border-b-4 ${isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>화면 캡처 분석</button>
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
              <div className="aspect-video bg-black/70 border-2 border-[#00f2ff]/50 p-8 flex flex-col justify-center items-center gap-5">
                <div className="text-center mb-2">
                   <p className="text-sm opacity-70 mb-1">유튜브 쇼츠, 인스타그램 등 분석 대상을 띄우고</p>
                   <p className="font-bold text-[#00f2ff]">아래 버튼을 클릭하여 영역을 드래그하세요.</p>
                </div>
                <button onClick={startScreenCapture} disabled={isExtracting} className="w-full bg-[#00f2ff] text-black font-black py-5 hover:bg-white transition-all disabled:bg-gray-600 shadow-[0_0_20px_rgba(0,242,255,0.6)] animate-pulse">
                  {isExtracting ? "영역 데이터 처리 중..." : "실시간 화면 캡처 분석 시작"}
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

        {/* Right Section */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-10 flex flex-col min-h-[650px] shadow-2xl relative overflow-hidden">
            
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-[#00f2ff]/60 uppercase font-bold mb-2 tracking-[0.3em] text-xs">최종 신뢰 점수</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-8xl font-black italic text-[#00f2ff] drop-shadow-[0_0_20px_rgba(0,242,255,0.4)]">
                    {displayScore !== null ? Math.floor(displayScore) : "00"}
                  </span>
                  <span className="text-4xl font-bold text-[#00f2ff]/80">%</span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-[#00f2ff]/60 mb-4 font-bold uppercase tracking-widest">분석 결과 상태</p>
                {displayScore !== null && (
                  <div className={`px-10 py-5 text-3xl font-black border-4 shadow-lg transition-all ${
                     displayScore > 50
                    ? 'border-green-500 text-green-500 bg-green-500/10'
                    : 'border-red-600 text-red-600 bg-red-600/10 animate-pulse'
                    }`}>
                    {displayScore > 50 ? 'AUTHENTIC' : 'DEEPFAKE'}
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
                {/* 1. 이미지/캡처 모드 결과 */}
                {(!isUrlMode || analysisResult.urlFaces.length > 0) && analysisResult.srmScore !== null && (
                  <>
                    <DonutChart score={analysisResult.srmScore} label="주파수(SRM) 대조 분석" color="#7C3AED" />
                    <DonutChart score={analysisResult.pixelScore} label="픽셀(Pixel) 변조 분석" color="#2563EB" />
                  </>
                )}

                {/* 2. 비디오 모드 결과 */}
                {!isUrlMode && fileType === 'video' && analysisResult.graphImg && (
                  <div className="col-span-2 border border-[#00f2ff]/20 bg-black/40 p-4">
                    <img src={analysisResult.graphImg} className="w-full h-full object-contain" />
                  </div>
                )}

                {/* 3. 캡처 모드에서 검출된 얼굴 리스트 표시 */}
                {isUrlMode && analysisResult.urlFaces.length > 0 && (
                  <div className="col-span-2 border border-[#00f2ff]/20 bg-black/20 p-4">
                    <p className="text-[10px] mb-3 opacity-50 uppercase tracking-tighter">추출된 안면 데이터 분석:</p>
                    <div className="grid grid-cols-4 gap-4">
                      {analysisResult.urlFaces.map((item, idx) => (
                        <div key={idx} className="relative border border-[#00f2ff]/40 bg-black">
                          <img 
                            src={`data:image/jpeg;base64,${item.face_img}`} 
                            className="w-full aspect-square object-cover" 
                          />
                          <div className={`absolute bottom-0 w-full text-[10px] text-center font-bold py-1 ${item.score > 50 ? 'bg-green-600' : 'bg-red-600'}`}>
                            {item.score}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 대기 화면 */}
                {(!analysisResult.srmScore && !analysisResult.graphImg && analysisResult.urlFaces.length === 0) && (
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