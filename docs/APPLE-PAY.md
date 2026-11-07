# Apple Pay — préparation et essai en mode test

Vérification documentaire : 24 octobre 2026. Le projet utilise **Stripe Checkout hébergé**, et non un formulaire Apple Pay intégré au site.

## Ce qui est prêt

Le serveur autorise `card` et `bancontact`. Apple Pay est un wallet de carte : aucun type `apple_pay` séparé n'est ajouté. Checkout reste hébergé sur `https://checkout.stripe.com` ; aucun bouton Apple Pay n'est rendu sur notre origine HTTP locale.

Selon [Stripe, Apple Pay sur le Web](https://docs.stripe.com/apple-pay?platform=web), Checkout hébergé ne nécessite pas de configuration Apple Pay supplémentaire. L'enregistrement du domaine concerne Elements et Checkout intégré. Un domaine propre n'est donc pas une condition à cet essai sur Checkout hébergé.

Stripe affiche Apple Pay selon l'éligibilité de l'appareil et du navigateur. Pour l'essai, utiliser Safari et une carte bancaire réelle déjà enregistrée dans Wallet, avec les **clés Stripe de test** : Stripe simule le paiement sans débiter cette carte. Les cartes de test Stripe (4242…) et les cartes du sandbox Apple ne conviennent pas au Wallet dans cette intégration. [Conditions de test Stripe](https://support.stripe.com/questions/testing-apple-pay-with-stripe).

## Essai accompagné avec la propriétaire

1. Garder le serveur local et l'écoute des webhooks Stripe de test démarrés. Garder les clés `sk_test_…` et ne pas passer le compte en production.
2. Sur **le même Mac que le serveur**, ouvrir `http://localhost:5174` dans Safari. Ce point évite que l'URL de retour localhost désigne un autre appareil.
3. Acheter le produit Catstar disponible, puis arriver sur la page sécurisée Stripe. Vérifier l'indication de mode test et le montant attendu avant toute validation.
4. Si Apple Pay est proposé, le sélectionner puis autoriser avec le mécanisme Apple habituel. La propriétaire effectue elle-même cette étape ; ne partager ni carte, ni code, ni authentification.
5. Vérifier le retour sur la commande confirmée, télécharger le STL et vérifier dans Stripe **en environnement de test** que le détail de paiement indique Apple Pay.
6. Facultatif ensuite : annuler une nouvelle tentative avant autorisation et vérifier qu'aucun téléchargement n'est débloqué. Le remboursement reste effectué dans Stripe, puis son statut est synchronisé par webhook.

Si le bouton manque : vérifier Wallet et les capacités Apple Pay du Mac ; consulter le [diagnostic Stripe des wallets](https://docs.stripe.com/testing/wallets). Il ne faut pas inventer un bouton côté boutique pour forcer l'éligibilité. L'affichage effectif n'a pas encore été validé sur l'appareil de la propriétaire.

## Limite locale et validation

Un iPhone ne peut pas ouvrir la boutique à l'adresse `localhost` du Mac. Une session de paiement partagée peut s'afficher sur Stripe mais son retour vers `localhost` ne rejoindra pas le serveur Mac. Pour un parcours complet sur un autre appareil, prévoir ultérieurement une origine HTTPS accessible et mettre à jour `APP_ORIGIN` ; aucun tunnel ni domaine n'est créé dans cette préparation.

Le test serveur simule les métadonnées d'une carte Apple Pay, une confirmation vérifiée, le téléchargement et la révocation après remboursement. Il valide notre traitement commun aux cartes ; **il ne prouve ni l'affichage du bouton, ni l'autorisation Apple Pay réelle**. Aucun paiement externe, email ni changement de compte Stripe n'a été effectué dans cette préparation. Le garde-fou refusant les clés et événements Stripe de production est conservé.
