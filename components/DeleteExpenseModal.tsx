"use client";

interface Props {
  expenseLabel: string;
  onDeletePermanently: () => void;
  onUnshare: () => void;
  onCancel: () => void;
}

export default function DeleteExpenseModal({ expenseLabel, onDeletePermanently, onUnshare, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-white font-semibold text-lg mb-2">Supprimer "{expenseLabel}"</h2>
        <p className="text-gray-400 text-sm mb-6">
          Que veux-tu faire de cette dépense ?
        </p>

        <div className="space-y-3">
          <button
            onClick={onUnshare}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors text-sm"
          >
            📤 Retirer du budget partagé
            <span className="block text-xs text-gray-500 mt-0.5">Revient dans les transactions personnelles</span>
          </button>

          <button
            onClick={onDeletePermanently}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium py-3 rounded-xl transition-colors border border-red-500/20 text-sm"
          >
            🗑️ Supprimer définitivement
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-transparent hover:bg-gray-800 text-gray-400 font-medium py-3 rounded-xl transition-colors text-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}