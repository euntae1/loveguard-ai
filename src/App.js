/* eslint-disable jsx-a11y/alt-text */
import React, { useState, useRef, useEffect } from 'react';
import { client } from "@gradio/client";
import './index.css';

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
  const [isCaptureMode, setIsCaptureMode] = useState(false);
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
      setProgress((prev) => (prev >= 95 ? prev : prev + step));
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

  const handleInstantCapture = async () => {
    try {
      // 브라우저 탭 선택 시 해당 탭으로 이동하지 않도록 제어 시도 (일부 브라우저 지원)
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: "browser", selfBrowserSurface: "include" },
        audio: false 
      });

      // 창 선택 직후 바로 우리 웹사이트(분석 도구)로 포커스를 다시 가져오기 위한 꼼수
      window.focus(); 

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
                urlFaces: result.data[1] || [], // 백엔드에서 온 얼굴 리스트
                srmScore: score,
                pixelScore: 100 - score,
                comment: `[판독 완료] ${result.data[2]}`
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
        }, 300); // 캡처 속도 향상
      };
    } catch (err) {
      setIsExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!rawFile) return alert("분석할 파일을 확보하십시오.");
    setIsAnalyzing(true);
    startProgress(fileType === 'image' ? 5 : 15);

    try {
      const app = await client("euntaejang/deepfake");
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      const apiResult = await app.predict(endpoint, [rawFile]);
      clearInterval(progressTimer.current);
      setProgress(100);

      if (fileType === 'video') {
        setAnalysisResult({ realConfidence: apiResult.data[0], graphImg: apiResult.data[1]?.url, comment: "[영상 분석 완료]" });
      } else {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          srmScore: apiResult.data[1],
          pixelScore: apiResult.data[2],
          comment: apiResult.data[0] > 50 ? "[무결성 통과]" : "[변조 감지]"
        });
      }
    } catch (error) {
      clearInterval(progressTimer.current);
      setProgress(0);
      alert("분석 오류");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null ? Math.floor(analysisResult.realConfidence) : null;

  return (
    <div className="min-h-screen p-6 md:p-12 text-[#00f2ff] bg-[#0a0e14] font-mono">
      <header className="max-w-[1600px] mx-auto mb-10 flex justify-between items-center border-b-2 border-[#00f2ff] pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#00f2ff] flex items-center justify-center rounded-sm shadow-[0_0_10px_#00f2ff]"><span className="text-black text-xl font-black">DB</span></div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Deepfake Forensic Unit</h1>
        </div>
        <button onClick={() => window.location.reload()} className="px-6 py-2 border-2 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all">REFRESH</button>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Side */}
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-[#121b28] border border-[#00f2ff]/30 p-6">
            <div className="flex justify-between mb-6">
              <button onClick={() => setIsCaptureMode(false)} className={`flex-1 py-2 font-bold ${!isCaptureMode ? 'bg-[#00f2ff] text-black' : 'text-gray-500'}`}>파일 업로드</button>
              <button onClick={() => setIsCaptureMode(true)} className={`flex-1 py-2 font-bold ${isCaptureMode ? 'bg-[#00f2ff] text-black' : 'text-gray-500'}`}>브라우저 캡처</button>
            </div>
            {!isCaptureMode ? (
              <label className="relative aspect-video bg-black/50 border-2 border-dashed border-[#00f2ff]/30 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                {selectedFile ? (fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-contain" /> : <img src={selectedFile} className="w-full h-full object-contain" />) : <p className="opacity-50">Upload Evidence</p>}
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="aspect-video bg-black/50 border border-[#00f2ff]/30 flex flex-col justify-center items-center p-4">
                <button onClick={handleInstantCapture} disabled={isExtracting} className="w-full bg-[#00f2ff] text-black font-black py-6 shadow-[0_0_15px_#00f2ff]">
                  {isExtracting ? "CAPTURING..." : "화면 선택 및 즉시 분석"}
                </button>
              </div>
            )}
          </div>
          <button onClick={handleAnalyze} disabled={isAnalyzing || isCaptureMode} className="w-full py-4 font-black border-2 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all disabled:opacity-30">START SCAN</button>
          
          <div className="grid grid-cols-3 gap-2">
            {newsData.map(news => (
              <div key={news.id} className="border border-[#00f2ff]/20"><img src={news.src} className="w-full h-16 object-cover grayscale" alt={news.label} /></div>
            ))}
          </div>

          <div className="p-4 bg-black/60 border-l-4 border-[#00f2ff]">
            <p className="text-[10px] text-[#00f2ff] mb-1 opacity-60 font-bold uppercase">System Log</p>
            <p className="text-xs italic leading-relaxed">{analysisResult.comment || "> STANDBY..."}</p>
          </div>
        </section>

        {/* Right Side: Results */}
        <section className="lg:col-span-8">
          <div className="bg-[#121b28] border border-[#00f2ff]/30 p-10 min-h-[600px] flex flex-col relative">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] opacity-50 uppercase tracking-[0.3em]">Integrity Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-8xl font-black text-[#00f2ff] italic">{displayScore ?? "00"}</span>
                  <span className="text-2xl font-bold opacity-60">%</span>
                </div>
              </div>
              {displayScore !== null && (
                <div className={`px-8 py-4 text-2xl font-black border-2 ${displayScore > 50 ? 'border-green-500 text-green-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
                  {displayScore > 50 ? 'AUTHENTIC' : 'DEEPFAKE'}
                </div>
              )}
            </div>

            <div className="mb-10 h-1 bg-black border border-[#00f2ff]/10">
              <div className="h-full bg-[#00f2ff] transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
              {analysisResult.srmScore !== null ? (
                <>
                  <DonutChart score={analysisResult.srmScore} label="Frequency Analysis" color="#8b5cf6" />
                  <DonutChart score={analysisResult.pixelScore} label="Pixel Integrity" color="#3b82f6" />
                  
                  {/* [수정 1] 검출된 얼굴들이 겹치지 않게 flex-wrap 및 고정 크기 적용 */}
                  {isCaptureMode && analysisResult.urlFaces.length > 0 && (
                    <div className="col-span-2 mt-6">
                      <p className="text-[10px] text-[#00f2ff] mb-4 opacity-70 tracking-widest uppercase border-b border-[#00f2ff]/20 pb-2">Detected Face Archive</p>
                      <div className="flex flex-wrap gap-4">
                        {analysisResult.urlFaces.map((face, i) => (
                          <div key={i} className="w-[140px] border border-[#00f2ff]/30 bg-black overflow-hidden shadow-lg shadow-black/50">
                            <img src={`data:image/jpeg;base64,${face.face_img}`} className="w-full h-[140px] object-cover" />
                            <div className="text-[10px] py-2 text-center bg-[#00f2ff] text-black font-black uppercase tracking-tighter">
                              Score: {face.score}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                !isCaptureMode && fileType === 'video' && analysisResult.graphImg ? (
                  <div className="col-span-2 border border-[#00f2ff]/20 p-2 bg-black/40"><img src={analysisResult.graphImg} className="w-full h-auto" /></div>
                ) : (
                  <div className="col-span-2 border border-dashed border-[#00f2ff]/10 flex items-center justify-center opacity-20">
                    <span className="text-[10px] uppercase tracking-[1em] animate-pulse">Waiting for Data...</span>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;