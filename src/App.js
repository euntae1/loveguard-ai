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
      setDisplayScore(score || 0);
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

  const [isCaptureMode, setIsCaptureMode] = useState(false); // URL 모드 대신 캡처 모드로 명칭 변경
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
        if (prev >= 95) return prev;
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

  /**
   * [신규] 브라우저 창 캡처 기능 (기존 URL 분석 대체)
   */
  const handleInstantCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: "browser" },
        audio: false 
      });

      setIsExtracting(true);
      startProgress(5);

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
              alert("백엔드 연결 실패");
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

  /**
   * [유지] 기존 사진/동영상 분석 기능
   */
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
          comment: apiResult.data[0] > 50 
            ? "[판독완료] 픽셀 및 주파수 무결성 통과." 
            : "[경고] 생성 노이즈 및 주파수 변조 감지."
        });
      }
    } catch (error) {
      clearInterval(progressTimer.current);
      setProgress(0);
      alert("분석 도중 오류 발생");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null 
    ? Math.floor(analysisResult.realConfidence) 
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
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-6 shadow-inner">
            <div className="flex justify-between mb-6">
              <button onClick={() => { setIsCaptureMode(false); setProgress(0); }} className={`flex-1 py-3 font-bold border-b-4 ${!isCaptureMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>증거 파일 업로드</button>
              <button onClick={() => { setIsCaptureMode(true); setProgress(0); }} className={`flex-1 py-3 font-bold border-b-4 ${isCaptureMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>실시간 화면 캡처</button>
            </div>

            {!isCaptureMode ? (
              <label className="relative aspect-video bg-black/70 border-2 border-dashed border-[#00f2ff]/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                {selectedFile ? (
                  fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-contain" /> : <img src={selectedFile} className="w-full h-full object-contain" />
                ) : (
                  <p className="text-[#00f2ff]/50 font-bold text-center group-hover:text-[#00f2ff]">사진 또는 영상을 업로드하세요.</p>
                )}
                {isAnalyzing && <div className="scan-line"></div>}
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="aspect-video bg-black/70 border-2 border-[#00f2ff]/50 p-8 flex flex-col justify-center items-center gap-6 text-center">
                <p className="text-sm font-bold">분석하려는 브라우저 탭이나 영상 창을 띄운 뒤 아래 버튼을 클릭하세요.</p>
                <button 
                  onClick={handleInstantCapture} 
                  disabled={isExtracting} 
                  className="w-full bg-[#00f2ff] text-black font-black py-6 hover:bg-white transition-all shadow-[0_0_20px_#00f2ff]"
                >
                  {isExtracting ? "데이터 패킷 분석 중..." : "브라우저 창 선택 및 캡처"}
                </button>
              </div>
            )}
          </div>

          <button onClick={handleAnalyze} disabled={isAnalyzing || isCaptureMode} className="w-full py-4 font-black text-xl border-4 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all disabled:opacity-50">
            {isAnalyzing ? "정밀 분석 시스템 가동 중..." : "업로드 파일 판별하기"}
          </button>

          <div className="p-4 bg-black/80 border-l-4 border-[#00f2ff] shadow-lg">
            <h3 className="text-[#00f2ff] text-sm font-bold mb-1 underline tracking-widest uppercase">AI 분석관의 소견</h3>
            <p className="text-gray-200 text-sm font-mono italic leading-relaxed">{analysisResult.comment || "> 디지털 분석 대기 중..."}</p>
          </div>
        </section>

        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-10 flex flex-col min-h-[650px] shadow-2xl relative">
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-[#00f2ff]/60 uppercase font-bold mb-2 tracking-[0.3em] text-xs">최종 신뢰 점수</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-9xl font-black italic text-[#00f2ff] drop-shadow-[0_0_20px_rgba(0,242,255,0.4)]">
                    {displayScore ?? "00"}
                  </span>
                  <span className="text-4xl font-bold text-[#00f2ff]/80">%</span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-[#00f2ff]/60 mb-4 font-bold uppercase tracking-widest">분석 결과 상태</p>
                {displayScore !== null && (
                  <div className={`px-10 py-5 text-3xl font-black border-4 shadow-lg ${
                     displayScore > 50 ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-red-600 text-red-600 bg-red-600/10 animate-pulse'
                    }`}>
                    {displayScore > 50 ? 'AUTHENTIC' : 'DEEPFAKE'}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-12">
              <div className="h-2 bg-black border border-[#00f2ff]/30 relative overflow-hidden">
                <div className="h-full bg-[#00f2ff] shadow-[0_0_15px_#00f2ff] transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <div className="flex-grow">
              <p className="text-xs mb-6 text-[#00f2ff] font-bold border-l-4 border-[#00f2ff] pl-3 uppercase tracking-[0.4em]">DETECTION MONITOR</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 사진 분석 또는 캡처 분석 결과 */}
                {analysisResult.srmScore !== null && (
                  <>
                    <DonutChart score={analysisResult.srmScore} label="주파수(SRM) 대조 분석" color="#7C3AED" />
                    <DonutChart score={analysisResult.pixelScore} label="픽셀(Pixel) 변조 분석" color="#2563EB" />
                    
                    {/* 캡처 분석 시 발견된 얼굴들 표시 */}
                    {isCaptureMode && analysisResult.urlFaces.length > 0 && (
                      <div className="col-span-2 mt-4 flex gap-4 overflow-x-auto pb-4">
                        {analysisResult.urlFaces.map((face, i) => (
                          <div key={i} className="min-w-[100px] border border-[#00f2ff]/30 bg-black">
                            <img src={`data:image/jpeg;base64,${face.face_img}`} className="w-full aspect-square object-cover" />
                            <div className="text-[10px] text-center font-bold bg-[#00f2ff] text-black">{face.score}%</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* 비디오 분석 결과 그래프 */}
                {!isCaptureMode && fileType === 'video' && analysisResult.graphImg && (
                  <div className="col-span-2 border border-[#00f2ff]/20 bg-black/40 p-4">
                    <img src={analysisResult.graphImg} className="w-full h-full object-contain" />
                  </div>
                )}

                {/* 대기 상태 */}
                {(!analysisResult.srmScore && !analysisResult.graphImg) && (
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