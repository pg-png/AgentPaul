# Agent Paul

**Generateur de Landing Pages pour Restaurants**

Agent Paul scrape Google Maps, genere du contenu marketing avec Claude AI, et cree de belles landing pages deployees sur Vercel. Les restaurateurs peuvent modifier leur page via Telegram en langage naturel.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AGENT PAUL                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐    ┌───────────┐    ┌──────────┐             │
│   │ Scraper │───▶│ Generator │───▶│ Builder  │             │
│   │ Google  │    │  Claude   │    │ Template │             │
│   └─────────┘    └───────────┘    └──────────┘             │
│        │                                 │                  │
│        │         ┌──────────┐           │                  │
│        │         │ Telegram │           │                  │
│        └────────▶│   Bot    │◀──────────┘                  │
│                  │Interpreter│                              │
│                  └──────────┘                               │
│                        │                                    │
│                  ┌──────────┐    ┌──────────┐              │
│                  │  Vercel  │    │  Notion  │              │
│                  │  Deploy  │    │ Database │              │
│                  └──────────┘    └──────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Fonctionnalites

- **Scraper Google Maps**: Extrait nom, adresse, telephone, horaires, photos, avis
- **Generation IA**: Claude genere tagline, description, menu, couleurs
- **Template Responsive**: HTML/CSS moderne avec hero, galerie, menu, avis
- **Bot Telegram**: Modification en langage naturel
- **Deploy Vercel**: Publication automatique
- **Notion Database**: Tracking de toutes les pages

## Installation

```bash
# Clone
git clone https://github.com/your-org/agent-paul.git
cd agent-paul

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your keys
```

## Configuration

```env
# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx
TELEGRAM_BOT_TOKEN=xxxxx:yyyyy

# Optional
VERCEL_TOKEN=xxxxx
NOTION_API_KEY=xxxxx
NOTION_PAGES_DB=xxxxx
```

## Usage

### CLI: Scraper un restaurant

```bash
npm run scrape "Chez Marco" "Montreal"
```

### CLI: Generer une page

```bash
npm run generate chez-marco
```

### Demarrer le bot Telegram

```bash
npm run bot
```

### Demarrer le serveur API

```bash
npm run server
```

### Demarrer les deux (developpement)

```bash
npm run dev
```

## Bot Telegram

### Commandes

- `/start` - Accueil et liste des pages
- `/new "Nom" Ville` - Creer une nouvelle page
- `/select slug` - Selectionner une page
- `/status` - Voir l'etat de la page
- `/preview` - Obtenir le lien de preview
- `/deploy` - Deployer sur Vercel
- `/help` - Aide et exemples

### Modifications en langage naturel

Le bot comprend les demandes en francais:

- "Change le titre pour Bienvenue chez nous"
- "Ajoute la pizza margherita a 18$"
- "Retire la lasagne du menu"
- "Met une promo pour la St-Valentin"
- "Je veux du rouge comme couleur principale"
- "Change la photo principale"

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/pages` | Liste des pages |
| GET | `/api/pages/:slug` | Donnees d'une page |
| POST | `/api/pages` | Creer une page |
| PATCH | `/api/pages/:slug` | Modifier une page |
| POST | `/api/pages/:slug/deploy` | Deployer sur Vercel |
| POST | `/api/pages/:slug/regenerate` | Regenerer le contenu |
| GET | `/:slug` | Servir la page HTML |

### Creer une page via API

```bash
curl -X POST http://localhost:3000/api/pages \
  -H "Content-Type: application/json" \
  -d '{"name": "Chez Marco", "city": "Montreal"}'
```

## Structure du projet

```
agent-paul/
├── src/
│   ├── scraper/           # Google Maps scraping
│   │   ├── google-maps.ts
│   │   ├── google-reviews.ts
│   │   └── photo-downloader.ts
│   ├── generator/         # Content generation
│   │   ├── content-generator.ts
│   │   └── page-builder.ts
│   ├── template/          # HTML template
│   │   └── index.html
│   ├── bot/               # Telegram bot
│   │   ├── telegram.ts
│   │   ├── interpreter.ts
│   │   └── handler.ts
│   ├── deploy/            # Vercel & Notion
│   │   ├── vercel.ts
│   │   └── notion.ts
│   ├── api/               # Express server
│   │   └── server.ts
│   └── cli/               # CLI tools
│       ├── scrape.ts
│       └── generate.ts
├── tests/
├── output/                # Generated pages
└── package.json
```

## Tests

```bash
npm test
```

## Deploiement

### Railway (Bot)

1. Connecter le repo GitHub
2. Variables d'environnement:
   - `TELEGRAM_BOT_TOKEN`
   - `ANTHROPIC_API_KEY`
3. Deploy

### Vercel (Pages)

Les pages sont deployees individuellement via l'API Vercel.
Chaque page obtient son propre subdomain: `agent-paul-{slug}.vercel.app`

## Stack technique

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Scraping**: Puppeteer + Stealth plugin
- **AI**: Claude Sonnet (Anthropic)
- **Template**: Handlebars
- **Bot**: Telegraf
- **API**: Express
- **Database**: Notion
- **Deploy**: Vercel

## Licence

MIT - Pascal Gonsales / WwithAI
