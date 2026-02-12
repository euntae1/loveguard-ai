import React, { useState } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  // 모드 관리 ('file' 또는 'url')
  const [activeTab, setActiveTab] = useState('file');
  
  // 파일 업로드 관련 상태
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  
  // URL 분석 관련 상태
  const [urlInput, setUrlInput] = useState('');
  const [urlResults, setUrlResults] = useState([]); // URL 내 여러 이미지 결과 저장
  
  // 공통 상태
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

  // 파일 선택 로직
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

  // 진행도 애니메이션 함수
  const startProgress = (estimatedSeconds) => {
    setProgress(0);
    const intervalTime = 100;
    const totalSteps = (estimatedSeconds * 1000) / intervalTime;
    const stepIncrement = 100 / totalSteps;

    return setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 95 : prev + stepIncrement));
    }, intervalTime);
  };

  // [기능 1] 파일/비디오 분석 실행
  const handleAnalyzeFile = async () => {
    if (!rawFile) return alert("파일을 먼저 업로드해주세요! ✨");
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
          comment: apiResult.data[0] > 50 ? "영상 전체적으로 안정적입니다!" : "합성 징후가 포착되었습니다."
        });
      } else {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          freqImg: apiResult.data[1]?.url,
          detectImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50 ? "자연스러운 사진입니다." : "인위적인 흔적이 발견되었습니다."
        });
      }
    } catch (error) {
      clearInterval(timer);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // [기능 2] URL 분석 실행
const handleAnalyzeUrl = async () => {
  if (!urlInput) return alert("분석할 URL을 입력해주세요! 🔗");
  setIsAnalyzing(true);
  const timer = startProgress(10); 

  try {
    const app = await client("euntaejang/deepfake");
    const apiResult = await app.predict("/predict_url", [urlInput]);

    clearInterval(timer);
    setProgress(100);
    
    // 핵심: Gradio는 결과를 리스트로 감싸서 보내므로 [0]을 꼭 붙여야 합니다.
    const resultData = apiResult.data[0];
    
    if (resultData && resultData.length > 0) {
      setUrlResults(resultData);
    } else {
      alert("해당 페이지에서 분석 가능한 얼굴 이미지를 찾지 못했습니다. 🧐");
      setUrlResults([]);
    }
  } catch (error) {
    clearInterval(timer);
    alert("URL 스캔 중 오류가 발생했습니다. 주소를 다시 확인해주세요.");
  } finally {
    setIsAnalyzing(false);
  }
};
  const displayScore = analysisResult.realConfidence !== null ? Math.floor(analysisResult.realConfidence) : null;

  return (
    <div className="min-h-screen bg-[#FFF0F5] p-4 md:p-8 font-sans text-[#5F4B8B]">
      <header className="max-w-6xl mx-auto mb-10 flex justify-between items-center bg-white/60 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-pink-100">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🛡️</span>
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">LoveGuard AI Web Scanner</h1>
        </div>
        
        {/* 모드 전환 버튼 */}
        <div className="flex bg-pink-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'file' ? 'bg-pink-500 text-white shadow-md' : 'text-pink-400'}`}
          >파일 분석</button>
          <button 
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'url' ? 'bg-pink-500 text-white shadow-md' : 'text-pink-400'}`}
          >URL 스캔</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 왼쪽 섹션: 입력 영역 */}
        <section className="lg:col-span-4 space-y-6">
          {activeTab === 'file' ? (
            <div className="space-y-6">
              <label className="relative aspect-square bg-white rounded-[2rem] flex flex-col items-center justify-center border-4 border-white shadow-xl overflow-hidden cursor-pointer">
                {selectedFile ? (
                  fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-cover" controls /> : <img src={selectedFile} alt="Upload" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-5xl mb-3">📁</div>
                    <p className="text-pink-400 font-bold">파일을 드래그하거나 클릭</p>
                  </div>
                )}
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
              <button onClick={handleAnalyzeFile} disabled={isAnalyzing} className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all ${isAnalyzing ? 'bg-gray-400' : 'bg-gradient-to-r from-pink-400 to-rose-400 hover:scale-105'}`}>
                {isAnalyzing ? "분석 중..." : "🔮 파일 판독 시작"}
              </button>
            </div>
          ) : (
            <div className="space-y-6 bg-white p-6 rounded-[2rem] shadow-xl border border-pink-100">
              <div className="text-center">
                <div className="text-5xl mb-3">🔗</div>
                <h3 className="font-bold text-pink-500">웹사이트 URL 스캔</h3>
                <p className="text-xs text-gray-400 mt-1">사이트 내 모든 이미지를 분석합니다.</p>
              </div>
              <input 
                type="text" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="w-full p-4 rounded-xl border-2 border-pink-100 focus:border-pink-300 outline-none transition-all"
              />
              <button onClick={handleAnalyzeUrl} disabled={isAnalyzing} className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all ${isAnalyzing ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-400 to-purple-400 hover:scale-105'}`}>
                {isAnalyzing ? "스캔 중..." : "🔎 URL 전체 스캔"}
              </button>
            </div>
          )}

          <div className="p-6 bg-white/80 rounded-3xl border border-pink-100 shadow-sm">
            <h3 className="font-bold text-pink-600 mb-2 flex items-center gap-2"><span>📝</span> AI Guide</h3>
            <p className="text-gray-600 text-sm italic">
              {activeTab === 'file' ? (analysisResult.comment || "파일을 업로드하고 분석하세요.") : "URL을 입력하면 해당 페이지의 이미지를 추출합니다."}
            </p>
          </div>
        </section>

        {/* 오른쪽 섹션: 결과 영역 */}
        <section className="lg:col-span-8 space-y-6">
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl border-t-8 border-pink-400 min-h-[400px]">
            {/* 진행바 (공통) */}
            {(isAnalyzing || progress > 0) && (
              <div className="mb-8 p-6 bg-gray-50 rounded-3xl border border-pink-50">
                <div className="flex justify-between mb-3">
                  <p className="font-bold text-gray-700">분석 진행도</p>
                  <p className="text-pink-500 font-black">{Math.floor(progress)}%</p>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-300 to-rose-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {/* 결과 표시: 파일 분석 모드 */}
            {activeTab === 'file' && (
              <div>
                {displayScore !== null ? (
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <p className="text-pink-400 font-bold text-xs tracking-widest uppercase">Confidence</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-7xl font-black text-pink-500">{displayScore}</p>
                        <p className="text-2xl font-bold text-pink-400">%</p>
                      </div>
                    </div>
                    <div className={`px-6 py-3 rounded-2xl text-lg font-black text-white ${displayScore > 50 ? 'bg-green-400' : 'bg-rose-500 animate-pulse'}`}>
                      {displayScore > 50 ? '✅ 진본' : '🚨 위조 의심'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-300 font-bold">분석 결과가 여기에 표시됩니다.</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fileType === 'video' ? (
                    analysisResult.graphImg && <img src={analysisResult.graphImg} className="w-full col-span-2 rounded-2xl shadow-lg" alt="Graph" />
                  ) : (
                    <>
                      {analysisResult.freqImg && <img src={analysisResult.freqImg} className="rounded-xl border shadow-sm" alt="Freq" />}
                      {analysisResult.detectImg && <img src={analysisResult.detectImg} className="rounded-xl border shadow-sm" alt="Detect" />}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 결과 표시: URL 스캔 모드 */}
            {activeTab === 'url' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-gray-700 mb-4">발견된 이미지 리스트 ({urlResults.length})</h3>
                {urlResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {urlResults.map((res, index) => (
                      <div key={index} className="flex flex-col border border-pink-50 rounded-2xl overflow-hidden shadow-sm bg-gray-50">
                        <img src={res.url} alt="Scanned" className="h-40 w-full object-cover" />
                        <div className="p-4 flex justify-between items-center bg-white">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">진본 확률</p>
                            <p className={`text-xl font-black ${res.score > 50 ? 'text-green-500' : 'text-rose-500'}`}>{res.score}%</p>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${res.score > 50 ? 'bg-green-400' : 'bg-rose-500'}`}>
                            {res.score > 50 ? 'Safe' : 'Deepfake'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isAnalyzing && <div className="text-center py-20 text-gray-300 font-bold">URL을 입력하고 스캔 버튼을 눌러주세요.</div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;