import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Plus,
  LogOut,
  ArrowUpRight,
  Upload,
  X,
  Package,
  ShoppingBag,
  BarChart3,
  Mail,
} from "lucide-react";
import "../../styles/admin.css";

type Inquiry = {
  reference: string;
  createdAt: string;
  name: string;
  email: string;
  subject: string;
  message?: string;
};
type Session = { username: string; csrf: string };
type Product = {
  id: string;
  name?: string;
  status: string;
  type?: string;
  category?: string;
  description?: string;
  details?: string;
  image?: string;
  priceCents: number;
  currency: string;
  file?: string;
  fileSize?: string;
  printTime?: string;
  version?: string;
  licenseVersion?: string;
  featured?: boolean;
  bundleItems?: string[];
};
type Order = {
  id: string;
  status: string;
  totalCents: number;
  refundedCents: number;
  createdAt: number;
  items?: {
    id: string;
    name: string;
    priceCents: number;
    licenseVersion: string;
  }[];
};
type Stats = {
  grossCents: number;
  refundedCents: number;
  netBeforeFeesAndTaxCents: number;
  paidOrders: number;
};
const money = (cents: number) =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
const stateNames: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
  pending: "En attente",
  paid: "Payé",
  refunded: "Remboursé",
  partially_refunded: "Remboursement partiel",
  disputed: "En litige",
  failed: "Échoué",
  expired: "Expiré",
};
const emptyProduct = (): Product => ({
  id: "",
  name: "",
  status: "draft",
  type: "single",
  category: "charm",
  description: "",
  details: "",
  image: "",
  priceCents: 490,
  currency: "eur",
  licenseVersion: "personal-v1",
  version: "1",
  featured: false,
  bundleItems: [],
});

