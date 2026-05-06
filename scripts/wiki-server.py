#!/usr/bin/env python3
"""
Bobby's Wiki - Local Host Server
Serves ~/agent-mission-control/memory-wiki/ as a searchable web interface.
Run: python3 ~/agent-mission-control/scripts/wiki-server.py
Opens at: http://localhost:8080
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

WIKI_ROOT = Path.home() / "agent-mission-control" / "memory-wiki"
PORT = 8080

def markdown_to_html(text):
    """Convert markdown to HTML."""
    # Headers
    text = re.sub(r'^### (.+)$', r'<h3>\1</h3>', text, flags=re.MULTILINE)
    text = re.sub(r'^## (.+)$', r'<h2>\1</h2>', text, flags=re.MULTILINE)
    text = re.sub(r'^# (.+)$', r'<h1>\1</h1>', text, flags=re.MULTILINE)
    
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    
    # Links
    text = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', r'<a href="\2">\1</a>', text)
    
    # Code blocks
    text = re.sub(r'```[\s\S]*?```', lambda m: f'<pre><code>{m.group(0)}</code></pre>', text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    
    # Lists
    text = re.sub(r'^- (.+)$', r'<li>\1</li>', text, flags=re.MULTILINE)
    text = re.sub(r'(\n<li>.*</li>\n)+', r'<ul>\n\g<0></ul>\n', text)
    
    # Paragraphs
    text = re.sub(r'\n\n+', '</p><p>', text)
    
    return text

def get_all_files(folder, ext='.md'):
    """Get all markdown files recursively."""
    files = []
    for f in sorted(folder.rglob(f'*{ext}')):
        if '/.git/' not in str(f) and '/node_modules/' not in str(f):
            files.append(f)
    return files

def search_wiki(query):
    """Search all wiki files for query."""
    results = []
    query = query.lower()
    for f in get_all_files(WIKI_ROOT):
        try:
            with open(f) as file:
                content = file.read()
                if query in content.lower():
                    # Find line numbers
                    lines = content.split('\n')
                    matches = []
                    for i, line in enumerate(lines):
                        if query in line.lower():
                            matches.append((i+1, line.strip()[:200]))
                    results.append({
                        'file': str(f.relative_to(WIKI_ROOT)),
                        'path': str(f),
                        'matches': matches[:5]  # First 5 matches
                    })
        except:
            pass
    return results

def get_daily_logs():
    """Get list of daily logs."""
    logs_dir = WIKI_ROOT / 'daily-logs'
    if not logs_dir.exists():
        return []
    logs = []
    for f in sorted(logs_dir.glob('*.md'), reverse=True)[:30]:
        logs.append({
            'date': f.stem,
            'path': str(f.relative_to(WIKI_ROOT)),
            'size': f.stat().st_size
        })
    return logs

def get_wiki_pages():
    """Get list of wiki pages."""
    wiki_dir = WIKI_ROOT / 'wiki'
    if not wiki_dir.exists():
        return []
    pages = []
    for f in sorted(wiki_dir.glob('*.md')):
        pages.append({
            'name': f.stem.replace('-', ' ').title(),
            'path': str(f.relative_to(WIKI_ROOT))
        })
    return pages

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bobby's Wiki</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { background: #161b22; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #30363d; }
        h1 { color: #58a6ff; font-size: 1.8em; }
        h2 { color: #8b949e; font-size: 1.4em; margin: 20px 0 10px; }
        h3 { color: #c9d1d9; font-size: 1.1em; margin: 15px 0 8px; }
        .search-box { width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 16px; margin-top: 15px; }
        .search-box:focus { outline: none; border-color: #58a6ff; }
        .nav { display: flex; gap: 15px; margin: 15px 0; flex-wrap: wrap; }
        .nav a { color: #58a6ff; text-decoration: none; padding: 8px 16px; background: #161b22; border-radius: 6px; border: 1px solid #30363d; }
        .nav a:hover { background: #1f6feb; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin: 20px 0; }
        .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 15px; }
        .card h3 { color: #58a6ff; }
        .card a { color: #c9d1d9; text-decoration: none; }
        .card a:hover { color: #58a6ff; }
        .card .meta { color: #8b949e; font-size: 0.85em; margin-top: 5px; }
        pre { background: #0d1117; padding: 15px; border-radius: 6px; overflow-x: auto; border: 1px solid #30363d; margin: 10px 0; }
        code { background: #0d1117; padding: 2px 6px; border-radius: 4px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9em; }
        pre code { padding: 0; background: none; }
        .content { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .content p { margin: 10px 0; }
        ul { margin: 10px 0 10px 20px; }
        li { margin: 5px 0; }
        a { color: #58a6ff; }
        .search-result { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .search-result h4 { color: #58a6ff; margin-bottom: 10px; }
        .search-result .match { color: #8b949e; font-size: 0.9em; margin: 3px 0; }
        .search-result .match span { color: #f0883e; }
        .back { color: #8b949e; text-decoration: none; margin-bottom: 15px; display: inline-block; }
        .back:hover { color: #58a6ff; }
        .timestamp { color: #8b949e; font-size: 0.85em; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { text-align: left; padding: 10px; border-bottom: 1px solid #30363d; }
        th { color: #58a6ff; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📚 Bobby's Wiki</h1>
            <p class="timestamp">Memory system for Bobby's AI team · {date}</p>
            <form action="/" method="get">
                <input type="text" name="search" class="search-box" placeholder="Search the wiki..." value="{search_query}">
            </form>
        </header>
        
        {nav}
        
        {content}
        
        <footer style="text-align: center; color: #8b949e; margin-top: 40px; padding: 20px;">
            <p>Wiki files stored at: ~/agent-mission-control/memory-wiki/</p>
        </footer>
    </div>
</body>
</html>"""

