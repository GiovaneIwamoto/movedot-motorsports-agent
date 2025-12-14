/**
 * Markdown Renderer
 * Characteristics: compact spacing, no flickering, minimalist theme
*/

class MarkdownRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            parseIncompleteMarkdown: false,
            className: 'minimalist-markdown',
            enableSyntaxHighlighting: false, // disabled to avoid conflicts
            streamingSpeed: 8, // fast render to avoid flickering
            useUnifiedParser: true, // use Unified (remark/rehype) in the browser
            ...options
        };
        
        this.buffer = '';
        this.isStreaming = false;
        this.renderTimeout = null;
        this.lastContent = '';
        this._unifiedReady = false;
        this._processor = null;
        
        // Initialize container and styles
        this.initContainer();
        this.injectStyles();
    }
    
    initContainer() {
        // CRITICAL: Preserve existing classes, especially 'message-text'
        const existingClasses = this.container.className.split(' ').filter(cls => cls && cls !== this.options.className);
        const classList = [...existingClasses, this.options.className];
        // Ensure message-text is always present
        if (!classList.includes('message-text')) {
            classList.push('message-text');
        }
        this.container.className = classList.join(' ');
        this.container.innerHTML = '';
        this.container.setAttribute('data-markdown-renderer', 'true');
    }
    
    injectStyles() {
        // Inject styles only once
        if (document.getElementById('markdown-renderer-styles')) return;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'markdown-renderer-styles';
        styleSheet.textContent = this.getStyles();
        document.head.appendChild(styleSheet);
    }
    
    getStyles() {
        return `
/* Minimalist Markdown Renderer - MoveDot Analytics theme */
.minimalist-markdown {
    font-family: var(--font-sans);
    line-height: 1.6;
    color: var(--text-primary);
    max-width: 100%;
    word-wrap: break-word;
    overflow-wrap: break-word;
    font-size: 0.9rem;
}

/* Message text styling - simple text without containers */
.message-text.minimalist-markdown {
    /* Plain text styling only */
}

/* Clear visual hierarchy - Headings */
.minimalist-markdown h1 {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.4;
    margin: 1rem 0 0.6rem 0;
    color: var(--text-primary);
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 0.4rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.minimalist-markdown h2 {
    font-size: 1.2rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0.8rem 0 0.5rem 0;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.3rem;
}

.minimalist-markdown h3 {
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0.7rem 0 0.4rem 0;
    color: var(--text-primary);
}

.minimalist-markdown h4 {
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0.6rem 0 0.35rem 0;
    color: var(--text-primary);
}

.minimalist-markdown h5, .minimalist-markdown h6 {
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.4;
    margin: 0.5rem 0 0.3rem 0;
    color: var(--text-primary);
}

/* Paragraphs with compact spacing */
.minimalist-markdown p {
    margin: 0.5rem 0;
    color: var(--text-primary);
    font-size: 0.9rem;
    line-height: 1.6;
}

.minimalist-markdown p:first-child {
    margin-top: 0;
}

.minimalist-markdown p:last-child {
    margin-bottom: 0;
}

/* Text formatting */
.minimalist-markdown strong {
    font-weight: 600;
    color: var(--text-primary);
}

.minimalist-markdown em {
    font-style: italic;
    color: var(--text-primary);
}

/* Compact code */
.minimalist-markdown code {
    font-family: var(--font-mono);
    font-size: 0.8em;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 0.1em 0.3em;
    border-radius: 0.2rem;
    border: 1px solid var(--border-color);
}

.minimalist-markdown pre {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 0.3rem;
    padding: 0.5rem;
    margin: 0.6rem 0;
    overflow-x: auto;
}

.minimalist-markdown pre code {
    background: none;
    border: none;
    padding: 0;
    color: var(--text-primary);
    font-size: 0.8rem;
    line-height: 1.6;
}

/* Lists spacing */
.minimalist-markdown ul,
.minimalist-markdown ol {
    margin: 0.6rem 0;
    padding-left: 1.2rem;
    color: var(--text-primary);
}

.minimalist-markdown li {
    margin: 0.3rem 0;
    line-height: 1.6;
    color: var(--text-primary);
}

.minimalist-markdown ul li {
    list-style-type: disc;
}

.minimalist-markdown ol li {
    list-style-type: decimal;
}

/* Spacing between nested lists */
.minimalist-markdown ul ul,
.minimalist-markdown ol ol,
.minimalist-markdown ul ol,
.minimalist-markdown ol ul {
    margin: 0.1rem 0;
}

/* Links */
.minimalist-markdown a {
    color: var(--text-primary);
    text-decoration: underline;
    text-decoration-color: var(--border-color);
    transition: text-decoration-color 0.2s ease;
}

.minimalist-markdown a:hover {
    text-decoration-color: var(--text-primary);
}

/* Blockquotes */
.minimalist-markdown blockquote {
    margin: 0.8rem 0;
    padding: 0.6rem 0.9rem;
    background: var(--bg-secondary);
    border-left: 3px solid var(--border-color);
    border-radius: 0 0.3rem 0.3rem 0;
    color: var(--text-primary);
    font-style: italic;
    line-height: 1.6;
}

.minimalist-markdown blockquote p {
    margin: 0;
}

/* Tables */
/* Table wrapper for horizontal scroll */
.minimalist-markdown .table-wrapper {
    width: 100%;
    overflow-x: auto;
    overflow-y: visible;
    margin: 0.8rem 0;
    border-radius: 0.4rem;
    -webkit-overflow-scrolling: touch;
}

.minimalist-markdown table {
    width: 100%;
    min-width: 100%;
    border-collapse: collapse;
    margin: 0;
    background: var(--bg-secondary);
    border-radius: 0.4rem;
    border: 1px solid var(--border-color);
}

.minimalist-markdown th,
.minimalist-markdown td {
    padding: 0.5rem 0.7rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    line-height: 1.6;
}

.minimalist-markdown th {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 0.85rem;
}

.minimalist-markdown td {
    color: var(--text-primary);
    font-size: 0.85rem;
}

.minimalist-markdown tr:hover {
    background: var(--bg-hover);
}

/* Horizontal rules */
.minimalist-markdown hr {
    margin: 0.8rem 0;
    border: none;
    height: 1px;
    background: var(--border-color);
}

/* Images */
.minimalist-markdown img {
    max-width: 100%;
    height: auto;
    border-radius: 0.2rem;
    margin: 0.2rem 0;
}

/* Remove streaming animations to avoid flickering */
.minimalist-markdown .streaming-element {
    opacity: 1;
    transform: none;
    animation: none;
}

/* Responsive design */
@media (max-width: 768px) {
    .minimalist-markdown {
        font-size: 0.85rem;
    }
    
    .minimalist-markdown h1 {
        font-size: 1.1rem;
        margin: 0.4rem 0 0.25rem 0;
    }
    
    .minimalist-markdown h2 {
        font-size: 1rem;
        margin: 0.3rem 0 0.2rem 0;
    }
    
    .minimalist-markdown h3 {
        font-size: 0.9rem;
        margin: 0.25rem 0 0.15rem 0;
    }
    
    .minimalist-markdown p {
        margin: 0.15rem 0;
        font-size: 0.85rem;
    }
    
    .minimalist-markdown ul,
    .minimalist-markdown ol {
        margin: 0.15rem 0;
        padding-left: 0.8rem;
    }
    
    .minimalist-markdown li {
        margin: 0.03rem 0;
    }
    
    .minimalist-markdown pre {
        padding: 0.4rem;
        margin: 0.2rem 0;
    }
    
    .minimalist-markdown table {
        font-size: 0.75rem;
        margin: 0.2rem 0;
    }
    
    .minimalist-markdown th,
    .minimalist-markdown td {
        padding: 0.25rem 0.4rem;
    }
}
`;
    }
    
    startStreaming() {
        this.isStreaming = true;
        this.buffer = '';
        this.container.innerHTML = '';
        this.lastContent = '';
    }
    
    appendToken(token) {
        if (!this.isStreaming) {
            this.startStreaming();
        }
        
        this.buffer += token;
        
        // Limit render frequency to avoid flickering
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        
        this.renderTimeout = setTimeout(() => {
            this.renderMarkdown(this.buffer);
        }, this.options.streamingSpeed);
    }
    
    finishStreaming() {
        this.isStreaming = false;
        
        // Clear any pending render
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
            this.renderTimeout = null;
        }
        
        // Final render
        this.renderMarkdown(this.buffer);
    }
    
    async renderMarkdown(content) {
        try {
            // Render only if content changed to avoid flickering
            if (content === this.lastContent) {
                return;
            }
            
            this.lastContent = content;
            
            // Parse and render markdown
            const html = await this.parseMarkdown(content);
            this.container.innerHTML = html;
            
        } catch (error) {
            console.error('Error rendering markdown:', error);
            // Fallback to plain text
            this.container.textContent = content;
        }
    }
    
    async parseMarkdown(text) {
        if (!text) return '';
        
        let html = text;
        
        // Handle incomplete markdown if enabled
        if (this.options.parseIncompleteMarkdown) {
            html = this.parseIncompleteMarkdown(html);
        }
        
        if (this.options.useUnifiedParser) {
            try {
                const result = await this.convertMarkdownWithUnified(html);
                return result;
            } catch (e) {
                console.warn('Unified parser failed, using internal parser:', e);
            }
        }
        
        // Convert markdown to HTML with internal parser
        html = this.convertMarkdownToHtml(html);
        
        return html;
    }

    async ensureUnifiedReady() {
        if (this._unifiedReady && this._processor) return;
        // Dynamic import via CDN (esm.sh)
        const [{ unified }, { default: remarkParse }, { default: remarkGfm }, { default: remarkRehype }, { default: rehypeSanitize }, { default: rehypeStringify }] = await Promise.all([
            import('https://esm.sh/unified@11?bundle'),
            import('https://esm.sh/remark-parse@11?bundle'),
            import('https://esm.sh/remark-gfm@4?bundle'),
            import('https://esm.sh/remark-rehype@11?bundle'),
            import('https://esm.sh/rehype-sanitize@6?bundle'),
            import('https://esm.sh/rehype-stringify@10?bundle'),
        ]);
        this._processor = unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkRehype)
            .use(rehypeSanitize)
            .use(rehypeStringify);
        this._unifiedReady = true;
    }

    async convertMarkdownWithUnified(text) {
        await this.ensureUnifiedReady();
        const file = await this._processor.process(text);
        return String(file);
    }
    
    parseIncompleteMarkdown(text) {
        // Handle incomplete markdown blocks during streaming
        
        // Fix incomplete code blocks
        text = text.replace(/```([^`]*)$/gm, '```\n$1');
        
        // Fix incomplete bold/italic markers
        text = text.replace(/\*\*([^*]*)$/gm, '**$1**');
        text = text.replace(/\*([^*]*)$/gm, '*$1*');
        text = text.replace(/__([^_]*)$/gm, '__$1__');
        text = text.replace(/_([^_]*)$/gm, '_$1_');
        
        // Fix incomplete links
        text = text.replace(/\[([^\]]*)$/gm, '[$1]()');
        
        // Fix incomplete list markers
        text = text.replace(/^(\s*)[-*+]\s*$/gm, '$1- ');
        
        // Neutralize dangling emphasis at line end (avoids suffixes like "**Pit Stops:**_")
        text = this.fixUnbalancedEmphasis(text);
        
        return text;
    }
    
    // Remove or neutralize dangling emphasis markers at line end
    fixUnbalancedEmphasis(text) {
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            // Ignore code block lines or tables
            if (line.startsWith('```') || line.trim().startsWith('|')) {
                continue;
            }
            // If a backtick is left open at the end, keep as-is
            if (/`$/.test(line)) {
                lines[i] = line;
                continue;
            }
            // Only neutralize if it is a dangling marker (no prior pair)
            // Capture a trailing sequence of 1 to 3 asterisks/underscores
            const trailingMatch = line.match(/([*_]{1,3})\s*$/);
            if (trailingMatch) {
                const trailingSeq = trailingMatch[1];
                const head = line.slice(0, line.length - trailingMatch[0].length);
                // If the same sequence does not appear earlier, treat as dangling and remove
                if (!head.includes(trailingSeq)) {
                    line = head.replace(/\s+$/, '');
                }
            }
            lines[i] = line;
        }
        return lines.join('\n');
    }
    
    convertMarkdownToHtml(text) {
        // Split into lines for more precise processing
        const lines = text.split('\n');
        const processedLines = [];
        let inList = false;
        let listItems = [];
        let listType = 'ul'; // 'ul' or 'ol'
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Process headings first
            if (line.match(/^#{1,6}\s/)) {
                // Close an open list if present
                if (inList && listItems.length > 0) {
                    processedLines.push(this.wrapListItems(listItems));
                    listItems = [];
                    inList = false;
                }
                
                const level = line.match(/^(#{1,6})/)[1].length;
                const content = line.replace(/^#{1,6}\s/, '');
                processedLines.push(`<h${level}>${content}</h${level}>`);
                continue;
            }
            
            // Process lists
            if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
                const isOrdered = /^\d+\.\s/.test(line);
                if (!inList) {
                    inList = true;
                    listType = isOrdered ? 'ol' : 'ul';
                } else if ((isOrdered && listType !== 'ol') || (!isOrdered && listType !== 'ul')) {
                    // List type changed; close current and start another
                    processedLines.push(this.wrapListItems(listItems, listType));
                    listItems = [];
                    listType = isOrdered ? 'ol' : 'ul';
                }

                const content = line.replace(/^[-*+]\s/, '').replace(/^\d+\.\s/, '');
                // Process inline formatting inside lists
                const processedContent = this.processInlineFormatting(content);
                listItems.push(`<li>${processedContent}</li>`);
                continue;
            }
            
            // If neither heading nor list, close list if open
            if (inList && listItems.length > 0) {
                processedLines.push(this.wrapListItems(listItems, listType));
                listItems = [];
                inList = false;
            }
            
            // Process other lines
            if (line === '') {
                processedLines.push('');
            } else {
                // Process inline formatting
                let processedLine = this.processInlineFormatting(line);
                processedLines.push(processedLine);
            }
        }
        
        // Close list if still open
        if (inList && listItems.length > 0) {
            processedLines.push(this.wrapListItems(listItems, listType));
        }
        
        // Join lines and process paragraphs
        let result = processedLines.join('\n');
        
        // Process special blocks (code, tables, etc.)
        result = this.processSpecialBlocks(result);
        
        // Process paragraphs
        result = this.processParagraphs(result);
        
        return result;
    }
    
    wrapListItems(listItems, type = 'ul') {
        const listHtml = listItems.join('');
        return type === 'ol' ? `<ol>${listHtml}</ol>` : `<ul>${listHtml}</ul>`;
    }
    
    processInlineFormatting(text) {
        // State-machine inline parser for `code`, italic, bold, bold+italic using * and _
        const tokens = [];
        const markerStack = []; // {char:'*'|'_', count:1|2|3, pos:number}
        let i = 0;
        let inCode = false;
        let codeBuffer = '';

        const pushText = (s) => {
            if (!s) return;
            const last = tokens[tokens.length - 1];
            if (last && last.type === 'text') last.value += s; else tokens.push({ type: 'text', value: s });
        };

        const wrap = (count, children) => {
            if (count === 3) return { type: 'strong_em', children };
            if (count === 2) return { type: 'strong', children };
            return { type: 'em', children };
        };

        while (i < text.length) {
            const ch = text[i];

            // Code spans have highest precedence
            if (ch === '`') {
                if (inCode) {
                    tokens.push({ type: 'code', value: codeBuffer });
                    inCode = false;
                    codeBuffer = '';
                } else {
                    inCode = true;
                    codeBuffer = '';
                }
                i++;
                continue;
            }

            if (inCode) {
                codeBuffer += ch;
                i++;
                continue;
            }

            if (ch === '*' || ch === '_') {
                let j = i;
                while (j < text.length && text[j] === ch && (j - i) < 3) j++;
                const count = j - i; // 1..3

                // Determine if closing: find nearest matching opener
                let closeIdx = -1;
                for (let k = markerStack.length - 1; k >= 0; k--) {
                    if (markerStack[k].char === ch && markerStack[k].count === count) { closeIdx = k; break; }
                }

                if (closeIdx !== -1) {
                    const start = markerStack[closeIdx].pos;
                    const inner = tokens.splice(start);
                    tokens.push(wrap(count, inner));
                    markerStack.splice(closeIdx, 1);
                } else {
                    markerStack.push({ char: ch, count, pos: tokens.length });
                }
                i = j;
                continue;
            }

            pushText(ch);
            i++;
        }

        if (inCode) {
            // Unclosed code span: emit literal backtick + content
            pushText('`' + codeBuffer);
        }

        // Convert any unclosed markers to literal characters at stored positions
        if (markerStack.length) {
            markerStack.sort((a, b) => a.pos - b.pos).forEach((m, idx) => {
                tokens.splice(m.pos + idx, 0, { type: 'text', value: m.char.repeat(m.count) });
            });
        }

        // Serialize tokens
        const serialize = (nodes) => nodes.map((n) => {
            if (n.type === 'text') return this.escapeHtml(n.value);
            if (n.type === 'code') return `<code>${this.escapeHtml(n.value)}</code>`;
            if (n.type === 'em') return `<em>${serialize(n.children)}</em>`;
            if (n.type === 'strong') return `<strong>${serialize(n.children)}</strong>`;
            if (n.type === 'strong_em') return `<strong><em>${serialize(n.children)}</em></strong>`;
            return '';
        }).join('');

        let html = serialize(tokens);

        // Post-process links/images (safe after emphasis/code resolution)
        html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (m, alt, src) => `<img src="${src}" alt="${this.escapeHtml(alt)}" loading="lazy">`);
        html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (m, label, href) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`);

        return html;
    }
    
    processSpecialBlocks(text) {
        // Code blocks
        text = text.replace(/```(\w+)?\n([^`]*?)```/gs, (match, lang, code) => {
            const language = lang || 'text';
            return `<pre data-language="${language}"><code class="language-${language}">${this.escapeHtml(code)}</code></pre>`;
        });
        
        // Blockquotes
        text = text.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
        
        // Horizontal rules
        text = text.replace(/^---$/gm, '<hr>');
        text = text.replace(/^\*\*\*$/gm, '<hr>');
        
        // Tables
        text = this.parseTables(text);
        
        return text;
    }
    
    processParagraphs(text) {
        // Split into blocks separated by blank lines
        const blocks = text.split(/\n\s*\n/);
        const processedBlocks = [];
        
        for (const block of blocks) {
            const trimmedBlock = block.trim();
            if (!trimmedBlock) continue;
            
            // If already HTML (headings, lists, etc.), do not wrap in paragraph
            if (trimmedBlock.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr|table)/)) {
                processedBlocks.push(trimmedBlock);
            } else {
                // Wrap in paragraph
                processedBlocks.push(`<p>${trimmedBlock}</p>`);
            }
        }
        
        return processedBlocks.join('\n');
    }
    
    parseTables(text) {
        const lines = text.split('\n');
        let inTable = false;
        let tableLines = [];
        let result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('|') && line.trim().length > 0) {
                if (!inTable) {
                    inTable = true;
                    tableLines = [];
                }
                tableLines.push(line);
            } else {
                if (inTable) {
                    result.push(this.convertTableToHtml(tableLines));
                    inTable = false;
                    tableLines = [];
                }
                result.push(line);
            }
        }
        
        if (inTable) {
            result.push(this.convertTableToHtml(tableLines));
        }
        
        return result.join('\n');
    }
    
    convertTableToHtml(tableLines) {
        if (tableLines.length < 2) return tableLines.join('\n');
        
        let html = '<div class="table-wrapper">\n<table>\n';
        
        // Header line
        const headerCells = tableLines[0].split('|').slice(1, -1).map(cell => cell.trim());
        html += '<thead><tr>';
        headerCells.forEach(cell => {
            html += `<th>${this.escapeHtml(cell)}</th>`;
        });
        html += '</tr></thead>\n';
        
        // Data rows
        html += '<tbody>';
        for (let i = 2; i < tableLines.length; i++) {
            const cells = tableLines[i].split('|').slice(1, -1).map(cell => cell.trim());
            html += '<tr>';
            cells.forEach(cell => {
                html += `<td>${this.escapeHtml(cell)}</td>`;
            });
            html += '</tr>';
        }
        html += '</tbody>\n';
        
        html += '</table>\n</div>';
        return html;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Utilities
    clear() {
        this.buffer = '';
        this.container.innerHTML = '';
        this.isStreaming = false;
        this.lastContent = '';
        
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
            this.renderTimeout = null;
        }
    }
    
    getContent() {
        return this.buffer;
    }
    
    setContent(content) {
        this.clear();
        return this.renderMarkdown(content);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownRenderer;
} else if (typeof window !== 'undefined') {
    window.MarkdownRenderer = MarkdownRenderer;
}
