const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configure marked with mermaid code renderer extension
marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      if (lang === 'mermaid') {
        return `<pre class="mermaid">${text}</pre>`;
      }
      return false; // use standard marked code rendering
    },
  },
});

const DOCS_DIR = path.resolve(__dirname, '../../docs');

// Helper to get all documentation files
function getDocFiles() {
  if (!fs.existsSync(DOCS_DIR)) return [];
  return fs.readdirSync(DOCS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const name = path.basename(f, '.md');
      const title = name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      return { file: f, name, title };
    });
}

// Controller for rendering documentation
router.get(['/', '/:page'], (req, res) => {
  const docFiles = getDocFiles();
  let requestedPage = (req.params.page || 'README').toUpperCase();
  if (requestedPage.endsWith('.MD')) {
    requestedPage = requestedPage.replace(/\.MD$/i, '');
  }

  // Locate the requested file (case-insensitive)
  const targetDoc = docFiles.find(d => d.name.toUpperCase() === requestedPage) || docFiles[0];

  if (!targetDoc) {
    return res.status(404).send('No documentation files found in docs directory.');
  }

  const filePath = path.join(DOCS_DIR, targetDoc.file);
  const markdownContent = fs.readFileSync(filePath, 'utf-8');
  const htmlBody = marked.parse(markdownContent);

  const sidebarLinks = docFiles.map(d => {
    const isActive = d.name.toUpperCase() === targetDoc.name.toUpperCase();
    const activeClasses = isActive
      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80';
    return `
      <a href="/docs/${d.name}" class="flex items-center px-3.5 py-2.5 rounded-lg text-sm transition-colors ${activeClasses}">
        <i class="fa-solid fa-file-lines mr-2.5 text-xs ${isActive ? 'text-white' : 'text-slate-500'}"></i>
        <span>${d.title}</span>
      </a>
    `;
  }).join('');

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${targetDoc.title} | AutoScope Docs</title>
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    /* Custom dark prose overrides */
    .prose pre {
      background-color: #020617;
      border: 1px solid #1e293b;
      border-radius: 0.75rem;
    }
    .prose pre.mermaid {
      background-color: #0b1329;
      border: 1px solid #1e293b;
      display: flex;
      justify-content: center;
      padding: 1.5rem;
      border-radius: 0.75rem;
      overflow-x: auto;
    }
    .prose code {
      color: #818cf8;
      font-size: 0.875em;
    }
    .prose table {
      width: 100%;
      border-collapse: collapse;
    }
    .prose th, .prose td {
      border: 1px solid #334155;
      padding: 0.75rem;
    }
    .prose th {
      background-color: #0f172a;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased flex flex-col">

  <!-- Top Navbar -->
  <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <i class="fa-solid fa-book-bookmark text-lg"></i>
        </div>
        <div>
          <a href="/docs" class="font-bold text-base leading-tight tracking-wide text-white hover:text-indigo-400 transition-colors">AutoScope <span class="text-indigo-400 font-medium text-xs px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 ml-1">Docs</span></a>
          <p class="text-[11px] text-slate-400">Architecture, Schemas, S3 Pipeline & APIs</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <a href="/" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-2">
          <i class="fa-solid fa-arrow-left"></i>
          <span>Live Demo App</span>
        </a>
        <a href="https://github.desktop.com/nischaysharma-me/AutoScope-server" target="_blank" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20">
          <i class="fa-brands fa-github"></i>
          <span>GitHub</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Docs Layout: Sidebar + Main Content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col md:flex-row gap-8">
    
    <!-- Sidebar Navigation -->
    <aside class="w-full md:w-64 flex-shrink-0 space-y-4">
      <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 sticky top-24">
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 px-2">
          Documentation
        </div>
        <nav class="space-y-1.5">
          ${sidebarLinks}
        </nav>

        <div class="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 px-2 space-y-1">
          <p><i class="fa-solid fa-check text-emerald-400 mr-1"></i> Markdown: <strong>marked.js</strong></p>
          <p><i class="fa-solid fa-check text-indigo-400 mr-1"></i> Diagrams: <strong>mermaid.js</strong></p>
        </div>
      </div>
    </aside>

    <!-- Main Markdown Render Body -->
    <main class="flex-1 min-w-0 bg-slate-900/50 border border-slate-800/80 rounded-xl p-6 sm:p-10 shadow-xl overflow-hidden">
      <article class="prose prose-invert prose-indigo max-w-none prose-headings:font-semibold prose-a:text-indigo-400 prose-img:rounded-xl">
        ${htmlBody}
      </article>
    </main>

  </div>

  <!-- Mermaid.js Plugin Script to convert diagrams to SVGs -->
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: true,
        background: '#0b1329',
        primaryColor: '#4f46e5',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#6366f1',
        lineColor: '#94a3b8',
        secondaryColor: '#0f172a',
        tertiaryColor: '#1e293b'
      }
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(fullHtml);
});

module.exports = router;
