/**
 * WidgetManager
 * Handles detection and rendering of special group widgets (Clocks, Notes, etc.).
 *
 * @class WidgetManager
 */
class WidgetManager {
  constructor() {
    this.widgets = new Map();
    this._registerBuiltinWidgets();
  }

  /**
   * Register a widget type.
   * @param {string} type - Unique identifier.
   * @param {Object} config - Widget configuration.
   */
  register(type, config) {
    this.widgets.set(type, config);
  }

  /**
   * Detect if a group should render as a widget based on its title.
   * @param {Object} group 
   * @returns {string|null}
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

  /**
   * Start a recurring interval that auto-clears when the anchor element is removed.
   * @private
   */
  _startInterval(anchorEl, updateFn, ms = 1000) {
    updateFn();
    const interval = setInterval(() => {
      if (!anchorEl.isConnected) {
        clearInterval(interval);
        return;
      }
      updateFn();
    }, ms);
  }

  /**
   * Create a widget delete button.
   * @private
   */
  _createWidgetDeleteBtn(group, actions, ui) {
    const btn = ui._createLucideIcon('trash-2', { width: 14, height: 14, strokeWidth: "1.5" });
    btn.className = 'widget-delete-btn';
    btn.setAttribute('aria-label', ui.getTranslation('delete_group'));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(ui.getTranslation('delete_group_confirm'))) {
        actions.onDeleteGroup(group.id);
      }
    });
    return btn;
  }

  _registerBuiltinWidgets() {
    // Analog Clock
    this.register('analog-clock', {
      triggers: ['analog_clock'],
      requireEmpty: true,
      aspectSquare: true,
      render: (group, groupEl, actions, ui) => {
        groupEl.classList.add('analog-widget');
        groupEl.appendChild(this._createWidgetDeleteBtn(group, actions, ui));

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

    // Digital Clock
    this.register('digital-clock', {
      triggers: ['digital_clock'],
      requireEmpty: true,
      aspectSquare: true,
      render: (group, groupEl, actions, ui) => {
        groupEl.classList.add('digital-widget');
        groupEl.appendChild(this._createWidgetDeleteBtn(group, actions, ui));

        const clockWrap = document.createElement('div');
        clockWrap.className = 'clock-widget';

        const timeWrap = document.createElement('div');
        timeWrap.className = 'digital-time-wrap';

        const timeEl = document.createElement('div');
        timeEl.className = 'clock-time';
        timeEl.textContent = '00:00';

        const ampmEl = document.createElement('div');
        ampmEl.className = 'clock-indicator';
        ampmEl.textContent = 'A';

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

    // Text / Notes Widget
    this.register('text-note', {
      triggers: ['text', 'نص', 'note', 'notes', 'ملاحظة'],
      requireEmpty: true,
      aspectSquare: false,
      render: (group, groupEl, actions, ui) => {
        if (!group.widgetData || group.widgetData.text === undefined) {
          group.widgetData = group.widgetData || {};
          const defaultTitle = ui.getTranslation('text_widget_title') || 'Title';
          const defaultBody  = ui.getTranslation('text_widget_body')  || 'Type here...';
          group.widgetData.text = `# ${defaultTitle}\n${defaultBody}`;
          if (actions.onSaveWidgetData) {
            actions.onSaveWidgetData(group.id, group.widgetData);
          }
        }

        groupEl.appendChild(this._createWidgetDeleteBtn(group, actions, ui));

        const contentArea = document.createElement('div');
        contentArea.className = 'text-widget-content';

        const renderText = (rawText) => {
          contentArea.innerHTML = '';
          contentArea.classList.remove('editing');
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

        contentArea.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          if (contentArea.querySelector('.text-widget-editor')) return;

          contentArea.classList.add('editing');

          const textarea = document.createElement('textarea');
          textarea.className = 'text-widget-editor';
          textarea.value = group.widgetData.text || '';
          textarea.dir = 'auto';
          textarea.spellcheck = false;

          contentArea.innerHTML = '';
          contentArea.appendChild(textarea);
          textarea.focus();

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
