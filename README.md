# EduFinance Admin

Console d'administration indépendante de la plateforme EduFinance Pro.

## Stack
React + TypeScript + Vite + Firebase + Tailwind CSS + lucide-react

## Déploiement
Base path GitHub Pages : `/edufinance-admin/`

## Sécurité
L'authentification Firebase ne suffit pas à donner l'accès admin. Le frontend exige un document `admins/{uid}` avec :
- `role`: `super_admin` ou `school_admin`
- `active`: `true`
- `schoolId` pour un administrateur d'établissement si nécessaire

La protection définitive doit être renforcée côté Firebase Security Rules et, pour les opérations sensibles, par Firebase Custom Claims / Admin SDK.

## Collections
Le dépôt client `edufinance` n'est pas modifié. Les collections existantes `schools/{schoolId}/...` sont lues sans changement. La collection `admins` est la seule nouvelle structure introduite par cette fondation.
