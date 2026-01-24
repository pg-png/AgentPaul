# AGENT PAUL - PLAN PRODUIT FINAL

## Vision Produit

**Pour le restaurateur:**
- Creer une landing page en 2 minutes via Telegram
- Recevoir un lien permanent a partager
- Capturer des leads (emails clients)
- Recevoir une notification quand quelqu'un s'inscrit

**Pour le client du restaurant:**
- Page mobile rapide et belle
- CTA clair (appeler, reserver, directions)
- Incentive a laisser email (10% off, VIP list, etc.)

---

## SESSION A: TEMPLATE IMPACT (2-3h)

### Objectif
Creer UN template parfait base sur un vrai restaurant (Pamika ou Mae Sri)

### A.1 Structure de page optimisee

```
┌─────────────────────────────────────┐
│           HERO (full screen)        │
│  ┌─────────────────────────────┐    │
│  │      Photo principale       │    │
│  │                             │    │
│  │    NOM DU RESTAURANT        │    │
│  │    Tagline courte           │    │
│  │                             │    │
│  │   [CTA PRIMAIRE - Reserver] │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         SECTION RAPIDE              │
│  📍 Adresse (cliquable → Maps)      │
│  📞 Telephone (cliquable → call)    │
│  🕐 Ouvert maintenant? Horaires     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         MENU HIGHLIGHTS             │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │Photo│ │Photo│ │Photo│           │
│  │Plat1│ │Plat2│ │Plat3│           │
│  │ 18$ │ │ 22$ │ │ 16$ │           │
│  └─────┘ └─────┘ └─────┘           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         GALERIE PHOTOS              │
│  Scroll horizontal (touch-friendly) │
│  [Photo] [Photo] [Photo] [Photo]    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         AVIS CLIENTS                │
│  ⭐⭐⭐⭐⭐ "Meilleur pad thai..."    │
│  ⭐⭐⭐⭐⭐ "Ambiance parfaite..."    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│       EMAIL CAPTURE (optionnel)     │
│                                     │
│  🎁 Recois 10% sur ta 1ere visite   │
│                                     │
│  [        Ton email        ]        │
│  [    Recevoir mon code    ]        │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         CTA FLOTTANT (mobile)       │
│  [📞 Appeler]  [📅 Reserver]        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│              FOOTER                 │
│  Adresse | Horaires | Social        │
│  Propulse par WwithAI               │
└─────────────────────────────────────┘
```

### A.2 Criteres de qualite

- [ ] Mobile-first (teste sur iPhone)
- [ ] Load time < 2 secondes
- [ ] Score Lighthouse > 90
- [ ] CTA visible sans scroll
- [ ] Couleurs coherentes avec la cuisine
- [ ] Fonts lisibles
- [ ] Images optimisees (WebP, lazy load)

### A.3 Livrables

1. Template HTML/CSS complet
2. Teste sur un vrai resto (Mae Sri ou Pamika)
3. Screenshots avant/apres pour demo

---

## SESSION B: EMAIL CAPTURE + NOTIFICATIONS (2-3h)

### Objectif
Quand un visiteur laisse son email:
1. Il recoit un email de confirmation (code promo)
2. Le restaurateur recoit une notification
3. Lead sauvegarde dans une liste

### B.1 Flow Email

```
VISITEUR                    SYSTEME                     RESTAURATEUR
   │                           │                              │
   │  [Entre email]            │                              │
   │ ─────────────────────────>│                              │
   │                           │                              │
   │                           │  Sauvegarde dans Brevo       │
   │                           │  (liste: resto-mae-sri)      │
   │                           │                              │
   │  Email: "Ton code: VIP10" │<─────────────────────────────│
   │ <─────────────────────────│                              │
   │                           │                              │
   │                           │  Email: "Nouveau lead!"      │
   │                           │ ─────────────────────────────>│
   │                           │                              │
```

### B.2 Integration Brevo

```typescript
// Quand email soumis
POST /api/subscribe
{
  email: "client@example.com",
  restaurant: "mae-sri",
  source: "landing-page"
}

// Actions:
1. Ajouter a liste Brevo (ID par resto)
2. Envoyer email transactionnel au client
3. Envoyer notification au restaurateur
```

### B.3 Configuration necessaire

- BREVO_API_KEY (deja dans wwithai)
- Template email "Code promo"
- Template email "Nouveau lead"
- Liste Brevo par restaurant

---

## SESSION C: UPLOAD PHOTOS (1-2h)

### Objectif
Le restaurateur peut envoyer SES photos via Telegram

### C.1 Flow simplifie

```
BOT: Ta page est prete! Tu veux ajouter tes photos?
     [Oui] [Non, garde celles-la]

--- Si Oui ---

BOT: Envoie-moi ta meilleure photo (celle du hero)

USER: [envoie photo]

BOT: Super! Photo principale mise a jour.
     Tu veux en ajouter pour la galerie?
     [Oui, j'en ai d'autres] [Non, c'est bon]

--- Si Oui ---

BOT: Envoie jusqu'a 5 photos pour la galerie

USER: [envoie photos]

BOT: Galerie mise a jour! Regarde: [lien]
```

### C.2 Processing

1. Recevoir photo Telegram (file_id)
2. Telecharger via API Telegram
3. Redimensionner avec Sharp:
   - Hero: 1920x1080
   - Galerie: 800x600
   - Thumbnail: 400x300
4. Convertir en WebP
5. Upload vers stockage (Vercel Blob ou local)
6. Mettre a jour page data
7. Redeploy sur Vercel

---

## SESSION D: POLISH + DEMO (1-2h)

### Objectif
Avoir une demo complete a montrer

### D.1 Checklist finale

- [ ] Flow complet fonctionne (nom → page → Vercel)
- [ ] Photos uploadees s'affichent
- [ ] Email capture fonctionne
- [ ] Notifications arrivent
- [ ] Page mobile parfaite
- [ ] Performance optimale

### D.2 Demo assets

- [ ] Video screen recording du flow
- [ ] Screenshots avant/apres
- [ ] Lien vers page live
- [ ] Stats (temps de creation, etc.)

---

## ORDRE RECOMMANDE

```
AUJOURD'HUI
└── Session A: Template Impact
    └── Focus sur Mae Sri ou Pamika
    └── Creer LE template parfait
    └── Tester sur mobile

PROCHAINE SESSION
├── Session B: Email Capture
│   └── Brevo integration
│   └── Double notification
│
└── Session C: Upload Photos
    └── Flow Telegram
    └── Processing images

DERNIERE SESSION
└── Session D: Polish + Demo
    └── Tests finaux
    └── Video demo
    └── Ready for WHOP
```

---

## QUESTIONS STRATEGIQUES

1. **Quel restaurant pour le template parfait?**
   - Mae Sri (thai, tu connais bien)
   - Pamika (si tu as les assets)
   - Autre?

2. **Email capture - quel incentive?**
   - 10% premiere visite
   - Entree gratuite
   - VIP list (acces prioritaire)
   - Newsletter recettes

3. **CTA principal - quoi?**
   - Appeler directement
   - Formulaire reservation
   - Lien vers Yelp/Google
   - WhatsApp/Messenger

4. **Notifications restaurateur - ou?**
   - Email (simple)
   - Telegram (meme bot)
   - SMS (Twilio)
   - Slack

---

## METRIQUES DE SUCCES

| Metrique | Objectif |
|----------|----------|
| Temps creation page | < 2 minutes |
| Page load time | < 2 secondes |
| Lighthouse score | > 90 |
| Taux conversion email | > 5% |
| Satisfaction restaurateur | "WOW" |
