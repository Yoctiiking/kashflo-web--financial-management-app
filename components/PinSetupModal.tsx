"use client";

import { useState } from "react";
import { setPin, removePin, hasPinSet } from "@/lib/pinLock";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinSetupModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [firstPin, setFirstPin] = useState("");
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState("");

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPinValue(newPin);
    setError("");

    if (newPin.length === 4) {
      if (step === "enter") {
        setFirstPin(newPin);
        setPinValue("");
        setStep("confirm");
      } else {
        if (newPin === firstPin) {
          setPin(newPin).then(() => {
            onSuccess();
            onClose();
          });
        } else {
          setError("Les codes ne correspondent pas");
          setTimeout(() => {
            setPinValue("");
            setFirstPin("");
            setStep("enter");
          }, 800);
        }
      }
    }
  };

  const handleDelete = () => setPinValue(p => p.slice(0, -1));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md p-8 text-center">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-gray-900 dark:text-white font-semibold text-xl">
            {step === "enter" ? "Créer un code" : "Confirmer le code"}
          </h2>
          <button onClick={onClose} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X className="w-5 h-5" strokeWidth={2} /></button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-8">
          {step === "enter" ? "Choisis un code à 4 chiffres" : "Entre à nouveau ton code"}
        </p>

        <div className="flex justify-center gap-4 mb-10">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length ? "bg-emerald-500 border-emerald-500" : "border-gray-300 dark:border-gray-700"
              }`}
            />
          ))}
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-4">
          {["1","2","3","4","5","6","7","8","9"].map(d => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className="aspect-square bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-700 text-gray-900 dark:text-white text-3xl font-medium rounded-2xl transition-colors"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit("0")}
            className="aspect-square bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-700 text-gray-900 dark:text-white text-3xl font-medium rounded-2xl transition-colors"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="aspect-square bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-700 text-gray-600 dark:text-gray-400 text-2xl font-medium rounded-2xl transition-colors"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}