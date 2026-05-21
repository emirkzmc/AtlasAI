import { useNavigate } from "react-router-dom";

export default function MentorEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <img
          src="/icons/brain-icon.svg"
          alt=""
          aria-hidden="true"
          className="h-8 w-8 object-contain opacity-50 grayscale"
        />
      </div>
      <h3 className="mb-2 text-base font-semibold text-gray-900">
        Henüz Analiz Edilecek Veri Yok
      </h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">
        Mentorluk önerileri alabilmek için sistemin senin quiz performansını analiz etmesi gerekiyor. Öğrenmeye hemen başla!
      </p>
      <button
        onClick={() => navigate("/panel/student/dokumanlarim")}
        className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        Doküman Yükle & Test Çöz
      </button>
    </div>
  );
}
