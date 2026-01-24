# Agent Paul - Roadmap V2

## Vision
Bot Telegram qui cree des landing pages restaurant **professionnelles** en 2 minutes.
Chaque mois = un nouveau bot killer en acces exclusif sur WHOP.

---

## PHASE 1: ONBOARDING FLUIDE

### 1.1 Conversation Naturelle (pas de commandes)

**Avant:**
```
/new "Mae Sri" Montreal
```

**Apres:**
```
User: Salut!
Bot: 👋 Hey! Je suis Paul, ton assistant landing page.
     C'est quoi le nom de ton resto?

User: Mae Sri Comptoir Thai

Bot: Nice! Mae Sri Comptoir Thai 🍜
     T'es dans quelle ville?

User: Montreal

Bot: Perfect! Je vais chercher ton resto sur Google Maps...
```

### 1.2 Guided Setup Flow

```
Etape 1: Nom + Ville
    ↓
Etape 2: Verifier les infos Google (corriger si besoin)
    ↓
Etape 3: Choisir le vibe/style
         [ Elegant ] [ Casual ] [ Trendy ] [ Familial ]
    ↓
Etape 4: Choisir les couleurs
         [ Auto-detect ] ou palette visuelle
    ↓
Etape 5: Upload photos (optionnel)
         "Envoie 3-5 photos de ton resto"
    ↓
Etape 6: Preview + Confirmation
```

### 1.3 GPT Onboarding (Option Premium)

Lien vers un GPT custom pour:
- Decrire le concept en detail
- Definir le tone of voice
- Creer le "restaurant DNA"
- Generer un brief complet

Export JSON → Import dans Agent Paul

---

## PHASE 2: CONTENU PREMIUM (Claude Extended Thinking)

### 2.1 Prompts Travailles

**Tagline** - 5-8 mots max, memorable, pas cliche
```
❌ "Le meilleur thai de Montreal"
✅ "Sawadee. L'authenticite dans chaque bouchee."
```

**Description** - 2-3 phrases, storytelling, emotion
```
❌ "Restaurant thai avec une bonne note"
✅ "Depuis 2015, Mae Sri transporte les saveurs de Bangkok
    au coeur du Plateau. Recettes familiales, ingredients
    frais, sourires sinceres."
```

**CTA** - Action claire, urgence subtile
```
❌ "Reserver"
✅ "Reserve ta table" / "Rejoins le club VIP" / "Commande maintenant"
```

### 2.2 Extended Thinking pour Qualite

Utiliser `claude-3-5-sonnet` avec thinking blocks pour:
- Analyser les reviews en profondeur
- Extraire les themes recurrents
- Identifier le differentiateur unique
- Creer du copy qui resonne

### 2.3 Variantes A/B

Generer 2-3 versions:
- Version emotionnelle
- Version factuelle
- Version urgente

User choisit sa preferee.

---

## PHASE 3: CALL-TO-ACTION AVANCES

### 3.1 Options CTA

| Type | Action | Integration |
|------|--------|-------------|
| Reserve | Lien reservation | Resy, OpenTable, tel |
| Commande | Lien livraison | UberEats, DoorDash, direct |
| VIP Club | Capture email | Brevo, Mailchimp |
| Fidelite | Inscription WHOP | API WHOP |
| Tickets | Vente evenement | Stripe, WHOP |
| WhatsApp | Contact direct | wa.me link |

### 3.2 Lead Capture Integre

```html
<form>
  <input placeholder="Ton email pour 10% off">
  <button>Rejoins le club 🎉</button>
</form>
```

Integration directe avec:
- Brevo (email automation)
- Notion (CRM simple)
- WHOP (membership)

### 3.3 WHOP Integration

- Programme fidelite
- Acces events exclusifs
- Cashback/points
- Membres VIP

---

## PHASE 4: PHOTOS & VISUELS

### 4.1 Guidelines Upload

```
Bot: 📸 Envoie tes meilleures photos!

Tips:
• Format carre ou portrait (Instagram-style)
• Minimum 1080px de large
• Bien eclaire, pas floue
• 3-5 photos ideales

Tu peux envoyer:
• Screenshots Instagram ✅
• Photos du telephone ✅
• Zip de ta banque photos ✅
```

