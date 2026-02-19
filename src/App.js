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
  const [extractedImages, setExtractedImages] = useState([]); // URL에서 추출된 이미지들
  const [isExtracting, setIsExtracting] = useState(false);

  const [analysisResult, setAnalysisResult] = useState({
    graphImg: null,
    freqImg: null,
    detectImg: null,
    realConfidence: null,
    comment: ""
  });

  // 뉴스 데이터 (이미지 경로 설정)
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

  // -------------------------------
  // URL 이미지 추출 함수 (추론은 하지 않음)
  // -------------------------------
  const handleUrlExtract = async () => {
    if (!inputUrl) {
      alert("타겟 URL을 입력하십시오.");
      return;
    }
    setIsExtracting(true);
    setExtractedImages([]);

    try {
      const app = await client("euntaejang/deepfake");
      const result = await app.predict("/extract_url", [inputUrl]);
      
      // result.data[0] 에 이미지 URL 배열이 들어있음
      if (result.data && result.data[0]) {
        setExtractedImages(result.data[0]);
      }
    } catch (error) {
      console.error(error);
      alert("URL 자산 추출 실패: 서버 연결을 확인하십시오.");
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
            ? "[판독완료] 데이터 무결성 검증됨. 조작 흔적 없음." 
            : "[위험] 인위적 프레임 변조 및 합성 징후 포착."
        });
      } else {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          freqImg: apiResult.data[1]?.url,
          detectImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50 
            ? "[판독완료] 픽셀 무결성 통과. 정상 이미지입니다." 
            : "[경고] 딥러닝 기반 생성 노이즈 패턴이 감지됨."
        });
      }
    } catch (error) {
      clearInterval(timer);
      setProgress(0);
      alert("분석 오류 발생");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null ? Math.floor(analysisResult.realConfidence) : null;

  return (
    <div className="min-h-screen forensic-grid p-6 md:p-12 text-[#00f2ff] bg-[#0a0e14]">
      {/* HEADER */}
      <header className="max-w-[1600px] mx-auto mb-10 flex justify-between items-center border-b-4 border-[#00f2ff] pb-6 shadow-[0_0_20px_rgba(0,242,255,0.4)]">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-[#00f2ff] flex items-center justify-center rounded-sm shadow-[0_0_15px_#00f2ff]">
            <span className="text-black text-xl font-black">NPA</span>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">DIGITAL FORENSIC ANALYSIS TERMINAL</h1>
            <p className="text-sm text-[#00f2ff]/70 tracking-[0.3em]">UNIT CODE: 0429-DEEPFAKE-DETECTOR</p>
          </div>
        </div>
        <button onClick={() => window.location.reload()} className="px-8 py-3 border-2 border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all text-lg font-black italic">
          REBOOT SYSTEM
        </button>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT: EVIDENCE SECTION */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-6 relative shadow-inner">
            <div className="flex justify-between mb-6">
              <button 
                onClick={() => setIsUrlMode(false)}
                className={`flex-1 py-3 text-lg font-bold border-b-4 ${!isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10 text-white' : 'border-transparent text-gray-500'}`}
              >
                LOCAL FILE
              </button>
              <button 
                onClick={() => setIsUrlMode(true)}
                className={`flex-1 py-3 text-lg font-bold border-b-4 ${isUrlMode ? 'border-[#00f2ff] bg-[#00f2ff]/10 text-white' : 'border-transparent text-gray-500'}`}
              >
                NETWORK URL
              </button>
            </div>

            {!isUrlMode ? (
              <label htmlFor="file-upload" className="relative aspect-video bg-black/70 border-2 border-dashed border-[#00f2ff]/50 flex flex-col items-center justify-center cursor-pointer group hover:border-[#00f2ff] transition-all">
                {selectedFile ? (
                  fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-contain" /> : <img src={selectedFile} alt="Evidence" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-2 text-[#00f2ff]/50">SECURE UPLOAD AREA</p>
                    <p className="text-sm text-gray-500 tracking-widest">DRAG AND DROP EVIDENCE</p>
                  </div>
                )}
                {isAnalyzing && <div className="scan-line"></div>}
                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="aspect-video bg-black/70 border-2 border-[#00f2ff]/50 p-8 flex flex-col justify-center gap-5 overflow-y-auto">
                <input 
                  type="text" 
                  placeholder="INPUT TARGET URL..."
                  className="bg-black border-2 border-[#00f2ff]/50 p-4 text-xl outline-none focus:border-[#00f2ff] text-white"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
                <button 
                  onClick={handleUrlExtract}
                  disabled={isExtracting}
                  className="bg-[#00f2ff] text-black font-black py-4 text-xl hover:bg-white transition-all shadow-[0_0_15px_#00f2ff] disabled:bg-gray-600"
                >
                  {isExtracting ? "EXTRACTING ASSETS..." : "RUN REMOTE ASSET EXTRACTION"}
                </button>

                {/* 추출된 이미지 목록 렌더링 */}
                {extractedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-4 gap-2 border-t border-[#00f2ff]/30 pt-4">
                    {extractedImages.map((url, idx) => (
                      <div key={idx} className="aspect-square border border-[#00f2ff]/30 overflow-hidden hover:border-[#00f2ff] transition-all">
                        <img src={url} alt="extracted" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || (isUrlMode && !selectedFile)} 
            className={`w-full py-6 font-black text-2xl tracking-[0.4em] transition-all border-4 ${isAnalyzing ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-transparent border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black shadow-[0_0_20px_rgba(0,242,255,0.2)]'}`}
          >
            {isAnalyzing ? "SCANNING DATA..." : "EXECUTE FORENSIC SCAN"}
          </button>

          <div className="p-6 bg-black/80 border-l-8 border-[#00f2ff] shadow-lg">
            <h3 className="text-[#00f2ff] text-xl font-bold mb-3 underline tracking-tighter">CHIEF INVESTIGATOR'S LOG</h3>
            <p className="text-gray-200 text-lg leading-relaxed font-mono italic">{analysisResult.comment || "> SYSTEM IDLE: AWAITING INPUT..."}</p>
          </div>

          {/* NEWS SECTION */}
          <div className="pt-4 border-t border-[#00f2ff]/20">
            <p className="text-sm font-bold mb-4 tracking-widest text-[#00f2ff]/60 uppercase">Reference Deepfake Cases</p>
            <div className="grid grid-cols-3 gap-4">
              {newsData.map((news) => (
                <div key={news.id} className="aspect-[4/3] bg-gray-900 border-2 border-white/10 hover:border-[#00f2ff] cursor-pointer relative group overflow-hidden transition-all">
                  <img src={news.src} alt={news.label} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                  <div className="absolute bottom-2 left-2 text-[10px] bg-[#00f2ff] text-black px-2 font-bold">{news.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT: REPORT SECTION */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-10 relative h-full flex flex-col shadow-2xl">
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-lg text-[#00f2ff]/60 uppercase font-bold tracking-widest mb-2">Integrity Confidence</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-9xl font-black italic tracking-tighter text-[#00f2ff] drop-shadow-[0_0_15px_rgba(0,242,255,0.5)]">
                    {displayScore ?? "00"}
                  </span>
                  <span className="text-4xl font-bold">%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#00f2ff]/60 mb-4 uppercase font-bold tracking-widest">Final Verdict</p>
                {displayScore !== null && (
                  <div className={`px-8 py-4 text-2xl font-black border-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] ${displayScore > 50 ? 'border-green-500 text-green-500' : 'border-red-600 text-red-600 animate-pulse'}`}>
                    {displayScore > 50 ? 'VERIFIED: AUTHENTIC' : 'ALERT: FORGERY DETECTED'}
                  </div>
                )}
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="mb-12">
               <div className="flex justify-between text-lg font-bold mb-3">
                  <span className="tracking-widest">SCANNING FREQUENCY & PIXEL INTEGRITY...</span>
                  <span>{Math.floor(progress)}%</span>
               </div>
               <div className="h-4 bg-black border-2 border-[#00f2ff]/30 p-[2px]">
                  <div className="h-full bg-[#00f2ff] shadow-[0_0_10px_#00f2ff] transition-all duration-300" style={{ width: `${progress}%` }}></div>
               </div>
            </div>

            {/* VISUALIZATION */}
            <div className="grid grid-cols-1 gap-6 flex-grow">
              <div className="grid grid-cols-2 gap-6">
                <div className="border-2 border-[#00f2ff]/20 p-4 bg-black/50">
                  <p className="text-sm mb-3 text-[#00f2ff] font-bold border-l-4 border-[#00f2ff] pl-3">FREQUENCY SPECTRUM</p>
                  <div className="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden border border-white/5">
                    {fileType === 'video' ? (
                       analysisResult.graphImg ? <img src={analysisResult.graphImg} className="w-full h-full object-cover" alt="Graph" /> : <span className="text-sm text-gray-700">WAITING...</span>
                    ) : (
                       analysisResult.freqImg ? <img src={analysisResult.freqImg} className="w-full h-full object-cover" alt="Freq" /> : <span className="text-sm text-gray-700">WAITING...</span>
                    )}
                  </div>
                </div>
                <div className="border-2 border-[#00f2ff]/20 p-4 bg-black/50">
                  <p className="text-sm mb-3 text-[#00f2ff] font-bold border-l-4 border-[#00f2ff] pl-3">TRACE ANALYSIS</p>
                  <div className="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden border border-white/5">
                    {fileType === 'image' && analysisResult.detectImg ? (
                      <img src={analysisResult.detectImg} className="w-full h-full object-cover" alt="Detect" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center opacity-10">
                        <div className="w-1/2 h-[2px] bg-[#00f2ff] mb-4 animate-bounce"></div>
                        <span className="text-xs">SCANNING...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between items-center opacity-40 text-xs font-mono border-t border-[#00f2ff]/20 pt-4">
              <span>LOCAL_SECURE_SERVER_PORT: 8080</span>
              <span>LOG_ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;