export function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [messagePage, setMessagePage] = useState(1);
  const [messageTotal, setMessageTotal] = useState(0);
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [draft, setDraft] = useState<Product | null>(null);
  const [price, setPrice] = useState("4.90");
  const [editing, setEditing] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => {
    document.title = "Administration | Tokki Pocket";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.append(meta);
    const controller = new AbortController();
    fetch("/api/admin/session", { signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setSession(await response.json());
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      meta.remove();
    };
  }, []);
  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(`/api/admin${path}`, {
      ...init,
      credentials: "same-origin",
      headers: {
        ...(init.body && !(init.body instanceof File)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(session ? { "X-CSRF-Token": session.csrf } : {}),
        ...init.headers,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        setSession(null);
        setInquiries([]);
        setInquiry(null);
        setProducts([]);
        setOrders([]);
        setOrder(null);
        setDraft(null);
        setStats(null);
      }
      throw new Error(data.error || "L’opération a échoué.");
    }
    return data;
  }
  async function loadMessages(page = messagePage) {
    try {
      const data = await api(`/messages?page=${page}`);
      setInquiries(data.messages);
      setMessagePage(data.page);
      setMessageTotal(data.total);
      setInquiry(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }
  async function refresh() {
    const [catalogue, sales, totals] = await Promise.all([
      api("/products"),
      api(`/orders?q=${encodeURIComponent(orderSearch)}`),
      api("/stats"),
    ]);
    setProducts(catalogue.products);
    setOrders(sales.orders);
    setStats(totals);
  }
  useEffect(() => {
    if (session) {
      setLoading(true);
      refresh()
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [session]);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      setSession(
        await api("/login", {
          method: "POST",
          body: JSON.stringify({
            username: form.get("username"),
            password: form.get("password"),
          }),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }
  function edit(product?: Product) {
    setDraft(
      product ? { ...product, type: product.type || "single" } : emptyProduct(),
    );
    setPrice(((product?.priceCents ?? 490) / 100).toFixed(2));
    setEditing(!!product);
    setNotice("");
    setError("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError("");
    setNotice("");
    const normalized = price.trim().replace(",", ".");
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(normalized)) {
      setError("Saisissez un prix en euros avec au maximum deux décimales.");
      return;
    }
    setBusy(true);
    try {
      const result = await api("/products", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          priceCents: Math.round(Number(normalized) * 100),
          currency: "eur",
        }),
      });
      setDraft(result.product);
      setEditing(true);
      await refresh();
      setNotice("Produit enregistré.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined) {
    if (!file || !draft) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(`/files/${encodeURIComponent(draft.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
      });
      setDraft(
        (p) => p && { ...p, file: result.file, fileSize: result.fileSize },
      );
      setNotice(
        "STL transféré en stockage privé. Enregistrez ensuite la fiche pour l’associer au produit.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfert impossible.");
    } finally {
      setBusy(false);
    }
  }
  const message = (
    <>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
    </>
  );
  if (!session)
    return (
      <div className="admin-page admin-login">
        <Link to="/" className="admin-wordmark">
          Tokki Pocket <ArrowUpRight size={16} />
        </Link>
        <div className="admin-login-panel">
          <p className="admin-kicker">ESPACE PROPRIÉTAIRE</p>
          <h1>Gérer le studio.</h1>
          <p>
            Connectez-vous pour gérer les produits et consulter les commandes.
          </p>
          {message}
          {loading ? (
            <p role="status">Vérification de la session…</p>
          ) : (
            <form onSubmit={login}>
              <label>
                Identifiant
                <input
                  name="username"
                  autoComplete="username"
                  required
                  maxLength={80}
                />
              </label>
              <label>
                Mot de passe
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={256}
                />
              </label>
              <button className="admin-button" disabled={busy}>
                {busy ? "Connexion…" : "Se connecter"}
              </button>
            </form>
          )}
          <details className="admin-setup">
            <summary>Première connexion ?</summary>
            <p>
              Le compte propriétaire doit être créé une fois depuis le terminal
              du serveur. Aucun compte par défaut n’est fourni.
            </p>
            <code>node scripts/admin-account.mjs</code>
            <p>
              Le mot de passe reste local et ne doit pas être envoyé dans le
              chat.
            </p>
          </details>
        </div>
      </div>
    );
  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <Link to="/" className="admin-wordmark">
            Tokki Pocket
          </Link>
          <span className="admin-kicker">ADMINISTRATION</span>
        </div>
        <div>
          <Link to="/" className="admin-text-link">
            Voir la boutique <ArrowUpRight size={15} />
          </Link>
          <button
            className="admin-button admin-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("/logout", { method: "POST", body: "{}" });
                setSession(null);
                setInquiries([]);
                setInquiry(null);
                setProducts([]);
                setOrders([]);
                setDraft(null);
                setOrder(null);
                setStats(null);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Déconnexion impossible.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </header>
      <nav className="admin-tabs" aria-label="Administration">
        {[
          ["overview", "Vue d’ensemble", BarChart3],
          ["products", "Produits", Package],
          ["orders", "Commandes", ShoppingBag],
          ["messages", "Messages", Mail],
        ].map(([key, label, Icon]) => (
          <button
            key={String(key)}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => {
              setTab(String(key));
              if (key === "messages") void loadMessages(1);
              setError("");
              setNotice("");
            }}
          >
            <Icon size={17} />
            {String(label)}
          </button>
        ))}
      </nav>
      <main className="admin-main">
        {message}
        {loading && <p role="status">Chargement des données…</p>}
        {tab === "overview" && (
          <>
            <div className="admin-heading">
              <div>
                <p className="admin-kicker">LE STUDIO EN CHIFFRES</p>
                <h1>Vue d’ensemble.</h1>
              </div>
              <button
                className="admin-button admin-secondary"
                onClick={() => refresh().catch((e) => setError(e.message))}
              >
                Actualiser
              </button>
            </div>
            <div className="admin-metrics">
              {[
                ["Ventes payées", stats ? money(stats.grossCents) : "-"],
                ["Remboursements", stats ? money(stats.refundedCents) : "-"],
                [
                  "Après remboursements",
                  stats ? money(stats.netBeforeFeesAndTaxCents) : "-",
                ],
                ["Commandes payées", stats?.paidOrders ?? "-"],
              ].map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
            <p className="admin-caption">
              Montants avant frais et taxes. Les transactions Stripe restent
              actuellement en mode test ; ces chiffres ne représentent pas un
              solde bancaire.
            </p>
            <div className="admin-summary">
              <h2>Votre catalogue</h2>
              <p>
                {products.filter((p) => p.status === "published").length}{" "}
                produits publiés ·{" "}
                {products.filter((p) => p.status === "draft").length} brouillons
              </p>
              <button
                className="admin-button"
                onClick={() => {
                  setTab("products");
                  edit();
                }}
              >
                <Plus size={17} />
                Ajouter un produit
              </button>
            </div>
          </>
        )}
        {tab === "products" && (
          <>
            <div className="admin-heading">
              <div>
                <p className="admin-kicker">CATALOGUE</p>
                <h1>Vos objets.</h1>
              </div>
              <button className="admin-button" onClick={() => edit()}>
                <Plus size={17} />
                Ajouter un produit
              </button>
            </div>
            <div className={draft ? "admin-editor-layout" : ""}>
              <div className="admin-product-list">
                {products.map((p) => (
                  <button
                    key={p.id}
                    className={`admin-product-row ${draft?.id === p.id ? "is-active" : ""}`}
                    onClick={() => edit(p)}
                  >
                    <span>
                      <strong>{p.name || p.id}</strong>
                      <small>
                        {p.type === "bundle" ? "Pack" : "STL"} /{" "}
                        {p.category || "Sans catégorie"}
                      </small>
                    </span>
                    <span>{money(p.priceCents)}</span>
                    <span className="admin-badge">
                      {stateNames[p.status] || p.status}
                    </span>
                  </button>
                ))}
                {!products.length && <p>Aucun produit pour l’instant.</p>}
              </div>
              {draft && (
                <form className="admin-product-form" onSubmit={save}>
                  <div className="admin-form-title">
                    <h2>{editing ? "Modifier la fiche" : "Nouveau produit"}</h2>
                    <button
                      type="button"
                      aria-label="Fermer la fiche"
                      onClick={() => setDraft(null)}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <label>
                    Identifiant stable
                    <input
                      value={draft.id}
                      disabled={editing || busy}
                      required
                      pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}"
                      onChange={(e) =>
                        setDraft({ ...draft, id: e.target.value })
                      }
                      placeholder="catstar"
                    />
                    <small>
                      Sans espace. Cet identifiant ne change pas après création.
                    </small>
                  </label>
                  <label>
                    Nom
                    <input
                      value={draft.name || ""}
                      required
                      maxLength={160}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                  </label>
                  <div className="admin-form-grid">
                    <label>
                      Type
                      <select
                        value={draft.type}
                        onChange={(e) =>
                          setDraft({ ...draft, type: e.target.value })
                        }
                      >
                        <option value="single">Fichier STL</option>
                        <option value="bundle">Pack de modèles</option>
                      </select>
                    </label>
                    <label>
                      État
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDraft({ ...draft, status: e.target.value })
                        }
                      >
                        <option value="draft">Brouillon</option>
                        <option value="published">Publié</option>
                        <option value="archived">Archivé</option>
                      </select>
                    </label>
                    <label>
                      Prix en euros
                      <input
                        inputMode="decimal"
                        value={price}
                        required
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </label>
                    <label>
                      Catégorie
                      <input
                        value={draft.category || ""}
                        required
                        pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}"
                        onChange={(e) =>
                          setDraft({ ...draft, category: e.target.value })
                        }
                        placeholder="charm"
                      />
                    </label>
                  </div>
                  <label>
                    Description courte
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={draft.description || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Description complète
                    <textarea
                      rows={4}
                      maxLength={10000}
                      value={draft.details || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, details: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Image : URL ou chemin public
                    <input
                      value={draft.image || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, image: e.target.value })
                      }
                      placeholder="https://… ou /image.webp"
                    />
                    <small>
                      Utilisez uniquement une image fidèle au modèle. Le
                      transfert d’images n’est pas encore proposé.
                    </small>
                  </label>
                  {draft.type === "bundle" ? (
                    <fieldset className="admin-members">
                      <legend>Modèles inclus</legend>
                      {products
                        .filter((p) => p.id !== draft.id && p.type !== "bundle")
                        .map((p) => (
                          <label key={p.id}>
                            <input
                              type="checkbox"
                              checked={
                                draft.bundleItems?.includes(p.id) || false
                              }
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  bundleItems: e.target.checked
                                    ? [...(draft.bundleItems || []), p.id]
                                    : (draft.bundleItems || []).filter(
                                        (id) => id !== p.id,
                                      ),
                                })
                              }
                            />
                            {p.name} · {stateNames[p.status]}
                          </label>
                        ))}
                    </fieldset>
                  ) : (
                    <>
                      <label>
                        Fichier STL privé
                        <input
                          value={draft.file || ""}
                          onChange={(e) =>
                            setDraft({ ...draft, file: e.target.value })
                          }
                          placeholder={`${draft.id || "modele"}.stl`}
                        />
                      </label>
                      <label className="admin-upload">
                        <Upload size={18} />
                        Transférer un STL (50 Mo max.)
                        <input
                          type="file"
                          accept=".stl"
                          disabled={
                            busy ||
                            !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(draft.id)
                          }
                          onChange={(e) => {
                            void upload(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                        <small>
                          Stockage privé. Le contrôle du fichier ne remplace pas
                          un test d’impression.
                        </small>
                      </label>
                    </>
                  )}
                  <div className="admin-form-grid">
                    <label>
                      Version du fichier
                      <input
                        value={draft.version || "1"}
                        onChange={(e) =>
                          setDraft({ ...draft, version: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Taille affichée
                      <input
                        value={draft.fileSize || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, fileSize: e.target.value })
                        }
                        placeholder="Ex. 1 MB"
                      />
                    </label>
                    <label>
                      Temps d’impression estimé
                      <input
                        value={draft.printTime || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, printTime: e.target.value })
                        }
                        placeholder="Non vérifié"
                      />
                    </label>
                    <label>
                      Version de licence
                      <input
                        value={draft.licenseVersion || "personal-v1"}
                        readOnly
                      />
                      <small>
                        Licence personnelle uniquement pour le moment.
                      </small>
                    </label>
                  </div>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={draft.featured || false}
                      onChange={(e) =>
                        setDraft({ ...draft, featured: e.target.checked })
                      }
                    />
                    Mettre en avant dans la sélection
                  </label>
                  <p className="admin-caption">
                    La publication exige une fiche complète et des fichiers
                    privés disponibles. Archiver masque le produit sans
                    supprimer les anciennes commandes.
                  </p>
                  <button className="admin-button" disabled={busy}>
                    {busy ? "Enregistrement…" : "Enregistrer la fiche"}
                  </button>
                </form>
              )}
            </div>
          </>
        )}
        {tab === "orders" && (
          <>
            <div className="admin-heading">
              <div>
                <p className="admin-kicker">VENTES & LIVRAISONS</p>
                <h1>Commandes.</h1>
              </div>
            </div>
            <form
              className="admin-search"
              onSubmit={(e) => {
                e.preventDefault();
                setError("");
                api(`/orders?q=${encodeURIComponent(orderSearch)}`)
                  .then((data) => setOrders(data.orders))
                  .catch((e) => setError(e.message));
              }}
            >
              <label className="admin-visually-hidden" htmlFor="order-search">
                Rechercher une commande
              </label>
              <input
                id="order-search"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Identifiant ou état (paid, refunded…)"
                maxLength={100}
              />
              <button className="admin-button">Rechercher</button>
            </form>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Commande</th>
                    <th>Date</th>
                    <th>État</th>
                    <th>Total</th>
                    <th>Remboursé</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <button
                          className="admin-text-link"
                          onClick={() =>
                            api(`/orders/${encodeURIComponent(o.id)}`)
                              .then((data) => setOrder(data.order))
                              .catch((e) => setError(e.message))
                          }
                        >
                          {o.id.slice(0, 8)}…
                        </button>
                      </td>
                      <td>
                        {new Date(o.createdAt).toLocaleDateString("fr-BE")}
                      </td>
                      <td>{stateNames[o.status] || o.status}</td>
                      <td>{money(o.totalCents)}</td>
                      <td>{money(o.refundedCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!orders.length && (
                <p className="admin-caption">Aucune commande correspondante.</p>
              )}
            </div>
            <p className="admin-caption">
              100 commandes au maximum par recherche. Les remboursements se
              déclenchent dans Stripe ; leur état est synchronisé sur le site.
            </p>
            {order && (
              <section className="admin-order-detail">
                <div className="admin-form-title">
                  <h2>Détail de commande</h2>
                  <button
                    aria-label="Fermer le détail"
                    onClick={() => setOrder(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="admin-order-id">{order.id}</p>
                <p>
                  {stateNames[order.status] || order.status} ·{" "}
                  {money(order.totalCents)}
                </p>
                {order.items?.map((i) => (
                  <div className="admin-order-item" key={i.id}>
                    <span>
                      {i.name}
                      <small>{i.licenseVersion}</small>
                    </span>
                    <strong>{money(i.priceCents)}</strong>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
        {tab === "messages" && (
          <>
            <div className="admin-heading">
              <div>
                <p className="admin-kicker">CONTACT & SUPPORT</p>
                <h1>Vos messages.</h1>
              </div>
              <button className="admin-button" onClick={() => loadMessages()}>
                Actualiser
              </button>
            </div>
            <p className="admin-caption">
              Demandes reçues via le formulaire de contact. Ouvre un message
              pour lire la demande et répondre depuis ta messagerie.
            </p>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Nom</th>
                    <th>Sujet</th>
                    <th>Référence</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((item) => (
                    <tr key={item.reference}>
                      <td>
                        {new Date(item.createdAt).toLocaleDateString("fr-BE")}
                      </td>
                      <td>{item.name}</td>
                      <td>
                        <button
                          className="admin-text-link"
                          onClick={() =>
                            api(
                              `/messages/${encodeURIComponent(item.reference)}`,
                            )
                              .then((data) => setInquiry(data.message))
                              .catch((e) => setError(e.message))
                          }
                        >
                          {item.subject || "Sans sujet"}
                        </button>
                      </td>
                      <td>{item.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!inquiries.length && (
                <p className="admin-caption">Aucun message sur cette page.</p>
              )}
            </div>
            <div className="admin-message-pagination">
              <button
                className="admin-button"
                disabled={messagePage <= 1}
                onClick={() => loadMessages(messagePage - 1)}
              >
                Précédent
              </button>
              <span>
                Page {messagePage} · {messageTotal} message(s)
              </span>
              <button
                className="admin-button"
                disabled={messagePage * 50 >= messageTotal}
                onClick={() => loadMessages(messagePage + 1)}
              >
                Suivant
              </button>
            </div>
            {inquiry && (
              <section className="admin-order-detail">
                <div className="admin-form-title">
                  <h2>{inquiry.subject || "Sans sujet"}</h2>
                  <button
                    aria-label="Fermer le message"
                    onClick={() => setInquiry(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <p>
                  {inquiry.name} · {inquiry.email}
                </p>
                <p className="admin-caption">
                  {new Date(inquiry.createdAt).toLocaleString("fr-BE")} ·{" "}
                  {inquiry.reference}
                </p>
                <p className="admin-message-body">{inquiry.message}</p>
                <a
                  className="admin-button"
                  href={`mailto:${encodeURIComponent(inquiry.email)}?subject=${encodeURIComponent(`Re: ${inquiry.subject} [${inquiry.reference}]`)}`}
                >
                  Répondre avec ma messagerie
                </a>
                <p className="admin-caption">
                  Ce bouton ouvre ton application email. Le site n’envoie aucune
                  réponse automatiquement.
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
