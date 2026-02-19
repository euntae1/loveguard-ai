/* eslint-disable jsx-a11y/alt-text */
import React, { useState, useRef } from 'react';
import { client } from "@gradio/client";
import './index.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  const [isUrlMode, setIsUrlMode] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const [analysisResult, setAnalysisResult] = useState({
    srmImg: null,
    pixelImg: null,
    graphImg: null,
    urlGridImg: null,
    realConfidence: null,
    comment: ""
  });

  const newsData = [
    { id: 1, src: "/image/news_1.png", label: "EVIDENCE_01" },
    { id: 2, src: "/image/news_2.jpeg", label: "EVIDENCE_02" },
    { id: 3, src: "/image/news_3.jpg", label: "EVIDENCE_03" }
  ];

  const startProgress = (seconds) => {
    clearInterval(progressTimer.current);
    setProgress(0);
    const interval = 100;
    const step = 100 / (seconds * (1000 / interval));

    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressTimer.current);
          return prev;
        }
        return prev + step;
      });
    }, interval);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRawFile(file);
      setSelectedFile(URL.createObjectURL(file));
      const isVideo = file.type.startsWith('video');
      setFileType(isVideo ? 'video' : 'image');
      setAnalysisResult({ srmImg: null, pixelImg: null, graphImg: null, urlGridImg: null, realConfidence: null, comment: "" });
      setProgress(0);
      clearInterval(progressTimer.current);
    }
  };

  const handleUrlAnalyze = async () => {
    if (!inputUrl) {
      alert("타겟 URL을 입력하십시오.");
      return;
    }
    setIsExtracting(true);
    setAnalysisResult({ srmImg: null, pixelImg: null, graphImg: null, urlGridImg: null, realConfidence: null, comment: "" });
    startProgress(10);

    try {
      const app = await client("euntaejang/deepfake");
      const result = await app.predict("/extract_url", [inputUrl]);

      if (result.data) {
        clearInterval(progressTimer.current);
        setProgress(100);
        setAnalysisResult({
          realConfidence: result.data[0], // 문자열 "15/20"
          urlGridImg: result.data[1]?.url,
          comment: `[원격분석완료] ${result.data[2]}`
        });
      }
    } catch (error) {
      clearInterval(progressTimer.current);
      setProgress(0);
      alert("URL 분석 실패");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!rawFile) {
      alert("분석할 증거물을 확보하십시오.");
      return;
    }
    setIsAnalyzing(true);

    if (fileType === 'image') {
      startProgress(5);
    } else {
      const tempVideo = document.createElement('video');
      tempVideo.src = selectedFile;
      tempVideo.onloadedmetadata = () => {
        const duration = tempVideo.duration || 10;
        startProgress(duration * 2);
      };
    }

    try {
      const app = await client("euntaejang/deepfake");
      const endpoint = fileType === 'video' ? "/predict_video" : "/predict";
      const apiResult = await app.predict(endpoint, [rawFile]);

      clearInterval(progressTimer.current);
      setProgress(100);

      if (fileType === 'video') {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          graphImg: apiResult.data[1]?.url,
          comment: "[영상 타임라인 분석 완료] 데이터 무결성 검증됨."
        });
      } else {
        setAnalysisResult({
          realConfidence: apiResult.data[0],
          srmImg: apiResult.data[1]?.url,
          pixelImg: apiResult.data[2]?.url,
          comment: apiResult.data[0] > 50
            ? "[판독완료] 픽셀 및 주파수 무결성 통과."
            : "[경고] 생성 노이즈 및 주파수 변조 감지."
        });
      }
    } catch (error) {
      clearInterval(progressTimer.current);
      setProgress(0);
      alert("얼굴을 검출할 수 없습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ✅ URL 모드면 문자열 그대로, 아니면 숫자 처리
  const displayScore = analysisResult.realConfidence !== null
    ? (isUrlMode
        ? analysisResult.realConfidence
        : Math.floor(analysisResult.realConfidence))
    : null;

  return (
    <div className="min-h-screen forensic-grid p-6 md:p-12 text-[#00f2ff] bg-[#0a0e14]">
      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#121b28] border-2 border-[#00f2ff]/40 p-10 flex flex-col min-h-[600px] shadow-2xl relative">

            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-[#00f2ff]/60 uppercase font-bold mb-2 tracking-widest">신뢰도</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-9xl font-black italic text-[#00f2ff]">
                    {displayScore ?? "00"}
                  </span>

                  {/* ✅ URL 모드 아닐 때만 % 표시 */}
                  {!isUrlMode && (
                    <span className="text-4xl font-bold">%</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-[#00f2ff]/60 mb-4 font-bold uppercase">진위여부</p>

                {/* ✅ 일반 모드 */}
                {!isUrlMode && displayScore !== null && (
                  <div className={`px-8 py-4 text-2xl font-black border-4 ${
                    displayScore > 50
                      ? 'border-green-500 text-green-500'
                      : 'border-red-600 text-red-600 animate-pulse'
                  }`}>
                    {displayScore > 50 ? '통과' : '검거'}
                  </div>
                )}

                {/* ✅ URL 모드 */}
                {isUrlMode && displayScore && (
                  <div className="px-8 py-4 text-2xl font-black border-4 border-[#00f2ff] text-[#00f2ff]">
                    집단 분석 완료
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