### 4.2 Processing Auto

- Resize intelligent (hero: 1920x1080, gallery: 800x800)
- Compression WebP (qualite 85%)
- Crop intelligent (focus sur le sujet)
- Format mobile-first

### 4.3 Sources Acceptees

| Source | Comment |
|--------|---------|
| Telegram direct | Envoyer les photos |
| Instagram | Screenshot ou lien post |
| Google Drive | Lien partage |
| URL directe | Coller le lien |

---

## PHASE 5: TEMPLATE PREMIUM

### 5.1 Sections Modulaires

```
[ Hero ]           - Obligatoire
[ About ]          - Optionnel
[ Gallery ]        - Optionnel (si photos)
[ Menu ]           - Optionnel
[ Reviews ]        - Auto (Google)
[ Events ]         - Optionnel
[ VIP Signup ]     - Optionnel
[ Contact/CTA ]    - Obligatoire
[ Footer ]         - Obligatoire
```

### 5.2 Themes Visuels

| Theme | Vibe | Couleurs |
|-------|------|----------|
| Elegant | Fine dining | Noir, or, blanc |
| Fresh | Healthy, moderne | Vert, blanc, bois |
| Bold | Street food, trendy | Couleurs vives |
| Classic | Traditionnel | Bordeaux, creme |
| Minimal | Epure | Noir, blanc |

### 5.3 Mobile-First Design

- Hero full-screen mobile
- Navigation sticky
- Bouton CTA flottant
- Touch-friendly gallery
- Fast loading (<2s)

---

## PHASE 6: UX BOT AMELIOREE

### 6.1 Langage Naturel

```
"change le titre" → detecte l'intention
"ajoute pad thai 18$" → parse automatiquement
"plus de rouge" → ajuste les couleurs
"montre moi la page" → envoie le lien
```

### 6.2 Feedback Visuel

- Progress bar pendant generation
- Preview inline (image)
- Confirmation avec emoji
- Suggestions proactives

### 6.3 Aide Contextuelle

```
User: j'sais pas quoi mettre

Bot: Pas de stress! Voici quelques idees:

     Pour le titre:
     • "[Nom] - [Specialite]"
     • "Bienvenue chez [Nom]"
     • "[Slogan memorable]"

     Veux-tu que je genere des suggestions?
```

---

## PHASE 7: DISTRIBUTION & MONETISATION

### 7.1 Modele WHOP

| Tier | Prix | Inclus |
|------|------|--------|
| Free | $0 | 1 page, watermark |
| Pro | $29/mo | 5 pages, no watermark, custom domain |
| Agency | $99/mo | Unlimited, white-label, API |

### 7.2 Bot du Mois

Chaque mois, nouveau bot exclusif:
- Janvier: Agent Paul (Landing pages)
- Fevrier: Agent [X] (Social content)
- Mars: Agent [Y] (Email campaigns)
- ...

Early access pour membres WHOP.

---

## PRIORITES IMMEDIATES

### Sprint 1 (Cette semaine)
- [ ] Conversation naturelle (pas de /new)
- [ ] Meilleur prompt Claude (tagline + description)
- [ ] Lien preview dans le bot
- [ ] Fix contenu fallback

### Sprint 2 (Semaine prochaine)
- [ ] Guided setup (buttons Telegram)
- [ ] Upload photos simplifie
- [ ] Template ameliore (mobile-first)
- [ ] CTA configurable

### Sprint 3 (Dans 2 semaines)
- [ ] Integration email (Brevo)
- [ ] Deploy Vercel automatique
- [ ] Custom domains
- [ ] WHOP integration

---

## NOTES TECHNIQUES

### Claude Extended Thinking
```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 16000,
  thinking: {
    type: 'enabled',
    budget_tokens: 10000
  },
  messages: [...]
});
```

### Photo Processing Pipeline
```
Upload → Validate → Resize → Compress → Upload CDN → Return URL
```

### Conversation State Machine
```
IDLE → ONBOARDING → SETUP → EDITING → PUBLISHED
```

---

## SUCCESS METRICS

- Time to first page: < 2 minutes
- User satisfaction: > 4.5/5
- Conversion (free → paid): > 10%
- Monthly active bots: 100+
