import React, { useState } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null); 
  const [imageFile, setImageFile] = useState(null); 
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [analysisResult, setAnalysisResult] = useState({
    freqImg: null,    
    detectImg: null,  
    realConfidence: null 
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setSelectedImage(URL.createObjectURL(file));
      // 새 이미지 올리면 이전 결과 초기화
      setAnalysisResult({ freqImg: null, detectImg: null, realConfidence: null });
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      alert("분석할 사진을 먼저 올려주세요! ✨");
      return;
    }

    setIsAnalyzing(true);

    try {
      // 1. 허깅페이스 스페이스 연결
      const app = await client("euntaejang/deepfake");
      
      // 2. 추론 요청 (app.py의 predict 함수 호출)
      const apiResult = await app.predict("/predict", [
        imageFile, 
      ]);

      console.log("API 원본 응답:", apiResult);

      /* app.py의 return 순서에 맞춰 매핑:
         return real_prob_percent(숫자), chart_freq(이미지), chart_img(이미지)
      */
      setAnalysisResult({
        realConfidence: apiResult.data[0], // 숫자
        freqImg: apiResult.data[1]?.url,  // 이미지 URL
        detectImg: apiResult.data[2]?.url  // 이미지 URL
      });

    } catch (error) {
      console.error("API 호출 에러:", error);
      alert("AI 서버가 응답하지 않거나 연결 시간이 초과되었습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 화면에 표시할 최종 점수 (소수점 제거)
  const displayScore = analysisResult.realConfidence !== null 
    ? Math.floor(analysisResult.realConfidence) 
    : null;

  return (
    <div className="min-h-screen bg-[#FFF0F5] p-4 md:p-8 font-sans text-[#5F4B8B]">
      {/* 상단 헤더 */}
      <header className="max-w-6xl mx-auto mb-10 flex justify-between items-center bg-white/60 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-pink-100">
        <div className="flex items-center gap-2">
          <span className="text-3xl">💖</span>
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
            LoveGuard AI
          </h1>
        </div>
        <button onClick={() => window.location.reload()} className="px-5 py-2 bg-pink-500 text-white rounded-full font-bold shadow-lg hover:bg-pink-600 transition-all">✨ 다시 하기</button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 왼쪽: 업로드 영역 */}
        <section className="lg:col-span-4 space-y-6">
          <div className="relative group">
            <label htmlFor="image-upload-input" className="relative aspect-square bg-white rounded-[2rem] flex flex-col items-center justify-center border-4 border-white shadow-xl overflow-hidden cursor-pointer">
              {selectedImage ? (
                <img src={selectedImage} alt="Original" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <div className="text-5xl mb-3">📸</div>
                  <p className="text-pink-400 font-bold">사진을 올려주세요</p>
                </div>
              )}
              <input id="image-upload-input" type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
            </label>
          </div>

          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all ${isAnalyzing ? 'bg-gray-400' : 'bg-gradient-to-r from-pink-400 to-rose-400 hover:scale-[1.02]'}`}>
            {isAnalyzing ? "🧚 분석 마법 시전 중..." : "🔮 판독 시작"}
          </button>

          <div className="p-6 bg-white/80 rounded-3xl border border-pink-100 shadow-sm">
            <h3 className="font-bold text-pink-600 mb-2 flex items-center gap-2"><span>📝</span> 요정의 한마디</h3>
            <p className="text-gray-600 text-sm">
              {displayScore !== null ? (displayScore > 60 ? "진실된 인연일 가능성이 매우 높아요!" : "조금 수상한 흔적이 발견되었어요...") : "사진을 분석하면 AI가 진실을 말해줄 거예요."}
            </p>
          </div>
        </section>

        {/* 오른쪽: 결과 리포트 */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 ml-2">🌈 주파수 도메인 분석 (F3-Net)</p>
                <div className="aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 overflow-hidden flex items-center justify-center">
                  {analysisResult.freqImg ? <img src={analysisResult.freqImg} className="w-full h-full object-contain" alt="Frequency" /> : <span className="text-gray-300 text-xs">주파수 분석 대기 중</span>}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 ml-2">🔍 이미지 픽셀 정밀 분석</p>
                <div className="aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 overflow-hidden flex items-center justify-center">
                  {analysisResult.detectImg ? <img src={analysisResult.detectImg} className="w-full h-full object-contain" alt="Detection" /> : <span className="text-gray-300 text-xs">픽셀 분석 대기 중</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-pink-50">
             <p className="font-bold text-gray-700 mb-3">AI 종합 분석 진행도</p>
             <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-pink-300 to-pink-500 h-full transition-all duration-1000" style={{ width: `${displayScore || 0}%` }}></div>
             </div>
             <p className="text-[10px] text-gray-400 mt-4">* 본 결과는 딥러닝 모델의 확률적 수치이며, 인연의 진심을 완벽히 대변하지는 않습니다.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;