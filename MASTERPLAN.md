# AGENT PAUL - MASTERPLAN V2

## Vue d'ensemble

**Objectif:** Transformer Agent Paul en produit premium pret pour WHOP
**Temps estime:** 12 heures de travail
**Methode:** Sessions alternees (Claude code → Pascal teste → iteration)

---

# PHASE 1: CONVERSATION NATURELLE
**Temps: 2h | Priorite: HAUTE**

## 1.1 State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                     ETATS UTILISATEUR                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   START ──────► ONBOARDING ──────► CREATING ──────► READY   │
│     │               │                  │              │      │
│     │          [Collecte]         [Scrape]      [Editing]   │
│     │          - nom              [Generate]    - modify    │
│     │          - ville            [Build]       - preview   │
│     │          - vibe                           - deploy    │
│     │          - photos                                     │
│     │                                                        │
│     └──────────────────► HELP (a tout moment)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 1.2 Fichiers a creer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/bot/conversation.ts` | CREER | State machine + flow |
| `src/bot/messages.ts` | CREER | Tous les messages du bot |
| `src/bot/telegram.ts` | MODIFIER | Utiliser conversation flow |

## 1.3 Flow de conversation detaille

### Etape 1: Accueil
```
TRIGGER: /start ou premier message

BOT: Salut! 👋 Je suis Paul, ton assistant pour creer
     une landing page pour ton restaurant.

     C'est simple: tu me donnes les infos, je cree la page.

     On commence? Dis-moi le nom de ton restaurant.
```

### Etape 2: Nom du restaurant
```
USER: Mae Sri Comptoir Thai

BOT: Mae Sri Comptoir Thai, note! 📝

     Dans quelle ville?
```

### Etape 3: Ville
```
USER: Montreal

BOT: Montreal, parfait.

     Je cherche ton restaurant sur Google Maps...

     [Recherche en cours]
```

### Etape 4: Confirmation Google
```
BOT: J'ai trouve:

     📍 Mae Sri Comptoir Thai
     ⭐ 4.4/5 (523 avis)
     📍 1234 Rue Saint-Denis, Montreal
     📞 514-555-1234

     [C'est bien ca ✓] [Ce n'est pas mon resto]
```

### Etape 5: Choix du style (Boutons Telegram)
```
BOT: Quel vibe correspond le mieux a ton resto?

     [🍷 Elegant]     [☕ Casual]
     [🔥 Trendy]      [👨‍👩‍👧 Familial]
```

### Etape 6: Generation
```
BOT: Parfait! Je genere ta landing page...

     ⏳ Analyse des avis clients...
     ⏳ Creation du contenu...
     ⏳ Design de la page...

     [Progress bar animee]
```

### Etape 7: Resultat
```
BOT: Ta page est prete! 🎉

     🔗 Preview: https://agentpaul.../mae-sri

     Voici ce que j'ai cree:

     📌 Titre: Sawadee. Bienvenue chez Mae Sri.
     ✨ Accroche: L'authenticite thailandaise au coeur du Plateau
     🎨 Couleurs: Rouge thai + Or

     Tu peux modifier n'importe quoi. Dis-moi ce que tu veux changer,
     ou tape /preview pour voir la page.
