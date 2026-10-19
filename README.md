# Ollivander : Site vitrine

Site web vitrine d'**Ollivander**, entreprise de développement d'applications sur mesure pour les PME de la construction québécoise.

> *« Pas une solution générique. Une app construite pour votre réalité de chantier. »*

- **Domaine cible :** [ollivander.ca](https://ollivander.ca)
- **Hébergement :** Azure Static Web Apps (région Canada)
- **Stack :** Un seul fichier `index.html` (HTML + CSS + JS intégrés). Aucune dépendance de build. Seule ressource externe : Google Fonts.

---

## 📁 Structure du projet

```
ollivander-website/
├── index.html                        # Site complet (toutes les sections)
├── staticwebapp.config.json          # Config Azure SWA (fallback, en-têtes, sécurité)
├── .gitignore
├── README.md
└── .github/
    └── workflows/
        └── azure-swa.yml             # CI/CD GitHub Actions → Azure SWA
```

---

## 🧭 Sections du site

1. **Hero** : proposition de valeur + CTA « Discuter de votre projet »
2. **Problèmes qu'on règle** : 4 irritants de chantier
3. **Notre approche** : Comprendre · Construire · Accompagner
4. **La suite Vander** : plateforme SaaS modulaire + connexion Microsoft
5. **Modules en action** : Facturation, TakeOff, Dynamics (captures + fiches détaillées)
6. **Pourquoi Ollivander** : différenciateurs clés
7. **À propos** : 16 ans d'expérience terrain
8. **Contact** : formulaire (mailto) + coordonnées

---

## 💻 Développement local

Aucun outil requis. Ouvrez simplement le fichier :

```bash
# Option 1 : ouvrir directement dans le navigateur
start index.html      # Windows
open index.html       # macOS

# Option 2 : petit serveur local (recommandé pour tester le formulaire)
python -m http.server 5500
# puis visiter http://localhost:5500
```

---

## 🚀 Déploiement sur Azure Static Web Apps

Le déploiement est **automatisé** via GitHub Actions : chaque `push` sur `main` publie le site. Voici la mise en place initiale.

### Étape 1 : Créer la ressource Azure

1. Portail Azure → **Créer une ressource** → *Static Web App*.
2. Renseignez :
   - **Groupe de ressources** : nouveau ou existant.
   - **Nom** : `ollivander-website` (ou autre).
   - **Plan** : `Free` (suffisant pour un site vitrine).
   - **Région** : **Canada Central** (données au Canada).
   - **Source** : *Other* (on gère le workflow nous-mêmes), ou *GitHub* si vous laissez Azure générer le workflow.
3. Créez la ressource.

### Étape 2 : Récupérer le jeton de déploiement

1. Ouvrez la ressource Static Web App créée.
2. Menu **Overview** → bouton **Manage deployment token**.
3. Copiez le jeton.

### Étape 3 : Ajouter le secret dans GitHub

1. Repo GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret** :
   - **Name** : `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - **Secret** : *(collez le jeton de l'étape 2)*
3. Enregistrez.

### Étape 4 : Déployer

```bash
git add .
git commit -m "Mise en ligne du site vitrine Ollivander"
git push origin main
```

Le workflow [`azure-swa.yml`](.github/workflows/azure-swa.yml) se déclenche automatiquement. Suivez la progression dans l'onglet **Actions** du repo. Une fois terminé, le site est accessible à l'URL `*.azurestaticapps.net` fournie par Azure.

### Étape 5 : Domaine personnalisé (ollivander.ca)

1. Ressource SWA → **Custom domains** → **Add**.
2. Suivez les instructions pour ajouter l'enregistrement DNS (CNAME ou TXT) chez votre registraire.
3. Azure fournit automatiquement un certificat SSL gratuit.

---

## ⚙️ Détails techniques

- **`navigationFallback`** renvoie vers `index.html` (site une seule page).
- **En-têtes de sécurité** : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- **Aperçus de PR** : chaque pull request obtient un environnement de préversion, fermé automatiquement à la fermeture de la PR.
- **Accessibilité / perf** : respect de `prefers-reduced-motion`, polices `display=swap`, HTML sémantique.

---

## 📬 Contact

Olivier : [olivier@ollivander.ca](mailto:olivier@ollivander.ca)
Basé au Québec. Disponible partout.
