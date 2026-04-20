/**
 * UIManager
 * Responsible for all DOM rendering and visual updates.
 * Receives state data and renders it. Emits user actions via callbacks.
 *
 * @class UIManager
 */
class UIManager {
  constructor() {
    this.widgetManager = new WidgetManager();
    this.elements = {
      board: document.getElementById("board"),
      bgVideo: document.getElementById("bgVideo"),
      modals: {
        site: document.getElementById("siteModal"),
        customize: document.getElementById("customizeModal"),
        templates: document.getElementById("templatesModal"),
        settings: document.getElementById("settingsModal"),
        about: document.getElementById("aboutModal"),
      },
      inputs: {
        siteName: document.getElementById("siteNameInput"),
        siteUrl: document.getElementById("siteUrlInput"),
        siteDesc: document.getElementById("siteDescInput"),
        groupId: document.getElementById("currentGroupId"),
        themeMode: document.getElementById("themeModeInput"),
        primaryColor: document.getElementById("primaryColorInput"),
        cardOpacity: document.getElementById("cardOpacityInput"),
        bgFile: document.getElementById("bgFileInput"),
        bgUrl: document.getElementById("bgUrlInput"),
        colCount: document.getElementById("colCountInput"),
        cardSize: document.getElementById("cardSizeInput"),
        searchSize: document.getElementById("searchSizeInput"),
        simpleMode: document.getElementById("simpleModeInput"),
        openInNewTab: document.getElementById("openInNewTabInput"),
        showSearchBar: document.getElementById("showSearchBarInput"),
        enableHistorySearch: document.getElementById(
          "enableHistorySearchInput",
        ),
        language: document.getElementById("languageInput"),
        hideScrollbar: document.getElementById("hideScrollbarInput"),
        hideDescription: document.getElementById("hideDescriptionInput"),
        iconOnlyMode: document.getElementById("iconOnlyModeInput"),
        siteDirection: document.getElementById("siteDirectionInput"),
        hideBorders: document.getElementById("hideBordersInput"),
      },
      containers: {
        bgPresets: document.getElementById("bgPresetsContainer"),
        fileUploadLabel: document.getElementById("fileUploadLabel"),
        userMediaPreview: document.getElementById("currentUserMediaPreview"),
        opacityValue: document.getElementById("opacityValueDisplay"),
        colCountValue: document.getElementById("colCountValue"),
        cardSizeValue: document.getElementById("cardSizeValue"),
        searchSizeValue: document.getElementById("searchSizeValue"),
        pagesTabs: document.getElementById("pagesTabs"),
        searchBarWrapper: document.getElementById("searchBarWrapper"),
        searchSizeControlWrap: document.getElementById("searchSizeControlWrap"),
      },
    };

    this.objectUrlBlob = null;
  }

