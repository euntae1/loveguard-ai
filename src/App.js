import React, { useState, useRef } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0); // 실시간 로딩 상태
  const [estimatedTime, setEstimatedTime] = useState(0); // 예상 소요 시간
  const [analysisResult, setAnalysisResult] = useState({
    graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: ""
  });

  const timerRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setSelectedFile(URL.createObjectURL(file));
      const type = file.type.startsWith('video') ? 'video' : 'image';
      setFileType(type);
      setAnalysisResult({ graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: "" });
      setProgress(0);

      if (type === 'image') {
        setEstimatedTime(2); // 이미지는 2초
      } else {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => setEstimatedTime(Math.round(video.duration * 2)); // 비디오는 길이의 2배
        video.src = URL.createObjectURL(file);
      }
    }
  };

  // 실시간 로딩바 제어 함수
  const startLoading = (totalSec) => {
    setProgress(0);
    const duration = totalSec * 1000;
    const interval = 100; 
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; 
        return prev + step;
      });
    }, interval);
  };

  const handleAnalyze = async () => {
    if (!rawFile) return alert("분석할 사진이나 영상을 먼저 올려주세요! ✨");

    setIsAnalyzing(true);
    startLoading(estimatedTime); // 로딩바 시작

    try {
      const app = await client("euntaejang/deepfake");
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      const apiResult = await app.predict(endpoint, [rawFile]);

      clearInterval(timerRef.current);
      setProgress(100); // 성공 시 100%

      if (fileType === 'video') {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          graphImg: apiResult.data[1]?.url,
          comment: apiResult.data[0] > 50 ? "영상 전반에서 자연스러운 흐름이 관찰됩니다." : "특정 구간에서 인위적인 프레임 왜곡이 감지되었습니다."
        });
      } else {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          freqImg: apiResult.data[1]?.url,
          detectImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50 ? "진실된 인연일 가능성이 높아요!" : "조금 수상한 흔적이 발견되었어요..."
        });
      }
    } catch (error) {
      clearInterval(timerRef.current);
      setProgress(0);
      alert("AI 서버 연결에 실패했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null ? Math.floor(analysisResult.realConfidence) : null;

  return (
    <div className="min-h-screen bg-[#FFF0F5] p-4 md:p-8 font-sans text-[#5F4B8B]">
      {/* 원본 헤더 디자인 */}
      <header className="max-w-6xl mx-auto mb-10 flex justify-between items-center bg-white/60 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-pink-100">
        <div className="flex items-center gap-2">
          <span className="text-3xl">💖</span>
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">LoveGuard AI</h1>
        </div>
        <button onClick={() => window.location.reload()} className="px-5 py-2 bg-pink-500 text-white rounded-full font-bold shadow-lg hover:bg-pink-600 transition-all">✨ Reset</button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 왼쪽 섹션 */}
        <section className="lg:col-span-4 space-y-6">
          <div className="relative group">
            <label htmlFor="file-upload" className="relative aspect-square bg-white rounded-[2rem] flex flex-col items-center justify-center border-4 border-white shadow-xl overflow-hidden cursor-pointer">
              {selectedFile ? (
                fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-cover" controls /> : <img src={selectedFile} alt="Upload" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <div className="text-5xl mb-3">🎬</div>
                  <p className="text-pink-400 font-bold">사진 또는 영상 업로드</p>
                </div>
              )}
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
            </label>
          </div>

          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all ${isAnalyzing ? 'bg-gray-400' : 'bg-gradient-to-r from-pink-400 to-rose-400 hover:scale-[1.02]'}`}>
            {isAnalyzing ? "🧚 분석 마법 시전 중..." : "🔮 판독 시작"}
          </button>

          {/* 원본 요정의 한마디 디자인 */}
          <div className="p-6 bg-white/80 rounded-3xl border border-pink-100 shadow-sm">
            <h3 className="font-bold text-pink-600 mb-2 flex items-center gap-2"><span>📝</span> 요정의 한마디</h3>
            <p className="text-gray-600 text-sm italic">{analysisResult.comment || "파일을 분석하면 AI가 진실을 말해줄 거예요."}</p>
          </div>
        </section>

        {/* 오른쪽 섹션 */}
        <section className="lg:col-span-8 space-y-6">
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl border-t-8 border-pink-400">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-pink-400 font-bold text-xs tracking-widest uppercase">Real Confidence</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-7xl font-black text-pink-500">{displayScore ?? "--"}</p>
                  <p className="text-2xl font-bold text-pink-400">%</p>
                </div>
              </div>
              {displayScore !== null && (
                <div className={`px-6 py-3 rounded-2xl text-lg font-black animate-bounce text-white ${displayScore > 50 ? 'bg-green-400' : 'bg-rose-500'}`}>
                  {displayScore > 50 ? '✅ 안심 인연' : '🚨 주의 요망'}
                </div>
              )}
            </div>

            <div className="mt-8">
              {fileType === 'video' ? (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-500 ml-2">📊 시간대별 신뢰도 변화</p>
                  <div className="w-full bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 p-2">
                    {analysisResult.graphImg ? <img src={analysisResult.graphImg} className="w-full h-auto rounded-xl" alt="Graph" /> : <div className="h-48 flex items-center justify-center text-gray-300">분석 완료 후 표시됩니다.</div>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 ml-2">🌈 주파수 도메인 분석</p>
                    <div className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 overflow-hidden flex items-center justify-center">
                      {analysisResult.freqImg ? <img src={analysisResult.freqImg} className="w-full h-full object-contain" alt="Freq" /> : <span className="text-gray-300 text-xs">대기 중</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 ml-2">🔍 픽셀 정밀 분석</p>
                    <div className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 overflow-hidden flex items-center justify-center">
                      {analysisResult.detectImg ? <img src={analysisResult.detectImg} className="w-full h-full object-contain" alt="Pixel" /> : <span className="text-gray-300 text-xs">대기 중</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 하단: 실시간 로딩바 (원본 코드의 진행도 바 위치) */}
          <div className="p-6 bg-white rounded-2xl border border-pink-50 shadow-sm">
             <p className="font-bold text-gray-700 mb-3 flex justify-between">
                <span>AI 종합 분석 진행도</span>
                <span className="text-pink-500">{Math.floor(progress)}%</span>
             </p>
             <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-pink-300 to-pink-500 h-full transition-all duration-100 ease-linear" 
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
             <p className="text-[10px] text-gray-400 mt-4">* 본 결과는 딥러닝 모델의 확률적 수치이며, 영상의 모든 프레임을 전수 조사하지는 않습니다.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;