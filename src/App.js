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

  // 분석 결과 상태 관리 (이미지 2개와 그리드 이미지를 구분)
  const [analysisResult, setAnalysisResult] = useState({
    srmImg: null,      // SRM 도넛 그래프
    pixelImg: null,    // Pixel 도넛 그래프
    graphImg: null,    // 비디오용 타임라인 그래프
    urlGridImg: null,  // URL 분석용 그리드 이미지
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
      const isVideo = file.type.startsWith('video');
      setFileType(isVideo ? 'video' : 'image');
      // 초기화
      setAnalysisResult({ srmImg: null, pixelImg: null, graphImg: null, urlGridImg: null, realConfidence: null, comment: "" });
      setProgress(0);
    }
  };

  // ------------------------------------------------
  // URL 분석: /extract_url 엔드포인트 호출
  // ------------------------------------------------
  const handleUrlAnalyze = async () => {
    if (!inputUrl) {
      alert("타겟 URL을 입력하십시오.");
      return;
    }
    setIsExtracting(true);
    setProgress(10);
    setAnalysisResult({ srmImg: null, pixelImg: null, graphImg: null, urlGridImg: null, realConfidence: null, comment: "" });

    try {
      const app = await client("euntaejang/deepfake");
      const result = await app.predict("/extract_url", [inputUrl]);
      
      if (result.data) {
        setProgress(100);
        setAnalysisResult({
          realConfidence: result.data[0],
          urlGridImg: result.data[1]?.url, // 서버의 그리드 이미지 경로
          comment: `[원격분석완료] ${result.data[2]}`
        });
      }
    } catch (error) {
      console.error(error);
      alert("URL 분석 실패: " + (error.message || "서버 응답 없음"));
      setProgress(0);
    } finally {
      setIsExtracting(false);
    }
  };

  // ------------------------------------------------
  // 로컬 파일 분석: /predict 또는 /predict_video 호출
  // ------------------------------------------------
  const handleAnalyze = async () => {
    if (!rawFile) {
      alert("분석할 증거물을 확보하십시오.");
      return;
    }
    setIsAnalyzing(true);
    setProgress(0);

    try {
      const app = await client("euntaejang/deepfake");
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      const apiResult = await app.predict(endpoint, [rawFile]);

      setProgress(100);

      if (fileType === 'video') {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          graphImg: apiResult.data[1]?.url,
          comment: "[영상 타임라인 분석 완료] 데이터 무결성 검증됨."
        });
      } else {
        // 이미지 결과: [최종점수, SRM도넛, Pixel도넛]
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          srmImg: apiResult.data[1]?.url,
          pixelImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50 
            ? "[판독완료] 픽셀 및 주파수 무결성 통과." 
            : "[경고] 생성 노이즈 및 주파수 변조 감지."
        });
      }
    } catch (error) {
      setProgress(0);
      alert(error.message || "분석 중 오류가 발생했습니다. (얼굴 미검출 등)");
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
          <h1 className="text-4xl font-black tracking-tighter uppercase">Digital Forensic Terminal</h1>
        </div>
        <button onClick={() => window.location.reload()} className="px-8 py-3 border-2 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all font-black italic">
          REBOOT
        </button>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT: EVIDENCE INPUT */}
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
                  className="bg-black border-2 border-[#00f2ff]/50 p-4 outline-none text-white font-mono"
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

          <div className="p-6 bg-black/80 border-l-8 border-[#00f2ff]">
            <h3 className="text-[#00f2ff] text-xl font-bold mb-2 underline">INVESTIGATOR LOG</h3>
            <p className="text-gray-200 font-mono italic">{analysisResult.comment || "> SYSTEM IDLE..."}</p>
          </div>
        </section>

        {/* RIGHT: ANALYSIS REPORT */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-10 flex flex-col min-h-[600px] shadow-2xl relative">
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-[#00f2ff]/60 uppercase font-bold mb-2 tracking-widest">Reliability Score</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-9xl font-black italic text-[#00f2ff]">{displayScore ?? "00"}</span>
                  <span className="text-4xl font-bold">%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#00f2ff]/60 mb-4 font-bold uppercase">Final Verdict</p>
                {displayScore !== null && (
                  <div className={`px-8 py-4 text-2xl font-black border-4 ${displayScore > 50 ? 'border-green-500 text-green-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
                    {displayScore > 50 ? 'VERIFIED' : 'FORGERY'}
                  </div>
                )}
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="mb-10">
              <div className="h-2 bg-black border border-[#00f2ff]/30">
                <div className="h-full bg-[#00f2ff] shadow-[0_0_10px_#00f2ff] transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            {/* 시각화 결과 영역 (요구사항 반영) */}
            <div className="flex-grow">
              <p className="text-sm mb-4 text-[#00f2ff] font-bold border-l-4 border-[#00f2ff] pl-3 uppercase tracking-tighter">
                {isUrlMode ? "Remote Asset Grid Inspection" : "Dual-Stream Analysis Visualization"}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* 1. 로컬 이미지 분석 시: 도넛 그래프 2개 나란히 출력 */}
                {!isUrlMode && fileType === 'image' && analysisResult.srmImg && (
                  <>
                    <div className="border border-[#00f2ff]/20 bg-black/40 p-4 flex flex-col items-center">
                      <span className="text-[10px] text-[#00f2ff]/50 mb-2 font-mono">CHANNEL A: SRM FREQUENCY</span>
                      <img src={analysisResult.srmImg} className="w-full h-auto object-contain" alt="SRM Result" />
                    </div>
                    <div className="border border-[#00f2ff]/20 bg-black/40 p-4 flex flex-col items-center">
                      <span className="text-[10px] text-[#00f2ff]/50 mb-2 font-mono">CHANNEL B: PIXEL ANALYSIS</span>
                      <img src={analysisResult.pixelImg} className="w-full h-auto object-contain" alt="Pixel Result" />
                    </div>
                  </>
                )}

                {/* 2. 비디오 분석 시: 타임라인 그래프 크게 출력 */}
                {!isUrlMode && fileType === 'video' && analysisResult.graphImg && (
                  <div className="col-span-2 border border-[#00f2ff]/20 bg-black/40 p-4">
                    <img src={analysisResult.graphImg} className="w-full h-auto object-contain" alt="Timeline Graph" />
                  </div>
                )}

                {/* 3. URL 분석 시: 그리드 이미지 크게 출력 */}
                {isUrlMode && analysisResult.urlGridImg && (
                  <div className="col-span-2 border border-[#00f2ff]/20 bg-black/40 p-4 overflow-auto">
                    <img src={analysisResult.urlGridImg} className="w-full h-auto object-contain" alt="URL Grid Inspection" />
                  </div>
                )}

                {/* 데이터가 없을 때 표시되는 스켈레톤 UI */}
                {!analysisResult.srmImg && !analysisResult.graphImg && !analysisResult.urlGridImg && (
                  <div className="col-span-2 aspect-video bg-gray-900/50 border border-dashed border-[#00f2ff]/10 flex items-center justify-center">
                    <span className="text-sm opacity-20 uppercase tracking-[0.4em]">Awaiting Scan Data...</span>
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