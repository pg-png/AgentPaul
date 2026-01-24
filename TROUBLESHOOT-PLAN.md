# AGENT PAUL - PLAN DE TROUBLESHOOTING

## Probleme Principal: Pages perdues sur Railway

Railway = filesystem ephemere. Chaque redeploy efface `/app/output/`.

### Solutions possibles:

| Solution | Complexite | Cout | Recommandation |
|----------|------------|------|----------------|
| **Railway Volume** | Facile | $0.25/GB/mois | Recommande |
| Cloudflare R2 | Moyen | $0.015/GB/mois | Long terme |
| Vercel (pages statiques) | Moyen | Gratuit | Separation bot/pages |
| GitHub Pages | Facile | Gratuit | Alternative |

**Decision recommandee:** Railway Volume pour commencer (simple), puis migration vers Vercel pour les pages finales.

---

## PHASE 1: STORAGE PERSISTANT (30 min)

### Etape 1.1: Ajouter Railway Volume
```bash
# Dans Railway Dashboard:
# 1. Service → Settings → Volumes
# 2. Add Volume: /app/output
# 3. Redeploy
```

### Etape 1.2: Verifier que output persiste
- Creer une page
- Redeploy le service
- Verifier que la page existe encore

### Etape 1.3: Alternative - Deploy pages sur Vercel
Si Railway Volume ne fonctionne pas bien:
- Bot reste sur Railway (webhook)
- Pages deployees sur Vercel (statique)
- `/deploy` commande envoie vers Vercel

---

## PHASE 2: UPLOAD PHOTOS (1h)

### Options pour les photos:

| Methode | UX | Implementation |
|---------|-----|----------------|
| **Chat Telegram** | Simple | Deja partiellement fait |
| Lien URL | Moyen | Facile a ajouter |
| Google Drive | Pro | API a configurer |
| Instagram | Cool | Scraping complique |

**Decision recommandee:** Chat Telegram (simple, deja en place)

### Etape 2.1: Flow photos dans le chat

```
[Apres confirmation restaurant]

BOT: Tu veux utiliser tes propres photos?
     [Oui, j'en ai] [Non, utilise Google]

--- Si Oui ---

BOT: Envoie-moi 3 a 5 photos:
     • Photo 1 = photo principale (hero)
     • Photos 2-5 = galerie

     Envoie quand tu es pret!

USER: [envoie photo 1]
BOT: Photo 1/5 recue (hero)

USER: [envoie photo 2]
BOT: Photo 2/5 recue

USER: [envoie photo 3]
BOT: Photo 3/5 recue

BOT: Tu veux en ajouter d'autres?
     [Non, c'est bon] [Oui, encore]
```

### Etape 2.2: Processing photos
- Telecharger depuis Telegram API
- Redimensionner avec Sharp (1200x800)
- Convertir en WebP
- Sauvegarder dans output/{slug}/images/

### Etape 2.3: Fallback Google
Si pas de photos: utiliser celles de Google Maps

---

## PHASE 3: AMELIORER L'INPUT COMMERCANT (1h)

### Etape 3.1: Questions supplementaires

Apres le style, demander:

```
BOT: Quelle est ta specialite? (le plat dont tu es le plus fier)

USER: Notre Pad Thai maison

BOT: A quel prix?

USER: 18$

BOT: Une description courte?

USER: Nouilles sautees, crevettes fraiches, sauce tamarin maison

BOT: Parfait! Tu veux ajouter d'autres plats?
     [Oui] [Non, c'est assez]
```

### Etape 3.2: Input optionnels
- Tagline personnalisee ("Si tu avais une phrase d'accroche?")
- Horaires confirmes
- Lien reservation (si applicable)

### Etape 3.3: Mode edition enrichi
Apres creation:
```
BOT: Ta page est prete! Tu peux:
     • Envoyer une photo pour la changer
     • "Change le titre pour..."
     • "Ajoute [plat] a [prix]"
     • /preview pour voir
     • /deploy quand tu es satisfait
```

---

## PHASE 4: TESTS COMPLETS (30 min)

### Checklist de test:

- [ ] /start → message d'accueil
- [ ] Nom restaurant → demande ville
- [ ] Ville → recherche Google Maps
- [ ] Bouton Oui → demande style
- [ ] Bouton style → generation
- [ ] Page creee → fichiers existent
- [ ] /preview → lien fonctionne
- [ ] Redeploy → page existe encore (volume)
- [ ] Upload photo → photo remplacee
- [ ] Modification texte → page mise a jour
- [ ] /deploy → deploy Vercel (si configure)

---

## ORDRE D'EXECUTION

```
AUJOURD'HUI (Session Debug)
├── Phase 1: Storage persistant
│   ├── 1.1 Configurer Railway Volume
│   ├── 1.2 Tester persistence
│   └── 1.3 Verifier pages survivent redeploy
│
├── Phase 2: Upload photos (base)
│   ├── 2.1 Flow basique (1 photo hero)
│   └── 2.2 Tester upload → page mise a jour
│
└── Phase 4: Tests
    └── Parcourir toute la checklist

PROCHAINE SESSION
├── Phase 2: Upload photos (complet)
│   ├── Multi-photos
│   └── Galerie
│
├── Phase 3: Input commercant
│   ├── Questions specialite/menu
│   └── Tagline personnalisee
│
└── Bonus
    ├── Deploy Vercel
    └── Custom domain
```

---

## QUESTIONS POUR TOI

1. **Storage**: Tu veux configurer Railway Volume maintenant?
   - C'est dans Dashboard → Service → Settings → Volumes
   - Mount path: `/app/output`

2. **Photos**: Tu preferes:
   - A) Chat Telegram uniquement
   - B) Chat + possibilite d'envoyer URL
   - C) Integration Google Drive/Dropbox

3. **Priorite**: On commence par quoi?
   - A) Fixer le storage (pages persistent)
   - B) Upload photos
   - C) Questions commercant

---

## NOTES TECHNIQUES

### Railway Volume
```
Mount Path: /app/output
Size: 1GB (suffisant pour ~100 pages)
```

### Photo Processing (Sharp)
```typescript
await sharp(buffer)
  .resize(1200, 800, { fit: 'cover' })
  .webp({ quality: 85 })
  .toBuffer();
```

### Telegram File Download
```typescript
const file = await ctx.telegram.getFile(photo.file_id);
const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
const response = await axios.get(url, { responseType: 'arraybuffer' });
```
