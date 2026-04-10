/**
 * WidgetManager
 * Handles detection and rendering of special group widgets.
 *
 * To add a new widget:
 *   1. Call this.register('type', { triggers, requireEmpty, aspectSquare, render })
 *   2. Add corresponding CSS styles in components.css
 *
 * render(group, groupEl, actions, ui) receives:
 *   - group: the group data object (may include widgetData)
 *   - groupEl: the .group-card DOM element to populate
 *   - actions: { onRenameGroup, onDeleteGroup, onSaveWidgetData, ... }
 *   - ui: UIManager instance for translations and dropdown creation
 */
class WidgetManager {
  constructor() {
    this.widgets = new Map();
    this._registerBuiltinWidgets();
  }

  /**
   * Register a widget type.
   * @param {string} type        Unique widget identifier
   * @param {Object} config
   * @param {string[]} config.triggers      Lowercase titles that activate this widget
   * @param {boolean}  config.requireEmpty  Only activate when group.sites is empty
   * @param {boolean}  config.aspectSquare  Apply 1:1 aspect ratio (like clocks)
   * @param {Function} config.render        (group, groupEl, actions, ui) => void
   */
  register(type, config) {
    this.widgets.set(type, config);
  }

  /**
   * Detect if a group should render as a widget.
   * @returns {string|null} Widget type or null
   */
  detect(group) {
    const title = group.title.trim().toLowerCase();
    for (const [type, config] of this.widgets) {
      if (config.triggers.includes(title)) {
        if (config.requireEmpty && group.sites.length > 0) continue;
        return type;
      }
    }
    return null;
  }

  /**
   * Render a detected widget into the group element.
   */
  render(type, group, groupEl, actions, ui) {
    const config = this.widgets.get(type);
    if (!config) return;
    if (config.aspectSquare) {
      groupEl.classList.add('widget-card');
    }
    config.render(group, groupEl, actions, ui);
  }

  // ─── Helpers ───────────────────────────────────────────────

  /**
   * Start a recurring interval that auto-clears when the anchor element
   * is removed from the DOM.
   */
  _startInterval(anchorEl, updateFn, ms = 1000) {
    updateFn();
    const interval = setInterval(updateFn, ms);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.removedNodes) {
          if (node === anchorEl || (node.contains && node.contains(anchorEl))) {
            clearInterval(interval);
            observer.disconnect();
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Create a standard group header (title + settings dropdown).
   * Reusable by any widget that wants a normal header.
   */
  _createHeader(group, actions, ui, widgetType = null) {
    const headerEl = document.createElement('div');
    headerEl.className = 'group-header';

    const titleEl = document.createElement('div');
    titleEl.className = 'group-title';
    titleEl.textContent = group.title;
    titleEl.dir = 'auto';

    titleEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      titleEl.contentEditable = true;
      titleEl.focus();
      document.execCommand('selectAll', false, null);
    });
    titleEl.addEventListener('blur', (e) => {
      titleEl.contentEditable = false;
      const defaultTitle = ui.getTranslation('new_group_placeholder') || 'New Group';
      const newTitle = e.target.textContent.trim() || defaultTitle;
      actions.onRenameGroup(group.id, newTitle);
    });

    headerEl.appendChild(titleEl);
    headerEl.appendChild(ui._createGroupSettingsDropdown(group, actions, widgetType));
    return headerEl;
  }

  // ─── Built-in Widgets ──────────────────────────────────────

