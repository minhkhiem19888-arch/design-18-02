
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUpload } from './components/ImageUpload';
import { Spinner } from './components/Spinner';
import { ResultCard } from './components/ResultCard';
import { generateDesigns } from './services/geminiService';
import type { GenerationResult } from './types';

const App: React.FC = () => {
  const [dob, setDob] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const isFormValid = dob && imageFile;

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFormValid) {
      setError('Vui lòng điền đầy đủ thông tin và tải lên ảnh.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const generatedResult = await generateDesigns({ dob, imageFile });
      setResult(generatedResult);
    } catch (e) {
      console.error(e);
      setError('Đã xảy ra lỗi khi tạo phương án. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [dob, imageFile, isFormValid]);

  const handleReset = () => {
    setDob('');
    setImageFile(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-primary-bg-light font-sans antialiased">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        {!result && !isLoading && (
          <div className="max-w-2xl mx-auto bg-card p-6 md:p-8 rounded-xl shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-accent mb-2">Nhận Quà Tặng Miễn Phí</h2>
            <p className="text-center text-text-secondary mb-6">Nhận 2 phương án thiết kế mặt tiền ứng dụng AI & Phong Thủy</p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-text-secondary mb-2">Ngày/Tháng/Năm Sinh</label>
                <input
                  type="date"
                  id="dob"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-primary-bg-light border border-accent/20 rounded-md p-3 text-text-primary focus:ring-accent focus:border-accent transition"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Ảnh Lô Đất (Mặt tiền hiện trạng)</label>
                <ImageUpload onFileChange={setImageFile} />
              </div>
              {error && <p className="text-red-400 text-center">{error}</p>}
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full bg-accent text-primary-bg font-bold py-3 px-4 rounded-md hover:bg-accent-dark transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none"
              >
                Tạo 2 Phương Án
              </button>
            </form>
          </div>
        )}

        {isLoading && (
          <div className="text-center">
            <Spinner />
            <p className="text-text-secondary mt-4 text-lg">AI đang phân tích & thiết kế... Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {result && (
          <div className="fade-in">
             <h2 className="text-3xl md:text-4xl font-bold text-center text-accent mb-8">2 Phương Án Thiết Kế Dành Cho Bạn</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ResultCard option={result.optionA} title="Phương Án A" />
              <ResultCard option={result.optionB} title="Phương Án B" />
            </div>
            <div className="text-center mt-12">
              <button
                onClick={handleReset}
                className="bg-accent text-primary-bg font-bold py-3 px-8 rounded-md hover:bg-accent-dark transition-transform transform hover:scale-105"
              >
                Tạo lại phương án khác
              </button>
            </div>
          </div>
        )}
      </main>
       <style>{`
          .fade-in {
            animation: fadeIn 1s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
    </div>
  );
};

export default App;
