import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase/config";

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24h
const BASE_CURRENCY = "CAD"; // devise pivot — celle dans laquelle tout est stocké

interface RatesDoc {
  rates: Record<string, number>;
  updatedAt: number;
}

async function getRatesFromFirestore(): Promise<Record<string, number>> {
  const ref = doc(db, "system", "exchangeRates");
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as RatesDoc;
    const isExpired = Date.now() - data.updatedAt > CACHE_DURATION_MS;
    if (!isExpired) {
      return data.rates;
    }
  }

  // Taux absents ou expirés — on rafraîchit depuis l'API
  const response = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
  const apiData = await response.json();

  if (apiData.result !== "success") {
    // Si l'API échoue mais qu'on a un cache périmé, on le garde plutôt que de planter
    if (snap.exists()) {
      return (snap.data() as RatesDoc).rates;
    }
    throw new Error("Impossible de récupérer les taux de change");
  }

  const newDoc: RatesDoc = {
    rates: apiData.rates,
    updatedAt: Date.now()
  };
  await setDoc(ref, newDoc);

  return apiData.rates;
}

export async function convertFromBase(amount: number, to: string): Promise<number> {
  if (to === BASE_CURRENCY) return amount;
  const rates = await getRatesFromFirestore();
  const rate = rates[to];
  if (!rate) return amount; // fallback silencieux si devise inconnue
  return amount * rate;
}