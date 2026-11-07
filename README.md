# Moya Creation

Boutique francophone de fichiers STL : React, Vite et serveur Node.js (22.6+).

## Démarrer

```sh
npm install
npm run dev
```

Ouvrir http://localhost:5173. Le serveur API utilise le port 3001. Si le port frontend est occupé : `npm run dev -- --port 5174`. Utiliser l'adresse affichée, avec `localhost` par défaut.

```sh
npm run typecheck
npm test
npm run build
npm start
```

En production, le serveur Node sert `dist/` et `/api/`. Un hébergement statique seul ne suffit pas. Utiliser un disque persistant pour `data/` et `private-files/`, un reverse proxy HTTPS et définir `HOST=0.0.0.0` si nécessaire.

## Activer les achats

1. Copier `.env.example` vers `.env` et renseigner `STRIPE_SECRET_KEY` côté serveur, en mode test d'abord. Ne jamais utiliser de préfixe `VITE_` pour une clé secrète.
2. Définir `APP_ORIGIN` avec l’origine publique exacte (schéma, domaine, port éventuel ; pas de slash final).
3. Ajouter les **vrais fichiers vendus** à `private-files/1.stl` jusqu'à `private-files/8.stl`, selon les identifiants de `src/app/data/catalog.json`. Ce dossier est privé, jamais dans `public/` ou `dist/`. `FILES_DIR` permet un autre emplacement.
4. Vérifier le catalogue : les noms, images, prix et caractéristiques sont hérités du prototype. Plusieurs aperçus ne correspondent pas aux noms ; les quatre derniers sont des images externes. Ils doivent être remplacés par des aperçus fidèles des fichiers avant vente. Les prix sont exprimés en **EUR** ; le serveur crée également les sessions Stripe en euros. Les montants du catalogue restent ceux du prototype, à valider.
5. Publier l’identité et les coordonnées du vendeur, les conditions de vente complètes et les modalités de confidentialité adaptées. La page actuelle est une base informative à compléter.
6. Définir `COMMERCE_ENABLED=true`, redémarrer et effectuer une commande avec Stripe en mode test avant de configurer les clés réelles.

Le site désactive les achats tant que le serveur n'est pas configuré ou qu'un fichier catalogue manque. Aucun faux paiement ni faux fichier n'est créé. Les tests utilisent des fichiers temporaires exclusivement.

## Paiement et livraison

Stripe Checkout hébergé, montants calculés depuis le catalogue serveur, quantité de chaque fichier fixée à un et clé d’idempotence pour les nouvelles tentatives identiques. Références : [création de session](https://docs.stripe.com/api/checkout/sessions/create) et [sessions Checkout](https://docs.stripe.com/api/checkout/sessions).

Le retour de paiement et chaque téléchargement vérifient `payment_status` côté Stripe ainsi que l’appartenance du fichier à la commande. Le panier n’est nettoyé qu'après paiement confirmé et seuls les articles achetés sont retirés. Les erreurs et annulations le conservent.

La page de commande et ses liens sont confidentiels : toute personne possédant le lien peut télécharger les fichiers achetés. Livraison sur cette page, **pas d'envoi d'e-mail automatique**. Les commandes sont consultables dans Stripe. Aucun webhook ni compte client n'est implémenté ; si le client ferme le paiement avant de revenir, le studio devra l’aider à récupérer son accès depuis sa session Stripe. Ajouter webhook et messagerie transactionnelle avant de promettre une livraison automatique par e-mail.

## Demandes de contact

Les demandes validées sont réellement enregistrées côté serveur dans `data/inquiries/<référence>.json`. Le studio doit consulter ce dossier pour y répondre ; aucune notification e-mail ni interface d’administration n’est fournie. Limitation des requêtes en mémoire et champ anti-spam inclus. En production, configurer sauvegarde, accès restreint et durée de conservation du dossier.

## Tests

`npm test` : catalogue, prix serveur, disponibilité des fichiers, validation, accès aux commandes et téléchargements, persistance du contact (Stripe simulé, aucun débit).

`npm run test:e2e` : navigation et panier dans un navigateur ; nécessite `npx playwright install chromium` et le serveur de développement lancé. `E2E_BASE_URL` permet une autre URL.

## Interface de découverte

Accueil et catalogue partagent recherche, catégories et tri via les paramètres URL. Le feed utilise des colonnes CSS et des ratios réservés, sans chargement infini ni tracking ajouté. Les fiches offrent un achat direct via `/checkout?buy=<id>` : seul ce produit est envoyé au serveur et les autres articles du panier sont conservés. Une annulation Stripe revient à ce même achat direct. Aucune activation de paiement réel n'est effectuée par ce changement.
