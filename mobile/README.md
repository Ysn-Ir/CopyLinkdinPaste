# 📱 PFE Hunter • Application Mobile (React Native & Expo)

Application mobile compagnon pour **PFE Hunter Career Command Center**, connectée en temps réel au backend FastAPI sur le même réseau local (Wi-Fi / LAN / Tailscale).

---

## ✨ Fonctionnalités Principales

1. **🔗 Connexion & Découverte Réseau Zéro-Config** :
   - Détection automatique de l'IP du PC (`http://192.168.1.12:8003`)
   - Scanner de QR code ou appairage en 1 clic
   - Indicateur en direct de l'état du serveur FastAPI et de la base de données

2. **📋 Ingestion Intelligente du Presse-Papiers** :
   - Détecte automatiquement dès que vous copiez un post ou un lien LinkedIn sur votre smartphone
   - 1-tap pour envoyer au backend : l'IA (Groq / gpt-oss-120b) analyse l'offre, extrait le titre, le contact du recruteur, classe dans le domaine pertinent et synchronise instantanément avec votre ordinateur !

3. **📊 Flux d'Offres PFE & Inspection** :
   - Recherche et filtres par domaines dynamiques (AI/ML, Fullstack, Data, DevOps, etc.)
   - Fiche d'inspection détaillée avec score de confiance et explications de l'IA
   - Raccourcis directs :
     - 💬 **WhatsApp Direct** : pré-remplit le message personnalisé
     - ✉️ **Email Direct** : ouvre votre client mail avec le sujet et la candidature
     - 📞 **Appel téléphonique** & lien vers le post LinkedIn

4. **🚀 Pilotage du Pipeline de Recrutement** :
   - Boutons 1-tap pour faire progresser les offres (`Enregistré` ➔ `Prêt` ➔ `Candidaté` ➔ `Entretien` ➔ `Offre`)
   - Synchronisation bidirectionnelle immédiate avec le PC de bureau.

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js (v18+)
- Votre smartphone Android ou iPhone connecté au **même réseau Wi-Fi** que votre PC
- L'application gratuite **Expo Go** installée sur votre smartphone (disponible sur Google Play Store et App Store)

### 1. Installation des dépendances
Dans le dossier `mobile` :
```bash
cd mobile
npm install
```

### 2. Lancement du serveur mobile
```bash
npx expo start
```
ou
```bash
npm start
```

### 3. Connexion sur votre téléphone
1. Ouvrez l'application **Expo Go** sur votre smartphone.
2. Scannez le QR code affiché dans votre terminal ou navigateur.
3. L'application PFE Hunter s'ouvre immédiatement sur votre téléphone !
4. Dans l'onglet **Réseau**, assurez-vous que l'adresse IP pointe bien vers l'adresse de votre PC (ex: `http://192.168.1.12:8003`).

---

## 🛠️ Architecture Technique

```
mobile/
├── App.js                   # Navigation principale (Bottom Navigation Bar)
├── app.json                 # Configuration Expo & permissions
├── package.json             # Dépendances (Expo SDK 52, React Native, AsyncStorage)
├── src/
│   ├── theme.js             # Thème sombre zinc, palettes de couleurs & statuts pipeline
│   ├── services/
│   │   └── api.js           # Client HTTP (FastAPI, offline cache AsyncStorage, pairing)
│   └── screens/
│       ├── DashboardScreen.js   # KPI et raccourcis rapides
│       ├── CaptureScreen.js     # Détecteur presse-papiers & extraction IA
│       ├── OffersListScreen.js  # Flux filtrable d'offres PFE
│       ├── OfferDetailScreen.js # Fiche d'inspection, contact WhatsApp/Email, boutons pipeline
│       └── ConnectScreen.js     # Paramètres réseau, test ping & appairage IP
```
