/**
 * AppController
 * Binds UI inputs to Business Logic. Updates the State then invokes re-rendering natively.
 */
class AppController {
  constructor() {
    this.stateManager = new StateManager();
    this.mediaStorage = new MediaStorage();
    this.ui = new UIManager();
    this.searchEngine = new SearchEngine(this.stateManager);

    this.sortableInstances = [];
    this._bindStaticEvents();
  }

  async init() {
    try {
        const resp = await fetch('js/translations.json');
        window.TRANSLATIONS = await resp.json();
    } catch (e) {
        console.error("Failed to load translations:", e);
    }

    if (typeof lucide !== "undefined") lucide.createIcons();
    await this.ui.applySettings(
      this.stateManager.getState().settings,
      this.mediaStorage,
    );
    this.renderAll();
  }

  renderAll() {
    const state = this.stateManager.getState();
    const activePage = this._getActivePage();
    if (!activePage) return; // Wait for state normalization

    const proxyActions = {
      onAddGroup: (colIndex) => this._addGroup(colIndex),
      onRenameGroup: (groupId, newTitle) =>
        this._updateGroup(groupId, { title: newTitle }),
      onDeleteGroup: (groupId) => this._removeGroup(groupId),
      onOpenAddSiteModal: (groupId) => this._openSiteModal(groupId),
      onDeleteSite: (groupId, siteId) => this._removeSite(groupId, siteId),
      onSaveWidgetData: (groupId, data) => this._saveWidgetData(groupId, data),
    };

    const pageActions = {
      onSelectPage: (id) => this._selectPage(id),
      onRenamePage: (id, newTitle) => this._renamePage(id, newTitle),
      onDeletePage: (id) => this._deletePage(id),
    };

    this.ui.renderPagesTabs(state.pages, state.activePageId, pageActions);
    this.ui.renderBoard(activePage.groups, proxyActions);
    this._initDragAndDrop();
  }

  _getActivePage() {
    const state = this.stateManager.getState();
    return state.pages.find(p => p.id === state.activePageId) || state.pages[0];
  }

  _selectPage(id) {
    const state = this.stateManager.getState();
    state.activePageId = id;
    this.stateManager.save();
    this.renderAll();
  }

  _addPage() {
    const state = this.stateManager.getState();
    const newId = `page-${Date.now()}`;
    state.pages.push({
      id: newId,
      title: this.ui.getTranslation("new_page") || "New Page",
      groups: []
    });
    state.activePageId = newId;
    this.stateManager.save();
    this.renderAll();
  }

  _renamePage(id, newTitle) {
    const state = this.stateManager.getState();
    const page = state.pages.find(p => p.id === id);
    if (page) {
      page.title = newTitle;
      this.stateManager.save();
      this.renderAll();
    }
  }

  _deletePage(id) {
    const state = this.stateManager.getState();
    state.pages = state.pages.filter(p => p.id !== id);
    if (state.activePageId === id) {
      state.activePageId = state.pages[0]?.id;
    }
    this.stateManager.save();
    this.renderAll();
  }

  _updateGroup(groupId, updates) {
    const group = this._findGroup(groupId);
    if (group) {
      Object.assign(group, updates);
      this.stateManager.save();
      this.renderAll();
    }
  }

  _removeGroup(groupId) {
    const activePage = this._getActivePage();
    if (activePage) {
      activePage.groups = activePage.groups.filter((g) => g.id !== groupId);
      this.stateManager.save();
      this.renderAll();
    }
  }

  _removeSite(groupId, siteId) {
    const group = this._findGroup(groupId);
    if (group) {
      group.sites = group.sites.filter((s) => s.id !== siteId);
      this.stateManager.save();
      this.renderAll();
    }
  }

  _addSite(groupId, name, url, desc = "") {
    const group = this._findGroup(groupId);
    if (group) {
      group.sites.push({ id: `site-${Date.now()}`, name, url, desc });
      this.stateManager.save();
      this.renderAll();
    }
  }

  deleteCustomTemplate(templateId) {
    const state = this.stateManager.getState();
    if (state.customTemplates) {
      const initialLength = state.customTemplates.length;
      state.customTemplates = state.customTemplates.filter(t => t.id !== templateId);
      
      if (state.customTemplates.length < initialLength) {
        this.stateManager.save();
        this.ui.renderTemplates((template) => this._onSelectTemplate(template), this.mediaStorage);
      }
    }
  }

