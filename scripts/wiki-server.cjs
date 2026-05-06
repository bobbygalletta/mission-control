#!/usr/bin/env node
/**
 * Bobby's Brain - Wiki Server
 * Unlimited memory for Bobby's AI team
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Constants
const WIKI_ROOT = process.env.HOME;
const MEMORY_WIKI_ROOT = path.join(process.env.HOME, 'agent-mission-control/memory-wiki');
const TEAM_SPACES_ROOT = path.join(process.env.HOME, 'agent-mission-control/team-spaces');

const AGENT_LOG_NAMES = {
    'main': 'DEAN',
    'emmy': 'EMMY',
    'finn': 'FINN',
    'rex': 'REX',
    'x': 'AGENT X',
    'yoyos': 'YOYOS',
    'cody': 'CODY',
    'dj': 'DJ',
    'reese': 'REESE',
    'tt': 'TT'
};

const AGENTS = [
    { id: 'main', name: 'Dean', emoji: '🤖🦞' },
    { id: 'emmy', name: 'Emmy', emoji: '🦋📧' },
    { id: 'finn', name: 'Finn', emoji: '🧊💸' },
    { id: 'rex', name: 'Rex', emoji: '🔍📊' },
    { id: 'x', name: 'Agent X', emoji: '⚡🕶️' },
    { id: 'yoyos', name: 'YoYo', emoji: '🎥✨' },
    { id: 'cody', name: 'Cody', emoji: '🧑‍💻' },
    { id: 'dj', name: 'DJ', emoji: '🎧' },
    { id: 'reese', name: 'Reese', emoji: '🍳' },
    { id: 'tt', name: 'TT', emoji: '📱' }
];

const TOPICS = ['YouTube', 'Money', 'Emails', 'Calendar', 'Research', 'Coding', 'Music', 'Food', 'TikTok', 'Twitter', 'Life', 'Health', 'Home', 'OpenClaw', 'Projects', 'Recipes'];

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getDailyLogsForAgent(agent) {
    const agent_id_raw = typeof agent === 'string' ? agent : (agent ? agent.id : 'main');
    const agent_id = AGENT_LOG_NAMES[agent_id_raw] || agent_id_raw.toUpperCase();
    const logs_dir = path.join(MEMORY_WIKI_ROOT, 'daily-logs');
    if (!fs.existsSync(logs_dir)) return [];
    const files = fs.readdirSync(logs_dir).filter(f => f.endsWith('.md')).sort().reverse();
    const logs = [];
    for (const f of files) {
        const filePath = path.join(logs_dir, f);
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes(`### ${agent_id} × Bobby`)) {
            const stats = fs.statSync(filePath);
            logs.push({ date: f.replace('.md', ''), size: stats.size });
        }
    }
    return logs;
}

function getFolderContents(folderPath) {
    const fullPath = path.join(WIKI_ROOT, folderPath);
    if (!fs.existsSync(fullPath)) return { type: 'error', message: 'Folder not found' };
    
    const entries = fs.readdirSync(fullPath);
    const items = [];
    
    for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        if (entry === 'node_modules') continue;
        
        const fullEntryPath = path.join(fullPath, entry);
        const stats = fs.statSync(fullEntryPath);
        
        items.push({
            name: entry,
            type: stats.isDirectory() ? 'folder' : 'file',
            size: stats.size,
            modified: stats.mtime
        });
    }
    
    items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    
    return { type: 'folder', items, path: folderPath };
}

function getFileContent(relPath) {
    let fullPath = path.join(WIKI_ROOT, relPath);
    
    // If file doesn't exist, try agent-mission-control as fallback
    if (!fs.existsSync(fullPath)) {
        const altPath = path.join(WIKI_ROOT, 'agent-mission-control', relPath);
        if (fs.existsSync(altPath)) {
            fullPath = altPath;
        }
    }
    
    if (!fs.existsSync(fullPath)) return null;
    
    const stats = fs.statSync(fullPath);
    const ext = path.extname(relPath).toLowerCase();
    
    if (stats.isDirectory()) {
        return getFolderContents(relPath);
    }
    
    const textExts = ['.md', '.txt', '.json', '.js', '.cjs', '.ts', '.py', '.sh', '.html', '.css', '.yml', '.yaml', '.toml', '.env', '.gitignore', '.mdx', '.log', '.jsonl'];
    
    if (!textExts.includes(ext)) {
        return { type: 'binary', ext, size: stats.size };
    }
    
    try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        if (lines.length > 500) {
            return { type: 'large_file', ext, size: stats.size, lines: lines.length, preview: lines.slice(0, 200).join('\n') };
        }
        return { type: 'text', ext, content, size: stats.size, lines: lines.length };
    } catch (e) {
        return { type: 'error', message: e.message };
    }
    
    return { type: 'binary', ext, size: stats.size };
}

function renderAgentSection(agent) {
    const logs = getDailyLogsForAgent(agent.id);
    let html = `<h2>${agent.emoji} ${agent.name}</h2>`;
    
    if (logs.length === 0) {
        html += '<p style="color: #8b949e;">No conversations logged yet.</p>';
    } else {
        html += '<div class="grid">';
        for (const log of logs) {
            const sizeKb = (log.size / 1024).toFixed(1);
            html += `
                <div class="card">
                    <h3><a href="/?view=agent-log&agent=${agent.id}&date=${log.date}">${log.date}</a></h3>
                    <div class="meta">${sizeKb} KB</div>
                </div>`;
        }
        html += '</div>';
    }
    
    return html;
}

const TEXT_EXTS = ['.md', '.txt', '.json', '.js', '.cjs', '.ts', '.py', '.sh', '.html', '.css', '.yml', '.yaml', '.toml', '.env', '.gitignore', '.mdx', '.log', '.jsonl'];

function renderFolderView(folderPath) {
    const data = getFolderContents(folderPath);
    if (data.type !== 'folder') return '<p>Error loading folder</p>';
    
    let html = `<div class="breadcrumb">`;
    const parts = folderPath.split('/');
    let accum = '';
    for (let i = 0; i < parts.length; i++) {
        accum += (i > 0 ? '/' : '') + parts[i];
        html += `<a href="/?folder=${encodeURIComponent(accum)}">${parts[i]}</a>` + (i < parts.length - 1 ? ' / ' : '');
    }
    html += `</div>`;
    html += `<div class="grid">`;
    
    if (folderPath !== '') {
        const parent = parts.slice(0, -1).join('/');
        html += `
            <div class="folder-item">
                <span class="icon">📁</span>
                <a href="/?folder=${encodeURIComponent(parent)}">..</a>
            </div>`;
    }
    
    for (const item of data.items) {
        const itemPath = path.join(folderPath, item.name);
        if (item.type === 'folder') {
            html += `
                <div class="folder-item">
                    <span class="icon">📁</span>
                    <a href="/?folder=${encodeURIComponent(itemPath)}">${item.name}/</a>
                </div>`;
        } else {
            const ext = path.extname(item.name);
            const isText = TEXT_EXTS.includes(ext);
            html += `
                <div class="file-item">
                    <span class="icon">${isText ? '📄' : '📦'}</span>
                    <a href="/?file=${encodeURIComponent(itemPath)}">${item.name}</a>
                    <span class="file-size">${(item.size / 1024).toFixed(1)} KB</span>
                </div>`;
        }
    }
    
    html += `</div>`;
    return html;
}

function getWikiPages() {
    const wikiDir = path.join(MEMORY_WIKI_ROOT, 'wiki');
    if (!fs.existsSync(wikiDir)) return [];
    
    const files = fs.readdirSync(wikiDir).filter(f => f.endsWith('.md'));
    return files.map(f => ({
        name: f.replace('.md', ''),
        path: `memory-wiki/wiki/${f}`
    }));
}

function markdownToHtml(text) {
    if (!text) return '';
    
    // First escape HTML
    text = escapeHtml(text);
    
    // Convert markdown to HTML
    // Headers
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Code blocks
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Lists
    text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Paragraphs - wrap lines not already in tags
    const lines = text.split('\n');
    let inBlock = false;
    let result = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            result.push('');
            continue;
        }
        if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
            result.push(line);
            inBlock = true;
        } else if (trimmed.startsWith('</') && trimmed.endsWith('>')) {
            result.push(line);
            inBlock = false;
        } else {
            result.push(`<p>${line}</p>`);
        }
    }
    
    return result.join('\n');
}

function renderTeamSpace(teamId) {
    const teamDir = path.join(TEAM_SPACES_ROOT, teamId);
    if (!fs.existsSync(teamDir)) {
        return `<h2>Team Space</h2><p>No workspace found for ${teamId}</p>`;
    }
    
    const agent = AGENTS.find(a => a.id === teamId) || { name: teamId, emoji: '🤖' };
    let html = `<h2>${agent.emoji} ${agent.name}'s Workspace</h2>`;
    
    const entries = fs.readdirSync(teamDir).filter(f => !f.startsWith('.'));
    if (entries.length === 0) {
        html += '<p style="color:#8b949e;">Empty workspace. Files will appear here as the agent works.</p>';
    } else {
        html += '<div class="grid">';
        for (const entry of entries) {
            const fullPath = path.join(teamDir, entry);
            const stats = fs.statSync(fullPath);
            const ext = path.extname(entry);
            html += `
                <div class="card">
                    <h3><a href="/?file=${encodeURIComponent('team-spaces/' + teamId + '/' + entry)}">${entry}</a></h3>
                    <div class="meta">${(stats.size / 1024).toFixed(1)} KB</div>
                </div>`;
        }
        html += '</div>';
    }
    
    return html;
}

function renderAllTeamSpaces() {
    let html = '<h2>🤖 Team Spaces</h2><p style="color:#8b949e;margin-bottom:20px;">Each agent\'s personal workspace. They update during their heartbeat.</p><div class="grid">';
    
    for (const agent of AGENTS) {
        const teamDir = path.join(TEAM_SPACES_ROOT, agent.id);
        const hasFiles = fs.existsSync(teamDir) && fs.readdirSync(teamDir).filter(f => !f.startsWith('.')).length > 0;
        html += `
            <div class="card" style="padding:20px;">
                <h3 style="font-size:1.2em">${agent.emoji} ${agent.name}</h3>
                <p style="color:#8b949e;font-size:0.9em">${hasFiles ? '🟢 Active' : '🟡 Empty'}</p>
                <a href="/?view=team&team=${agent.id}" style="color:#58a6ff;margin-top:10px;display:inline-block">Open Workspace →</a>
            </div>`;
    }
    
    html += '</div>';
    return html;
}

function renderSearchResults(query, allResults) {
    let html = `<h2>🔍 Search Results</h2><p style="color:#8b949e;margin-bottom:20px;">Query: "${escapeHtml(query)}"</p>`;
    
    if (allResults.length === 0) {
        html += '<p>No results found.</p>';
    } else {
        html += '<div class="search-results">';
        for (const result of allResults.slice(0, 20)) {
            const preview = result.preview || '';
            html += `
                <div class="search-result">
                    <h4><a href="/?file=${encodeURIComponent(result.file)}">${result.file}</a></h4>
                    <div class="match">${escapeHtml(preview.substring(0, 150))}...</div>
                </div>`;
        }
        html += '</div>';
    }
    
    return html;
}

const logs = getDailyLogsForAgent({ id: 'main' });
const pages = getWikiPages();

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const q = parsedUrl.query;
    
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    let content = '';
    const view = q.view || 'home';
    const folder = q.folder !== undefined ? q.folder : null;
    const file = q.file || null;
    const search = q.search || null;
    const agent_filter = q.agent || null;
    const date_filter = q.date || null;
    
    try {
        // Search
        if (search) {
            const results = [];
            const searchDir = path.join(MEMORY_WIKI_ROOT);
            const searchPattern = new RegExp(search, 'gi');
            
            function searchFolder(dir) {
                if (dir.includes('node_modules')) return;
                const entries = fs.readdirSync(dir);
                for (const entry of entries) {
                    if (entry.startsWith('.')) continue;
                    if (dir.includes('Library/Application Support')) continue;
                    const fullPath = path.join(dir, entry);
                    const stats = fs.statSync(fullPath);
                    
                    if (stats.isDirectory()) {
                        searchFolder(fullPath);
                    } else {
                        const ext = path.extname(entry).toLowerCase();
                        if (TEXT_EXTS.includes(ext)) {
                            try {
                                const content = fs.readFileSync(fullPath, 'utf-8');
                                if (searchPattern.test(content)) {
                                    const relPath = fullPath.replace(WIKI_ROOT + '/', '');
                                    const lines = content.split('\n');
                                    let lineNum = 0;
                                    let preview = '';
                                    for (let i = 0; i < lines.length; i++) {
                                        if (searchPattern.test(lines[i])) {
                                            lineNum = i + 1;
                                            preview = lines[i];
                                            break;
                                        }
                                    }
                                    results.push({ file: relPath, line: lineNum, preview });
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
            
            searchFolder(searchDir);
            content = renderSearchResults(search, results);
        }
        // Agent + date view with clean conversation display
        else if (view === 'agent-log' && agent_filter && date_filter) {
            const agent = AGENTS.find(a => a.id === agent_filter) || AGENTS[0];
            const log_file = path.join(MEMORY_WIKI_ROOT, 'daily-logs', `${date_filter}.md`);
            
            if (fs.existsSync(log_file)) {
                const content_raw = fs.readFileSync(log_file, 'utf-8');
                const lines = content_raw.split('\n');
                
                const agent_log_name = AGENT_LOG_NAMES[agent_filter] || agent_filter.toUpperCase();
                
                // Collect ALL sections for this agent as separate chunks
                let all_sections = [];
                let current_section = [];
                
                for (const line of lines) {
                    const m = line.match(/^### ([A-Z][A-Z ]+) × Bobby/);
                    if (m) {
                        if (m[1] === agent_log_name) {
                            if (current_section.length > 0) all_sections.push(current_section);
                            current_section = [line];
                        } else {
                            if (current_section.length > 0) { all_sections.push(current_section); current_section = []; }
                        }
                    }
                    if (current_section.length > 0) current_section.push(line);
                }
                if (current_section.length > 0) all_sections.push(current_section);
                
                // Reverse so newest section first
                all_sections.reverse();
                
                // Build clean HTML with visual separation between sessions
                let sessionHtml = '';
                for (const section of all_sections) {
                    // Find timestamp for this section
                    const tsMatch = section.find(l => l.includes('**Time:**'));
                    const timestamp = tsMatch ? tsMatch.replace('**Time:**', '').trim() : '';
                    
                    // Convert each line to clean HTML
                    let linesHtml = '';
                    let inMessage = false;
                    
                    for (const line of section) {
                        const trimmed = line.trim();
                        if (!trimmed) continue;
                        
                        const KNOWN_SPEAKERS = ['Bobby', 'DEAN', 'EMMY', 'FINN', 'REX', 'AGENT X', 'YOYOS', 'CODY', 'DJ', 'REESE', 'TT'];
                        
                        if (trimmed.startsWith('### ')) {
                            // Skip section headers in display
                            continue;
                        } else if (trimmed.startsWith('**') && trimmed.includes(':**')) {
                            // Speaker label line like **Bobby:** So give me updates
                            const labelMatch = trimmed.match(/^\*\*([A-Za-z ]+):\*\*(.*)/);
                            if (labelMatch && KNOWN_SPEAKERS.includes(labelMatch[1])) {
                                // Close previous message if open
                                if (inMessage) {
                                    linesHtml += '</span></div>';
                                }
                                const speaker = labelMatch[1];
                                const restOfLine = labelMatch[2] ? labelMatch[2].trim() : '';
                                const isBobby = speaker === 'Bobby';
                                linesHtml += `<div class="msg msg-${isBobby ? 'bobby' : 'agent'}"><span class="speaker">${speaker}:</span> <span class="text">`;
                                inMessage = true;
                                // If there's content on same line after the label, add it
                                if (restOfLine) {
                                    linesHtml += restOfLine + ' ';
                                }
                                continue;
                            }
                        }
                        
                        // Regular content line - add to current message
                        if (inMessage) {
                            linesHtml += trimmed + ' ';
                        } else {
                            linesHtml += `<p>${trimmed}</p>`;
                        }
                    }
                    
                    // Close final message
                    if (inMessage) {
                        linesHtml += '</span></div>';
                    }
                    
                    // Wrap in session block with timestamp
                    sessionHtml += `
                        <div class="session">
                            ${timestamp ? `<div class="session-time">${timestamp}</div>` : ''}
                            <div class="session-messages">${linesHtml}</div>
                        </div>`;
                }
                
                content = `
                    <a href="/?view=agents&agent=${agent_filter}" class="back">← Back to ${agent.emoji} ${agent.name}</a>
                    <div class="conversation-view">${sessionHtml}</div>`;
            }
        }
        // Agent view
        else if (view === 'agents' && agent_filter) {
            const agent = AGENTS.find(a => a.id === agent_filter);
            content = renderAgentSection(agent);
        }
        // All agents
        else if (view === 'agents') {
            content = '<h2>🤖 Agent Conversations</h2><p style="color:#8b949e;margin-bottom:20px;">All conversations logged every 30 min. Click an agent to view their history.</p><div class="grid">';
            for (const a of AGENTS) {
                const log_count = getDailyLogsForAgent(a).length;
                content += `<div class="card" style="padding:20px;"><h3>${a.emoji} ${a.name}</h3><p style="color:#8b949e">${log_count} day(s)</p><a href="/?view=agents&agent=${a.id}" style="color:#58a6ff;">View →</a></div>`;
            }
            content += '</div>';
        }
        // Single file view
        else if (file) {
            const relPath = decodeURIComponent(file);
            const fileData = getFileContent(relPath);
            if (fileData) {
                if (fileData.type === 'folder') {
                    content = renderFolderView(relPath);
                } else if (fileData.type === 'text') {
                    content = `
                        <a href="/?folder=${encodeURIComponent(path.dirname(relPath))}" class="back">← Back</a>
                        <div class="content"><pre>${escapeHtml(fileData.content)}</pre></div>`;
                } else if (fileData.type === 'large_file') {
                    content = `
                        <a href="/?folder=${encodeURIComponent(path.dirname(relPath))}" class="back">← Back</a>
                        <div class="content">
                            <p style="color:#8b949e;">Large file (${fileData.lines} lines). Showing first 200 lines:</p>
                            <pre>${escapeHtml(fileData.preview)}</pre>
                        </div>`;
                } else {
                    content = '<p>Cannot preview this file type.</p>';
                }
            } else {
                content = '<p>File not found.</p>';
            }
        }
        // Team Spaces
        else if (view === 'team' || q.team) {
            const targetAgent = q.team || null;
            if (targetAgent) {
                content = renderTeamSpace(targetAgent);
            } else {
                content = renderAllTeamSpaces();
            }
        }
        // Wiki pages
        else if (view === 'wiki') {
            content = '<h2>📖 Wiki Pages</h2><div class="grid">';
            for (const pg of pages) {
                content += `<div class="card"><h3><a href="/?file=${encodeURIComponent(pg.path)}">${pg.name}</a></h3></div>`;
            }
            content += '</div>';
        }
        // Daily logs
        else if (view === 'daily-logs') {
            content = '<h2>📅 All Daily Logs</h2><div class="grid">';
            for (const log of logs) {
                const kb = (log.size / 1024).toFixed(1);
                content += `<div class="card"><h3><a href="/?file=${encodeURIComponent('memory-wiki/daily-logs/' + log.date + '.md')}">${log.date}</a></h3><div class="meta">${kb} KB</div></div>`;
            }
            content += '</div>';
        }
        // Home
        else {
            content = `
                <h2>🏷️ Topics</h2>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin:15px 0;">`;
            for (const t of TOPICS) {
                content += `<a href="/?search=${encodeURIComponent(t)}" rel="noopener" style="background:#238636;padding:6px 14px;border-radius:16px;color:#fff;text-decoration:none;font-size:0.9em;">${t}</a>`;
            }
            content += `</div>
                <h2>🤖 Agent Conversations</h2>
                <div class="grid">`;
            for (const a of AGENTS) {
                const lc = getDailyLogsForAgent(a).length;
                content += `<div class="card" style="padding:20px;"><h3 style="font-size:1.2em">${a.emoji} ${a.name}</h3><p style="color:#8b949e;font-size:0.9em">${lc} day(s)</p><a href="/?view=agents&agent=${a.id}" style="color:#58a6ff">View →</a></div>`;
            }
            content += '</div>';
        }
        
        // Navigation tabs
        let agent_tabs = '<div class="agent-tabs">';
        agent_tabs += `<a href="/?view=home" class="${view === 'home' ? 'active' : ''}">🏠 Home</a>`;
        for (const a of AGENTS) {
            agent_tabs += `<a href="/?view=agents&agent=${a.id}" class="${agent_filter === a.id ? 'active' : ''}">${a.emoji} ${a.name}</a>`;
        }
        agent_tabs += `</div>`;
        
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bobby's Brain</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; line-height: 1.6; }
        .container { max-width: 1300px; margin: 0 auto; padding: 20px; }
        header { background: #161b22; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #30363d; }
        h1 { color: #58a6ff; font-size: 1.8em; }
        h2 { color: #c9d1d9; font-size: 1.3em; margin: 20px 0 10px; }
        h3 { color: #c9d1d9; }
        h4 { color: #58a6ff; }
        .search-box { width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 16px; margin-top: 15px; }
        .search-box:focus { outline: none; border-color: #58a6ff; }
        .nav { display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap; }
        .nav a { color: #58a6ff; text-decoration: none; padding: 8px 16px; background: #161b22; border-radius: 6px; border: 1px solid #30363d; font-size: 0.9em; }
        .nav a:hover { background: #1f6feb; }
        .agent-tabs { display: flex; gap: 6px; margin: 15px 0; flex-wrap: wrap; padding: 10px; background: #161b22; border-radius: 8px; border: 1px solid #30363d; }
        .agent-tabs a { color: #8b949e; text-decoration: none; padding: 7px 12px; border-radius: 6px; font-size: 0.85em; }
        .agent-tabs a:hover { background: #30363d; color: #c9d1d9; }
        .agent-tabs a.active { background: #1f6feb; color: #fff; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; margin: 20px 0; }
        .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 15px; }
        .card h3 { color: #58a6ff; font-size: 1em; }
        .card a { color: #c9d1d9; text-decoration: none; }
        .card a:hover { color: #58a6ff; }
        .card .meta { color: #8b949e; font-size: 0.85em; margin-top: 5px; }
        pre { background: #0d1117; padding: 15px; border-radius: 6px; overflow-x: auto; border: 1px solid #30363d; margin: 10px 0; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.85em; line-height: 1.5; }
        code { background: #0d1117; padding: 2px 6px; border-radius: 4px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.85em; }
        .content { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin: 20px 0; }
        ul { margin: 10px 0 10px 20px; }
        li { margin: 5px 0; }
        a { color: #58a6ff; }
        .search-result { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .search-result h4 { margin-bottom: 10px; }
        .search-result .match { color: #8b949e; font-size: 0.9em; margin: 3px 0; font-family: monospace; }
        .back { color: #8b949e; text-decoration: none; margin-bottom: 15px; display: inline-block; }
        .back:hover { color: #58a6ff; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { text-align: left; padding: 10px; border-bottom: 1px solid #30363d; }
        th { color: #58a6ff; }
        hr { border: none; border-top: 1px solid #30363d; margin: 15px 0; }
        p { margin: 8px 0; }
        .folder-item, .file-item { padding: 10px; border-bottom: 1px solid #21262d; display: flex; align-items: center; gap: 10px; }
        .folder-item:hover, .file-item:hover { background: #1f2937; }
        .folder-item a, .file-item a { color: #c9d1d9; text-decoration: none; flex: 1; }
        .folder-item .icon, .file-item .icon { font-size: 1.2em; }
        .file-size { color: #8b949e; font-size: 0.85em; }
        .breadcrumb { color: #8b949e; font-size: 0.9em; margin-bottom: 15px; }
        .breadcrumb a { color: #58a6ff; text-decoration: none; }
        .ext { color: #8b949e; font-size: 0.8em; background: #21262d; padding: 2px 6px; border-radius: 4px; }
        footer { text-align: center; color: #8b949e; margin-top: 40px; padding: 20px; font-size: 0.85em; }
        
        /* Conversation view styles */
        .conversation-view { margin: 20px 0; }
        .session { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .session:last-child { margin-bottom: 0; }
        .session-time { color: #8b949e; font-size: 0.85em; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #30363d; }
        .session-messages { line-height: 1.7; }
        .msg { margin-bottom: 12px; }
        .msg-bobby { color: #c9d1d9; }
        .msg-agent { color: #79c0ff; }
        .speaker { font-weight: 600; }
        .msg-bobby .speaker { color: #f0883e; }
        .msg-agent .speaker { color: #58a6ff; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🧠 Bobby's Brain</h1>
            <p style="color:#8b949e;margin-top:5px;">Unlimited memory · ${new Date().toISOString().split('T')[0]}</p>
            <form action="/" method="get">
                <input type="hidden" name="view" value="search">
                <input type="text" name="search" class="search-box" placeholder="🔍 Search all files...">
            </form>
        </header>
        
        <div class="nav">
            <a href="/?view=home">🏠 Home</a>
            <a href="/?view=daily-logs">📅 All Logs</a>
            <a href="/?file=memory-wiki/wiki">📖 Wiki</a>
            <a href="/?view=team">🤖 Team Spaces</a>
            <a href="/?folder=">📁 Files</a>
        </div>
        
        ${agent_tabs}
        
        <div class="content">${content}</div>
        
        <footer>
            <p>Bobby's Brain · ${WIKI_ROOT} · Updated every 30 min</p>
        </footer>
    </div>
</body>
</html>`;
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error: ' + e.message);
    }
});

const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Bobby's Brain running at http://0.0.0.0:${PORT}`);
    console.log(`Access via TailScale: http://100.103.22.35:${PORT}`);
});
