const { app } = require("@azure/functions");

// Formulaire de contact ollivander.ca → courriel, via Microsoft Graph sendMail
// (auth app-only, autorisation Exchange « RBAC for Applications » limitée à la
// seule boîte CONTACT_FROM). Aucun secret dans le code : tout vient des
// Application settings du SWA (GRAPH_TENANT_ID / GRAPH_CLIENT_ID /
// GRAPH_CLIENT_SECRET / CONTACT_TO / CONTACT_FROM).

const MAX = { nom: 120, compagnie: 160, courriel: 160, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

async function getGraphToken() {
  const tenant = process.env.GRAPH_TENANT_ID;
  const body = new URLSearchParams({
    client_id: process.env.GRAPH_CLIENT_ID,
    client_secret: process.env.GRAPH_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`token ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  if (!j.access_token) throw new Error("token: réponse sans access_token");
  return j.access_token;
}

app.http("contact", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "contact",
  handler: async (request, context) => {
    // 1) Lire le corps JSON
    let b;
    try { b = await request.json(); } catch { b = null; }
    if (!b || typeof b !== "object") {
      return { status: 400, jsonBody: { ok: false, error: "bad_request" } };
    }

    const nom = String(b.nom || "").trim();
    const compagnie = String(b.compagnie || "").trim();
    const courriel = String(b.courriel || "").trim();
    const message = String(b.message || "").trim();
    const honeypot = String(b.site || "").trim(); // champ piège (invisible)

    // 2) Honeypot : un bot a rempli le champ caché → on répond « OK » sans rien envoyer.
    if (honeypot) {
      context.log("contact: honeypot déclenché, ignoré silencieusement");
      return { status: 200, jsonBody: { ok: true } };
    }

    // 3) Validation serveur (longueurs max + format courriel)
    if (!nom || nom.length > MAX.nom) return { status: 422, jsonBody: { ok: false, error: "nom" } };
    if (compagnie.length > MAX.compagnie) return { status: 422, jsonBody: { ok: false, error: "compagnie" } };
    if (!courriel || courriel.length > MAX.courriel || !EMAIL_RE.test(courriel))
      return { status: 422, jsonBody: { ok: false, error: "courriel" } };
    if (!message || message.length > MAX.message) return { status: 422, jsonBody: { ok: false, error: "message" } };

    const to = process.env.CONTACT_TO;
    const from = process.env.CONTACT_FROM;
    if (!to || !from || !process.env.GRAPH_TENANT_ID || !process.env.GRAPH_CLIENT_ID || !process.env.GRAPH_CLIENT_SECRET) {
      context.error("contact: configuration manquante (settings Graph/CONTACT_*)");
      return { status: 500, jsonBody: { ok: false, error: "server_config" } };
    }

    // Sujet : aucun retour de ligne/espace multiple dans {compagnie} (évite l'injection d'en-tête).
    const who = String(compagnie || nom).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 150);
    const subject = `Nouveau message – ollivander.ca – ${who}`;
    const html =
      `<p><strong>Nom :</strong> ${esc(nom)}</p>` +
      `<p><strong>Compagnie :</strong> ${esc(compagnie) || "—"}</p>` +
      `<p><strong>Courriel :</strong> ${esc(courriel)}</p>` +
      `<hr>` +
      `<p>${esc(message).replace(/\n/g, "<br>")}</p>`;

    // 4) Envoi via Graph sendMail (Reply-To = courriel du visiteur)
    try {
      const token = await getGraphToken();
      const mail = {
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: to } }],
          replyTo: [{ emailAddress: { address: courriel, name: nom } }],
        },
        saveToSentItems: true,
      };
      const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(mail),
      });
      if (r.status !== 202) {
        context.error(`contact: sendMail ${r.status}: ${(await r.text()).slice(0, 400)}`);
        return { status: 502, jsonBody: { ok: false, error: "send_failed" } };
      }
      context.log(`contact: message envoyé à ${to} (reply-to ${courriel})`);
      return { status: 200, jsonBody: { ok: true } };
    } catch (e) {
      context.error("contact: exception", e && e.message);
      return { status: 500, jsonBody: { ok: false, error: "server" } };
    }
  },
});
