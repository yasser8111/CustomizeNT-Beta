/**
 * UIManager
 * Only concerns itself with reading state and updating the DOM visually.
 * Emits events via callbacks that the Controller listens to.
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
        colCount: document.getElementById("colCountInput"),
        cardSize: document.getElementById("cardSizeInput"),
        searchSize: document.getElementById("searchSizeInput"),
        simpleMode: document.getElementById("simpleModeInput"),
        openInNewTab: document.getElementById("openInNewTabInput"),
        showSearchBar: document.getElementById("showSearchBarInput"),
        enableHistorySearch: document.getElementById("enableHistorySearchInput"),
        language: document.getElementById("languageInput"),
        hideScrollbar: document.getElementById("hideScrollbarInput"),
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

  async applySettings(settings, mediaStorage) {
    const root = document.documentElement;
    const lang = settings.language || "ar";
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    this.applyTranslations(lang);

    root.style.setProperty("--primary-color", settings.primaryColor);
    
    // Convert hex to rgb for transparency usage
    const hex = settings.primaryColor.replace('#', '');
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
    document.body.className = `${settings.themeMode}-theme`;
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

  async updateUserMediaPreview(mediaStorage, currentSettings) {
    const container = this.elements.containers.userMediaPreview;
    if (!container) return;

    const settings =
      currentSettings || window.App?.stateManager?.getState()?.settings;
    if (!settings) return;

    container.innerHTML = "";

    if (settings.bgType === "videoUrl") {
      const video = document.createElement("video");
      video.src = settings.bgImage;
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      container.appendChild(video);
      return;
    }

    if (settings.bgType === "preset") {
      const img = document.createElement("div");
      img.className = "preview-img-box";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.backgroundImage = `url('${settings.bgImage}')`;
      img.style.backgroundSize = "cover";
      img.style.backgroundPosition = "center";
      container.appendChild(img);
      return;
    }

    const media = await mediaStorage.loadMedia("customBg");
    if (!media || !media.file) {
      container.innerHTML = `<span style="font-size: 12px; opacity: 0.5;">${this.getTranslation("no_bg")}</span>`;
      return;
    }

    const url = URL.createObjectURL(media.file);

    if (media.isVideo) {
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      container.appendChild(video);
    } else {
      const img = document.createElement("div");
      img.className = "preview-img-box";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.backgroundImage = `url('${url}')`;
      img.style.backgroundSize = "cover";
      img.style.backgroundPosition = "center";
      container.appendChild(img);
    }
  }

  getFavicon(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return `https://www.google.com/s2/favicons?domain=google.com&sz=64`;
    }
  }

  async renderTemplates(onSelectTemplate, mediaStorage) {
    const grid = document.getElementById("templatesGrid");
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
    const customTemplates = state?.customTemplates || [];

    const allTemplates = [...customTemplates, ...UI_TEMPLATES];

    // Add 'Create Template' card
    const createItem = document.createElement("div");
    createItem.className = "template-item add-template-card";
    createItem.style.border = "2px dashed var(--primary-color)";
    createItem.style.background = "rgba(var(--card-bg-rgb), 0.05)";
    createItem.style.display = "flex";
    createItem.style.flexDirection = "column";
    createItem.style.alignItems = "center";
    createItem.style.justifyContent = "center";
    createItem.style.gap = "12px";
    createItem.innerHTML = `
      <i data-lucide="plus-circle" width="36" height="36" style="color: var(--primary-color);"></i>
      <span style="font-weight: 700; color: var(--text-color); font-size: 16px;">${this.getTranslation("create_custom_template") || "إنشاء قالب خاص"}</span>
    `;
    createItem.addEventListener("click", () => {
      this.toggleModal("templates", false);
      this.toggleModal("customize", true);
    });
    grid.appendChild(createItem);

    allTemplates.forEach((template) => {
      const item = document.createElement("div");
      item.className = "template-item";

      const templateName =
        this.getTranslation(template.id) !== template.id
          ? this.getTranslation(template.id)
          : template.name || template.id;

      item.setAttribute(
        "aria-label",
        `${this.getTranslation("aria_template")} ${templateName}`,
      );

      let isVideo = template.type === "video";
      let renderUrl = template.url;

      if (template.isCustom && !template.url && customMediaBlobUrl) {
        renderUrl = customMediaBlobUrl;
        isVideo = customMediaIsVideo;
      }

      const previewContent = isVideo
        ? `<video src="${renderUrl || ""}" muted loop playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>`
        : `<img src="${renderUrl || ""}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" alt="${templateName}" />`;

      const badgeText = isVideo
        ? this.getTranslation("video_badge")
        : this.getTranslation("image_badge");
      const themeText =
        template.theme === "dark"
          ? this.getTranslation("theme_dark")
          : this.getTranslation("theme_light");

      const deleteBtnStr = template.isCustom 
        ? `<button class="delete-template-btn" data-id="${template.id}" title="${this.getTranslation('delete_template') || 'حذف القالب'}">
             <i data-lucide="trash-2" width="16" height="16"></i>
           </button>`
        : '';

      item.innerHTML = `
                <div class="template-preview" style="background: ${template.color};">
                    ${previewContent}
                    ${deleteBtnStr}
                    <div class="template-overlay">
                        <span class="template-name-minimal">${templateName}</span>
                        <div class="template-badges-row">
                            <span class="template-badge-minimal">${badgeText}</span>
                            <span class="template-badge-minimal">${themeText}</span>
                        </div>
                    </div>
                </div>
            `;

      if (template.isCustom) {
        const delBtn = item.querySelector('.delete-template-btn');
        if (delBtn) {
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(this.getTranslation('delete_template_confirm') || 'هل أنت متأكد من حذف هذا القالب؟')) {
               if (window.App) window.App.deleteCustomTemplate(template.id);
            }
          });
        }
      }

      // Hover to play/pause video logic
      if (isVideo) {
        const video = item.querySelector("video");
        item.addEventListener("mouseenter", () => {
          video.play().catch((e) => console.warn("Video play error:", e));
        });
        item.addEventListener("mouseleave", () => {
          video.pause();
        });
      }

      item.addEventListener("click", () => onSelectTemplate(template));
      grid.appendChild(item);
    });

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

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

      // Edit and Delete buttons for pages
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
      lucide.createIcons();
    }
  }

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

    // Dynamic add-group placeholder on hover (JS-driven)
    columns.forEach((colEl, i) => {
      let placeholder = null;

      const createPlaceholder = () => {
        // Don't show if dragging is active or already exists
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
        if (typeof lucide !== "undefined") lucide.createIcons();
        requestAnimationFrame(() => placeholder?.classList.add("visible"));
      };

      const removePlaceholder = () => {
        if (placeholder) {
          placeholder.remove();
          placeholder = null;
        }
      };

      // Use a single delegated listener for cleaner logic
      colEl.addEventListener("mousemove", (e) => {
        // If we are over a group-card, remove placeholder
        if (e.target.closest(".group-card")) {
          removePlaceholder();
        } else if (!placeholder) {
          // If we are over the column empty space, create it
          createPlaceholder();
        }
      });

      colEl.addEventListener("mouseleave", () => {
        removePlaceholder();
      });
    });

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  _createGroupElement(group, actions) {
    const groupEl = document.createElement("div");
    groupEl.className = "group-card";
    groupEl.dataset.id = group.id;

    // Delegate to WidgetManager if this group is a widget
    const widgetType = this.widgetManager.detect(group);

    if (widgetType) {
      this.widgetManager.render(widgetType, group, groupEl, actions, this);
    } else {
      // Standard Group Rendering
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
        document.execCommand("selectAll", false, null);
      });
      titleEl.addEventListener("blur", (e) => {
        titleEl.contentEditable = false;
        const defaultTitle =
          this.getTranslation("new_group_placeholder") || "New Group";
        const newTitle = e.target.textContent.trim() || defaultTitle;
        actions.onRenameGroup(group.id, newTitle);
      });

      headerEl.appendChild(titleEl);
      headerEl.appendChild(this._createGroupSettingsDropdown(group, actions));
      groupEl.appendChild(headerEl);

      const listEl = document.createElement("div");
      listEl.className = "site-list";
      listEl.dataset.groupId = group.id;

      group.sites.forEach((site) => {
        listEl.appendChild(this._createSiteElement(site, group.id, actions));
      });

      const addSiteBtn = document.createElement("button");
      addSiteBtn.className = "add-site-btn";
      addSiteBtn.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <i data-lucide="square-plus" width="14" height="14" stroke-width="2"></i>
                  <span data-i18n="add_site">${this.getTranslation("add_site")}</span>
              </div>
          `;
      addSiteBtn.addEventListener("click", () =>
        actions.onOpenAddSiteModal(group.id),
      );

      groupEl.appendChild(listEl);
      groupEl.appendChild(addSiteBtn);
    }

    return groupEl;
  }

  _createGroupSettingsDropdown(group, actions, widgetType = null) {
    const wrap = document.createElement("div");
    wrap.className = "group-settings-wrap";

    const triggerBtn = document.createElement("button");
    triggerBtn.className = "group-settings-btn";
    triggerBtn.setAttribute("aria-label", this.getTranslation("group_options"));
    triggerBtn.innerHTML =
      '<i data-lucide="ellipsis-vertical" width="16" height="16" stroke-width="1.5" aria-hidden="true"></i>';

    const dropdown = document.createElement("div");
    dropdown.className = "group-dropdown";

    const renameBtn = document.createElement("button");
    renameBtn.innerHTML = `<i data-lucide="pencil" width="14" height="14" stroke-width="1.5"></i> ${this.getTranslation("rename_group_btn")}`;
    renameBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.remove("show");
      
      // Trigger the title editing directly
      const groupCard = dropdown.closest(".group-card");
      const titleEl = groupCard.querySelector(".group-title");
      if (titleEl) {
        titleEl.contentEditable = true;
        titleEl.focus();
        document.execCommand("selectAll", false, null);
      }
    });

    const delBtn = document.createElement("button");
    delBtn.className = "delete-dropdown-btn";
    delBtn.innerHTML = `<i data-lucide="trash" width="14" height="14" stroke-width="1.5"></i> ${this.getTranslation("delete_group_btn")}`;
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(this.getTranslation("delete_group_confirm"))) {
        actions.onDeleteGroup(group.id);
      }
    });

    if (widgetType) {
      // Clock Widget Buttons
      const toggleClockBtn = document.createElement("button");
      const isAnalog = widgetType === "analog";
      const btnText = isAnalog ? this.getTranslation("convert to digital") : this.getTranslation("convert to analog");
      toggleClockBtn.innerHTML = `<i data-lucide="${isAnalog ? "clock-4" : "clock"}" width="14" height="14" stroke-width="1.5"></i> ${btnText}`;
      toggleClockBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        actions.onRenameGroup(group.id, isAnalog ? "ساعة رقمية" : "ساعة");
        dropdown.classList.remove("show");
      });
      dropdown.appendChild(toggleClockBtn);
      dropdown.appendChild(delBtn);
    } else {
      // Normal Group Buttons
      dropdown.appendChild(renameBtn);
      dropdown.appendChild(delBtn);
    }

    wrap.appendChild(triggerBtn);
    wrap.appendChild(dropdown);

    triggerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".group-dropdown.show").forEach((d) => {
        if (d !== dropdown) d.classList.remove("show");
      });
      dropdown.classList.toggle("show");
    });

    return wrap;
  }

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
    iconEl.src = this.getFavicon(site.url);
    iconEl.alt = `${site.name} icon`;
    iconEl.width = 16;
    iconEl.height = 16;
    iconEl.loading = "lazy";

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

    const delSiteBtn = document.createElement("button");
    delSiteBtn.className = "delete-site-btn";
    delSiteBtn.setAttribute(
      "aria-label",
      `${this.getTranslation("delete_site_aria")} ${site.name}`,
    );
    delSiteBtn.innerHTML =
      '<i data-lucide="x" width="14" height="14" stroke-width="2" aria-hidden="true"></i>';
    delSiteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      actions.onDeleteSite(groupId, site.id);
    });

    siteEl.appendChild(iconEl);
    siteEl.appendChild(contentWrap);
    siteEl.appendChild(delSiteBtn);

    return siteEl;
  }

  closeDropdowns() {
    document
      .querySelectorAll(".group-dropdown.show")
      .forEach((d) => d.classList.remove("show"));
  }

  toggleModal(modalKey, isVisible) {
    const modal = this.elements.modals[modalKey];
    if (modal) {
      modal.style.display = isVisible ? "flex" : "none";
    }
  }

  renderSearchSuggestions(suggestions, selectedIndex, performAction) {
    const { searchBarWrapper } = this.elements.containers;
    const suggestionsBox = document.getElementById("searchSuggestions");
    
    suggestionsBox.innerHTML = "";
    if (!suggestions || suggestions.length === 0) {
      if (searchBarWrapper) {
          const query = document.getElementById("searchInput").value.trim();
          if (query) {
             suggestionsBox.innerHTML = `
                <div style="padding: 16px; text-align: center; color: var(--text-color); opacity: 0.6; font-size: 13px;">
                   <i data-lucide="search-x" width="24" height="24" style="margin-bottom: 8px; display: inline-block;"></i><br/>
                   ${this.getTranslation("no_search_results") || "لم يتم العثور على نتائج"}
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

    suggestions.forEach((sug, index) => {
      const div = document.createElement("div");
      div.className = "suggestion-item" + (index === selectedIndex ? " selected" : "");
      
      let icon = "search";
      if (sug.type === "history" || sug.type === "search_history") icon = "history";
      if (sug.type === "site") icon = "globe";
      if (sug.type === "exact_site") icon = "star"; // Exact match highlight

      let subText = "";
      if (sug.url && sug.url !== "search_action") {
         subText = `<span class="suggestion-url" style="font-size: 11px; opacity: 0.45; margin-inline-start: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; min-width: 0;">${sug.url}</span>`;
      }

      // Highlight match
      const query = document.getElementById("searchInput").value.trim();
      let highlightedText = sug.text;
      if (query && sug.type !== "search") {
         const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
         const regex = new RegExp(`(${escapedQuery})`, 'gi');
         highlightedText = sug.text.replace(regex, '<span style="color: var(--primary-color); font-weight: bold;">$1</span>');
      }

      div.innerHTML = `<div style="display: flex; align-items: center; width: 100%; overflow: hidden;"><i data-lucide="${icon}" width="14" height="14" style="flex-shrink: 0; opacity: 0.6;"></i><span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; min-width: 0; margin-inline-start: 12px; font-weight: 500;">${highlightedText}</span>${subText}</div>`;
      div.addEventListener("click", () => performAction(sug));
      div.addEventListener("mouseenter", () => {
         const items = suggestionsBox.querySelectorAll(".suggestion-item");
         items.forEach(el => el.classList.remove("selected"));
         div.classList.add("selected");
      });
      suggestionsBox.appendChild(div);
    });
    
    if (typeof lucide !== "undefined") lucide.createIcons();
    suggestionsBox.classList.remove("hidden");
    
    // Initial scroll sync
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
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (index === items.length - 1) {
        // Absolutely at the bottom
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else if (itemRect.top < containerRect.top) {
        // Scrolling UP: it's clipped at the top. Scroll up by the exact hidden distance.
        const hiddenAmount = containerRect.top - itemRect.top;
        container.scrollBy({ top: -(hiddenAmount + 4), behavior: 'smooth' }); // small 4px top gap
      } else if (itemRect.bottom > containerRect.bottom) {
        // Scrolling DOWN: it's clipped at the bottom. Scroll down by the exact hidden distance.
        const hiddenAmount = itemRect.bottom - containerRect.bottom;
        container.scrollBy({ top: hiddenAmount + 12, behavior: 'smooth' }); // 12px bottom space
      }
    }
  }
}
