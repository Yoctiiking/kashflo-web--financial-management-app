export interface OnboardingSlide {
    version: number;
    icon: string;
    title: string;
    description: string;
}

// Quand tu ajoutes une fonctionnalité, ajoute une slide avec version = ONBOARDING_VERSION + 1,
// puis augmente ONBOARDING_VERSION ci-dessous.
export const ONBOARDING_VERSION = 1;

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
    {
        version: 1,
        icon: "📊",
        title: "Bienvenue sur Kash Flo",
        description: "Suis tes revenus et dépenses en un coup d'œil grâce à un dashboard clair et personnalisé."
    },
    {
        version: 1,
        icon: "💸",
        title: "Transactions",
        description: "Ajoute tes dépenses et revenus en quelques secondes. Recherche, filtre, et navigue mois par mois."
    },
    {
        version: 1,
        icon: "🎯",
        title: "Budgets",
        description: "Définis des limites par catégorie — journalières, hebdomadaires ou mensuelles — et suis ta progression."
    },
    {
        version: 1,
        icon: "🤝",
        title: "Budgets partagés",
        description: "Invite d'autres personnes à contribuer à un budget commun, comme les courses ou les sorties."
    },
    {
        version: 1,
        icon: "🔄",
        title: "Récurrences & Épargne",
        description: "Automatise tes paiements réguliers et suis tes objectifs d'épargne au fil du temps."
    },
    {
        version: 1,
        icon: "📄",
        title: "Export de tes données",
        description: "Exporte tes transactions en CSV ou PDF directement depuis la page Transactions — pratique pour tes déclarations ou ton suivi personnel."
    }
];