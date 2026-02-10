import React, { useState } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null); 
  const [rawFile, setRawFile] = useState(null);           
  const [fileType, setFileType] = useState('');           
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
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
      setFileType(file.type.startsWith('video') ? 'video' : 'image');
      
      setAnalysisResult({ 
        graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: "" 
      });
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
      
      // API 호출
      const apiResult = await app.predict(endpoint, [ rawFile ]);

      console.log("API 응답:", apiResult);

      // 백엔드에서 얼굴 검출 실패 시 raise gr.Error를 던지면 
      // Gradio Client가 내부적으로 에러를 발생시켜 catch 블록으로 이동하지만,
      // 만약 정상 응답 내에 상태 메시지가 포함된 경우를 위해 아래와 같이 처리합니다.

      if (fileType === 'video') {
        /* 비디오 응답 매핑: [평균확률, 그래프경로, 상세데이터(JSON), 상태메시지] */
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          graphImg: apiResult.data[1]?.url,
          comment: apiResult.data[0] > 50 ? "영상 전반에서 자연스러운 흐름이 관찰됩니다." : "특정 구간에서 인위적인 프레임 왜곡이 감지되었습니다."
        });
      } else {
        /* 이미지 응답 매핑: [확률, 주파수차트, 픽셀차트, 상태메시지] */
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          freqImg: apiResult.data[1]?.url,
          detectImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50 ? "진실된 인연일 가능성이 높아요!" : "조금 수상한 흔적이 발견되었어요..."
        });
      }

    } catch (error) {
      console.error("API 호출 에러 상세:", error);
      
      // 백엔드에서 보낸 gr.Error 메시지를 사용자에게 보여줌
      if (error.message.includes("얼굴을 검출하지 못했습니다")) {
        alert("🔍 얼굴을 찾을 수 없어요!\n사진 속 인물의 얼굴이 잘 보이도록 다시 찍어주세요.");
      } else {
        alert("AI 요정이 잠시 자리를 비웠나봐요. (서버 연결 실패)");
      }
      
      // 결과 초기화
      setAnalysisResult({ 
        graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: "얼굴 검출에 실패하여 분석을 중단했습니다." 
      });
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
                  <p className="text-[10px] text-gray-400 mt-2">얼굴이 정면으로 잘 보이는 파일을 선택해주세요!</p>
                </div>
              )}
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
            </label>
          </div>

          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all ${isAnalyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-pink-400 to-rose-400 hover:scale-[1.02]'}`}>
            {isAnalyzing ? "🧚 얼굴 찾는 중..." : "🔮 판독 시작"}
          </button>

          <div className="p-6 bg-white/80 rounded-3xl border border-pink-100 shadow-sm">
            <h3 className="font-bold text-pink-600 mb-2 flex items-center gap-2"><span>📝</span> 분석 상태</h3>
            <p className="text-gray-600 text-sm italic">
              {analysisResult.comment || "파일을 분석하면 AI가 결과를 말해줄 거예요."}
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

            <div className="mt-8">
              {fileType === 'video' ? (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-500 ml-2">📊 시간대별 신뢰도 변화</p>
                  <div className="w-full bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 p-2">
                    {analysisResult.graphImg ? (
                      <img src={analysisResult.graphImg} className="w-full h-auto rounded-xl" alt="Timeline Graph" />
                    ) : (
                      <div className="h-48 flex items-center justify-center text-gray-300">얼굴 검출 및 분석 완료 후 그래프가 표시됩니다.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 ml-2">🌈 주파수 도메인 분석</p>
                    <div className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 overflow-hidden flex items-center justify-center">
                      {analysisResult.freqImg ? <img src={analysisResult.freqImg} className="w-full h-full object-contain" alt="Freq" /> : <span className="text-gray-300 text-xs">검출 대기 중</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 ml-2">🔍 픽셀 정밀 분석</p>
                    <div className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-pink-100 overflow-hidden flex items-center justify-center">
                      {analysisResult.detectImg ? <img src={analysisResult.detectImg} className="w-full h-full object-contain" alt="Pixel" /> : <span className="text-gray-300 text-xs">검출 대기 중</span>}
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
             <p className="text-[10px] text-gray-400 mt-4">* 얼굴이 인식되지 않으면 결과가 나오지 않습니다. 흐릿한 사진이나 마스크를 쓴 사진은 분석이 어려울 수 있습니다.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;