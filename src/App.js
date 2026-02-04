import React, { useState } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null); 
  const [imageFile, setImageFile] = useState(null); 
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [analysisResult, setAnalysisResult] = useState({
    freqImg: null,    // 주파수 분석 이미지
    detectImg: null,  // 객체 탐지/분석 이미지
    textData: null    // 수치 데이터
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setSelectedImage(URL.createObjectURL(file));
      setAnalysisResult({ freqImg: null, detectImg: null, textData: null });
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      alert("분석할 사진을 먼저 올려주세요! ✨");
      return;
    }

    setIsAnalyzing(true);

    try {
      const app = await client("euntaejang/deepfake");
      const apiResult = await app.predict("/predict", { 
        img: imageFile 
      });

      // API 반환 구조에 맞게 매핑 (일반적으로 index 0: 이미지, 1: 이미지, 2: 텍스트)
      setAnalysisResult({
        freqImg: apiResult.data[0]?.url, 
        detectImg: apiResult.data[1]?.url,
        textData: apiResult.data[2]
      });

    } catch (error) {
      console.error("API 호출 에러:", error);
      alert("AI 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 결과 점수 계산
  const realConfidence = analysisResult.textData 
    ? (analysisResult.textData.confidences.find(c => c.label === "진짜일 확률")?.confidence * 100 || 0).toFixed(0)
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
        
        {/* 왼쪽: 업로드 및 조작 */}
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
              {realConfidence ? (realConfidence > 60 ? "진실된 인연일 가능성이 매우 높아요!" : "조금 수상한 흔적이 발견되었어요...") : "사진을 분석하면 AI가 진실을 말해줄 거예요."}
            </p>
          </div>
        </section>

        {/* 오른쪽: 상세 분석 리포트 */}
        <section className="lg:col-span-8 space-y-6">
          {/* 수치 결과 카드 */}
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl border-t-8 border-pink-400">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-pink-400 font-bold text-xs tracking-widest uppercase">Love Confidence</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-7xl font-black text-pink-500">{realConfidence || "--"}</p>
                  <p className="text-2xl font-bold text-pink-400">%</p>
                </div>
              </div>
              {realConfidence && (
                <div className={`px-6 py-3 rounded-2xl text-lg font-black animate-bounce text-white ${realConfidence > 50 ? 'bg-green-400' : 'bg-rose-500'}`}>
                  {realConfidence > 50 ? '✅ 안심 인연' : '🚨 주의 요망'}
                </div>
              )}
            </div>

            {/* 정밀 분석 이미지 영역 */}
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

          {/* 하단 바 및 푸터 */}
          <div className="p-6 bg-white rounded-2xl border border-pink-50">
             <p className="font-bold text-gray-700 mb-3">AI 종합 분석 진행도</p>
             <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-pink-300 to-pink-500 h-full transition-all duration-1000" style={{ width: `${realConfidence || 0}%` }}></div>
             </div>
             <p className="text-[10px] text-gray-400 mt-4">* 본 결과는 딥러닝 모델의 확률적 수치이며, 인연의 진심을 완벽히 대변하지는 않습니다.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;