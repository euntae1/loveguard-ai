import React, { useState } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null); // 화면 표시용 (base64)
  const [imageFile, setImageFile] = useState(null); // API 전송용 (File 객체)
  const [isAnalyzing, setIsAnalyzing] = useState(false); // 로딩 상태
  const [result, setResult] = useState(null); // AI 결과 저장

  // 1. 이미지 선택 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // 브라우저에서 즉시 보여주기 위한 URL 생성
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setResult(null); // 새 사진 올리면 이전 결과 초기화
      console.log("파일 선택 완료:", file.name);
    }
  };

  // 2. AI 분석 실행 (Hugging Face 연결)
  const handleAnalyze = async () => {
    if (!imageFile) {
      alert("분석할 사진을 먼저 올려주세요! ✨");
      return;
    }

    setIsAnalyzing(true);

    try {
      // euntaejang/deepfake 스페이스에 연결
      const app = await client("euntaejang/deepfake");
      
      // /predict 엔드포인트 호출
      const apiResult = await app.predict("/predict", { 
        img: imageFile 
      });

      // 결과 저장
      setResult(apiResult.data[0]);
      console.log("AI 분석 성공:", apiResult.data[0]);
    } catch (error) {
      console.error("API 호출 에러:", error);
      alert("AI 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 결과 점수 계산 (진짜일 확률 추출)
  const realConfidence = result 
    ? (result.confidences.find(c => c.label === "진짜일 확률")?.confidence * 100 || 0).toFixed(0)
    : 24; 

  return (
    <div className="min-h-screen bg-[#FFF0F5] p-4 md:p-8 font-sans text-[#5F4B8B]">
      {/* 상단 헤더 */}
      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-center bg-white/60 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-pink-100">
        <div className="flex items-center gap-2">
          <span className="text-3xl">💖</span>
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">
            LoveGuard AI
          </h1>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-5 py-2 bg-pink-500 text-white rounded-full font-bold shadow-lg shadow-pink-200 hover:bg-pink-600 hover:-translate-y-0.5 transition-all">
          ✨ 다시 하기
        </button>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 왼쪽: 사진 업로드 섹션 */}
        <section className="lg:col-span-5 space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-300 to-rose-300 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition"></div>
            
            {/* 고유 ID 부여로 클릭 감도 향상 */}
            <label 
              htmlFor="image-upload-input"
              className="relative aspect-[3/4] bg-white rounded-[2rem] flex flex-col items-center justify-center border-4 border-white shadow-xl overflow-hidden cursor-pointer hover:border-pink-100 transition-colors"
            >
              {selectedImage ? (
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center p-4 text-center">
                  <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner">📸</div>
                  <p className="text-pink-400 font-bold">여기를 눌러 사진 선택</p>
                  <p className="text-gray-300 text-xs mt-2">인연의 진실을 확인해보세요</p>
                </div>
              )}
              <input 
                id="image-upload-input"
                type="file" 
                className="hidden" 
                onChange={handleImageChange} 
                accept="image/*" 
              />
            </label>
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all ${
              isAnalyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-pink-400 to-rose-400 hover:scale-[1.02] active:scale-95'
            }`}>
            {isAnalyzing ? "🧚 판독 중..." : "🔮 인연 판독 시작"}
          </button>

          <div className="p-6 bg-white/80 rounded-3xl border border-pink-100 shadow-sm">
            <h3 className="font-bold text-pink-600 mb-2 flex items-center gap-2 text-lg">
              <span>📝</span> 요정의 한마디
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {isAnalyzing 
                ? "두근두근... 사진 속에 숨겨진 마법의 흔적을 찾는 중이에요!" 
                : result 
                ? (realConfidence > 60 ? "이분은 정말 따뜻한 분 같네요! 진짜 인연일 확률이 높아요." : "음... 이 사진은 인공지능의 느낌이 나요. 조금만 더 주의 깊게 살펴보세요!")
                : "상대의 사진을 올리면 제가 몰래 속삭여 드릴게요!"}
            </p>
          </div>
        </section>

        {/* 오른쪽: 분석 결과 섹션 */}
        <section className="lg:col-span-7 space-y-6">
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl shadow-pink-100/50 border-t-8 border-pink-400 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl">👑</div>
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <p className="text-pink-400 font-bold uppercase tracking-widest text-xs mb-1">인연 신뢰 지수</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-7xl font-black text-pink-500">{realConfidence}</p>
                  <p className="text-2xl font-bold text-pink-400">%</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`px-4 py-2 rounded-2xl text-sm font-black animate-bounce shadow-lg text-white ${realConfidence > 50 ? 'bg-green-400' : 'bg-rose-500'}`}>
                  {realConfidence > 50 ? '✅ 안심 인연' : '🚨 주의 요망'}
                </div>
                <p className="text-rose-400 text-xs mt-3 font-medium">
                  {realConfidence > 50 ? '진실된 미소가 느껴져요' : 'AI가 만든 가짜일 가능성이 커요'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-pink-50 flex items-center gap-4 group hover:bg-pink-50 transition-colors">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-xl shadow-inner">📊</div>
              <div className="flex-1">
                <p className="font-bold text-gray-700">인공지능 정밀 판독 결과</p>
                <div className="h-3 bg-gray-100 mt-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-pink-400 h-full transition-all duration-1000 ease-out" 
                    style={{ width: `${realConfidence}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-pink-500 font-bold text-sm">{realConfidence}%</span>
            </div>

            <div className="p-4 bg-pink-50/50 rounded-2xl text-[11px] text-pink-400 leading-tight">
              * 본 AI 서비스(LoveGuard)는 F3-Net 모델을 기반으로 딥페이크 여부를 판별합니다. 분석 결과는 통계적 수치이며 최종 판단의 책임은 사용자에게 있습니다.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;