```

## 1.4 Messages.ts - Bibliotheque de messages

```typescript
export const MESSAGES = {
  // Accueil
  WELCOME: `Salut! 👋 Je suis Paul, ton assistant pour creer une landing page pour ton restaurant.

C'est simple: tu me donnes les infos, je cree la page.

On commence? Dis-moi le nom de ton restaurant.`,

  // Collecte infos
  ASK_CITY: (name: string) => `${name}, note! 📝

Dans quelle ville?`,

  SEARCHING: (name: string, city: string) => `Je cherche ${name} a ${city} sur Google Maps...`,

  // Confirmation
  FOUND_RESTAURANT: (data: RestaurantData) => `J'ai trouve:

📍 ${data.name}
⭐ ${data.rating}/5 (${data.reviewCount} avis)
📍 ${data.address}
${data.phone ? `📞 ${data.phone}` : ''}

C'est bien ton restaurant?`,

  NOT_FOUND: `Je n'ai pas trouve ce restaurant sur Google Maps.

Essaie avec:
• Le nom exact (comme sur Google)
• L'adresse complete
• Ou envoie-moi le lien Google Maps`,

  // Style
  ASK_STYLE: `Quel vibe correspond le mieux a ton resto?`,

  // Generation
  GENERATING: `Parfait! Je genere ta landing page...

⏳ Analyse des avis clients...
⏳ Creation du contenu...
⏳ Design de la page...`,

  // Resultat
  PAGE_READY: (data: PageData, url: string) => `Ta page est prete! 🎉

🔗 Preview: ${url}

📌 Titre: ${data.heroTitle}
✨ Accroche: ${data.tagline}
🎨 Couleurs: ${data.primaryColor}

Tu peux modifier n'importe quoi:
• "Change le titre pour..."
• "Ajoute [plat] a [prix]"
• "Met du bleu comme couleur"

Ou tape /preview pour voir la page.`,

  // Erreurs
  ERROR_GENERIC: `Oups, quelque chose s'est mal passe. Reessaie!`,

  ERROR_SCRAPE: `Je n'ai pas reussi a trouver les infos de ce restaurant.

Verifie que:
• Le nom est correct
• Le restaurant est sur Google Maps
• La ville est bonne`,

  ERROR_GENERATE: `Le contenu n'a pas pu etre genere. Je reessaie...`,

  // Aide
  HELP: `Voici ce que je peux faire:

📝 Creer une page
   → Dis-moi le nom de ton resto

✏️ Modifier ta page
   → "Change le titre pour..."
   → "Ajoute [plat] a [prix]"
   → "Enleve le pad thai"
   → "Met du rouge"

👀 Voir ta page
   → /preview

🚀 Publier
   → /deploy

❓ Aide
   → /help`
};
```

## 1.5 Conversation.ts - State Machine

```typescript
// États possibles
type ConversationState =
  | 'IDLE'           // Rien en cours
  | 'AWAITING_NAME'  // Attend nom du resto
  | 'AWAITING_CITY'  // Attend ville
  | 'CONFIRMING'     // Confirmation Google
  | 'CHOOSING_STYLE' // Choix du vibe
  | 'GENERATING'     // En cours de generation
  | 'READY'          // Page prete, mode edition
  | 'AWAITING_PHOTO' // Attend une photo

