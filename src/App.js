import React, { useState } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null); // 화면 표시용 (이미지/비디오 URL)
  const [rawFile, setRawFile] = useState(null);           // API 전송용 파일 객체
  const [fileType, setFileType] = useState('');           // 'image' 또는 'video' 구분
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [analysisResult, setAnalysisResult] = useState({
    graphImg: null,       // 비디오용 통합 분석 그래프
    freqImg: null,        // 이미지용 주파수 분석 차트
    detectImg: null,      // 이미지용 픽셀 분석 차트
    realConfidence: null, // 종합 신뢰도 점수
    comment: ""           // AI 분석 코멘트
  });

  // 파일 선택 핸들러
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setSelectedFile(URL.createObjectURL(file));
      setFileType(file.type.startsWith('video') ? 'video' : 'image');
      
      // 결과 초기화
      setAnalysisResult({ 
        graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: "" 
      });
    }
  };

  // 분석 실행 핸들러
  const handleAnalyze = async () => {
    if (!rawFile) {
      alert("분석할 사진이나 영상을 먼저 올려주세요! ✨");
      return;
    }

    setIsAnalyzing(true);

    try {
      // 1. 허깅페이스 스페이스 연결 (사용자 환경에 맞게 경로 확인)
      const app = await client("euntaejang/deepfake");
      
      // 2. 파일 타입에 따라 다른 API 엔드포인트 호출
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      
      const apiResult = await app.predict(endpoint, [ rawFile ]);

      console.log("API 응답 성공:", apiResult);

      if (fileType === 'video') {
        /* 비디오 응답 매핑: [평균확률, 통합그래프경로, 상세데이터] */
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          graphImg: apiResult.data[1]?.url,
          comment: apiResult.data[0] > 50 
            ? "영상 전체 구간에서 일관된 신뢰도가 관찰됩니다. 안심하셔도 좋습니다!" 
            : "일부 구간에서 분석 지표가 급격히 변동됩니다. 딥페이크 가능성이 있어요."
        });
      } else {
        /* 이미지 응답 매핑: [확률, 주파수차트, 픽셀차트] */
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          freqImg: apiResult.data[1]?.url,
          detectImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50 
            ? "진실된 인연일 가능성이 높아요! 아주 자연스러운 사진입니다." 
            : "이미지 데이터에서 인위적인 편집 흔적이 발견되었습니다. 주의하세요!"
        });
      }

    } catch (error) {
      console.error("API 호출 에러:", error);
      
      // 백엔드(Gradio)에서 보낸 에러 메시지 추출
      const errorMessage = error.message || "";
      
      if (errorMessage.includes("얼굴을 찾을 수 없습니다")) {
        alert("🚨 얼굴 검출 실패: 사진에서 얼굴을 찾을 수 없습니다. 정면이 잘 보이고 밝은 사진으로 다시 시도해주세요.");
      } else if (errorMessage.includes("이미지를 업로드")) {
        alert("📸 사진 파일을 다시 확인해주세요.");
      } else {
        alert("AI 서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null 
    ? Math.floor(analysisResult.realConfidence) 
    : null;

  return (
    <div className="min-h-screen bg-[#FFF0F5] p-4 md:p-8 font-sans text-[#5F4B8B]">
      {/* 헤더 */}
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
        
        {/* 왼쪽: 미디어 업로드 및 컨트롤 */}
        <section className="lg:col-span-4 space-y-6">
          <div className="relative group">
            <label htmlFor="file-upload" className="relative aspect-square bg-white rounded-[2rem] flex flex-col items-center justify-center border-4 border-white shadow-xl overflow-hidden cursor-pointer">
              {selectedFile ? (
                fileType === 'video' ? (
                  <video src={selectedFile} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={selectedFile} alt="Upload" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="text-center p-4">
                  <div className="text-5xl mb-3">🎬</div>
                  <p className="text-pink-400 font-bold">사진 또는 영상 업로드</p>
                  <p className="text-gray-400 text-xs mt-2">얼굴이 선명한 정면 파일을 올려주세요</p>
                </div>
              )}
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
            </label>
          </div>

          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all ${isAnalyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-pink-400 to-rose-400 hover:scale-[1.02] active:scale-95'}`}>
            {isAnalyzing ? "🧚 요정이 분석 중..." : "🔮 판독 시작"}
          </button>

          <div className="p-6 bg-white/80 rounded-3xl border border-pink-100 shadow-sm">
            <h3 className="font-bold text-pink-600 mb-2 flex items-center gap-2"><span>📝</span> 요정의 한마디</h3>
            <p className="text-gray-600 text-sm italic leading-relaxed">
              {analysisResult.comment || "파일을 분석하면 AI가 진실을 말해줄 거예요."}
            </p>
          </div>
        </section>

        {/* 오른쪽: 분석 결과 리포트 */}
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

            {/* 결과 시각화 영역 */}
            <div className="mt-8">
              {fileType === 'video' ? (
                // 비디오 분석 결과 (통합 그래프 하나만 출력)
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-500 ml-2">📊 통합 분석 리포트 (빨강:픽셀 / 파랑:주파수 / 초록:통합)</p>
                  <div className="w-full bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 p-2 overflow-hidden">
                    {analysisResult.graphImg ? (
                      <img src={analysisResult.graphImg} className="w-full h-auto rounded-xl shadow-inner" alt="Integrated Analysis Graph" />
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-gray-300 gap-2">
                        <span className="text-4xl">📉</span>
                        <p>영상 분석이 완료되면 통합 그래프가 표시됩니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // 이미지 분석 결과 (주파수 & 픽셀 두 개 유지)
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

          <div className="p-6 bg-white rounded-2xl border border-pink-50">
             <p className="font-bold text-gray-700 mb-3">AI 종합 분석 진행도</p>
             <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-pink-300 to-pink-500 h-full transition-all duration-1000" style={{ width: `${displayScore || 0}%` }}></div>
             </div>
             <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
               * 본 결과는 딥러닝 모델의 확률적 수치이며, 원본의 압축 상태나 조명에 따라 오차가 발생할 수 있습니다.<br/>
               * 영상 분석의 경우 속도 최적화를 위해 특정 프레임 간격으로 샘플링하여 분석을 진행합니다.
             </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;