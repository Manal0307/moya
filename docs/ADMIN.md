# Administration locale du catalogue

L'administration fournie est une **CLI locale**, pas un espace web. Elle n'expose aucune route admin, aucun mot de passe dans le navigateur, aucun cookie de session et aucun secret d'administration réseau. Seul un opérateur disposant des droits du système sur le serveur et sa base peut l'utiliser. Pour une machine distante, utiliser SSH avec clés et les protections du fournisseur (MFA si disponible). Aucun MFA applicatif n'est implémenté.

Prérequis : Node 22 avec `node:sqlite`, données persistantes du serveur, même `DATA_DIR` et `FILES_DIR` que l'application. La configuration n'est jamais affichée. Ne jamais accorder l'accès SSH à un utilisateur client. Le service et sa CLI doivent s'exécuter sous un compte dédié ; base, sauvegardes et fichiers privés ne doivent pas être lisibles par les autres comptes.

```sh
node --env-file-if-exists=.env server/admin-cli.mjs products
node --env-file-if-exists=.env server/admin-cli.mjs put /chemin/prive/produit.json
node --env-file-if-exists=.env server/admin-cli.mjs publish nouveau-modele
node --env-file-if-exists=.env server/admin-cli.mjs archive nouveau-modele
node --env-file-if-exists=.env server/admin-cli.mjs draft nouveau-modele
```

`put` ajoute ou remplace la fiche complète. Pour modifier, copier la fiche retournée par `products`, changer les champs souhaités dans un fichier JSON privé et la soumettre. Les champs inconnus sont ignorés. `publish`, `archive` et `draft` changent l'état sans supprimer le produit ni les anciennes commandes. Les changements ne modifient jamais les instantanés de commande ; la livraison utilise les versions immuables enregistrées lors du checkout.

Exemple de fiche :

```json
{
  "id": "nouveau-modele",
  "status": "draft",
  "type": "single",
  "name": "New model",
  "category": "charm",
  "description": "A printable charm.",
  "details": "Digital STL file, personal license.",
  "image": "charmBunny",
  "priceCents": 299,
  "currency": "eur",
  "licenseVersion": "personal-v1",
  "version": "1",
  "file": "nouveau-modele.stl",
  "featured": false
}
```

Les prix réels sont des centimes EUR entiers, entre 50 et 10 000 000 inclus. Le champ `price` est recalculé pour compatibilité ; les prix fournis par le navigateur ne font pas autorité. `compareAtPriceCents` peut renseigner un prix de référence supérieur au prix réel ; cela ne constitue pas une gestion de codes promotionnels ni une validation des règles légales de promotion.

Les catégories sont des identifiants courts (`charm`, `keychain`, etc.). La CLI les conserve dans la fiche. L'affichage d'une nouvelle catégorie dans les filtres du frontend nécessite sa prise en charge côté vitrine. Aucun changement de design n'est livré ici.

Pour un pack, utiliser `"type":"bundle"` et `"bundleItems":["id-a","id-b"]`. Les membres doivent exister, être des produits simples et être publiés avant le pack. Les doublons et packs imbriqués sont refusés. Archiver le pack avant d'archiver un de ses membres.

La publication vérifie présence des champs requis et fichiers STL privés non vides, réguliers et confinés à `FILES_DIR`, y compris après résolution des liens symboliques. Elle ne prouve ni la validité géométrique du STL, ni ses droits d'exploitation, ni sa réussite à l'impression : ces vérifications humaines restent nécessaires. Les fichiers doivent être déposés hors `src`, `public`, `dist` et Git, via l'accès local/SSH sécurisé ; aucun upload web n'est fourni.

La vitrine doit charger le catalogue persistant via l'API pour montrer les nouveaux produits : le bundle statique seul ne reflète pas les changements. Les produits seed existants restent compatibles ; la CLI exige les champs de publication pour les nouvelles fiches.

Vérification ciblée : `node --test tests/admin.test.mjs`. Les tests couvrent prix/devise, transitions, publication sans fichier, traversée de chemin, liens symboliques externes, répertoires, composition des packs et blocage de l'archivage d'un membre vendu en pack.

## Commandes et ventes

```sh
node --env-file-if-exists=.env server/admin-cli.mjs orders
node --env-file-if-exists=.env server/admin-cli.mjs orders paid
node --env-file-if-exists=.env server/admin-cli.mjs order ORDER_ID
node --env-file-if-exists=.env server/admin-cli.mjs stats
```

`orders` retourne au plus les 100 dernières commandes ; son argument facultatif recherche une partie d'identifiant ou un état exact. `order` détaille les articles achetés. Ces vues masquent volontairement noms/emails clients, URLs Stripe, jetons et chemins des fichiers. Elles ne constituent ni un export comptable ni un outil de remboursement : le remboursement reste à effectuer dans Stripe et à synchroniser par webhook.

`stats` calcule les ventes enregistrées payées, les remboursements et le montant net avant frais et taxes, en centimes EUR. Les litiges restent identifiés séparément par les états ; le chiffre n'est pas un solde bancaire ni le solde disponible Stripe. Aucun tracker de trafic ou cookie analytique n'est ajouté.

Chaque mutation de catalogue écrit un événement minimal `catalogue.put:ID:STATUT` daté dans la table `audit`, sans recopier fiche, données client ni secrets.