  _addGroup(targetColIndex) {
    const activePage = this._getActivePage();
    if (!activePage) return;
    
    const state = this.stateManager.getState();

    let targetCol = targetColIndex;
    if (targetCol === undefined) {
      const colCounts = new Array(state.settings.columnsCount || 6).fill(0);
      activePage.groups.forEach((g) => {
        if (g.column < colCounts.length) {
          colCounts[g.column]++;
        }
      });
      targetCol = colCounts.indexOf(Math.min(...colCounts));
    }

    const defaultTitle = this.ui.getTranslation("new_group_placeholder") || "New Group";
    const newId = `group-${Date.now()}`;
    activePage.groups.push({
      id: newId,
      title: defaultTitle,
      column: targetCol,
      order: 999,
      sites: [],
    });

    this.stateManager.sortGroups();
    this.stateManager.save();
    this.renderAll();
    return newId;
  }

  _findGroup(id) {
    return this._getActivePage()?.groups.find((g) => g.id === id);
  }

  _saveWidgetData(groupId, data) {
    const group = this._findGroup(groupId);
    if (group) {
      group.widgetData = data;
      this.stateManager.save();
    }
  }

  _openSiteModal(groupId) {
    const { inputs } = this.ui.elements;
    inputs.groupId.value = groupId;
    inputs.siteName.value = "";
    inputs.siteUrl.value = "";
    if (inputs.siteDesc) inputs.siteDesc.value = "";
    this.ui.toggleModal("site", true);
    inputs.siteName.focus();
  }

  _saveSite() {
    const { inputs } = this.ui.elements;
    const name = inputs.siteName.value.trim();
    let url = inputs.siteUrl.value.trim();
    const desc = inputs.siteDesc ? inputs.siteDesc.value.trim() : "";

    if (!name || !url)
      return alert(this.ui.getTranslation("site_name_url_required"));
    if (!url.startsWith("http://") && !url.startsWith("https://"))
      url = `https://${url}`;

    this._addSite(inputs.groupId.value, name, url, desc);
    this.ui.toggleModal("site", false);
  }