def render_page(path_info, search_query=None):
    """Render the wiki page."""
    nav = '''
        <div class="nav">
            <a href="/?daily-logs">📅 Daily Logs</a>
            <a href="/?wiki">📖 Wiki Pages</a>
            <a href="/?all">📁 All Files</a>
        </div>
    '''
    
    content = ''
    
    # Search mode
    if search_query:
        results = search_wiki(search_query)
        content = f'<h2>🔍 Search Results for "{search_query}"</h2>'
        if results:
            content += f'<p>{len(results)} file(s) found</p>'
            for r in results:
                content += f'''
                <div class="search-result">
                    <h4><a href="/?file={urllib.parse.quote(r['file'])}">{r['file']}</a></h4>
                    {'<br>'.join(f'<div class="match">Line {ln}: ...{m.replace(search_query, f"<span>{search_query}</span>")}...</div>' for ln, m in r['matches'])}
                </div>
                '''
        else:
            content += '<p>No results found.</p>'
        return HTML_TEMPLATE.format(date=datetime.now().strftime('%Y-%m-%d'), nav=nav, content=content, search_query='')
    
    # Daily logs view
    if 'daily-logs' in path_info or 'daily-logs' in search_query:
        logs = get_daily_logs()
        content = '<h2>📅 Daily Conversation Logs</h2><div class="grid">'
        for log in logs:
            size_kb = log['size'] / 1024
            content += f'''
            <div class="card">
                <h3><a href="/?file=daily-logs/{log['date']}.md">{log['date']}</a></h3>
                <div class="meta">{size_kb:.1f} KB</div>
            </div>
            '''
        content += '</div>'
        return HTML_TEMPLATE.format(date=datetime.now().strftime('%Y-%m-%d'), nav=nav, content=content, search_query='')
    
    # Wiki pages view
    if 'wiki' in path_info or 'wiki' in search_query:
        pages = get_wiki_pages()
        content = '<h2>📖 Wiki Pages</h2><div class="grid">'
        for page in pages:
            content += f'''
            <div class="card">
                <h3><a href="/?file=wiki/{page['path']}">{page['name']}</a></h3>
            </div>
            '''
        content += '</div>'
        return HTML_TEMPLATE.format(date=datetime.now().strftime('%Y-%m-%d'), nav=nav, content=content, search_query='')
    
    # All files view
    if 'all' in path_info:
        files = get_all_files(WIKI_ROOT)
        content = '<h2>📁 All Files</h2><table><tr><th>File</th><th>Path</th></tr>'
        for f in files[:100]:
            rel = str(f.relative_to(WIKI_ROOT))
            content += f'<tr><td><a href="/?file={urllib.parse.quote(rel)}">{f.name}</a></td><td>{rel}</td></tr>'
        content += '</table>'
        return HTML_TEMPLATE.format(date=datetime.now().strftime('%Y-%m-%d'), nav=nav, content=content, search_query='')
    
    # File view
    file_param = path_info.get('file', [''])[0] if path_info.get('file') else ''
    if file_param:
        file_path = WIKI_ROOT / file_param
        if file_path.exists() and file_path.is_file():
            with open(file_path) as f:
                md_content = f.read()
            html_content = markdown_to_html(md_content)
            breadcrumb = ' > '.join(file_param.split('/'))
            content = f'''
                <a href="/?all" class="back">← Back to all files</a>
                <div class="content">
                    <h2>{file_path.name}</h2>
                    <p class="timestamp">{breadcrumb}</p>
                    <hr style="border-color: #30363d; margin: 15px 0;">
                    {html_content}
                </div>
            '''
            return HTML_TEMPLATE.format(date=datetime.now().strftime('%Y-%m-%d'), nav=nav, content=content, search_query='')
    
    # Home - show stats
    logs = get_daily_logs()
    pages = get_wiki_pages()
    all_files = get_all_files(WIKI_ROOT)
    content = f'''
        <h2>📊 Wiki Statistics</h2>
        <div class="grid">
            <div class="card">
                <h3>{len(logs)}</h3>
                <p>Daily Logs</p>
            </div>
            <div class="card">
                <h3>{len(pages)}</h3>
                <p>Wiki Pages</p>
            </div>
            <div class="card">
                <h3>{len(all_files)}</h3>
                <p>Total Files</p>
            </div>
        </div>
        
        <h2>📅 Recent Daily Logs</h2>
        <div class="grid">
    '''
    for log in logs[:6]:
        content += f'''
            <div class="card">
                <h3><a href="/?file=daily-logs/{log['date']}.md">{log['date']}</a></h3>
            </div>
        '''
    content += '</div>'
    
    content += '''
        <h2>📖 Wiki Pages</h2>
        <div class="grid">
    '''
    for page in pages[:6]:
        content += f'''
            <div class="card">
                <h3><a href="/?file=wiki/{page['path']}">{page['name']}</a></h3>
            </div>
        '''
    content += '</div>'
    
    return HTML_TEMPLATE.format(date=datetime.now().strftime('%Y-%m-%d'), nav=nav, content=content, search_query='')

class WikiHandler(SimpleHTTPRequestHandler):
    """Handle wiki requests."""
    
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path_info = urllib.parse.parse_qs(parsed.query)
        
        if parsed.path == '/' or not parsed.path:
            search = path_info.get('search', [None])[0]
            html = render_page(path_info, search)
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(html.encode())
        else:
            # Serve static files
            super().do_GET()

def main():
    print(f"Starting Bobby's Wiki Server...")
    print(f"Wiki location: {WIKI_ROOT}")
    print(f"Open in browser: http://localhost:{PORT}")
    print(f"Press Ctrl+C to stop")
    
    os.chdir(WIKI_ROOT)
    server = HTTPServer(('localhost', PORT), WikiHandler)
    print(f"Server running at http://localhost:{PORT}")
    server.serve_forever()

if __name__ == '__main__':
    main()