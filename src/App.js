import React, { useState } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const [analysisResult, setAnalysisResult] = useState({
    graphImg: null,
    freqImg: null,
    detectImg: null,
    realConfidence: null,
    comment: ""
  });

  // 기존 뉴스 데이터 (유지)
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

  // ------------------------------------------------
  // 요청사항: URL 이미지 추출 및 서버 추론 연동
  // ------------------------------------------------
  const handleUrlAnalyze = async () => {
    if (!inputUrl) {
      alert("타겟 URL을 입력하십시오.");
      return;
    }
    setIsExtracting(true);
    setProgress(10);
    setAnalysisResult({ graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: "" });

    try {
      const app = await client("euntaejang/deepfake");
      // app.py의 /extract_url 엔드포인트 호출 (추론 결과 포함)
      const result = await app.predict("/extract_url", [inputUrl]);
      
      if (result.data) {
        setProgress(100);
        setAnalysisResult({
          realConfidence: result.data[0],
          freqImg: result.data[1]?.url, // 서버에서 생성한 '라벨링된 그리드 이미지'
          comment: `[원격분석완료] ${result.data[2]} / 평균 신뢰도: ${result.data[0]}%`
        });
      }
    } catch (error) {
      console.error(error);
      alert("URL 분석 실패");
      setProgress(0);
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
    setProgress(0);

    const estimatedTime = fileType === 'video' ? Math.max(videoDuration * 2, 8) : 5; 
    const intervalTime = 100;
    const totalSteps = (estimatedTime * 1000) / intervalTime;
    const stepIncrement = 100 / totalSteps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(timer);
          return 95;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    try {
      const app = await client("euntaejang/deepfake");
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      const apiResult = await app.predict(endpoint, [rawFile]);

      clearInterval(timer);
      setProgress(100);

      if (fileType === 'video') {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          graphImg: apiResult.data[1]?.url,
          comment: apiResult.data[0] > 50 
            ? "[판독완료] 데이터 무결성 검증됨." 
            : "[위험] 조작 징후 포착."
        });
      } else {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          freqImg: apiResult.data[1]?.url,
          detectImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50 
            ? "[판독완료] 픽셀 무결성 통과." 
            : "[경고] 생성 노이즈 패턴 감지."
        });
      }
    } catch (error) {
      clearInterval(timer);
      setProgress(0);
      alert("분석 오류");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null ? Math.floor(analysisResult.realConfidence) : null;

  return (
    <div className="min-h-screen forensic-grid p-6 md:p-12 text-[#00f2ff] bg-[#0a0e14]">
      {/* HEADER */}
      <header className="max-w-[1600px] mx-auto mb-10 flex justify-between items-center border-b-4 border-[#00f2ff] pb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-[#00f2ff] flex items-center justify-center rounded-sm shadow-[0_0_15px_#00f2ff]">
            <span className="text-black text-xl font-black">NPA</span>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">Digital Forensic Terminal</h1>
          </div>
        </div>
        <button onClick={() => window.location.reload()} className="px-8 py-3 border-2 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all font-black italic">
          REBOOT
        </button>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT: EVIDENCE */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-6 shadow-inner">
            <div className="flex justify-between mb-6">
              <button onClick={() => setIsUrlMode(false)} className={`flex-1 py-3 font-bold border-b-4 ${!isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>LOCAL</button>
              <button onClick={() => setIsUrlMode(true)} className={`flex-1 py-3 font-bold border-b-4 ${isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10' : 'border-transparent text-gray-500'}`}>URL</button>
            </div>

            {!isUrlMode ? (
              <label className="relative aspect-video bg-black/70 border-2 border-dashed border-[#00f2ff]/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                {selectedFile ? (
                  fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-contain" /> : <img src={selectedFile} className="w-full h-full object-contain" alt="Evidence" />
                ) : (
                  <p className="text-[#00f2ff]/50 font-bold">CLICK TO UPLOAD EVIDENCE</p>
                )}
                {isAnalyzing && <div className="scan-line"></div>}
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="aspect-video bg-black/70 border-2 border-[#00f2ff]/50 p-8 flex flex-col justify-center gap-5">
                <input 
                  type="text" 
                  placeholder="INPUT TARGET URL..."
                  className="bg-black border-2 border-[#00f2ff]/50 p-4 outline-none text-white"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
                <button onClick={handleUrlAnalyze} disabled={isExtracting} className="bg-[#00f2ff] text-black font-black py-4 hover:bg-white transition-all disabled:bg-gray-600">
                  {isExtracting ? "ANALYZING REMOTE ASSETS..." : "RUN REMOTE SCAN"}
                </button>
              </div>
            )}
          </div>

          <button onClick={handleAnalyze} disabled={isAnalyzing || isUrlMode} className="w-full py-6 font-black text-2xl border-4 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all">
            {isAnalyzing ? "SCANNING..." : "EXECUTE SCAN"}
          </button>

          {/* 기존 뉴스 데이터 영역 (그대로 유지) */}
          <div className="grid grid-cols-3 gap-4">
            {newsData.map((news) => (
              <div key={news.id} className="border border-[#00f2ff]/30 bg-black/40 p-2">
                <img src={news.src} alt={news.label} className="w-full h-24 object-cover mb-2 grayscale hover:grayscale-0 cursor-pointer" />
                <p className="text-[10px] text-center font-mono opacity-60">{news.label}</p>
              </div>
            ))}
          </div>

          <div className="p-6 bg-black/80 border-l-8 border-[#00f2ff]">
            <h3 className="text-[#00f2ff] text-xl font-bold mb-2 underline">INVESTIGATOR LOG</h3>
            <p className="text-gray-200 font-mono italic">{analysisResult.comment || "> SYSTEM IDLE..."}</p>
          </div>
        </section>

        {/* RIGHT: REPORT */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-10 flex flex-col h-full shadow-2xl relative">
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-[#00f2ff]/60 uppercase font-bold mb-2">Confidence</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-9xl font-black italic text-[#00f2ff]">{displayScore ?? "00"}</span>
                  <span className="text-4xl font-bold">%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#00f2ff]/60 mb-4 font-bold uppercase">Verdict</p>
                {displayScore !== null && (
                  <div className={`px-8 py-4 text-2xl font-black border-4 ${displayScore > 50 ? 'border-green-500 text-green-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
                    {displayScore > 50 ? 'VERIFIED' : 'FORGERY'}
                  </div>
                )}
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="mb-12">
              <div className="h-4 bg-black border-2 border-[#00f2ff]/30 p-[2px]">
                <div className="h-full bg-[#00f2ff] transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            {/* VISUALIZATION 영역 (요구사항: URL 이미지들이 그래프 위치에 출력됨) */}
            <div className="grid grid-cols-1 gap-6 flex-grow">
              <div className="border-2 border-[#00f2ff]/20 p-4 bg-black/50">
                <p className="text-sm mb-3 text-[#00f2ff] font-bold border-l-4 border-[#00f2ff] pl-3 uppercase">
                  {isUrlMode ? "Remote Asset Grid Inspection" : "Analysis Visualization"}
                </p>
                <div className="aspect-video bg-gray-900 flex items-center justify-center overflow-hidden border border-white/5">
                  {analysisResult.freqImg || analysisResult.graphImg ? (
                    <img src={analysisResult.freqImg || analysisResult.graphImg} className="w-full h-full object-contain" alt="Result" />
                  ) : (
                    <span className="text-sm opacity-20 uppercase tracking-[0.3em]">Awaiting Scan Data...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;