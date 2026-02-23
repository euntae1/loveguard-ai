/* eslint-disable jsx-a11y/alt-text */
import React, { useState, useRef, useEffect } from 'react';
import { client } from "@gradio/client";
import './index.css';

/**
 * [컴포넌트] DonutChart (기존 유지)
 */
const DonutChart = ({ score, label, color }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 50; 
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    setDisplayScore(score);
  }, [score]);

  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 bg-black/40 border border-[#00f2ff]/10">
      <span className="text-[11px] mb-4 opacity-70 uppercase tracking-widest">{label}</span>
      <div className="relative flex items-center justify-center">
        <svg className="w-48 h-48 transform -rotate-90">
          <circle cx="96" cy="96" r={radius} stroke="#1a1f26" strokeWidth="12" fill="transparent" />
          <circle 
            cx="96" cy="96" r={radius} 
            stroke={color} strokeWidth="12" fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset, 
              transition: 'stroke-dashoffset 0.5s ease-out',
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

/**
 * [컴포넌트] VideoTimelineGraph (백엔드 통합 지표 추가)
 */
const VideoTimelineGraph = ({ data }) => {
  if (!data || data.length === 0) return null;
  const width = 600;
  const height = 200;
  const padding = 40;

  // x축은 시간 또는 인덱스 기반
  const maxTime = data[data.length - 1].time || data.length;
  const getX = (time) => (time / maxTime) * (width - padding * 2) + padding;
  const getY = (score) => height - (score / 100) * (height - padding * 2) - padding;

  const pointsPixel = data.map((d, i) => `${getX(d.time || i)},${getY(d.pixel)}`).join(' ');
  const pointsSrm = data.map((d, i) => `${getX(d.time || i)},${getY(d.srm)}`).join(' ');
  const pointsFinal = data.map((d, i) => `${getX(d.time || i)},${getY(d.final)}`).join(' ');

  return (
    <div className="col-span-2 border border-[#00f2ff]/20 bg-black/60 p-4">
      <p className="text-[10px] text-[#00f2ff] mb-2 font-bold uppercase tracking-widest">Real-time Forensic Timeline</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid Lines */}
        <line x1={padding} y1={getY(50)} x2={width-padding} y2={getY(50)} stroke="white" opacity="0.1" strokeDasharray="4" />
        
        <polyline fill="none" stroke="#2563EB" strokeWidth="2" points={pointsPixel} opacity="0.6" />
        <polyline fill="none" stroke="#7C3AED" strokeWidth="2" points={pointsSrm} opacity="0.6" />
        <polyline fill="none" stroke="#FF0000" strokeWidth="4" points={pointsFinal} strokeLinejoin="round" />
        
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#00f2ff" strokeWidth="1" opacity="0.3" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#00f2ff" strokeWidth="1" opacity="0.3" />
      </svg>
      <div className="flex gap-4 mt-2 justify-center">
        <div className="flex items-center gap-2"><div className="w-3 h-1 bg-[#2563EB]"></div><span className="text-[10px]">Pixel</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-1 bg-[#7C3AED]"></div><span className="text-[10px]">SRM</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-1 bg-[#FF0000]"></div><span className="text-[10px] font-bold">Combined</span></div>
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

  const [isUrlMode, setIsUrlMode] = useState(false);
  const [inputUrl, setInputUrl] = useState("");

  const [analysisResult, setAnalysisResult] = useState({
    srmScore: null,
    pixelScore: null,
    faceCrop: null,
    timelineData: [], // 실시간 데이터를 쌓기 위해 빈 배열로 초기화
    realConfidence: null,
    comment: ""
  });

  const newsData = [
    { id: 1, src: "/image/news_1.png", label: "EVIDENCE_01" },
    { id: 2, src: "/image/news_2.jpeg", label: "EVIDENCE_02" },
    { id: 3, src: "/image/news_3.jpg", label: "EVIDENCE_03" }
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setSelectedFile(URL.createObjectURL(file));
      setFileType(file.type.startsWith('video') ? 'video' : 'image');
      resetResult();
    }
  };

  const resetResult = () => {
    setAnalysisResult({ srmScore: null, pixelScore: null, faceCrop: null, timelineData: [], realConfidence: null, comment: "" });
    setProgress(0);
  };

  /**
   * 백엔드 실시간 분석 핸들러 (Shorts 및 일반 비디오 통합)
   */
  const handleAnalyze = async () => {
    if (isUrlMode && !inputUrl) { alert("유튜브 쇼츠 주소를 입력하세요."); return; }
    if (!isUrlMode && !rawFile) { alert("파일을 업로드하세요."); return; }

    setIsAnalyzing(true);
    resetResult();

    try {
      const app = await client("euntaejang/deepfake");
      
      // 1. 엔드포인트 결정
      let endpoint = "/predict"; // 기본 이미지
      let payload = [rawFile];

      if (isUrlMode) {
        endpoint = "/analyze_shorts_realtime";
        payload = [inputUrl];
      } else if (fileType === 'video') {
        endpoint = "/predict_video"; // 기존 비디오 분석이 yield 방식이라면 아래 stream 사용 가능
      }

      // 2. 실시간 스트리밍(yield) 처리 (비디오/쇼츠 전용)
      if (isUrlMode || fileType === 'video') {
        const job = app.submit(endpoint, payload);
        
        for await (const msg of job) {
          if (msg.type === "data") {
            const [plot_obj, current_score, status] = msg.data;
            
            // 타임라인 데이터 누적 (백엔드에서 JSON 대신 그래프 객체를 주지만, 
            // 프론트엔드 차트를 위해 임의의 데이터 구조로 변환하거나 점수 업데이트)
            setAnalysisResult(prev => ({
              ...prev,
              realConfidence: current_score,
              comment: status,
              // 실시간 그래프 구현을 위해 점수들을 누적
              timelineData: [...prev.timelineData, { 
                time: prev.timelineData.length, 
                final: current_score,
                pixel: current_score - 2, // 예시를 위한 편차 (실제 백엔드 JSON 연동 시 수정)
                srm: current_score + 2
              }]
            }));
            setProgress((prev) => Math.min(prev + 1.5, 100)); // 분석 진행에 따른 프로그레스
          }
        }
        setProgress(100);
      } 
      // 3. 단일 이미지 처리
      else {
        const result = await app.predict("/predict", [rawFile]);
        setAnalysisResult({
          realConfidence: result.data[0],
          srmScore: result.data[1],
          pixelScore: result.data[2],
          faceCrop: result.data[3],
          comment: result.data[0] > 50 ? "[판독완료] 무결성 통과." : "[경고] 변조 가능성 높음."
        });
        setProgress(100);
      }
    } catch (error) {
      alert("분석 오류: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null 
    ? Math.floor(analysisResult.realConfidence) 
    : "00";

  return (
    <div className="min-h-screen forensic-grid p-6 md:p-12 text-[#00f2ff] bg-[#0a0e14]">
      {/* Header (기존과 동일) */}
      <header className="max-w-[1600px] mx-auto mb-10 flex justify-between items-center border-b-4 border-[#00f2ff] pb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-[#00f2ff] flex items-center justify-center rounded-sm shadow-[0_0_15px_#00f2ff]">
            <span className="text-black text-xl font-black">dbdb</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">디비디비딥페이크 2.0</h1>
        </div>
        <button onClick={() => window.location.reload()} className="px-8 py-3 border-2 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all font-black italic">리셋</button>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-6 shadow-inner">
            <div className="flex justify-between mb-6">
              <button onClick={() => { setIsUrlMode(false); resetResult(); }} className={`flex-1 py-3 font-bold border-b-4 ${!isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>파일 업로드</button>
              <button onClick={() => { setIsUrlMode(true); resetResult(); }} className={`flex-1 py-3 font-bold border-b-4 ${isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>유튜브 쇼츠 URL</button>
            </div>

            {!isUrlMode ? (
              <label className="relative aspect-video bg-black/70 border-2 border-dashed border-[#00f2ff]/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                {selectedFile ? (
                  fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-contain" /> : <img src={selectedFile} className="w-full h-full object-contain" />
                ) : (
                  <p className="text-[#00f2ff]/50 font-bold text-center group-hover:text-[#00f2ff] transition-colors">로컬 파일 선택 (MP4, JPG, PNG)</p>
                )}
                {isAnalyzing && <div className="scan-line"></div>}
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="aspect-video bg-black/70 border-2 border-[#00f2ff]/50 p-8 flex flex-col justify-center gap-5">
                <input type="text" placeholder="https://youtube.com/shorts/..." className="bg-black border-2 border-[#00f2ff]/50 p-4 outline-none text-[#00f2ff] font-mono" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} />
                <p className="text-[10px] opacity-50">* 입력 시 동영상을 다운로드하여 1초 단위로 분석합니다.</p>
              </div>
            )}
          </div>

          <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full py-4 font-black text-xl border-4 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all disabled:opacity-50">
            {isAnalyzing ? "실시간 포렌식 분석 중..." : "분석 시작"}
          </button>

          {analysisResult.faceCrop && (
            <div className="flex items-center gap-4 p-3 bg-[#00f2ff]/5 border border-[#00f2ff]/30">
              <img src={`data:image/jpeg;base64,${analysisResult.faceCrop}`} className="w-20 h-20 object-cover border border-[#00f2ff]" />
              <div>
                <p className="text-[10px] font-bold text-[#00f2ff]/60 uppercase">Extracted Face</p>
                <p className="text-xs font-mono">안면 특징점 추출 완료</p>
              </div>
            </div>
          )}

          <div className="p-4 bg-black/80 border-l-4 border-[#00f2ff]">
            <h3 className="text-[#00f2ff] text-sm font-bold mb-1 uppercase tracking-widest">분석 로그</h3>
            <p className="text-gray-200 text-sm font-mono italic">{analysisResult.comment || "> 대기 중..."}</p>
          </div>
        </section>

        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-10 flex flex-col min-h-[650px] shadow-2xl relative">
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-[#00f2ff]/60 uppercase font-bold mb-2 tracking-[0.3em] text-xs">Integrity Score</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-9xl font-black italic text-[#00f2ff]">{displayScore}</span>
                  <span className="text-4xl font-bold text-[#00f2ff]/80">%</span>
                </div>
              </div>
              <div className="text-right">
                {analysisResult.realConfidence !== null && (
                  <div className={`px-10 py-5 text-3xl font-black border-4 ${analysisResult.realConfidence > 50 ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-red-600 text-red-600 bg-red-600/10 animate-pulse'}`}>
                    {analysisResult.realConfidence > 50 ? 'REAL' : 'FAKE'}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-12">
              <div className="h-2 bg-black border border-[#00f2ff]/30">
                <div className="h-full bg-[#00f2ff] shadow-[0_0_15px_#00f2ff] transition-all" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <div className="flex-grow">
              <p className="text-xs mb-6 text-[#00f2ff] font-bold border-l-4 border-[#00f2ff] pl-3 uppercase">Forensic Monitor</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                {fileType === 'image' && !isUrlMode && analysisResult.srmScore !== null ? (
                  <>
                    <DonutChart score={analysisResult.srmScore} label="SRM 분석" color="#7C3AED" />
                    <DonutChart score={analysisResult.pixelScore} label="픽셀 분석" color="#2563EB" />
                  </>
                ) : (
                  analysisResult.timelineData.length > 0 && (
                    <VideoTimelineGraph data={analysisResult.timelineData} />
                  )
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