  /**
   * Selects all text inside a contentEditable element using the modern Selection API.
   * Replaces the deprecated document.execCommand('selectAll').
   * @param {HTMLElement} el - The element whose text content to select
   */
  _selectAllText(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /**
   * Helper to create a video or image element for media preview.
   * @private
   */
  _createMediaElement(src, isVideo, options = {}) {
    if (isVideo) {
      const video = document.createElement("video");
      video.src = src;
      video.muted = true;
      video.autoplay = options.autoplay !== false;
      video.loop = true;
      video.playsInline = true;
      video.className = options.className || "preview-video-box";
      return video;
    } else {
      const img = document.createElement("div");
      img.className = options.className || "preview-img-box";
      img.style.backgroundImage = `url('${src}')`;
      return img;
    }
  }

  /**
   * Creates a Lucide icon as a live SVG element.
   * Uses lucide.createElement() directly so event listeners are NEVER lost
   * (the old <i> placeholder approach caused listeners to be lost when
   *  lucide.createIcons() replaced the element with a new SVG node).
   * @private
   */
  _createLucideIcon(iconName, attrs = {}) {
    // Build normalised attribute map (camelCase → kebab-case where needed)
    const mappedAttrs = {};
    Object.entries(attrs).forEach(([k, v]) => {
      const attrName = k === "strokeWidth" ? "stroke-width" : k;
      mappedAttrs[attrName] = v;
    });

    // Prefer direct SVG creation so event listeners survive
    if (
      typeof lucide !== "undefined" &&
      typeof lucide.createElement === "function"
    ) {
      // Convert kebab-case icon name to Lucide's PascalCase export name
      // e.g. "trash-2" → "Trash2", "plus-circle" → "PlusCircle"
      const pascalName = iconName
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("");
      const iconDef = lucide[pascalName];
      if (iconDef) {
        const svgEl = lucide.createElement(iconDef);
        Object.entries(mappedAttrs).forEach(([k, v]) => {
          if (k === "class") {
            svgEl.setAttribute("class", v);
          } else {
            svgEl.setAttribute(k, v);
          }
        });
        svgEl.setAttribute("aria-hidden", "true");
        return svgEl;
      }
    }

    // Fallback: <i> placeholder (requires lucide.createIcons() to be called later)
    const i = document.createElement("i");
    i.setAttribute("data-lucide", iconName);
    Object.entries(mappedAttrs).forEach(([k, v]) => i.setAttribute(k, v));
    return i;
  }

  async applySettings(settings, mediaStorage) {
    const root = document.documentElement;
    const lang = settings.language || "ar";
    root.setAttribute("lang", lang);

    // Direction: auto (based on lang), or forced rtl/ltr
    const dirSetting = settings.siteDirection || "auto";
    if (dirSetting === "auto") {
      root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    } else {
      root.setAttribute("dir", dirSetting);
    }
    this.applyTranslations(lang);

    root.style.setProperty("--primary-color", settings.primaryColor);

    // Convert hex to rgb for transparency usage
    const hex = settings.primaryColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    root.style.setProperty("--primary-color-rgb", `${r}, ${g}, ${b}`);

    root.style.setProperty("--card-opacity", settings.cardOpacity);
    const cardScale = Math.max(0.5, (settings.cardSize || 100) / 100);
    const searchScale = Math.max(0.5, (settings.searchSize || 100) / 100);
    root.style.setProperty("--card-scale", cardScale);
    root.style.setProperty("--search-scale", searchScale);
    this.elements.board.style.zoom = cardScale;

    // Fix: Use classList instead of overwriting className to preserve Focus Mode
    document.body.classList.remove("light-theme", "dark-theme");
    document.body.classList.add(`${settings.themeMode}-theme`);
    if (settings.simpleMode) {
      document.body.classList.add("simple-mode");
    } else {
      document.body.classList.remove("simple-mode");
    }

    if (settings.hideScrollbar) {
      document.body.classList.add("hide-scrollbar");
    } else {
      document.body.classList.remove("hide-scrollbar");
    }

    // Hide Description Mode
    if (settings.hideDescription) {
      document.body.classList.add("hide-description");
    } else {
      document.body.classList.remove("hide-description");
    }

    // Icon-Only Mode
    if (settings.iconOnlyMode) {
      document.body.classList.add("icon-only-mode");
    } else {
      document.body.classList.remove("icon-only-mode");
    }

    // Hide Borders Mode
    if (settings.hideBorders) {
      document.body.classList.add("hide-borders");
    } else {
      document.body.classList.remove("hide-borders");
    }

    if (settings.showSearchBar && this.elements.containers.searchBarWrapper) {
      this.elements.containers.searchBarWrapper.classList.remove("hidden");
    } else if (this.elements.containers.searchBarWrapper) {
      this.elements.containers.searchBarWrapper.classList.add("hidden");
    }

    if (this.objectUrlBlob) {
      URL.revokeObjectURL(this.objectUrlBlob);
      this.objectUrlBlob = null;
    }

    const { bgVideo } = this.elements;

    if (settings.bgType === "preset") {
      bgVideo.style.display = "none";
      bgVideo.pause();
      bgVideo.removeAttribute("src");
      const bgUrl = settings.bgImage ? `url('${settings.bgImage}')` : "none";
      root.style.setProperty("--bg-image", bgUrl);
      // Fallback: Direct body style just in case variable fails
      document.body.style.backgroundImage = bgUrl;
    } else if (
      settings.bgType === "localImage" ||
      settings.bgType === "localVideo"
    ) {
      const media = await mediaStorage.loadMedia("customBg");
      if (media?.file) {
        this.objectUrlBlob = URL.createObjectURL(media.file);
        if (media.isVideo) {
          root.style.setProperty("--bg-image", "none");
          document.body.style.backgroundImage = "none";
          bgVideo.src = this.objectUrlBlob;
          bgVideo.style.display = "block";
          bgVideo.play().catch((e) => console.warn("Autoplay blocked:", e));
        } else {
          bgVideo.style.display = "none";
          bgVideo.pause();
          const bgUrl = `url('${this.objectUrlBlob}')`;
          root.style.setProperty("--bg-image", bgUrl);
          document.body.style.backgroundImage = bgUrl;
        }
      } else {
        root.style.setProperty("--bg-image", "none");
        document.body.style.backgroundImage = "none";
        bgVideo.style.display = "none";
      }
    } else if (settings.bgType === "videoUrl") {
      root.style.setProperty("--bg-image", "none");
      document.body.style.backgroundImage = "none";
      bgVideo.src = settings.bgImage;
      bgVideo.style.display = "block";
      bgVideo.play().catch((e) => console.warn("Autoplay blocked:", e));
    } else {
      root.style.setProperty("--bg-image", "none");
      document.body.style.backgroundImage = "none";
      bgVideo.style.display = "none";
    }

    // Update preview in customization modal if open
    this.updateUserMediaPreview(mediaStorage, settings);

    if (this.elements.containers.opacityValue) {
      this.elements.containers.opacityValue.textContent = `${Math.round(settings.cardOpacity * 100)}%`;
    }
  }

  applyTranslations(lang) {
    if (!window.TRANSLATIONS) return;
    const texts = window.TRANSLATIONS[lang] || window.TRANSLATIONS.ar;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (texts[key]) el.innerHTML = texts[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (texts[key]) el.setAttribute("placeholder", texts[key]);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      if (texts[key]) el.setAttribute("aria-label", texts[key]);
    });
    document.querySelectorAll("[data-i18n-content]").forEach((el) => {
      const key = el.getAttribute("data-i18n-content");
      if (texts[key]) el.setAttribute("content", texts[key]);
    });
    if (texts.page_title) document.title = texts.page_title;
  }

