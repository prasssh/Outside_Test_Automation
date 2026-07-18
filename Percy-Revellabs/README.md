# outsidevisual-maintenance

Percy visual regression snapshots for client sites.

## Setup

```bash
npm install
```

## Usage

1. Export your Percy token for the project you're running:
```bash
export PERCY_TOKEN=your_percy_token_here
```

2. Run snapshots:
```bash
npm run snap:revellabs
```

## Adding a new project

1. Add the project config to `config/projects.js`:
```js
newProject: {
  name: "New Project Name",
  baseUrl: "https://newproject.com"
}
```

2. Add its pages to `config/pages.js`:
```js
newProject: [
  '/',
  '/about/',
  '/contact/'
]
```

3. Add the npm script to `package.json`:
```json
"snap:newProject": "npx percy exec -- node snapshots.js newProject"
```

> The project key (e.g. `newProject`) must match exactly across all three files.

## Structure

```
├── config/
│   ├── projects.js   # Project names and base URLs
│   └── pages.js      # Pages to snapshot per project
├── snapshots.js      # Main runner
├── .env              # Your PERCY_TOKEN (never commit this)
└── .env.example      # Safe to commit
```