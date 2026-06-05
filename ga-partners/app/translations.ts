export type Language = 'en' | 'fr';

export const partnerTranslations = {
  en: {
    title: "Dr. Gahungu's Partner Portal",
    subtitle: "Apply to join as a Doctor, Pharmacy, Hospital or Insurance provider.",
    or: "OR",
    login: "Login",
    applyDoctor: "Apply as Doctor",
    applyPharmacy: "Apply as Pharmacy",
    applyHospital: "Apply as Hospital",
    applyInsurance: "Apply as Insurance",
    welcomeLogin: "Dr. Gahungu Welcomes you, Please Login.",
    chooseRole: "Choose who you are:",
    doctor: "Doctor",
    pharmacy: "Pharmacy",
    hospital: "Hospital",
    insurance: "Insurance",
    email: "Email Address",
    password: "Password",
    forgotPassword: "Forgot Password?",
    submit: "Submit Application",
    back: "Back to Home",
    dashboard: "Dashboard",
    logout: "Logout",
    profile: "Profile",
    settings: "Settings"
  },
  fr: {
    title: "Portail Partenaire du Dr. Gahungu",
    subtitle: "Inscrivez-vous en tant que médecin, pharmacie, hôpital ou assurance.",
    or: "OU",
    login: "Connexion",
    applyDoctor: "Postuler comme Docteur",
    applyPharmacy: "Postuler comme Pharmacie",
    applyHospital: "Postuler comme Hôpital",
    applyInsurance: "Postuler comme Assurance",
    welcomeLogin: "Le Dr Gahungu vous souhaite la bienvenue, veuillez vous connecter.",
    chooseRole: "Choisissez qui vous êtes :",
    doctor: "Docteur",
    pharmacy: "Pharmacie",
    hospital: "Hôpital",
    insurance: "Assurance",
    email: "Adresse Email",
    password: "Mot de passe",
    forgotPassword: "Mot de passe oublié ?",
    submit: "Soumettre la candidature",
    back: "Retour à l'accueil",
    dashboard: "Tableau de bord",
    logout: "Déconnexion",
    profile: "Profil",
    settings: "Paramètres"
  }
};

export type PartnerTranslations = typeof partnerTranslations.en;