  _bindStaticEvents() {
    const { inputs, containers } = this.ui.elements;

    const addPageBtn = document.getElementById("addPageBtn");
    if (addPageBtn) {
      addPageBtn.addEventListener("click", () => this._addPage());
    }

    this._initSearchSuggestions();

    document.getElementById("customizeBtn").addEventListener("click", () => {
      const settings = this.stateManager.getState().settings;
      inputs.themeMode.checked = settings.themeMode === "light";
      inputs.primaryColor.value = settings.primaryColor;
      inputs.cardOpacity.value = settings.cardOpacity;

      const hexLabel = document.getElementById("colorHexLabel");
      if (hexLabel) hexLabel.value = settings.primaryColor.toUpperCase();

      this.originalCustomizeSettings = JSON.parse(JSON.stringify(settings));

      if (containers.opacityValue) {
        containers.opacityValue.textContent = `${Math.round(settings.cardOpacity * 100)}%`;
      }

      const labelStrong = containers.fileUploadLabel.querySelector("strong span") || containers.fileUploadLabel.querySelector("strong");
      const labelSpan = containers.fileUploadLabel.querySelector(".upload-sub-text");
      
      if (labelStrong) {
        labelStrong.textContent = settings.bgType.startsWith("local")
          ? this.ui.getTranslation("local_file_in_use")
          : this.ui.getTranslation("upload_bg");
      }
      if (labelSpan) {
        labelSpan.textContent = settings.bgType.startsWith("local")
          ? this.ui.getTranslation("custom_bg_active")
          : this.ui.getTranslation("upload_sub");
      }

      this.ui.updateUserMediaPreview(this.mediaStorage, settings);
      this.ui.toggleModal("customize", true);
    });

    const closeCustomizeX = document.getElementById("closeCustomizeX");
    if (closeCustomizeX) {
      closeCustomizeX.addEventListener("click", () =>
        this.ui.toggleModal("customize", false),
      );
    }

    document.getElementById("settingsBtn").addEventListener("click", () => {
      const settings = this.stateManager.getState().settings;
      if (inputs.colCount) inputs.colCount.value = settings.columnsCount || 6;
      if (inputs.cardSize) inputs.cardSize.value = settings.cardSize || 100;
      if (inputs.searchSize) inputs.searchSize.value = settings.searchSize || 100;
      if (inputs.simpleMode)
        inputs.simpleMode.checked = settings.simpleMode || false;
      if (inputs.openInNewTab)
        inputs.openInNewTab.checked = settings.openInNewTab || false;
      if (inputs.showSearchBar)
        inputs.showSearchBar.checked = settings.showSearchBar || false;
      if (inputs.enableHistorySearch)
        inputs.enableHistorySearch.checked = settings.enableHistorySearch !== false; // default true
      if (inputs.language) inputs.language.value = settings.language || "ar";
      if (inputs.hideScrollbar)
        inputs.hideScrollbar.checked = settings.hideScrollbar || false;
      if (containers.colCountValue)
        containers.colCountValue.textContent = settings.columnsCount || 6;
      if (containers.cardSizeValue)
        containers.cardSizeValue.textContent = (settings.cardSize || 100) + "%";
      if (containers.searchSizeValue)
        containers.searchSizeValue.textContent = (settings.searchSize || 100) + "%";

      if (containers.searchSizeControlWrap) {
        containers.searchSizeControlWrap.style.display = settings.showSearchBar ? "block" : "none";
      }

      this.ui.toggleModal("settings", true);
    });

    const closeSettingsX = document.getElementById("closeSettingsX");
    if (closeSettingsX) {
      closeSettingsX.addEventListener("click", () =>
        this.ui.toggleModal("settings", false),
      );
    }

    document.getElementById("templatesBtn").addEventListener("click", async () => {
      await this.ui.renderTemplates((template) => this._onSelectTemplate(template), this.mediaStorage);
      this.ui.toggleModal("templates", true);
    });

    const aboutBtn = document.getElementById("aboutBtn");
    if (aboutBtn) {
      aboutBtn.addEventListener("click", () => {
        this.ui.toggleModal("about", true);
      });
    }

    const closeAboutBtn = document.getElementById("closeAboutBtn");
    if (closeAboutBtn) {
      closeAboutBtn.addEventListener("click", () => {
        this.ui.toggleModal("about", false);
      });
    }

    const closeAboutX = document.getElementById("closeAboutX");
    if (closeAboutX) {
      closeAboutX.addEventListener("click", () => {
        this.ui.toggleModal("about", false);
      });
    }

    const exportDataBtn = document.getElementById("exportDataBtn");
    if (exportDataBtn) {
      exportDataBtn.addEventListener("click", () => this._exportData());
    }

    const importDataBtn = document.getElementById("importDataBtn");
    const importFileInput = document.getElementById("importFileInput");
    if (importDataBtn && importFileInput) {
      importDataBtn.addEventListener("click", () => importFileInput.click());
      importFileInput.addEventListener("change", (e) => this._importData(e));
    }

    inputs.bgFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const isVideo = file.type.startsWith("video/");
      const settings = this.stateManager.getState().settings;

      const labelStrong = document.querySelector("#fileUploadLabel strong span") || document.querySelector("#fileUploadLabel strong");
      const labelSpan = document.querySelector("#fileUploadLabel .upload-sub-text");

      if (labelStrong)
        labelStrong.textContent = this.ui.getTranslation("saving") || "جاري الحفظ...";
      if (labelSpan) labelSpan.textContent = file.name;

      document.getElementById("saveCustomizeBtn").disabled = true;
      await this.mediaStorage.saveMedia("customBg", file, isVideo);

      settings.bgType = isVideo ? "localVideo" : "localImage";
      settings.bgImage = "";

      document
        .querySelectorAll(".bg-preset-item")
        .forEach((el) => el.classList.remove("active"));
      if (labelStrong)
        labelStrong.textContent = this.ui.getTranslation("upload_success");
      document.getElementById("saveCustomizeBtn").disabled = false;

      await this.ui.updateUserMediaPreview(this.mediaStorage, settings);
    });

    document
      .getElementById("saveCustomizeBtn")
      .addEventListener("click", async () => {
        const settings = this.stateManager.getState().settings;
        settings.themeMode = inputs.themeMode.checked ? "light" : "dark";
        settings.primaryColor = inputs.primaryColor.value;
        settings.cardOpacity = parseFloat(inputs.cardOpacity.value);

        this.stateManager.save();
        await this.ui.applySettings(settings, this.mediaStorage);
        this.ui.toggleModal("customize", false);
        this.renderAll();
      });

    const saveAsTemplateBtn = document.getElementById("saveAsTemplateBtn");
    if (saveAsTemplateBtn) {
      saveAsTemplateBtn.addEventListener("click", () => {
        const templateName = prompt(this.ui.getTranslation("template_name_prompt") || "Enter template name:");
        if (!templateName) return;

        const state = this.stateManager.getState();
        const settings = state.settings;
        
        // Save current modifications first
        settings.themeMode = inputs.themeMode.checked ? "light" : "dark";
        settings.primaryColor = inputs.primaryColor.value;
        settings.cardOpacity = parseFloat(inputs.cardOpacity.value);
        
        const isVideo = settings.bgType === "localVideo" || settings.bgType === "videoUrl";
        
        state.customTemplates = state.customTemplates || [];
        state.customTemplates.unshift({
          id: `tem-custom-${Date.now()}`,
          name: templateName, // Will be used as fallback since translation for this dynamic id won't exist
          type: isVideo ? "video" : "image",
          // For local files we cannot easily keep a generic template if media is overwritten,
          // but for simple cases we just copy the settings.
          // Since bgImage holds preset url or video url, or it is a local file which relies on IndexedDB:
          url: settings.bgType.startsWith("local") ? "" : settings.bgImage,
          color: settings.primaryColor,
          opacity: settings.cardOpacity,
          theme: settings.themeMode,
          isCustom: true
        });

        // Add dynamic translation for this session
        const lang = settings.language || "ar";
        if (window.TRANSLATIONS) {
            window.TRANSLATIONS[lang] = window.TRANSLATIONS[lang] || {};
            window.TRANSLATIONS[lang][state.customTemplates[0].id] = templateName;
        }

        this.stateManager.save();
        alert(this.ui.getTranslation("upload_success") || "Saved successfully");
        this.ui.toggleModal("customize", false);
        this.ui.applySettings(settings, this.mediaStorage);
        this.renderAll();
      });
    }

    document
      .getElementById("cancelCustomizeBtn")
      .addEventListener("click", () => {
        if (this.originalCustomizeSettings) {
          const state = this.stateManager.getState();
          Object.assign(state.settings, this.originalCustomizeSettings);
        }
        this.ui.toggleModal("customize", false);
      });

    const closeX = document.getElementById("closeCustomizeX");
    if (closeX) {
      closeX.addEventListener("click", () => {
        if (this.originalCustomizeSettings) {
          const state = this.stateManager.getState();
          Object.assign(state.settings, this.originalCustomizeSettings);
        }
        this.ui.toggleModal("customize", false);
      });
    }

    inputs.cardOpacity.addEventListener("input", (e) => {
      const val = Math.round(parseFloat(e.target.value) * 100);
      if (containers.opacityValue)
        containers.opacityValue.textContent = `${val}%`;
    });

    inputs.primaryColor.addEventListener("input", (e) => {
      const hexLabel = document.getElementById("colorHexLabel");
      if (hexLabel) hexLabel.value = e.target.value.toUpperCase();
    });

    const hexInput = document.getElementById("colorHexLabel");
    if (hexInput) {
      hexInput.addEventListener("input", (e) => {
        let val = e.target.value;
        if (val.length === 7 && val.startsWith("#")) {
          inputs.primaryColor.value = val;
        }
      });
      hexInput.addEventListener("blur", (e) => {
        if (!e.target.value.startsWith("#")) {
          e.target.value = "#" + e.target.value.replace(/#/g, "");
        }
      });
    }

    document
      .getElementById("cancelSettingsBtn")
      .addEventListener("click", () => {
        this.ui.toggleModal("settings", false);
      });

    document.getElementById("saveSettingsBtn").addEventListener("click", () => {
      const settings = this.stateManager.getState().settings;
      if (inputs.colCount)
        settings.columnsCount = parseInt(inputs.colCount.value, 10);
      if (inputs.cardSize)
        settings.cardSize = parseInt(inputs.cardSize.value, 10);
      if (inputs.searchSize)
        settings.searchSize = parseInt(inputs.searchSize.value, 10);
      if (inputs.simpleMode) settings.simpleMode = inputs.simpleMode.checked;
      if (inputs.openInNewTab)
        settings.openInNewTab = inputs.openInNewTab.checked;
      if (inputs.showSearchBar)
        settings.showSearchBar = inputs.showSearchBar.checked;
      if (inputs.enableHistorySearch)
        settings.enableHistorySearch = inputs.enableHistorySearch.checked;
      if (inputs.language) settings.language = inputs.language.value;
      if (inputs.hideScrollbar)
        settings.hideScrollbar = inputs.hideScrollbar.checked;
      this.stateManager.save();
      this.ui.applySettings(settings, this.mediaStorage);
      this.renderAll();
      this.ui.toggleModal("settings", false);
    });

    if (inputs.showSearchBar) {
      inputs.showSearchBar.addEventListener("change", (e) => {
        if (containers.searchSizeControlWrap) {
          containers.searchSizeControlWrap.style.display = e.target.checked ? "block" : "none";
        }
      });
    }

    const resetBtn = document.getElementById("resetSettingsBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm(this.ui.getTranslation("reset_confirm"))) {
          const settings = this.stateManager.getState().settings;
          // Core defaults
          settings.columnsCount = 6;
          settings.cardSize = 100;
          settings.searchSize = 100;
          settings.simpleMode = true;
          settings.openInNewTab = false;
          settings.showSearchBar = true;
          settings.enableHistorySearch = true;
          settings.language = 'en';
          
          // Background/Appearance defaults
          settings.themeMode = 'dark';
          settings.primaryColor = '#FF2E32';
          settings.cardOpacity = 0.1;
          settings.bgType = 'videoUrl';
          settings.bgImage = 'backgrounds/1111.mp4';

          // Update inputs if they exist
          if (inputs.simpleMode) inputs.simpleMode.checked = true;
          if (inputs.openInNewTab) inputs.openInNewTab.checked = false;
          if (inputs.showSearchBar) inputs.showSearchBar.checked = true;
          if (inputs.enableHistorySearch) inputs.enableHistorySearch.checked = true;
          if (inputs.language) inputs.language.value = 'en';
          if (inputs.hideScrollbar) inputs.hideScrollbar.checked = false;
          
          this.stateManager.save();
          this.ui.applySettings(settings, this.mediaStorage);
          this.renderAll();
          this.ui.toggleModal("settings", false);
        }
      });
    }

    if (inputs.colCount) {
      inputs.colCount.addEventListener("input", (e) => {
        if (containers.colCountValue)
          containers.colCountValue.textContent = e.target.value;
      });
    }

    if (inputs.cardSize) {
      inputs.cardSize.addEventListener("input", (e) => {
        if (containers.cardSizeValue)
          containers.cardSizeValue.textContent = e.target.value + "%";
      });
    }

    if (inputs.searchSize) {
      inputs.searchSize.addEventListener("input", (e) => {
        if (containers.searchSizeValue)
          containers.searchSizeValue.textContent = e.target.value + "%";
      });
    }

    document
      .getElementById("saveSiteBtn")
      .addEventListener("click", () => this._saveSite());
    document
      .getElementById("cancelSiteBtn")
      .addEventListener("click", () => this.ui.toggleModal("site", false));
    const cancelTemplates = document.getElementById("cancelTemplatesBtn");
    if (cancelTemplates) {
      cancelTemplates.addEventListener("click", () =>
        this.ui.toggleModal("templates", false),
      );
    }

    const closeTemplatesX = document.getElementById("closeTemplatesX");
    if (closeTemplatesX) {
      closeTemplatesX.addEventListener("click", () =>
        this.ui.toggleModal("templates", false),
      );
    }

    document.addEventListener(
      "click",
      () => {
        this.ui.closeDropdowns();
        // Resume video if it was blocked by autoplay policy
        if (this.ui.elements.bgVideo && this.ui.elements.bgVideo.paused) {
          this.ui.elements.bgVideo.play().catch((e) => {});
        }
      },
      { once: false },
    );

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          const closeBtn = overlay.querySelector('#closeCustomizeX, #closeSettingsX, #closeTemplatesX, #closeAboutX, #cancelSiteBtn');
          if (closeBtn) closeBtn.click();
        }
      });
    });

    // Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
      // Don't trigger if focus is in an input/textarea/editable
      const activeEl = document.activeElement;
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName) || activeEl.isContentEditable;
      if (isInput) return;

      // Group shortcut: Alt + G (New Group)
      if (e.altKey && (e.key === "g" || e.key === "ل")) {
        e.preventDefault();
        this._addGroup();
      }

      // Shortcut: Alt + S (Add current tab only)
      if (e.altKey && (e.key === "s" || e.key === "س")) {
        e.preventDefault();
        this._addCurrentTab();
      }

      // Shortcut: Alt + A (Collect all open tabs into a group)
      if (e.altKey && (e.key === "a" || e.key === "ش")) {
        e.preventDefault();
        this._addAllTabsToGroup();
      }
    });
  }

  _onSelectPreset(preset, elementToActivate) {
    const settings = this.stateManager.getState().settings;
    const { inputs, containers } = this.ui.elements;

    settings.bgType = "preset";
    settings.bgImage = preset.url;
    settings.primaryColor = preset.color;
    settings.themeMode = preset.theme;

    const labelStrong = containers.fileUploadLabel.querySelector("strong span") || containers.fileUploadLabel.querySelector("strong");
    if (labelStrong) {
        labelStrong.textContent = this.ui.getTranslation("upload_bg");
    }
    inputs.bgFile.value = "";

    document
      .querySelectorAll(".bg-preset-item")
      .forEach((el) => el.classList.remove("active"));
    elementToActivate.classList.add("active");

    inputs.primaryColor.value = preset.color;
    inputs.themeMode.checked = preset.theme === "light";
  }

  async _onSelectTemplate(template) {
    const settings = this.stateManager.getState().settings;

    if (template.isCustom) {
        // Handle custom template which might be local file conceptually.
        // Actually, for local file custom templates, we need to handle media properly.
        // If url is empty, it meant it was a local file when saved. 
        // We'll trust whatever is in indexeddb customBg is still there.
        settings.bgType = template.type === "video" 
            ? (template.url ? "videoUrl" : "localVideo")
            : (template.url ? "preset" : "localImage");
    } else {
        settings.bgType = template.type === "video" ? "videoUrl" : "preset";
    }

    settings.bgImage = template.url || "";
    settings.primaryColor = template.color;
    settings.cardOpacity = template.opacity;
    settings.themeMode = template.theme;

    this.stateManager.save();
    await this.ui.applySettings(settings, this.mediaStorage);
    this.ui.toggleModal("templates", false);
    this.renderAll();
  }

  _initDragAndDrop() {
    if (typeof Sortable === "undefined") return;

    if (this.sortableInstances && this.sortableInstances.length > 0) {
      this.sortableInstances.forEach((instance) => instance.destroy());
    }
    this.sortableInstances = [];

    document.querySelectorAll(".board-column").forEach((col) => {
      const sortableInstance = new Sortable(col, {
        group: "sharedColumns",
        animation: 150,
        // Normal groups: drag from header. Widgets: drag from their content area (covers the whole card)
        handle: ".group-header, .clock-widget, .text-widget-content",
        ghostClass: "sortable-ghost",
        filter: ".add-group-placeholder, .text-widget-editor",
        preventOnFilter: false,
        onStart: () => document.body.classList.add("dragging-active"),
        onEnd: (evt) => {
          document.body.classList.remove("dragging-active");
          const newColIndex = parseInt(evt.to.dataset.colIndex, 10);
          const group = this._findGroup(evt.item.dataset.id);

          if (group) {
            group.column = newColIndex;

            let orderTracker = 0;
            document.querySelectorAll(".board-column").forEach((c, cIdx) => {
              Array.from(c.children).forEach((child) => {
                const g = this._findGroup(child.dataset.id);
                if (g) {
                  g.column = cIdx;
                  g.order = orderTracker++;
                }
              });
            });

            this.stateManager.sortGroups();
            this.stateManager.save();
          }
        },
      });
      this.sortableInstances.push(sortableInstance);
    });

    document.querySelectorAll(".site-list").forEach((list) => {
      const siteSortableInstance = new Sortable(list, {
        group: "sharedSites",
        animation: 150,
        ghostClass: "sortable-ghost",
        delay: 150,
        delayOnTouchOnly: true,
        onStart: () => document.body.classList.add("dragging-active"),
        onEnd: (evt) => {
          document.body.classList.remove("dragging-active");
          const fromGroup = this._findGroup(evt.from.dataset.groupId);
          const toGroup = this._findGroup(evt.to.dataset.groupId);

          if (fromGroup && toGroup) {
            const [movedItem] = fromGroup.sites.splice(evt.oldIndex, 1);
            toGroup.sites.splice(evt.newIndex, 0, movedItem);
            this.stateManager.save();
          }
        },
      });
      this.sortableInstances.push(siteSortableInstance);
    });

    const pagesTabsContainer = document.getElementById("pagesTabs");
    if (pagesTabsContainer) {
      const tabsSortableInstance = new Sortable(pagesTabsContainer, {
        animation: 150,
        ghostClass: "sortable-ghost",
        delay: 150,
        delayOnTouchOnly: true,
        onEnd: (evt) => {
          const state = this.stateManager.getState();
          const pages = state.pages;
          const movedPage = pages.splice(evt.oldIndex, 1)[0];
          pages.splice(evt.newIndex, 0, movedPage);
          this.stateManager.save();
          // No need to re-render all here, it's just tabs
        },
      });
      this.sortableInstances.push(tabsSortableInstance);
    }
  }

  _exportData() {
    const state = this.stateManager.getState();
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'controltap-backup-' + new Date().toISOString().slice(0, 10) + '.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  _importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedState = JSON.parse(e.target.result);
        
        // Basic validation: must have pages or settings
        if (!importedState.pages && !importedState.settings) {
          throw new Error("Invalid structure");
        }

        // Update state and save
        this.stateManager.state = importedState;
        this.stateManager._normalizeState();
        this.stateManager.save();

        alert(this.ui.getTranslation("import_success"));
        window.location.reload(); // Hard reload to apply all settings/state correctly
      } catch (err) {
        console.error("Import failed", err);
        alert(this.ui.getTranslation("import_error"));
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  }

  /**
   * Shows a toast notification at the bottom of the screen.
   */
  _showToast(message, duration = 2500) {
    let toast = document.getElementById('shortcut-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'shortcut-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  /**
   * Alt + S: Add the most recently accessed real tab as a site in a new group.
   * Since the user is on the new tab page (extension page), the "active" tab
   * is the extension itself. We find the last real tab the user was on instead.
   */
  async _addCurrentTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      console.warn('chrome.tabs API not available');
      return;
    }
    try {
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      // Filter out internal browser and extension pages
      const realTabs = allTabs.filter(t =>
        t.url &&
        !t.url.startsWith('chrome://') &&
        !t.url.startsWith('chrome-extension://') &&
        !t.url.startsWith('about:') &&
        !t.url.startsWith('edge://')
      );

      if (realTabs.length === 0) {
        this._showToast(this.ui.getTranslation('no_valid_tab') || 'No valid tab to add');
        return;
      }

      // Pick the most recently accessed tab
      const targetTab = realTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];

      const siteName = targetTab.title || new URL(targetTab.url).hostname;
      const groupId = this._addGroup();
      if (groupId) {
        const group = this._findGroup(groupId);
        if (group) {
          group.title = siteName;
          group.sites.push({
            id: `site-${Date.now()}`,
            name: siteName,
            url: targetTab.url,
            desc: ''
          });
          this.stateManager.save();
          this.renderAll();
        }
      }
      this._showToast(this.ui.getTranslation('tab_added') || `✓ Added: ${siteName}`);
    } catch (err) {
      console.error('Failed to add current tab:', err);
    }
  }

  /**
   * Alt + A: Collect ALL open tabs in the current window and put them into a single new group.
   */
  async _addAllTabsToGroup() {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      console.warn('chrome.tabs API not available');
      return;
    }
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      // Filter out chrome:// and extension pages
      const validTabs = tabs.filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'));
      if (validTabs.length === 0) {
        this._showToast(this.ui.getTranslation('no_valid_tabs') || 'No valid tabs to collect');
        return;
      }
      const groupId = this._addGroup();
      if (groupId) {
        const group = this._findGroup(groupId);
        if (group) {
          const dateStr = new Date().toLocaleDateString();
          group.title = (this.ui.getTranslation('collected_tabs') || 'Collected Tabs') + ` (${validTabs.length})`;
          validTabs.forEach(tab => {
            group.sites.push({
              id: `site-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: tab.title || new URL(tab.url).hostname,
              url: tab.url,
              desc: ''
            });
          });
          this.stateManager.save();
          this.renderAll();
        }
      }
      this._showToast((this.ui.getTranslation('tabs_collected') || `✓ Collected ${validTabs.length} tabs`).replace('{count}', validTabs.length));
    } catch (err) {
      console.error('Failed to collect tabs:', err);
    }
  }

  _initSearchSuggestions() {
    const searchInput = document.getElementById("searchInput");
    const suggestionsBox = document.getElementById("searchSuggestions");
    if (!searchInput || !suggestionsBox) return;

    let selectedIndex = -1;
    let currentSuggestions = [];
    let debounceTimer;

    const performAction = (suggestion) => {
      if (!suggestion) return;
      const currentSettings = this.stateManager.getState().settings;
      const target = currentSettings.openInNewTab ? "_blank" : "_self";
      
      if (suggestion.type === "site" || suggestion.type === "exact_site" || suggestion.type === "history") {
        window.open(suggestion.url, target);
      } else {
        const query = suggestion.text.trim();
        
        // Regex to check if it looks like a URL (starts with protocol or is a domain.tld)
        const isUrl = /^https?:\/\//i.test(query) || 
                      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}(:\d+)?(\/.*)?$/i.test(query);

        if (isUrl) {
          const finalUrl = /^https?:\/\//i.test(query) ? query : `https://${query}`;
          window.open(finalUrl, target);
        } else {
          // It's a search term
          const state = this.stateManager.getState();
          state.searchHistory = state.searchHistory || [];
          state.searchHistory = state.searchHistory.filter(h => h !== query);
          state.searchHistory.unshift(query);
          if (state.searchHistory.length > 10) state.searchHistory.pop();
          this.stateManager.save();
          
          const encodedQuery = encodeURIComponent(query);
          window.open(`https://www.google.com/search?q=${encodedQuery}`, target);
        }
      }

      if (!currentSettings.openInNewTab) {
        searchInput.value = "";
        suggestionsBox.classList.add("hidden");
      } else {
        suggestionsBox.classList.add("hidden");
      }
    };

    const handleInput = async () => {
      const query = searchInput.value.trim();
      currentSuggestions = await this.searchEngine.getSuggestions(query);
      selectedIndex = -1;
      this.ui.renderSearchSuggestions(currentSuggestions, selectedIndex, performAction);
    };

    searchInput.addEventListener("focus", handleInput);

    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleInput, 150);
    });

    searchInput.addEventListener("keydown", (e) => {
      if (suggestionsBox.classList.contains("hidden")) {
        if (e.key === "Enter" && searchInput.value.trim()) {
           performAction({ type: "search", text: searchInput.value.trim(), url: "search_action" });
        }
        return;
      }

      if (currentSuggestions.length === 0 && e.key === "Enter") {
        e.preventDefault();
        if (searchInput.value.trim()) {
          performAction({ type: "search", text: searchInput.value.trim(), url: "search_action" });
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % currentSuggestions.length;
        this.ui.updateSearchSelection(selectedIndex);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
        this.ui.updateSearchSelection(selectedIndex);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < currentSuggestions.length) {
          performAction(currentSuggestions[selectedIndex]);
        } else {
          performAction(currentSuggestions[0] || { type: "search", text: searchInput.value.trim(), url: "search_action" });
        }
      } else if (e.key === "Escape") {
        suggestionsBox.classList.add("hidden");
        selectedIndex = -1;
        searchInput.blur();
      }
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box-container")) {
        suggestionsBox.classList.add("hidden");
      }
    });
  }
}
