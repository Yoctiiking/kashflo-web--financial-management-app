"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { OnboardingSlide } from "@/lib/onboardingSlides";

interface Props {
  slides: OnboardingSlide[];
  onComplete: () => void;
}

export default function OnboardingCarousel({ slides, onComplete }: Props) {
  const t = useTranslations("onboarding");
  const tSlides = useTranslations("onboarding.slides");
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;
  const slide = slides[index];

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setIndex(i => i + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 z-[100] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-2">
          <button
            onClick={onComplete}
            className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-sm transition-colors hover:text-gray-900 dark:hover:text-white hover:underline"
          >
            {t("skip")}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-6">{slide.icon}</div>
          <h2 className="text-gray-900 dark:text-white font-bold text-2xl mb-3">{tSlides(`${slide.key}.title`)}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-8">{tSlides(`${slide.key}.description`)}</p>

          <div className="flex items-center justify-center gap-2 mb-8">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-emerald-500" : "w-1.5 bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
          >
            {isLast ? t("done") : t("next")}
          </button>
        </div>
      </div>
    </div>
  );
}