// Script d'envoi automatique de l'email quotidien AW SERVICES
// Execute chaque jour par GitHub Actions (voir .github/workflows/email-quotidien.yml)

const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");

const SUPABASE_URL = "https://vnceunqygoiwglnwpgcr.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const SITE_URL = "https://awmamadou394-ops.github.io/aw-services-site";

const NB_PRODUITS_BOUTIQUE = 4;
const NB_BIENS_IMMOBILIER = 2;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function melangerEtPrendre(liste, n) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie.slice(0, n);
}

function formaterPrix(prix) {
  if (prix === null || prix === undefined) return "";
  return Number(prix).toLocaleString("fr-FR") + " FCFA";
}

async function recupererClients() {
  const { data, error } = await sb.from("clients").select("email").not("email", "is", null);
  if (error) throw error;
  return data.map((c) => c.email).filter(Boolean);
}

async function recupererProduits() {
  const { data, error } = await sb
    .from("produits")
    .select("*")
    .eq("statut", "approuve")
    .gt("stock", 0);
  if (error) throw error;
  return data || [];
}

async function recupererImmobilier() {
  const { data, error } = await sb.from("biens_immobiliers").select("*");
  if (error) throw error;
  return data || [];
}

function carteHtml(titre, sousTitre, prixTexte, lien) {
  return `
    <table role="presentation" width="100%" style="margin-bottom:12px;border:1px solid #2A2D4A;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="background-color:#1A1C38;padding:14px 16px;">
          <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#F5F5F7;">${titre}</div>
          ${sousTitre ? `<div style="font-family:Arial,sans-serif;font-size:13px;color:#A0A3C4;margin-top:2px;">${sousTitre}</div>` : ""}
          <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#F2A93B;margin-top:8px;">${prixTexte}</div>
          <a href="${lien}" style="display:inline-block;margin-top:10px;background-color:#F2A93B;color:#1C1200;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;padding:8px 16px;border-radius:6px;">Voir sur le site</a>
        </td>
      </tr>
    </table>`;
}

function construireEmailHtml(produits, biens) {
  let sections = "";

  if (produits.length > 0) {
    sections += `<h2 style="font-family:Arial,sans-serif;color:#F5F5F7;font-size:17px;margin:24px 0 10px;">🛍️ Boutique</h2>`;
    produits.forEach((p) => {
      sections += carteHtml(p.nom || "Produit", p.categorie || "", formaterPrix(p.prix), `${SITE_URL}/catalogue.html`);
    });
  }

  if (biens.length > 0) {
    sections += `<h2 style="font-family:Arial,sans-serif;color:#F5F5F7;font-size:17px;margin:24px 0 10px;">🏠 Immobilier</h2>`;
    biens.forEach((b) => {
      sections += carteHtml(b.titre || b.nom || "Bien immobilier", b.localisation || "", formaterPrix(b.prix), `${SITE_URL}/immobilier.html`);
    });
  }

  sections += `
    <h2 style="font-family:Arial,sans-serif;color:#F5F5F7;font-size:17px;margin:24px 0 10px;">📺 IPTV</h2>
    ${carteHtml("Abonnement IPTV", "6 mois - le plus choisi", "16 000 FCFA", `${SITE_URL}/iptv.html`)}

    <h2 style="font-family:Arial,sans-serif;color:#F5F5F7;font-size:17px;margin:24px 0 10px;">🐔 Volaille</h2>
    ${carteHtml("Poulet de chair", "Des le 5 pieces", "3 250 FCFA / piece", `${SITE_URL}/volaille.html`)}
  `;

  return `
  <div style="background-color:#12142B;padding:24px 16px;">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;">
      <tr>
        <td style="text-align:center;padding-bottom:20px;">
          <div style="font-family:Arial,sans-serif;color:#F2A93B;font-size:20px;font-weight:700;">AW SERVICES</div>
          <div style="font-family:Arial,sans-serif;color:#A0A3C4;font-size:13px;margin-top:4px;">Vos offres du jour</div>
        </td>
      </tr>
      <tr><td>${sections}</td></tr>
      <tr>
        <td style="text-align:center;padding-top:16px;">
          <a href="${SITE_URL}/index.html" style="font-family:Arial,sans-serif;color:#F2A93B;font-size:13px;text-decoration:none;">Visiter le site complet</a>
          <div style="font-family:Arial,sans-serif;color:#5A5D7A;font-size:11px;margin-top:16px;">Vous recevez cet email car vous avez un compte AW SERVICES.</div>
        </td>
      </tr>
    </table>
  </div>`;
}

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!SUPABASE_SERVICE_KEY || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error("Variables d'environnement manquantes (SUPABASE_SERVICE_KEY, GMAIL_USER, GMAIL_APP_PASSWORD).");
  }

  const [clients, tousLesProduits, tousLesBiens] = await Promise.all([
    recupererClients(),
    recupererProduits(),
    recupererImmobilier(),
  ]);

  if (clients.length === 0) {
    console.log("Aucun client avec email trouve. Rien a envoyer.");
    return;
  }

  const transporteur = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  let envoyes = 0;
  for (const email of clients) {
    // Selection aleatoire propre a chaque client : deux clients ne recoivent pas le meme email
    const produits = melangerEtPrendre(tousLesProduits, NB_PRODUITS_BOUTIQUE);
    const biens = melangerEtPrendre(tousLesBiens, NB_BIENS_IMMOBILIER);
    const html = construireEmailHtml(produits, biens);

    try {
      await transporteur.sendMail({
        from: `"AW SERVICES" <${GMAIL_USER}>`,
        to: email,
        subject: "Vos offres du jour - AW SERVICES",
        html,
      });
      envoyes++;
    } catch (err) {
      console.error(`Echec d'envoi a ${email} :`, err.message);
    }

    // Petite pause entre chaque envoi pour rester sous les limites Gmail
    await attendre(500);
  }

  console.log(`Email quotidien envoye individuellement a ${envoyes}/${clients.length} client(s).`);
}

main().catch((err) => {
  console.error("Erreur lors de l'envoi de l'email quotidien :", err);
  process.exit(1);
});
