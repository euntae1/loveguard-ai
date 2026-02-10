import React, { useState, useEffect, useRef } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0); // 로딩바 퍼센트
  const [estimatedTime, setEstimatedTime] = useState(0);
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
      setProgress(0);
      
      if (type === 'image') {
        setEstimatedTime(2);
      } else {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => setEstimatedTime(Math.round(video.duration * 2));
        video.src = URL.createObjectURL(file);
      }
    }
  };

  const startLoading = () => {
    setProgress(0);
    const duration = estimatedTime * 1000; // ms 단위
    const interval = 100; // 0.1초마다 업데이트
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; // 실제 완료 전까진 95%에서 대기
        return prev + step;
      });
    }, interval);
  };

  const handleAnalyze = async () => {
    if (!rawFile) return alert("파일을 올려주세요!");

    setIsAnalyzing(true);
    setAnalysisResult({ graphImg: null, freqImg: null, detectImg: null, realConfidence: null, comment: "" });
    startLoading();

    try {
      const app = await client("euntaejang/deepfake");
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      const apiResult = await app.predict(endpoint, [rawFile]);

      clearInterval(timerRef.current);
      setProgress(100); // 완료 시 100%

      if (fileType === 'video') {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          graphImg: apiResult.data[1]?.url,
          comment: "영상 분석이 완료되었습니다."
        });
      } else {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          freqImg: apiResult.data[1]?.url,
          detectImg: apiResult.data[2]?.url,
          comment: "이미지 분석이 완료되었습니다."
        });
      }
    } catch (error) {
      clearInterval(timerRef.current);
      setProgress(0);
      alert(error.message.includes("얼굴") ? "얼굴을 찾을 수 없습니다!" : "분석 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF0F5] p-8 text-[#5F4B8B]">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 왼쪽: 컨트롤 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-4 rounded-3xl shadow-xl aspect-square overflow-hidden flex items-center justify-center border-4 border-white">
            {selectedFile ? (
              fileType === 'video' ? <video src={selectedFile} autoPlay loop muted /> : <img src={selectedFile} alt="src" />
            ) : (
              <label htmlFor="up" className="cursor-pointer text-center">
                <div className="text-5xl mb-2">📤</div>
                <p className="font-bold">파일을 업로드하세요</p>
                <input id="up" type="file" className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>

          {/* 실시간 움직이는 로딩바 */}
          {estimatedTime > 0 && (
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-pink-100">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span>{isAnalyzing ? "AI 분석 진행 중..." : "준비 완료"}</span>
                <span>예상: {estimatedTime}초</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-400 to-indigo-500 transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className="w-full py-4 bg-pink-500 text-white rounded-2xl font-black shadow-lg hover:bg-pink-600 disabled:bg-gray-300">
            {isAnalyzing ? "🔮 요정이 분석 중..." : "✨ 판독 시작"}
          </button>
        </div>

        {/* 오른쪽: 결과 */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] shadow-xl min-h-[500px]">
          <p className="text-pink-400 font-bold uppercase tracking-widest text-sm">Real Confidence</p>
          <div className="text-7xl font-black text-pink-500 mb-8">
            {analysisResult.realConfidence !== null ? Math.floor(analysisResult.realConfidence) : "--"}
            <span className="text-2xl font-bold">%</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fileType === 'video' ? (
              <div className="col-span-2">
                {analysisResult.graphImg && <img src={analysisResult.graphImg} className="w-full rounded-xl border" alt="graph" />}
              </div>
            ) : (
              <>
                <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-pink-50">
                  {analysisResult.freqImg ? <img src={analysisResult.freqImg} className="w-full h-full object-contain" alt="f" /> : "Freq Chart"}
                </div>
                <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-pink-50">
                  {analysisResult.detectImg ? <img src={analysisResult.detectImg} className="w-full h-full object-contain" alt="p" /> : "Pixel Chart"}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;