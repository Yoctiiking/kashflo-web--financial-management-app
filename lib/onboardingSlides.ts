export interface OnboardingSlide {
    version: number;
    icon: string;
    key: string;
}

// Quand tu ajoutes une fonctionnalité, ajoute une slide avec version = ONBOARDING_VERSION + 1,
// puis augmente ONBOARDING_VERSION ci-dessous. Le titre et la description sont définis dans
// messages/*.json sous onboarding.slides.{key}.
export const ONBOARDING_VERSION = 1;

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
    { version: 1, icon: "📊", key: "welcome" },
    { version: 1, icon: "💸", key: "transactions" },
    { version: 1, icon: "🎯", key: "budgets" },
    { version: 1, icon: "🤝", key: "sharedBudgets" },
    { version: 1, icon: "🔄", key: "recurrencesSavings" },
    { version: 1, icon: "📄", key: "exportData" }
];
