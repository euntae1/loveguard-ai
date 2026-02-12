import React, { useState } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('file');
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlResults, setUrlResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const [analysisResult, setAnalysisResult] = useState({
    graphImg: null,
    freqImg: null,
    detectImg: null,
    realConfidence: null,
    comment: ""
  });

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

  const startProgress = (estimatedSeconds) => {
    setProgress(0);
    const intervalTime = 100;
    const totalSteps = (estimatedSeconds * 1000) / intervalTime;
    const stepIncrement = 100 / totalSteps;
    return setInterval(() => {
      setProgress((prev) => (prev >= 98 ? 98 : prev + stepIncrement));
    }, intervalTime);
  };

  const handleAnalyzeFile = async () => {
    if (!rawFile) return alert("분석할 파일을 업로드하십시오.");
    setIsAnalyzing(true);
    const timer = startProgress(fileType === 'video' ? Math.max(videoDuration * 2, 8) : 5);

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
          comment: apiResult.data[0] > 50 ? "분석 결과, 프레임 일관성이 정상 범주 내에 있습니다." : "비정상적인 프레임 변조 패턴이 감지되었습니다."
        });
      } else {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          freqImg: apiResult.data[1]?.url,
          detectImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50 ? "고주파 노이즈 및 특징점 분석 결과 정상 이미지로 판독됩니다." : "인공지능에 의한 픽셀 재구성 흔적이 식별되었습니다."
        });
      }
    } catch (error) {
      clearInterval(timer);
      alert("분석 엔진 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeUrl = async () => {
    if (!urlInput) return alert("대상 URL을 입력하십시오.");
    setIsAnalyzing(true);
    const timer = startProgress(10); 
    try {
      const app = await client("euntaejang/deepfake");
      const apiResult = await app.predict("/predict_url", [urlInput]);
      clearInterval(timer);
      setProgress(100);
      const resultData = apiResult.data[0];
      if (resultData && resultData.length > 0) {
        setUrlResults(resultData);
      } else {
        alert("해당 도메인에서 분석 가능한 객체를 식별할 수 없습니다.");
        setUrlResults([]);
      }
    } catch (error) {
      clearInterval(timer);
      alert("네트워크 연결 또는 도메인 접근 오류입니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null ? Math.floor(analysisResult.realConfidence) : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans text-slate-800">
      {/* Header 영역: 전문 보안 솔루션 느낌 */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-blue-200 shadow-lg">
            <span className="text-white text-2xl font-bold">🛡️</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">VeriScan AI <span className="text-blue-600">Pro</span></h1>
            <p className="text-xs text-slate-500 font-medium tracking-widest">ADVANCED DEEPFAKE DETECTION SYSTEM</p>
          </div>
        </div>
        
        <nav className="flex bg-slate-200/50 p-1.5 rounded-xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('file')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >LOCAL FILE</button>
          <button 
            onClick={() => setActiveTab('url')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'url' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >WEB SCANNER</button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Side: Control Panel */}
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> INPUT SOURCE
            </h2>
            
            {activeTab === 'file' ? (
              <div className="space-y-4">
                <label className="group relative aspect-video bg-slate-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer overflow-hidden">
                  {selectedFile ? (
                    fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-cover" /> : <img src={selectedFile} alt="Source" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <div className="text-3xl mb-2 opacity-40">📥</div>
                      <p className="text-sm font-semibold text-slate-500">Drop files or Browse</p>
                      <p className="text-xs text-slate-400 mt-1">Image, Video supported</p>
                    </div>
                  )}
                  <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
                <button onClick={handleAnalyzeFile} disabled={isAnalyzing} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${isAnalyzing ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-blue-700'}`}>
                  {isAnalyzing ? "ANALYZING..." : "EXECUTE ANALYSIS"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Enter target URL (https://...)"
                  className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                />
                <button onClick={handleAnalyzeUrl} disabled={isAnalyzing} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${isAnalyzing ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {isAnalyzing ? "SCANNING WEB..." : "START WEB CRAWL"}
                </button>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-900 rounded-2xl shadow-xl text-white">
            <h3 className="text-xs font-bold text-blue-400 mb-3 uppercase tracking-tighter">System Intelligence</h3>
            <p className="text-sm text-slate-300 leading-relaxed font-light">
              {analysisResult.comment || "대상을 입력받아 심층 신경망 분석(Deep Neural Network)을 대기 중입니다."}
            </p>
          </div>
        </section>

        {/* Right Side: Analytics Dashboard */}
        <section className="lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
            <div className="border-b border-slate-100 px-8 py-5 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="text-blue-600">📊</span> ANALYSIS REPORT
              </h3>
              {displayScore !== null && (
                <span className="text-[10px] font-black bg-slate-200 px-2 py-1 rounded text-slate-600">UID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
              )}
            </div>

            <div className="p-8">
              {/* Progress Tracker */}
              {(isAnalyzing || progress > 0) && (
                <div className="mb-10">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Neural Processing</p>
                    <p className="text-2xl font-black text-slate-800">{Math.floor(progress)}%</p>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Result Visuals */}
              {activeTab === 'file' && (
                <div className="animate-in fade-in duration-700">
                  {displayScore !== null ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                      <div className="md:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Integrity Score</p>
                        <div className="relative flex items-center justify-center">
                          <svg className="w-24 h-24 transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                              strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * displayScore) / 100}
                              className={`${displayScore > 50 ? 'text-blue-500' : 'text-red-500'} transition-all duration-1000`} />
                          </svg>
                          <span className="absolute text-2xl font-black text-slate-800">{displayScore}%</span>
                        </div>
                      </div>
                      <div className="md:col-span-2 flex flex-col justify-center">
                        <div className={`inline-block w-fit px-4 py-1.5 rounded-full text-xs font-black mb-4 tracking-widest text-white ${displayScore > 50 ? 'bg-emerald-500' : 'bg-red-600 animate-pulse'}`}>
                          {displayScore > 50 ? 'AUTHENTICATED' : 'SPOOFING DETECTED'}
                        </div>
                        <h4 className="text-2xl font-bold text-slate-900 mb-2">
                          {displayScore > 50 ? "신뢰할 수 있는 데이터" : "조작된 콘텐츠 가능성 높음"}
                        </h4>
                        <p className="text-slate-500 text-sm leading-relaxed">디지털 지문 및 주파수 도메인 분석 결과, {displayScore > 50 ? "변조 흔적이 발견되지 않았습니다." : "이미지 합성 알고리즘에 의한 아티팩트가 검출되었습니다."}</p>
                      </div>
                    </div>
                  ) : (
                    !isAnalyzing && (
                      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-3xl">
                        <p className="text-slate-300 font-medium italic">분석 대기 중입니다.</p>
                      </div>
                    )
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fileType === 'video' ? (
                      analysisResult.graphImg && <div className="col-span-2 rounded-xl overflow-hidden border border-slate-200 shadow-sm transition-all hover:shadow-md">
                        <div className="bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-500 border-b border-slate-100 uppercase">Temporal Consistency Graph</div>
                        <img src={analysisResult.graphImg} className="w-full" alt="Analysis Graph" />
                      </div>
                    ) : (
                      <>
                        {analysisResult.freqImg && <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                          <div className="bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-500 border-b border-slate-100 uppercase">Frequency Domain</div>
                          <img src={analysisResult.freqImg} className="w-full" alt="Frequency Analysis" />
                        </div>}
                        {analysisResult.detectImg && <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                          <div className="bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-500 border-b border-slate-100 uppercase">Feature Extraction</div>
                          <img src={analysisResult.detectImg} className="w-full" alt="Detection Result" />
                        </div>}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* URL Scanner Results */}
              {activeTab === 'url' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-600 uppercase">Detected Assets ({urlResults.length})</h3>
                    <div className="h-px flex-1 bg-slate-100 mx-4"></div>
                  </div>
                  {urlResults.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {urlResults.map((res, index) => (
                        <div key={index} className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-400 transition-all shadow-sm">
                          <div className="relative overflow-hidden aspect-[4/3]">
                            <img src={res.url} alt="Crawl result" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute top-3 right-3">
                              <span className={`px-3 py-1 rounded-md text-[10px] font-black text-white ${res.score > 50 ? 'bg-emerald-500' : 'bg-red-600 shadow-lg shadow-red-200'}`}>
                                {res.score > 50 ? 'PASS' : 'RISK'}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 flex justify-between items-center">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Confidence Index</p>
                              <p className={`text-xl font-black ${res.score > 50 ? 'text-slate-800' : 'text-red-600'}`}>{res.score}%</p>
                            </div>
                            <button className="text-[10px] font-bold text-blue-600 hover:underline">DETAILS →</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !isAnalyzing && <div className="text-center py-32 text-slate-300 font-medium italic border-2 border-dashed border-slate-100 rounded-3xl">입력된 도메인을 스캔하십시오.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto mt-20 pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-slate-400 text-xs font-medium">© 2024 VeriScan Global Security Operations. All Rights Reserved.</p>
        <div className="flex gap-6 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <span className="hover:text-blue-600 cursor-pointer">Security Protocol</span>
          <span className="hover:text-blue-600 cursor-pointer">API Access</span>
          <span className="hover:text-blue-600 cursor-pointer">Network Status: <span className="text-emerald-500">Online</span></span>
        </div>
      </footer>
    </div>
  );
}

export default App;