  _registerBuiltinWidgets() {

    // ╔══════════════════════════════════╗
    // ║        Analog Clock             ║
    // ╚══════════════════════════════════╝
    this.register('analog-clock', {
      triggers: ['clock', 'clook', 'ساعة'],
      requireEmpty: true,
      aspectSquare: true,
      render: (group, groupEl, actions, ui) => {
        groupEl.classList.add('analog-widget');

        const settingsWrap = ui._createGroupSettingsDropdown(group, actions, 'analog');
        settingsWrap.className = 'group-settings-wrap clock-widget-settings';
        groupEl.appendChild(settingsWrap);

        const clockWrap = document.createElement('div');
        clockWrap.className = 'clock-widget';

        const analogBox = document.createElement('div');
        analogBox.className = 'analog-clock';

        const hourHand = document.createElement('div');
        hourHand.className = 'analog-hand hour-hand';
        const minHand = document.createElement('div');
        minHand.className = 'analog-hand min-hand';
        const secHand = document.createElement('div');
        secHand.className = 'analog-hand sec-hand';
        const centerDot = document.createElement('div');
        centerDot.className = 'clock-center';

        analogBox.appendChild(hourHand);
        analogBox.appendChild(minHand);
        analogBox.appendChild(secHand);
        analogBox.appendChild(centerDot);
        clockWrap.appendChild(analogBox);
        groupEl.appendChild(clockWrap);

        this._startInterval(groupEl, () => {
          const now = new Date();
          const sec = now.getSeconds();
          const min = now.getMinutes();
          const hr = now.getHours();
          secHand.style.transform  = `translateX(-50%) rotate(${sec * 6}deg)`;
          minHand.style.transform  = `translateX(-50%) rotate(${min * 6 + sec * 0.1}deg)`;
          hourHand.style.transform = `translateX(-50%) rotate(${(hr % 12) * 30 + min * 0.5}deg)`;
        });
      }
    });

    // ╔══════════════════════════════════╗
    // ║        Digital Clock            ║
    // ╚══════════════════════════════════╝
    this.register('digital-clock', {
      triggers: ['digital', 'ساعة رقمية'],
      requireEmpty: true,
      aspectSquare: true,
      render: (group, groupEl, actions, ui) => {
        groupEl.classList.add('digital-widget');

        const settingsWrap = ui._createGroupSettingsDropdown(group, actions, 'digital');
        settingsWrap.className = 'group-settings-wrap clock-widget-settings';
        groupEl.appendChild(settingsWrap);

        const clockWrap = document.createElement('div');
        clockWrap.className = 'clock-widget';

        const timeWrap = document.createElement('div');
        timeWrap.style.cssText = 'display:flex;flex-direction:row;align-items:baseline;gap:8px;';

        const timeEl = document.createElement('div');
        timeEl.className = 'clock-time';
        timeEl.textContent = '00:00';

        const ampmEl = document.createElement('div');
        ampmEl.className = 'clock-indicator';
        ampmEl.textContent = 'A';
        ampmEl.style.cssText = 'font-size:1.2rem;line-height:1;font-weight:700;opacity:0.7;text-transform:uppercase;';

        timeWrap.appendChild(timeEl);
        timeWrap.appendChild(ampmEl);
        clockWrap.appendChild(timeWrap);
        groupEl.appendChild(clockWrap);

        this._startInterval(groupEl, () => {
          const now = new Date();
          let hours = now.getHours();
          const isPm = hours >= 12;
          hours = hours % 12 || 12;
          timeEl.textContent = `${hours.toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          ampmEl.textContent = isPm ? 'P' : 'A';
        });
      }
    });

    // ╔══════════════════════════════════╗
    // ║        Text / Notes Widget      ║
    // ╚══════════════════════════════════╝
    this.register('text-note', {
      triggers: ['text', 'نص', 'note', 'notes', 'ملاحظة'],
      requireEmpty: true,
      aspectSquare: false,
      render: (group, groupEl, actions, ui) => {
        // Initialize widget data on first render
        if (!group.widgetData || group.widgetData.text === undefined) {
          group.widgetData = group.widgetData || {};
          const defaultTitle = ui.getTranslation('text_widget_title') || 'Title';
          const defaultBody  = ui.getTranslation('text_widget_body')  || 'Type here...';
          group.widgetData.text = `# ${defaultTitle}\n${defaultBody}`;
          if (actions.onSaveWidgetData) {
            actions.onSaveWidgetData(group.id, group.widgetData);
          }
        }

        // Header with title + settings dropdown
        groupEl.appendChild(this._createHeader(group, actions, ui));

        // Content area
        const contentArea = document.createElement('div');
        contentArea.className = 'text-widget-content';

        // Parse and render text lines
        const renderText = (rawText) => {
          contentArea.innerHTML = '';
          const lines = (rawText || '').split('\n');
          lines.forEach(line => {
            if (line.startsWith('# ')) {
              const h = document.createElement('h2');
              h.className = 'text-widget-heading';
              h.textContent = line.substring(2);
              h.dir = 'auto';
              contentArea.appendChild(h);
            } else if (line.trim() === '') {
              const spacer = document.createElement('div');
              spacer.className = 'text-widget-spacer';
              contentArea.appendChild(spacer);
            } else {
              const p = document.createElement('p');
              p.className = 'text-widget-paragraph';
              p.textContent = line;
              p.dir = 'auto';
              contentArea.appendChild(p);
            }
          });
        };

        renderText(group.widgetData.text);

        // Double-click to enter edit mode
        contentArea.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          // Don't re-enter if already editing
          if (contentArea.querySelector('.text-widget-editor')) return;

          const textarea = document.createElement('textarea');
          textarea.className = 'text-widget-editor';
          textarea.value = group.widgetData.text || '';
          textarea.dir = 'auto';
          textarea.spellcheck = false;
          textarea.placeholder = '# Heading\nParagraph text...';

          contentArea.innerHTML = '';
          contentArea.appendChild(textarea);
          textarea.focus();

          // Auto-resize on input
          const autoResize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
          };
          textarea.addEventListener('input', autoResize);
          requestAnimationFrame(autoResize);

          const save = () => {
            const newText = textarea.value;
            group.widgetData.text = newText;
            if (actions.onSaveWidgetData) {
              actions.onSaveWidgetData(group.id, group.widgetData);
            }
            renderText(newText);
          };

          textarea.addEventListener('blur', save);
          textarea.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape') {
              ev.preventDefault();
              textarea.blur();
            }
          });
        });

        groupEl.appendChild(contentArea);
      }
    });
  }
}
