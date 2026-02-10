import React, { useState, useEffect } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(0); // 예상 소요 시간 상태
  const [analysisResult, setAnalysisResult] = useState({
    graphImg: null,
    freqImg: null,
    detectImg: null,
    realConfidence: null,
    comment: ""
  });

  // 파일 변경 시 예상 시간 계산 로직
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setSelectedFile(URL.createObjectURL(file));
      const type = file.type.startsWith('video') ? 'video' : 'image';
      setFileType(type);
      
      // 초기화
      setAnalysisResult({ 
        graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: "" 
      });

      // 예상 시간 계산
      if (type === 'image') {
        setEstimatedTime(2); // 이미지는 고정 2초
      } else {
        // 비디오 길이 추출
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          setEstimatedTime(Math.round(video.duration * 2)); // 영상 길이 * 2초
        };
        video.src = URL.createObjectURL(file);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!rawFile) {
      alert("분석할 사진이나 영상을 먼저 올려주세요! ✨");
      return;
    }

    setIsAnalyzing(true);

    try {
      const app = await client("euntaejang/deepfake");
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      
      const apiResult = await app.predict(endpoint, [ rawFile ]);

      if (fileType === 'video') {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          graphImg: apiResult.data[1]?.url,
          comment: apiResult.data[0] > 50 ? "영상 분석 완료! 전반적으로 자연스러운 모습입니다." : "인위적인 프레임 왜곡이 감지되었습니다."
        });
      } else {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          freqImg: apiResult.data[1]?.url,
          detectImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50 ? "진실된 사진일 가능성이 높아요!" : "조금 수상한 흔적이 발견되었어요..."
        });
      }

    } catch (error) {
      console.error("API 호출 에러:", error);
      
      // 백엔드 raise gr.Error 메시지 처리
      if (error.message.includes("얼굴") || error.message.includes("Face")) {
        alert("🔍 얼굴을 찾을 수 없어요!\n얼굴이 정면으로 잘 보이는 사진으로 다시 시도해주세요.");
      } else {
        alert("분석 중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
      }
      
      setAnalysisResult(prev => ({ ...prev, comment: "분석에 실패했습니다." }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null 
    ? Math.floor(analysisResult.realConfidence) 
    : null;

  return (
    <div className="min-h-screen bg-[#FFF0F5] p-4 md:p-8 font-sans text-[#5F4B8B]">
      <header className="max-w-6xl mx-auto mb-10 flex justify-between items-center bg-white/60 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-pink-100">
        <div className="flex items-center gap-2">
          <span className="text-3xl">💖</span>
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
            LoveGuard AI
          </h1>
        </div>
        <button onClick={() => window.location.reload()} className="px-5 py-2 bg-pink-500 text-white rounded-full font-bold shadow-lg hover:bg-pink-600 transition-all">✨ Reset</button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-4 space-y-6">
          <div className="relative group">
            <label htmlFor="file-upload" className="relative aspect-square bg-white rounded-[2rem] flex flex-col items-center justify-center border-4 border-white shadow-xl overflow-hidden cursor-pointer">
              {selectedFile ? (
                fileType === 'video' ? (
                  <video src={selectedFile} className="w-full h-full object-cover" />
                ) : (
                  <img src={selectedFile} alt="Upload" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="text-center p-4">
                  <div className="text-5xl mb-3">🎬</div>
                  <p className="text-pink-400 font-bold">사진 또는 영상 업로드</p>
                </div>
              )}
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
            </label>
          </div>

          {/* 예상 소요 시간 바 (진행도 대신 추가) */}
          {estimatedTime > 0 && (
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-pulse">
              <p className="text-indigo-600 font-bold text-sm flex items-center gap-2">
                ⏱️ 예상 분석 시간: 약 {estimatedTime}초
              </p>
              <div className="w-full bg-indigo-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className={`bg-indigo-500 h-full ${isAnalyzing ? 'w-full transition-all duration-[20000ms]' : 'w-0'}`}></div>
              </div>
            </div>
          )}

          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all ${isAnalyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-pink-400 to-rose-400 hover:scale-[1.02]'}`}>
            {isAnalyzing ? "🧚 AI 분석 중..." : "🔮 판독 시작"}
          </button>

          <div className="p-6 bg-white/80 rounded-3xl border border-pink-100 shadow-sm">
            <h3 className="font-bold text-pink-600 mb-2 flex items-center gap-2"><span>📝</span> 분석 리포트</h3>
            <p className="text-gray-600 text-sm italic">
              {analysisResult.comment || "파일을 선택하면 분석 준비가 완료됩니다."}
            </p>
          </div>
        </section>

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
                <div className={`px-6 py-3 rounded-2xl text-lg font-black text-white ${displayScore > 50 ? 'bg-green-400' : 'bg-rose-500'}`}>
                  {displayScore > 50 ? '✅ 안심 인연' : '🚨 주의 요망'}
                </div>
              )}
            </div>

            <div className="mt-8">
              {fileType === 'video' ? (
                <div className="w-full bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 p-2 min-h-[300px] flex items-center justify-center">
                  {analysisResult.graphImg ? (
                    <img src={analysisResult.graphImg} className="w-full h-auto rounded-xl" alt="Timeline" />
                  ) : (
                    <div className="text-gray-300 text-center">
                        <p className="text-4xl mb-2">📊</p>
                        <p>분석 완료 후 타임라인 그래프가 표시됩니다.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 ml-2">🌈 Frequency Analysis</p>
                    <div className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 overflow-hidden flex items-center justify-center">
                      {analysisResult.freqImg ? <img src={analysisResult.freqImg} className="w-full h-full object-contain" alt="Freq" /> : <span className="text-gray-300 text-xs">도넛 차트 대기 중</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 ml-2">🔍 Pixel Analysis</p>
                    <div className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 overflow-hidden flex items-center justify-center">
                      {analysisResult.detectImg ? <img src={analysisResult.detectImg} className="w-full h-full object-contain" alt="Pixel" /> : <span className="text-gray-300 text-xs">도넛 차트 대기 중</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
             <p className="text-[11px] text-gray-400 text-center">
               * 얼굴이 인식되지 않으면 AI 분석이 진행되지 않습니다. <br/>
               사진 속 인물의 이목구비가 뚜렷하게 보이도록 해주세요.
             </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;