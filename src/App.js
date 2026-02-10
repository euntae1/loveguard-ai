import React, { useState, useEffect } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0); // 영상 길이 저장
  const [progress, setProgress] = useState(0);          // 로딩바 퍼센트
  
  const [analysisResult, setAnalysisResult] = useState({
    graphImg: null,
    freqImg: null,
    detectImg: null,
    realConfidence: null,
    comment: ""
  });

  // 파일 선택 및 비디오 시간 측정
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
        video.onloadedmetadata = () => {
          setVideoDuration(video.duration);
          console.log("영상 길이(초):", video.duration);
        };
        video.src = URL.createObjectURL(file);
      }
      
      // 상태 초기화
      setAnalysisResult({ graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: "" });
      setProgress(0);
    }
  };

  // 분석 실행
  const handleAnalyze = async () => {
    if (!rawFile) {
      alert("파일을 먼저 업로드해주세요! ✨");
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    // --- 로딩바 애니메이션 로직 ---
    // 비디오는 (길이 * 2)초, 이미지는 5초를 목표로 설정
    const estimatedTime = fileType === 'video' ? Math.max(videoDuration * 2, 8) : 5; 
    const intervalTime = 100; // 0.1초마다 업데이트
    const totalSteps = (estimatedTime * 1000) / intervalTime;
    const stepIncrement = 100 / totalSteps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(timer); // 서버 응답 대기를 위해 95%에서 멈춤
          return 95;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    try {
      const app = await client("euntaejang/deepfake");
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      const apiResult = await app.predict(endpoint, [rawFile]);

      // 성공 시 즉시 100% 채우기
      clearInterval(timer);
      setProgress(100);

      if (fileType === 'video') {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          graphImg: apiResult.data[1]?.url,
          comment: apiResult.data[0] > 50 
            ? "영상 전체적으로 일관된 데이터가 관찰됩니다. 안심하셔도 좋습니다!" 
            : "특정 구간에서 합성 징후가 포착되었습니다. 주의가 필요합니다."
        });
      } else {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          freqImg: apiResult.data[1]?.url,
          detectImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50 
            ? "아주 자연스러운 사진이에요. 가짜일 확률이 매우 낮습니다." 
            : "픽셀 구조에서 인위적인 수정 흔적이 발견되었습니다."
        });
      }

    } catch (error) {
      clearInterval(timer);
      setProgress(0);
      console.error(error);
      const msg = error.message || "";
      alert(msg.includes("얼굴") ? "얼굴을 찾을 수 없습니다. 정면 사진을 올려주세요!" : "분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displayScore = analysisResult.realConfidence !== null ? Math.floor(analysisResult.realConfidence) : null;

  return (
    <div className="min-h-screen bg-[#FFF0F5] p-4 md:p-8 font-sans text-[#5F4B8B]">
      <header className="max-w-6xl mx-auto mb-10 flex justify-between items-center bg-white/60 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-pink-100">
        <div className="flex items-center gap-2">
          <span className="text-3xl">💖</span>
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent">LoveGuard AI</h1>
        </div>
        <button onClick={() => window.location.reload()} className="px-5 py-2 bg-pink-500 text-white rounded-full font-bold shadow-lg hover:bg-pink-600 transition-all">새로고침</button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 왼쪽: 미디어 업로드 */}
        <section className="lg:col-span-4 space-y-6">
          <div className="relative group">
            <label htmlFor="file-upload" className="relative aspect-square bg-white rounded-[2rem] flex flex-col items-center justify-center border-4 border-white shadow-xl overflow-hidden cursor-pointer">
              {selectedFile ? (
                fileType === 'video' ? <video src={selectedFile} className="w-full h-full object-cover" controls /> : <img src={selectedFile} alt="Upload" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <div className="text-5xl mb-3">🎬</div>
                  <p className="text-pink-400 font-bold">사진/영상 업로드</p>
                </div>
              )}
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <button onClick={handleAnalyze} disabled={isAnalyzing} className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all ${isAnalyzing ? 'bg-gray-400' : 'bg-gradient-to-r from-pink-400 to-rose-400 hover:scale-105'}`}>
            {isAnalyzing ? "분석 중..." : "🔮 판독 시작"}
          </button>

          <div className="p-6 bg-white/80 rounded-3xl border border-pink-100 shadow-sm">
            <h3 className="font-bold text-pink-600 mb-2 flex items-center gap-2"><span>📝</span> AI 코멘트</h3>
            <p className="text-gray-600 text-sm italic">{analysisResult.comment || "분석 버튼을 누르면 AI가 결과를 알려줍니다."}</p>
          </div>
        </section>

        {/* 오른쪽: 결과 리포트 */}
        <section className="lg:col-span-8 space-y-6">
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl border-t-8 border-pink-400">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-pink-400 font-bold text-xs uppercase tracking-widest">Confidence Score</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-7xl font-black text-pink-500">{displayScore ?? "--"}</p>
                  <p className="text-2xl font-bold text-pink-400">%</p>
                </div>
              </div>
              {displayScore !== null && (
                <div className={`px-6 py-3 rounded-2xl text-lg font-black text-white ${displayScore > 50 ? 'bg-green-400' : 'bg-rose-500 animate-pulse'}`}>
                  {displayScore > 50 ? '✅ 진본 가능성 높음' : '🚨 위조 가능성 높음'}
                </div>
              )}
            </div>

            {/* 진행도 로딩바 */}
            <div className="mt-8 p-6 bg-gray-50 rounded-3xl border border-pink-50">
               <div className="flex justify-between mb-3">
                  <p className="font-bold text-gray-700">{isAnalyzing ? "🧚 요정이 데이터를 읽는 중..." : "📊 분석 진행도"}</p>
                  <p className="text-pink-500 font-black">{Math.floor(progress)}%</p>
               </div>
               <div className="h-5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-300 to-rose-500 transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                  ></div>
               </div>
               <p className="text-[10px] text-gray-400 mt-3 italic">
                 {fileType === 'video' ? "* 비디오 분석은 영상 길이에 따라 최대 몇 분이 소요될 수 있습니다." : "* 이미지 분석은 보통 5초 이내에 완료됩니다."}
               </p>
            </div>

            {/* 시각화 결과 */}
            <div className="mt-8 grid grid-cols-1 gap-4">
              {fileType === 'video' ? (
                analysisResult.graphImg && <img src={analysisResult.graphImg} className="w-full rounded-2xl shadow-lg border border-pink-100" alt="Result" />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {analysisResult.freqImg && <img src={analysisResult.freqImg} className="rounded-xl border shadow-sm" alt="Freq" />}
                  {analysisResult.detectImg && <img src={analysisResult.detectImg} className="rounded-xl border shadow-sm" alt="Detect" />}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;