  getTranslation(key, lang) {
    if (!window.TRANSLATIONS) return key;
    const currentLang =
      lang || window.App?.stateManager?.getState()?.settings?.language || "ar";
    return (
      window.TRANSLATIONS[currentLang]?.[key] ||
      window.TRANSLATIONS.ar[key] ||
      key
    );
  }

  /**
   * Updates the live preview in the customization modal.
   * @param {MediaStorage} mediaStorage
   * @param {Object} [currentSettings] - Optional settings to preview instead of current state
   */
  async updateUserMediaPreview(mediaStorage, currentSettings) {
    const container = this.elements.containers.userMediaPreview;
    if (!container) return;

    const settings =
      currentSettings || window.App?.stateManager?.getState()?.settings;
    if (!settings) return;

    container.innerHTML = "";

    if (settings.bgType === "videoUrl" || settings.bgType === "preset") {
      const isVideo = settings.bgType === "videoUrl";
      const el = this._createMediaElement(settings.bgImage, isVideo);
      container.appendChild(el);
      return;
    }

    const media = await mediaStorage.loadMedia("customBg");
    if (!media || !media.file) {
      container.innerHTML = `<span style="font-size: 12px; opacity: 0.5;">${this.getTranslation("no_bg")}</span>`;
      return;
    }

    const url = URL.createObjectURL(media.file);
    const el = this._createMediaElement(url, media.isVideo);
    container.appendChild(el);
  }

