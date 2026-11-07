# Administration web : configuration et limites

L'API `/api/admin/*` utilise un compte propriétaire local ; aucun compte ni mot de passe n'est créé par défaut. La création et la réinitialisation sont réservées à l'opérateur disposant d'un accès système au serveur :

```sh
node --env-file-if-exists=.env scripts/admin-account.mjs
```

La commande demande un identifiant (`owner` par défaut), un mot de passe de 14 à 256 caractères et sa confirmation masquée. Elle refuse les arguments et les entrées non interactives : ne jamais mettre le mot de passe dans la ligne de commande, les variables d'environnement ou Git. Pour réinitialiser, relancer la même commande avec le même identifiant. Toutes ses sessions existantes sont révoquées. L'accès SSH à la machine et sa sécurité restent sous le contrôle de l'opérateur ; aucun MFA applicatif n'est fourni.

Prérequis : Node 22 avec SQLite natif, migration `002-admin.sql`, stockage persistant, même `DATA_DIR` et `FILES_DIR` pour application et CLI. Un nouveau stockage reçoit le seed du catalogue. Les comptes sont protégés par scrypt avec sel aléatoire individuel ; seuls les empreintes des jetons de session sont enregistrées dans SQLite. La base et ses sauvegardes sont privées et doivent être conservées sous un compte système dédié.

Configurer `APP_ORIGIN` à l'origine exacte du site, sans slash final (ex. `https://boutique.example`). Le cookie `small_things_lab_admin` est HttpOnly, SameSite=Strict, limité à `/api/admin`, d'une durée absolue de 8 heures. Il reçoit Secure avec une origine HTTPS. HTTP n'est destiné qu'au développement local ; en exploitation, utiliser HTTPS et une origine HTTPS. Toutes les mutations, connexion comprise, exigent l'en-tête Origin exact. Les mutations authentifiées exigent aussi `X-CSRF-Token`, fourni lors de la connexion ou par `GET /session`.

API :

| Route | Usage |
|---|---|
| `POST /api/admin/login` | JSON `{username,password}` ; retourne `{username,csrf}` et cookie |
| `GET /api/admin/session` | Retourne `{username,csrf}` ; 401 sans session |
| `POST /api/admin/logout` | Révoque la session et efface le cookie |
| `GET /api/admin/products` | `{products}` |
| `POST /api/admin/products` | Fiche complète JSON ; `{product}` ; validations CLI communes |
| `POST /api/admin/files/:id` | Corps STL brut `application/octet-stream`, 50 Mio maximum ; `{file,fileSize}` |
| `GET /api/admin/orders?q=...` | `{orders}`, au plus 100 résultats, sans données client ni liens secrets |
| `GET /api/admin/orders/:id` | `{order}`, articles et statut, sans jetons |
| `GET /api/admin/stats` | Totaux en centimes EUR, avant frais et taxes |

Le login est limité à 10 tentatives par fenêtre de 15 minutes et par adresse socket. Les identifiants inexistants et mots de passe erronés reçoivent le même message et déclenchent une dérivation scrypt. Le limiteur est en mémoire et revient à zéro au redémarrage. Derrière un proxy, plusieurs opérateurs peuvent partager la même adresse ; les en-têtes X-Forwarded-For arbitraires ne sont pas utilisés. Une seule instance est prévue.

L'upload exige authentification, origine et CSRF **avant** de lire le binaire. Les fichiers sont nommés par empreinte SHA-256 sous `FILES_DIR/uploads`, avec permissions privées ; aucun nom client n'est utilisé comme chemin. Ils sont immuables, ne remplacent pas les anciennes versions de commande et ne sont jamais servis publiquement. La vérification accepte la structure d'un STL binaire ou ASCII et refuse les coordonnées non finies, mais ne certifie ni géométrie imprimable, ni dimensions, ni droits de propriété intellectuelle. Le résultat `file` doit être affecté à la fiche produit avant sa publication. Le changement de catégorie, prix et composition des packs conserve les validations de l'administration locale.

Les fichiers déposés mais non rattachés à un produit restent privés ; aucun nettoyage automatique ne supprime les versions achetées. Pas d'upload d'image : utiliser une URL HTTPS ou un chemin public existant. Aucun remboursement ni envoi d'email n'est déclenché par cette API. Les changements de catalogue, comptes et dépôts écrivent un événement minimal d'audit sans mot de passe, jeton, données client ou chemin absolu.

Tests : `node --test tests/admin-http.test.mjs`. Ils utilisent une base et un serveur HTTP temporaires ; aucune clé Stripe, aucun email ni accès de production. En recette, vérifier également le proxy HTTPS et le cookie dans le navigateur réel.

## Messages de contact

L’onglet Messages affiche les demandes déjà enregistrées par `/api/contact` dans le répertoire privé `DATA_DIR/inquiries`. API protégées par la même session : `GET /api/admin/messages?page=1` (50 fiches par page, ordre de référence) et `GET /api/admin/messages/:reference` (contenu complet). Aucune route publique de lecture. La liste n’inclut pas le corps des messages ; les fichiers invalides ou liens symboliques ne sont pas affichés. Le contenu est rendu comme texte, jamais comme HTML. Les enregistrements ne sont ni modifiés ni supprimés depuis cet onglet. Le bouton de réponse ouvre l’application email locale ; il ne déclenche aucun envoi serveur. Aucune notification automatique ni statut lu/non lu à ce stade.
