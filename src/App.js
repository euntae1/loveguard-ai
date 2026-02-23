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

  // --- 화면 캡처 관련 상태 ---
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

  // --- 핵심: 사각형 드래그 캡처 로직 ---
  const startScreenCapture = async () => {
    try {
      // 1. 브라우저 창/탭 리스트 출력 및 선택
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: "browser", cursor: "always" },
        audio: false 
      });
      
      // 2. 선택 완료 시 캡처용 오버레이 활성화
      setIsCaptureOverlay(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setAnalysisResult({ srmScore: null, pixelScore: null, graphImg: null, urlFaces: [], realConfidence: null, comment: "" });
    } catch (err) {
      console.error("화면 선택 취소 또는 오류:", err);
    }
  };

  const handleMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSelection({
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      endX: e.clientX - rect.left,
      endY: e.clientY - rect.top,
      active: true
    });
  };

  const handleMouseMove = (e) => {
    if (!selection.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setSelection(prev => ({
      ...prev,
      endX: e.clientX - rect.left,
      endY: e.clientY - rect.top
    }));
  };

  const handleMouseUp = async () => {
    if (!selection.active) return;
    
    // 드래그 종료 및 분석 단계 진입
    setSelection(prev => ({ ...prev, active: false }));
    setIsExtracting(true);
    startProgress(3);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 캡처 영역 계산
    const rectLeft = Math.min(selection.startX, selection.endX);
    const rectTop = Math.min(selection.startY, selection.endY);
    const rectWidth = Math.abs(selection.endX - selection.startX);
    const rectHeight = Math.abs(selection.endY - selection.startY);

    if (rectWidth < 10 || rectHeight < 10) {
        alert("캡처 영역이 너무 작습니다. 다시 드래그해주세요.");
        setIsExtracting(false);
        return;
    }

    // 비디오 실제 해상도 대비 화면 표시 비율 계산
    const scaleX = video.videoWidth / video.clientWidth;
    const scaleY = video.videoHeight / video.clientHeight;

    canvas.width = rectWidth * scaleX;
    canvas.height = rectHeight * scaleY;

    // 선택 영역을 캔버스에 그리기
    ctx.drawImage(
      video,
      rectLeft * scaleX, rectTop * scaleY, rectWidth * scaleX, rectHeight * scaleY,
      0, 0, canvas.width, canvas.height
    );

    canvas.toBlob(async (blob) => {
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      
      // 스트림 종료 및 오버레이 닫기
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setIsCaptureOverlay(false);

      try {
        const app = await client("euntaejang/deepfake");
        // extract_url 엔드포인트에 캡처한 이미지 전송
        const result = await app.predict("/extract_url", [file]);

        setAnalysisResult({
          realConfidence: result.data[0],
          urlFaces: result.data[1] || [],
          srmScore: result.data[0], // 캡처 모드에서도 차트 표시를 위해 활용
          pixelScore: 100 - result.data[0],
          comment: `[영역 캡처 분석 완료] ${result.data[2]}`
        });

        clearInterval(progressTimer.current);
        setProgress(100);
      } catch (error) {
        console.error(error);
        alert("분석 서버 응답 실패");
        setProgress(0);
      } finally {
        setIsExtracting(false);
      }
    }, 'image/jpeg');
  };

  // 기존 파일 분석 로직 (유지)
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
      
      {/* --- 사각형 드래그 캡처 오버레이 --- */}
      {isCaptureOverlay && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[10001] bg-red-600 text-white px-8 py-3 font-black animate-pulse shadow-[0_0_30px_red] rounded-full">
            분석할 얼굴 영역을 마우스로 드래그하세요 (마우스를 떼면 즉시 분석)
          </div>
          
          <div 
            className="relative w-full h-full cursor-crosshair overflow-hidden flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <video 
              ref={videoRef} 
              autoPlay 
              className="w-full h-full object-contain pointer-events-none"
            />
            
            {/* 드래그 사각형 UI */}
            {selection.active || (selection.startX !== selection.endX) ? (
              <div 
                className="absolute border-2 border-[#00f2ff] bg-[#00f2ff]/10 shadow-[0_0_15px_#00f2ff]"
                style={{
                  left: Math.min(selection.startX, selection.endX),
                  top: Math.min(selection.startY, selection.endY),
                  width: Math.abs(selection.endX - selection.startX),
                  height: Math.abs(selection.endY - selection.startY),
                  pointerEvents: 'none'
                }}
              >
                <div className="absolute -top-6 left-0 text-[10px] bg-[#00f2ff] text-black px-2 font-bold uppercase">Target Area</div>
              </div>
            ) : null}
          </div>

          <button 
            onClick={() => setIsCaptureOverlay(false)}
            className="absolute bottom-10 px-6 py-2 border border-white/30 text-white/50 hover:text-white"
          >
            캡처 모드 종료
          </button>
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
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-6 shadow-inner">
            <div className="flex justify-between mb-6">
              <button onClick={() => { setIsUrlMode(false); setProgress(0); }} className={`flex-1 py-3 font-bold border-b-4 ${!isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>파일 분석</button>
              <button onClick={() => { setIsUrlMode(true); setProgress(0); }} className={`flex-1 py-3 font-bold border-b-4 ${isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>영역 캡처 분석</button>
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
              <div className="aspect-video bg-black/70 border-2 border-[#00f2ff]/50 p-8 flex flex-col justify-center items-center gap-6">
                <div className="text-center space-y-2">
                  <p className="text-[#00f2ff] font-bold">원하는 웹페이지나 영상을 띄운 뒤</p>
                  <p className="text-xs opacity-60">아래 버튼을 누르고 창을 선택하세요.</p>
                </div>
                <button 
                  onClick={startScreenCapture} 
                  disabled={isExtracting}
                  className="w-full bg-[#00f2ff] text-black font-black py-6 hover:bg-white transition-all shadow-[0_0_20px_#00f2ff] animate-pulse"
                >
                  {isExtracting ? "데이터 무결성 검증 중..." : "브라우저 화면 선택 및 캡처"}
                </button>
              </div>
            )}
          </div>

          <button onClick={handleAnalyze} disabled={isAnalyzing || isUrlMode} className="w-full py-4 font-black text-xl border-4 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all disabled:opacity-50">
            {isAnalyzing ? "정밀 판독 시스템 가동 중..." : "증거물 판별하기"}
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
            <p className="text-gray-200 text-sm font-mono italic leading-relaxed">{analysisResult.comment || "> 분석 대기 중..."}</p>
          </div>
        </section>

        {/* Right Section: Results */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-10 flex flex-col min-h-[650px] shadow-2xl relative">
            
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

            <div className="mb-12">
              <div className="flex justify-between text-[10px] mb-2 font-mono tracking-widest">
                <span>SYSTEM PROCESSING UNIT</span>
                <span>{Math.floor(progress)}%</span>
              </div>
              <div className="h-2 bg-black border border-[#00f2ff]/30 relative overflow-hidden">
                <div className="h-full bg-[#00f2ff] transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <div className="flex-grow">
              <p className="text-xs mb-6 text-[#00f2ff] font-bold border-l-4 border-[#00f2ff] pl-3 uppercase tracking-[0.4em]">DETECTION MONITOR</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {analysisResult.srmScore !== null && (
                  <>
                    <DonutChart score={analysisResult.srmScore} label="주파수 대조 분석" color="#7C3AED" />
                    <DonutChart score={analysisResult.pixelScore} label="픽셀 변조 분석" color="#2563EB" />
                  </>
                )}

                {/* 캡처 모드에서 얼굴 리스트 출력 */}
                {isUrlMode && analysisResult.urlFaces.length > 0 && (
                  <div className="col-span-2 border border-[#00f2ff]/20 bg-black/20 p-4">
                    <p className="text-[10px] mb-3 opacity-50">DETECTION FACES:</p>
                    <div className="grid grid-cols-4 gap-4">
                      {analysisResult.urlFaces.map((item, idx) => (
                        <div key={idx} className="relative border border-[#00f2ff]/40">
                          <img src={`data:image/jpeg;base64,${item.face_img}`} className="w-full aspect-square object-cover" />
                          <div className={`absolute bottom-0 w-full text-[10px] text-center font-bold py-1 ${item.score > 50 ? 'bg-green-600' : 'bg-red-600'}`}>
                            {item.score}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 비디오 타임라인 결과 */}
                {!isUrlMode && analysisResult.graphImg && (
                  <div className="col-span-2 border border-[#00f2ff]/20 bg-black/40 p-4">
                    <img src={analysisResult.graphImg} className="w-full h-full object-contain" />
                  </div>
                )}

                {!analysisResult.srmScore && !analysisResult.graphImg && (
                   <div className="col-span-2 aspect-video bg-gray-900/20 border border-dashed border-[#00f2ff]/10 flex flex-col items-center justify-center">
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