  /**
   * Returns an ordered list of favicon URLs from highest to lowest quality.
   * @param {string} url - The site URL.
   * @returns {string[]} Array of favicon URLs sorted by quality (highest first).
   */
  getFaviconSources(url) {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname;
      const origin = parsed.origin;
      return [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `${origin}/favicon.ico`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      ];
    } catch {
      return [`https://www.google.com/s2/favicons?domain=google.com&sz=64`];
    }
  }

  /**
   * Returns the highest quality favicon URL for a site.
   * For backward compatibility – returns just the first (best) source.
   * @param {string} url - The site URL.
   * @returns {string} Best favicon URL.
   */
  getFavicon(url) {
    return this.getFaviconSources(url)[0];
  }

  /**
   * Sets up progressive favicon loading on an img element.
   * Tries the highest quality source first; on error, falls back to the next.
   * @param {HTMLImageElement} imgEl - The image element.
   * @param {string} siteUrl - The site URL.
   */
  _setupProgressiveFavicon(imgEl, siteUrl) {
    const sources = this.getFaviconSources(siteUrl);
    let currentIndex = 0;

    imgEl.src = sources[currentIndex];

    imgEl.onerror = () => {
      currentIndex++;
      if (currentIndex < sources.length) {
        imgEl.src = sources[currentIndex];
      } else {
        // Final fallback: a 1x1 transparent pixel (avoids infinite loop)
        imgEl.onerror = null;
        imgEl.src =
          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%23555"/><text x="16" y="22" font-size="18" fill="white" text-anchor="middle" font-family="sans-serif">' +
          (imgEl.alt?.[0] || "?") +
          "</text></svg>";
      }
    };
  }

  /**
   * Renders the grid of templates in the templates modal.
   */
  async renderTemplates(onSelectTemplate, mediaStorage) {
    const grid = document.getElementById("templatesGrid");
    if (!grid) return;
    grid.innerHTML = "";

    let customMediaBlobUrl = null;
    let customMediaIsVideo = false;
    if (mediaStorage) {
      const media = await mediaStorage.loadMedia("customBg");
      if (media?.file) {
        customMediaBlobUrl = URL.createObjectURL(media.file);
        customMediaIsVideo = media.isVideo;
      }
    }

    const state = window.App?.stateManager?.getState();
    const allTemplates = [...(state?.customTemplates || []), ...UI_TEMPLATES];

    // Create Template Item
    const createItem = document.createElement("div");
    createItem.className = "template-item add-template-card";

    const plusIcon = this._createLucideIcon("plus-circle", {
      width: 36,
      height: 36,
      style: "color: var(--primary-color)",
    });
    const createLabel = document.createElement("span");
    createLabel.className = "template-create-title";
    createLabel.textContent = this.getTranslation("create_custom_template");

    createItem.appendChild(plusIcon);
    createItem.appendChild(createLabel);
    createItem.addEventListener("click", () => {
      this.toggleModal("templates", false);
      this.toggleModal("customize", true);
    });
    grid.appendChild(createItem);

    // Render Template List
    allTemplates.forEach((template) => {
      const item = document.createElement("div");
      item.className = "template-item";

      const templateName =
        this.getTranslation(template.id) !== template.id
          ? this.getTranslation(template.id)
          : template.name || template.id;

      let isVideo = template.type === "video";
      let renderUrl = template.url;

      if (template.isCustom && !template.url && customMediaBlobUrl) {
        renderUrl = customMediaBlobUrl;
        isVideo = customMediaIsVideo;
      }

      const previewContainer = document.createElement("div");
      previewContainer.className = "template-preview";
      previewContainer.style.background = template.color;

      const mediaEl = this._createMediaElement(renderUrl || "", isVideo, {
        autoplay: false,
      });
      mediaEl.style.width = "100%";
      mediaEl.style.height = "100%";
      mediaEl.style.objectFit = "cover";
      previewContainer.appendChild(mediaEl);

      if (template.isCustom) {
        const delBtn = document.createElement("button");
        delBtn.className = "delete-template-btn";
        delBtn.title = this.getTranslation("delete_template");
        delBtn.appendChild(
          this._createLucideIcon("trash-2", { width: 16, height: 16 }),
        );
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm(this.getTranslation("delete_template_confirm"))) {
            if (window.App) window.App.deleteCustomTemplate(template.id);
          }
        });
        previewContainer.appendChild(delBtn);
      }

      const overlay = document.createElement("div");
      overlay.className = "template-overlay";

      const nameSpan = document.createElement("span");
      nameSpan.className = "template-name-minimal";
      nameSpan.textContent = templateName;

      const badgeRow = document.createElement("div");
      badgeRow.className = "template-badges-row";

      const typeBadge = document.createElement("span");
      typeBadge.className = "template-badge-minimal";
      typeBadge.textContent = isVideo
        ? this.getTranslation("video_badge")
        : this.getTranslation("image_badge");

      const themeBadge = document.createElement("span");
      themeBadge.className = "template-badge-minimal";
      themeBadge.textContent =
        template.theme === "dark"
          ? this.getTranslation("theme_dark")
          : this.getTranslation("theme_light");

      badgeRow.appendChild(typeBadge);
      badgeRow.appendChild(themeBadge);
      overlay.appendChild(nameSpan);
      overlay.appendChild(badgeRow);
      previewContainer.appendChild(overlay);

      item.appendChild(previewContainer);
      item.addEventListener("click", () => onSelectTemplate(template));

      if (isVideo) {
        item.addEventListener("mouseenter", () =>
          mediaEl.play().catch(() => {}),
        );
        item.addEventListener("mouseleave", () => mediaEl.pause());
      }

      grid.appendChild(item);
    });

    if (typeof lucide !== "undefined") {
      lucide.createIcons({ root: grid });
    }
  }

  /**
   * Renders the page tabs in the header.
   * @param {Array} pages - List of pages.
   * @param {string} activePageId - ID of the active page.
   * @param {Object} actions - Actions for page management.
   */
  renderPagesTabs(pages, activePageId, actions) {
    const tabsContainer = this.elements.containers.pagesTabs;
    if (!tabsContainer) return;

    tabsContainer.innerHTML = "";

    pages.forEach((page) => {
      const tabEl = document.createElement("button");
      tabEl.className = "page-tab";
      tabEl.dataset.id = page.id;
      if (page.id === activePageId) {
        tabEl.classList.add("active");
      }

      const nameEl = document.createElement("span");
      nameEl.className = "page-tab-name";
      nameEl.textContent = page.title || this.getTranslation("new_page");
      nameEl.dir = "auto";

      const startRenaming = () => {
        nameEl.contentEditable = true;
        nameEl.focus();
        document.execCommand("selectAll", false, null);
        tabEl.classList.add("is-renaming");
      };

      nameEl.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        startRenaming();
      });

      nameEl.addEventListener("blur", () => {
        nameEl.contentEditable = false;
        tabEl.classList.remove("is-renaming");
        const newTitle = nameEl.textContent.trim();
        if (newTitle && newTitle !== page.title) {
          actions.onRenamePage(page.id, newTitle);
        } else {
          nameEl.textContent = page.title || this.getTranslation("new_page");
        }
      });

      nameEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          nameEl.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          nameEl.textContent = page.title;
          nameEl.blur();
        }
      });

      tabEl.appendChild(nameEl);

      const actionsWrap = document.createElement("div");
      actionsWrap.className = "page-tab-actions";

      const renameBtn = document.createElement("button");
      renameBtn.className = "action-page-btn";
      renameBtn.innerHTML =
        '<i data-lucide="pencil" width="12" height="12"></i>';
      renameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        startRenaming();
      });
      actionsWrap.appendChild(renameBtn);

      if (pages.length > 1) {
        const delBtn = document.createElement("button");
        delBtn.className = "action-page-btn";
        delBtn.innerHTML = '<i data-lucide="x" width="14" height="14"></i>';
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm(this.getTranslation("delete_page_confirm"))) {
            actions.onDeletePage(page.id);
          }
        });
        actionsWrap.appendChild(delBtn);
      }

      tabEl.appendChild(actionsWrap);

      tabEl.addEventListener("click", (e) => {
        if (nameEl.contentEditable === "true") return;
        if (page.id !== activePageId) {
          actions.onSelectPage(page.id);
        }
      });

      tabsContainer.appendChild(tabEl);
    });

    if (typeof lucide !== "undefined") {
      lucide.createIcons({ root: tabsContainer });
    }
  }

  /**
   * Renders the board (columns and groups).
   * @param {Array} groups - List of groups.
   * @param {Object} actions - Actions for group management.
   */
  renderBoard(groups, actions) {
    const { board } = this.elements;
    board.innerHTML = "";

    const colCount = Math.max(
      1,
      window.App?.stateManager?.getState()?.settings?.columnsCount || 6,
    );
    const columns = Array.from({ length: colCount }, (_, i) => {
      const colEl = document.createElement("div");
      colEl.className = "board-column";
      colEl.dataset.colIndex = i;
      board.appendChild(colEl);
      return colEl;
    });

    groups.forEach((group) => {
      const groupEl = this._createGroupElement(group, actions);
      const targetCol =
        columns[
          group.column >= 0 && group.column < colCount ? group.column : 0
        ];
      targetCol.appendChild(groupEl);
    });

    columns.forEach((colEl, i) => {
      let placeholder = null;

      const createPlaceholder = () => {
        if (placeholder || document.body.classList.contains("dragging-active"))
          return;

        placeholder = document.createElement("button");
        placeholder.className = "add-group-placeholder";
        placeholder.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i data-lucide="folder-plus" width="18" height="18" stroke-width="2"></i>
            <span data-i18n="create_group">${this.getTranslation("create_group")}</span>
          </div>
        `;
        placeholder.addEventListener("click", () => actions.onAddGroup(i));
        colEl.appendChild(placeholder);

        if (typeof lucide !== "undefined") {
          lucide.createIcons({ nameAttr: "data-lucide", root: placeholder });
        }

        requestAnimationFrame(() => placeholder?.classList.add("visible"));
      };

      const removePlaceholder = () => {
        if (placeholder) {
          placeholder.remove();
          placeholder = null;
        }
      };

      colEl.addEventListener("mousemove", (e) => {
        if (e.target.closest(".group-card")) {
          removePlaceholder();
        } else if (!placeholder) {
          createPlaceholder();
        }
      });

      colEl.addEventListener("mouseleave", () => {
        removePlaceholder();
      });
    });

    if (typeof lucide !== "undefined") {
      lucide.createIcons({ root: board });
    }
  }

  /**
   * Creates a group element.
   * @param {Object} group - The group object.
   * @param {Object} actions - Actions for group management.
   * @returns {HTMLElement} The group element.
   */
  _createGroupElement(group, actions) {
    const groupEl = document.createElement("div");
    groupEl.className = "group-card";
    groupEl.dataset.id = group.id;

    const widgetType = this.widgetManager.detect(group);

    if (widgetType) {
      this.widgetManager.render(widgetType, group, groupEl, actions, this);
    } else {
      const headerEl = document.createElement("div");
      headerEl.className = "group-header";

      const titleEl = document.createElement("div");
      titleEl.className = "group-title";
      titleEl.textContent = group.title;
      titleEl.dir = "auto";

      titleEl.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        titleEl.contentEditable = true;
        titleEl.focus();
        this._selectAllText(titleEl);
        groupEl.classList.add("is-renaming");
      });
      titleEl.addEventListener("blur", (e) => {
        titleEl.contentEditable = false;
        groupEl.classList.remove("is-renaming");
        const defaultTitle =
          this.getTranslation("new_group_placeholder") || "New Group";
        const newTitle = e.target.textContent.trim() || defaultTitle;
        actions.onRenameGroup(group.id, newTitle);
      });

      titleEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          titleEl.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          titleEl.textContent = group.title;
          titleEl.blur();
        }
      });

      headerEl.appendChild(titleEl);

      const headerActions = document.createElement("div");
      headerActions.className = "group-header-actions";

      const addBtn = this._createLucideIcon("plus", {
        width: 14,
        height: 14,
        strokeWidth: 1.5,
      });
      addBtn.setAttribute("class", "group-action-btn add-site-action");
      addBtn.title = this.getTranslation("add_site");
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        actions.onOpenAddSiteModal(group.id);
      });

      const delBtn = this._createLucideIcon("trash-2", {
        width: 14,
        height: 14,
        strokeWidth: 1.5,
      });
      delBtn.setAttribute("class", "group-action-btn delete-group-action");
      delBtn.title = this.getTranslation("delete_group");
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(this.getTranslation("delete_group_confirm"))) {
          actions.onDeleteGroup(group.id);
        }
      });

      headerActions.appendChild(addBtn);
      headerActions.appendChild(delBtn);
      headerEl.appendChild(headerActions);

      groupEl.appendChild(headerEl);

      const listEl = document.createElement("div");
      listEl.className = "site-list";
      listEl.dataset.groupId = group.id;
      group.sites.forEach((site) => {
        listEl.appendChild(this._createSiteElement(site, group.id, actions));
      });
      groupEl.appendChild(listEl);
    }
    return groupEl;
  }

  /**
   * Creates a site list item.
   * @param {Object} site - The site object.
   * @param {string} groupId - The group ID.
   * @param {Object} actions - Actions for site management.
   * @returns {HTMLElement} The site element.
   * @private
   */
  _createSiteElement(site, groupId, actions) {
    const siteEl = document.createElement("a");
    siteEl.className = "site-item";
    const openNewTab =
      window.App?.stateManager?.getState()?.settings?.openInNewTab ?? false;
    siteEl.href = site.url;
    siteEl.target = openNewTab ? "_blank" : "_self";
    siteEl.rel = "noopener noreferrer";
    siteEl.setAttribute(
      "aria-label",
      `${this.getTranslation("go_to_site")} ${site.name}`,
    );
    siteEl.dataset.id = site.id;
    siteEl.draggable = false;

    const iconEl = document.createElement("img");
    iconEl.className = "site-favicon";
    iconEl.alt = `${site.name} icon`;
    iconEl.width = 16;
    iconEl.height = 16;
    iconEl.loading = "lazy";
    this._setupProgressiveFavicon(iconEl, site.url);

    const nameEl = document.createElement("div");
    nameEl.className = "site-name";
    nameEl.textContent = site.name;
    nameEl.dir = "auto";

    const contentWrap = document.createElement("div");
    contentWrap.className = "site-content";
    contentWrap.appendChild(nameEl);

    if (site.desc) {
      const descEl = document.createElement("div");
      descEl.className = "site-desc";
      descEl.textContent = site.desc;
      descEl.dir = "auto";
      contentWrap.appendChild(descEl);
    }

    const actionsWrap = document.createElement("div");
    actionsWrap.className = "site-actions";

    const editSiteBtn = this._createLucideIcon("pencil", {
      width: 12,
      height: 12,
      strokeWidth: 1.5,
    });
    editSiteBtn.setAttribute("class", "site-action-btn edit-site-btn");
    editSiteBtn.setAttribute(
      "aria-label",
      this.getTranslation("edit_site_aria") || "تعديل",
    );
    editSiteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (actions.onEditSite) {
        actions.onEditSite(groupId, site);
      }
    });

    const delSiteBtn = this._createLucideIcon("trash-2", {
      width: 12,
      height: 12,
      strokeWidth: 1.5,
    });
    delSiteBtn.setAttribute("class", "site-action-btn delete-site-btn");
    delSiteBtn.setAttribute(
      "aria-label",
      `${this.getTranslation("delete_site_aria")} ${site.name}`,
    );
    delSiteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      actions.onDeleteSite(groupId, site.id);
    });

    actionsWrap.appendChild(editSiteBtn);
    actionsWrap.appendChild(delSiteBtn);

    siteEl.appendChild(iconEl);
    siteEl.appendChild(contentWrap);
    siteEl.appendChild(actionsWrap);

    return siteEl;
  }

  /**
   * Toggles modal visibility.
   * @param {string} modalKey - Key of the modal to toggle.
   * @param {boolean} isVisible - Visibility state.
   */
  toggleModal(modalKey, isVisible) {
    const modal = this.elements.modals[modalKey];
    if (modal) {
      modal.style.display = isVisible ? "flex" : "none";
    }
  }

  /**
   * Renders search suggestions.
   * @param {Array} suggestions - List of suggestions.
   * @param {number} selectedIndex - Currently selected index.
   * @param {Function} performAction - Action to perform on selection.
   */
  renderSearchSuggestions(suggestions, selectedIndex, performAction) {
    const { searchBarWrapper } = this.elements.containers;
    const suggestionsBox = document.getElementById("searchSuggestions");

    suggestionsBox.innerHTML = "";
    if (!suggestions || suggestions.length === 0) {
      if (searchBarWrapper) {
        const query = document.getElementById("searchInput").value.trim();
        if (query) {
          suggestionsBox.innerHTML = `
            <div class="suggestion-no-results">
              <i data-lucide="search-x" width="24" height="24"></i><br/>
              ${this.getTranslation("no_search_results") || "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0646\u062a\u0627\u0626\u062c"}
            </div>
          `;
          suggestionsBox.classList.remove("hidden");
          if (typeof lucide !== "undefined") lucide.createIcons();
        } else {
          suggestionsBox.classList.add("hidden");
        }
      }
      return;
    }

    const query = document.getElementById("searchInput").value.trim();

    suggestions.forEach((sug, index) => {
      const div = document.createElement("div");
      div.className =
        "suggestion-item" + (index === selectedIndex ? " selected" : "");

      // Determine icon based on suggestion type
      const iconMap = {
        history: "history",
        search_history: "history",
        site: "globe",
        exact_site: "star",
      };
      const icon = iconMap[sug.type] || "search";

      // Highlight matching text
      let highlightedText = sug.text;
      if (query && sug.type !== "search") {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(${escapedQuery})`, "gi");
        highlightedText = sug.text.replace(
          regex,
          '<span class="suggestion-highlight">$1</span>',
        );
      }

      const iconDiv = this._createLucideIcon(icon, {
        width: 14,
        height: 14,
        strokeWidth: 1.5,
      });
      iconDiv.classList.add("suggestion-item-icon");

      const innerDiv = document.createElement("div");
      innerDiv.className = "suggestion-item-inner";
      innerDiv.appendChild(iconDiv);

      const textEl = document.createElement("span");
      textEl.className = "suggestion-item-text";
      textEl.innerHTML = highlightedText;
      innerDiv.appendChild(textEl);

      div.appendChild(innerDiv);
      div.addEventListener("click", () => performAction(sug));
      div.addEventListener("mouseenter", () => {
        suggestionsBox
          .querySelectorAll(".suggestion-item")
          .forEach((el) => el.classList.remove("selected"));
        div.classList.add("selected");
      });
      suggestionsBox.appendChild(div);
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
    suggestionsBox.classList.remove("hidden");
    this.updateSearchSelection(selectedIndex);
  }

  updateSearchSelection(index) {
    const suggestionsBox = document.getElementById("searchSuggestions");
    if (!suggestionsBox) return;

    const items = suggestionsBox.querySelectorAll(".suggestion-item");
    items.forEach((item, i) => {
      item.classList.toggle("selected", i === index);
    });

    if (index >= 0 && items[index]) {
      const container = suggestionsBox;
      const item = items[index];

      const itemRect = item.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      if (index === 0) {
        // Absolutely at the top
        container.scrollTo({ top: 0, behavior: "smooth" });
      } else if (index === items.length - 1) {
        // Absolutely at the bottom
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } else if (itemRect.top < containerRect.top) {
        // Scrolling UP: it's clipped at the top. Scroll up by the exact hidden distance.
        const hiddenAmount = containerRect.top - itemRect.top;
        container.scrollBy({ top: -(hiddenAmount + 4), behavior: "smooth" }); // small 4px top gap
      } else if (itemRect.bottom > containerRect.bottom) {
        // Scrolling DOWN: it's clipped at the bottom. Scroll down by the exact hidden distance.
        const hiddenAmount = itemRect.bottom - containerRect.bottom;
        container.scrollBy({ top: hiddenAmount + 12, behavior: "smooth" }); // 12px bottom space
      }
    }
  }
}
