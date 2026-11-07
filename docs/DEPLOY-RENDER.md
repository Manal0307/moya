# Mise en ligne sur Render — tokkipocket.com

Le site tourne comme **un seul service Render** : il affiche les pages et gère
les paiements. Tout est décrit dans [`render.yaml`](../render.yaml) : région
Francfort (données en Europe), disque permanent de 1 Go monté sur `/var/data`.

Ce qui vit sur le disque (jamais effacé par une mise à jour) :

- `/var/data/db` : base de données (commandes, accès aux téléchargements, messages) ;
- `/var/data/private-files` : tes fichiers STL privés, jamais publics.

Les paiements restent **fermés** (`COMMERCE_ENABLED=false`) tant que l'étape 6
n'est pas faite. Le site, la boutique et le formulaire de contact fonctionnent
déjà.

## 1. GitHub

Le code est dans le dépôt `Manal0307/moya`. Vérifie qu'il est **privé**
(Settings → General → Danger Zone → Change visibility). `.env`, `data/` et
`private-files/` ne sont jamais envoyés (voir `.gitignore`).

## 2. Créer le service sur Render

1. Crée un compte sur render.com et connecte ton GitHub.
2. **New → Blueprint**, choisis le dépôt `moya`. Render lit `render.yaml`.
3. Laisse vides `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et `RESEND_API_KEY`
   pour l'instant.
4. Ajoute une carte de paiement (offre *Starter* ~7 $/mois + disque ~0,25 $/mois).
5. Attends le premier déploiement : le site est visible sur
   `https://tokki-pocket.onrender.com`.

## 3. Relier tokkipocket.com (Namecheap)

1. Sur Render : service → **Settings → Custom Domains** → ajoute
   `tokkipocket.com` puis `www.tokkipocket.com`.
2. Sur Namecheap : **Domain List → Manage → Advanced DNS**. Supprime les
   enregistrements par défaut (« parking ») puis ajoute ceux que Render affiche,
   en général :

   | Type  | Host | Value                          |
   |-------|------|--------------------------------|
   | A     | `@`  | l'adresse IP indiquée par Render |
   | CNAME | `www`| `tokki-pocket.onrender.com.`   |

3. Retourne sur Render et clique **Verify**. Le cadenas HTTPS est créé
   automatiquement (quelques minutes à quelques heures).

## 4. Envoyer le catalogue et les fichiers STL

Sur ton ordinateur, dans le dossier du projet :

```sh
node --env-file-if-exists=.env scripts/catalogue-sync.mjs export catalogue.json
```

Puis copie `catalogue.json` et le dossier `private-files/` sur le disque Render
(Render : **Connect → SSH** ; on le fait ensemble), et dans le **Shell** Render :

```sh
node scripts/catalogue-sync.mjs import /var/data/catalogue.json
```

La boutique en ligne affiche alors exactement tes produits publiés, aux bons
prix. Supprime ensuite `catalogue.json` (ordinateur et serveur).

## 5. E-mails de confirmation (obligatoires pour vendre dans l'UE)

1. Compte sur resend.com → **Domains → Add** `tokkipocket.com`.
2. Ajoute dans Namecheap (Advanced DNS) les enregistrements que Resend affiche
   (SPF, DKIM, éventuellement MX pour le sous-domaine d'envoi).
3. Une fois le domaine vérifié : Render → **Environment** → `RESEND_API_KEY`,
   puis `EMAIL_SEND_ENABLED=true`.

## 6. Ouvrir les paiements (Stripe en mode réel)

À faire **après** avoir complété ton profil Stripe et les pages légales.

1. Stripe (mode **Live**) → Settings → Public details : nom **Tokki Pocket**,
   libellé de relevé `TOKKI POCKET`, e-mail de support.
2. Settings → Payouts : **virements manuels** si tu veux laisser l'argent sur Stripe.
3. Developers → **Webhooks → Add endpoint** :
   `https://tokkipocket.com/api/stripe/webhook`, avec les événements
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`,
   `refund.created`, `refund.updated`. Copie le **Signing secret** (`whsec_…`).
4. Developers → API keys : copie la **Secret key** (`sk_live_…`).
5. Render → Environment : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, puis
   `COMMERCE_ENABLED=true`. Render redémarre le service.
6. Fais un vrai petit achat (Kero, 3,50 €), vérifie le téléchargement, puis
   rembourse-le depuis Stripe.

`STRIPE_MODE=live` est déjà réglé : le serveur refuse toute clé ou notification
de test en production, et inversement en local.

## Sauvegardes

Render fait des instantanés quotidiens du disque (gardés 7 jours). Pour une
copie à toi :

```sh
node scripts/commerce.mjs backup /var/data/backup-AAAA-MM-JJ.sqlite
```