interface UserSession {
  state: ConversationState;
  restaurantName?: string;
  city?: string;
  style?: 'elegant' | 'casual' | 'trendy' | 'familial';
  scrapedData?: RestaurantData;
  pageData?: PageData;
  pageSlug?: string;
}
```

## 1.6 Tests a effectuer

- [ ] Premier message → accueil correct
- [ ] Envoi nom → demande ville
- [ ] Envoi ville → recherche Google
- [ ] Boutons style → fonctionnent
- [ ] Generation → progresse sans erreur
- [ ] Resultat → lien fonctionne
- [ ] Modification → interprete correctement

---

# PHASE 2: PROMPTS CLAUDE PREMIUM
**Temps: 3h | Priorite: HAUTE**

## 2.1 Objectif

Passer de:
```
❌ "Bienvenue chez Mae Sri Comptoir Thai"
❌ "Plat signature - 22$"
```

A:
```
✅ "Sawadee. L'authenticite thailandaise depuis 2015."
✅ "Pad Thai Traditionnel - Nouilles sautees, crevettes, arachides - 18$"
```

## 2.2 Structure du prompt premium

```typescript
const PREMIUM_PROMPT = `Tu es un copywriter senior specialise dans la restauration haut de gamme.
Tu ecris en francais quebecois professionnel mais accessible.

CONTEXTE RESTAURANT:
- Nom: ${name}
- Type: ${category}
- Note: ${rating}/5 (${reviewCount} avis)
- Adresse: ${address}

ANALYSE DES AVIS (themes recurrents):
${reviewAnalysis}

STYLE DEMANDE: ${style}
- elegant: sophistique, mots choisis, experience premium
- casual: chaleureux, accessible, convivial
- trendy: moderne, dynamique, Instagram-worthy
- familial: accueillant, genereux, traditions

---

GENERE LE CONTENU SUIVANT:

1. TAGLINE (5-8 mots max)
   - Memorable, pas cliche
   - Peut inclure un mot de la culture (ex: "Sawadee" pour thai)
   - Evoque une emotion ou une promesse

   EXEMPLES BONS:
   - "Sawadee. L'authenticite dans chaque bouchee."
   - "Du marche a l'assiette, depuis 1987."
   - "La ou le Plateau rencontre Bangkok."

   EXEMPLES MAUVAIS:
   - "Le meilleur restaurant de Montreal" (cliche)
   - "Bienvenue chez nous" (generique)
   - "Qualite et service" (vide)

2. DESCRIPTION (2-3 phrases, 40-60 mots)
   - Premiere phrase: hook emotionnel
   - Deuxieme phrase: ce qui rend unique (base sur avis)
   - Troisieme phrase: invitation/promesse

   EXEMPLE:
   "Depuis 2015, Mae Sri transporte les saveurs authentiques de Bangkok
   au coeur du Plateau. Nos recettes familiales, transmises sur trois
   generations, transforment chaque repas en voyage. Venez gouter
   pourquoi nos clients reviennent encore et encore."

3. MENU HIGHLIGHTS (3-4 plats)
   - Noms authentiques (pas "Plat signature")
   - Prix realistes Quebec (15$-35$)
   - Description courte et appetissante (5-10 mots)

   FORMAT:
   [
     {"name": "Pad Thai Traditionnel", "price": "18$", "description": "Nouilles sautees, crevettes tigrees, arachides concassees"},
     {"name": "Curry Vert Bangkok", "price": "22$", "description": "Lait de coco, basilic thai, legumes croquants"},
     {"name": "Tom Yum Goong", "price": "16$", "description": "Soupe epicee aux crevettes, citronnelle, galanga"}
   ]

4. HERO TITLE
   - Peut etre le nom seul si fort
   - Ou nom + sous-titre court

   EXEMPLES:
   - "Mae Sri" (simple, elegant)
   - "Mae Sri Comptoir Thai" (complet)
   - "Mae Sri | Cuisine Thai Authentique" (avec descriptor)

5. CTA TEXT (2-4 mots)
   - Action claire
   - Urgence subtile optionnelle

   EXEMPLES BONS:
   - "Reserve ta table"
   - "Commande maintenant"
   - "Decouvre le menu"
   - "Rejoins-nous"

   EXEMPLES MAUVAIS:
   - "Reserver" (trop sec)
   - "Cliquez ici" (generique)

6. COULEURS (basees sur le style et la cuisine)
   - primaryColor: couleur dominante (hex)
   - accentColor: couleur d'accent (hex)

   PALETTES PAR CUISINE:
   - Thai: #C41E3A (rouge), #D4AF37 (or)
   - Italien: #2E5339 (vert olive), #D4A574 (terracotta)
   - Francais: #1A237E (bleu marine), #C9B037 (or)
   - Japonais: #2D2D2D (noir), #C41E3A (rouge)
   - Mexicain: #E65100 (orange), #43A047 (vert)
   - Mediterraneen: #1565C0 (bleu), #FFB300 (jaune)

   PALETTES PAR STYLE:
   - elegant: tons sombres, or/argent
   - casual: tons chauds, bois
   - trendy: couleurs vives, contraste fort
   - familial: tons doux, accueillants

---

REGLES STRICTES:
1. Jamais de superlatifs vides ("meilleur", "incroyable", "extraordinaire")
2. Toujours ancre dans le reel (basé sur les avis)
3. Ton professionnel mais humain
4. Prix realistes pour Montreal
5. Orthographe parfaite

REPONSE EN JSON VALIDE UNIQUEMENT:`;
```

## 2.3 Analyse des avis (pre-processing)

Avant le prompt principal, analyser les avis pour extraire:

```typescript
async function analyzeReviews(reviews: Review[]): Promise<string> {
  const reviewTexts = reviews.map(r => r.text).join('\n---\n');

  const analysis = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Analyse ces avis de restaurant et extrait:

1. Les 3 points positifs les plus mentionnes
2. La specialite/plat le plus mentionne
3. L'ambiance generale decrite
4. Un adjectif qui resume l'experience

AVIS:
${reviewTexts}

Reponds en 4 lignes max, format bullet points.`
    }]
  });

  return analysis.content[0].text;
}
```

## 2.4 Fichiers a modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/generator/content-generator.ts` | MODIFIER | Nouveau prompt premium |
| `src/generator/review-analyzer.ts` | CREER | Pre-analyse des avis |
| `src/generator/prompts.ts` | CREER | Bibliotheque de prompts |

## 2.5 Tests qualite contenu

Pour chaque restaurant teste, verifier:

- [ ] Tagline: memorable, pas generique?
- [ ] Description: evoque emotion, specifique au resto?
- [ ] Menu: plats realistes avec vrais noms?
- [ ] Couleurs: coherentes avec le type de cuisine?
- [ ] CTA: actionnable, clair?

---

# PHASE 3: PREVIEW & LIEN
**Temps: 1h | Priorite: HAUTE**

## 3.1 Objectif

Apres creation, le bot envoie automatiquement:
- Le lien cliquable vers la page
- Un screenshot/preview de la page (optionnel v2)

## 3.2 Implementation

```typescript
// Dans telegram.ts, apres creation reussie:

const pageUrl = `https://agentpaul-production.up.railway.app/${pageData.slug}`;

await ctx.reply(
  `Ta page est prete! 🎉\n\n` +
  `🔗 Voir ta page: ${pageUrl}\n\n` +
  `${getPageSummary(pageData)}\n\n` +
  `Tu peux modifier n'importe quoi en m'envoyant un message.`,
  {
    parse_mode: 'Markdown',
    disable_web_page_preview: false  // Permet preview du lien
  }
);
```

## 3.3 Commande /preview

```typescript
bot.command('preview', async (ctx) => {
  const state = getUserState(ctx.from.id);
  if (!state.pageSlug) {
    await ctx.reply("Tu n'as pas encore de page. Envoie-moi le nom de ton restaurant pour commencer!");
    return;
  }

  const url = `https://agentpaul-production.up.railway.app/${state.pageSlug}`;
  await ctx.reply(`🔗 Voici ta page:\n${url}`);
});
```

---

# PHASE 4: UPLOAD PHOTOS SIMPLIFIE
**Temps: 2h | Priorite: MOYENNE**

## 4.1 Flow photos

```
BOT: Tu veux ajouter tes propres photos? 📸

     [Oui, j'en ai] [Non, utilise Google]

--- Si oui ---

BOT: Envoie-moi 3 a 5 photos de ton restaurant.

     Tips:
     • La premiere sera la photo principale
     • Format carre ou portrait = ideal
     • Bonne lumiere = meilleur rendu

     Envoie quand tu es pret!

--- User envoie photos ---

BOT: Photo 1/5 recue ✓
BOT: Photo 2/5 recue ✓
...

BOT: Parfait! J'ai 5 photos.

     [Continuer avec ces photos] [Ajouter d'autres]
```

## 4.2 Processing photos

```typescript
async function processUploadedPhoto(
  fileId: string,
  ctx: Context
): Promise<ProcessedPhoto> {
  // 1. Telecharger depuis Telegram
  const file = await ctx.telegram.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  // 2. Telecharger le fichier
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  // 3. Traiter avec Sharp
  const processed = await sharp(buffer)
    .resize(1200, 800, { fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer();

  // 4. Sauvegarder localement
  const filename = `${uuid()}.webp`;
  const path = `/app/output/${slug}/images/${filename}`;
  await fs.writeFile(path, processed);

  return {
    url: `/images/${filename}`,
    alt: `Photo ${index}`,
    // ...
  };
}
```

## 4.3 Sources acceptees (v2)

| Source | Implementation |
|--------|---------------|
| Photo Telegram | Direct, deja fait |
| URL image | Fetch + process |
| Lien Instagram | Extract image URL |
| Google Drive | API download |

---

# PHASE 5: TEMPLATE MOBILE-FIRST
**Temps: 2h | Priorite: MOYENNE**

## 5.1 Ameliorations template

### Hero Section
```html
<section class="hero">
  <!-- Mobile: full screen -->
  <!-- Desktop: 70vh max -->

  <div class="hero-overlay"></div>
  <div class="hero-content">
    <h1>{{heroTitle}}</h1>
    <p class="tagline">{{tagline}}</p>
    <a href="#contact" class="cta-button">{{ctaText}}</a>
  </div>
</section>
```

### CTA Flottant Mobile
```html
<div class="floating-cta">
  <a href="tel:{{phone}}" class="cta-call">📞 Appeler</a>
  <a href="#reserve" class="cta-reserve">{{ctaText}}</a>
</div>
```

### Galerie Touch-Friendly
```html
<section class="gallery">
  <div class="gallery-scroll">
    {{#each photos}}
      <img src="{{url}}" alt="{{alt}}" loading="lazy">
    {{/each}}
  </div>
</section>
```

## 5.2 CSS Priorites

```css
/* Mobile First */
.hero {
  min-height: 100vh;
  min-height: 100dvh; /* Dynamic viewport height */
}

.floating-cta {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  padding: 1rem;
  background: white;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  z-index: 100;
}

/* Desktop */
@media (min-width: 768px) {
  .hero {
    min-height: 70vh;
  }

  .floating-cta {
    display: none;
  }
}
```

## 5.3 Performance

- [ ] Images WebP
- [ ] Lazy loading
- [ ] Critical CSS inline
- [ ] Fonts preload
- [ ] Target: < 2s load time

---

# PHASE 6: CTA & LEAD CAPTURE
**Temps: 2h | Priorite: MOYENNE**

## 6.1 Options CTA dans le bot

```
BOT: Quel est l'objectif principal de ta page?

     [📞 Recevoir des appels]
     [📅 Prendre des reservations]
     [📧 Collecter des emails]
     [🔗 Rediriger vers ton site]
```

## 6.2 Lead Capture Form

```html
<section class="lead-capture">
  <h3>Rejoins notre liste VIP</h3>
  <p>10% sur ta prochaine visite</p>

  <form action="/api/subscribe" method="POST">
    <input type="email" placeholder="ton@email.com" required>
    <button type="submit">Je m'inscris</button>
  </form>
</section>
```

## 6.3 Integration Brevo

```typescript
// src/integrations/brevo.ts

import SibApi from 'sib-api-v3-sdk';

export async function addSubscriber(
  email: string,
  restaurantSlug: string,
  listId: number
): Promise<void> {
  const client = SibApi.ApiClient.instance;
  client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

  const api = new SibApi.ContactsApi();

  await api.createContact({
    email,
    listIds: [listId],
    attributes: {
      RESTAURANT: restaurantSlug,
      SOURCE: 'agent-paul'
    }
  });
}
```

---

# PHASE 7: DEPLOY VERCEL
**Temps: 1h | Priorite: BASSE (v2)**

## 7.1 Commande /deploy

```
USER: /deploy

BOT: Je deploie ta page sur Vercel...

     ⏳ Upload des fichiers...
     ⏳ Build en cours...
     ✅ Deploye!

     🔗 URL definitive: https://mae-sri.vercel.app

     Tu peux maintenant partager ce lien!
```

## 7.2 Custom Domain (v2)

```
USER: /domain maesri.com

BOT: Pour connecter maesri.com:

     1. Va dans les DNS de ton domaine
     2. Ajoute ce record CNAME:

        Type: CNAME
        Nom: @
        Valeur: cname.vercel-dns.com

     3. Dis-moi quand c'est fait, je verifie!
```

---

# CHECKLIST FINALE

## Phase 1: Conversation Naturelle
- [ ] State machine implementee
- [ ] Messages.ts avec tous les textes
- [ ] Flow /start → nom → ville → confirm → style → generate
- [ ] Boutons Telegram fonctionnels
- [ ] Gestion erreurs gracieuse
- [ ] Tests complets

## Phase 2: Prompts Premium
- [ ] Nouveau prompt content-generator
- [ ] Analyse des reviews
- [ ] Test sur 5 restaurants differents
- [ ] Qualite validee (pas de fallback visible)
- [ ] Plats realistes, prix corrects

## Phase 3: Preview
- [ ] Lien dans message de confirmation
- [ ] Commande /preview
- [ ] Page accessible publiquement

## Phase 4: Photos
- [ ] Upload photos Telegram
- [ ] Processing Sharp
- [ ] Multiple photos
- [ ] Integration dans flow

## Phase 5: Template
- [ ] Mobile-first CSS
- [ ] CTA flottant
- [ ] Performance < 2s
- [ ] Test iPhone + Android

## Phase 6: Lead Capture
- [ ] Form email dans template
- [ ] Endpoint /api/subscribe
- [ ] Integration Brevo
- [ ] Test inscription

## Phase 7: Deploy
- [ ] /deploy commande
- [ ] Upload Vercel
- [ ] URL propre
- [ ] Custom domain (doc)

---

# ORDRE D'EXECUTION

```
SESSION 1 (3h)
├── Phase 2: Prompts Premium ← PRIORITE
│   └── Contenu qui claque = wow factor immediat
└── Phase 3: Preview
    └── Voir le resultat = satisfaction

SESSION 2 (3h)
├── Phase 1: Conversation Naturelle
│   └── Onboarding fluide = UX premium
└── Tests + Debug

SESSION 3 (3h)
├── Phase 5: Template Mobile
│   └── Beau sur telephone = shareable
└── Phase 4: Photos
    └── Photos perso = personnalisation

SESSION 4 (3h)
├── Phase 6: Lead Capture
│   └── Emails = valeur business
└── Phase 7: Deploy Vercel
    └── URL propre = pro

BONUS
├── Documentation WHOP
├── Video demo
└── Landing page Agent Paul
```

---

# NOTES POUR SESSIONS

## Avant chaque session
1. Pull dernier code
2. Check Railway logs
3. Tester le bot actuel

## Apres chaque session
1. Commit + Push
2. Verifier deploy Railway
3. Tester en live sur Telegram
4. Noter les bugs pour next session

## Communication
- Pascal teste en live
- Screenshots des bugs
- Feedback sur le ton/messages
- Validation qualite contenu

---

**LET'S BUILD THIS MONSTER! 🚀**
