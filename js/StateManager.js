/**
 * StateManager
 * Interacts with LocalStorage and manages application settings/records.
 */
class StateManager {
  constructor() {
    this.state = this._loadState();
    this._normalizeState();
  }

  _loadState() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Failed to parse state", e);
      return null;
    }
  }

  _normalizeState() {
    if (!this.state) {
      this.state = {
        settings: {
          bgType: "videoUrl",
          bgImage: "backgrounds/1111.mp4",
          primaryColor: "#FF2E32",
          cardOpacity: 0.1,
          themeMode: "dark",
          columnsCount: 6,
          cardSize: 100,
          simpleMode: true,
          openInNewTab: false,
          language: "en",
          showSearchBar: true,
          searchSize: 100
        },
        pages: [
          {
            id: "page-1775807211776",
            title: "Home",
            groups: [
              {
                id: "group-1775810788757",
                title: "ساعة رقمية",
                column: 0,
                order: 0,
                sites: []
              },
              {
                id: "group-1775807409644",
                title: "My Websites",
                column: 5,
                order: 1,
                sites: [
                  {
                    id: "site-1775817256443",
                    name: "Google",
                    url: "https://www.google.com",
                    desc: "It is Google :>"
                  },
                  {
                    id: "site-1775818719399",
                    name: "Github",
                    url: "https://github.com/yasser8111",
                    desc: "My Profile."
                  }
                ]
              }
            ]
          },
          {
            id: "page-1775818411308",
            title: "New Page",
            groups: []
          }
        ],
        activePageId: "page-1775807211776",
        customTemplates: [
          {
            id: "tem-custom-1775776037938",
            name: "Yasser",
            type: "video",
            url: "",
            color: "#3b82f6",
            opacity: 0.5,
            theme: "dark",
            isCustom": true
          }
        ]
      };
    }

    if (this.state.groups && !this.state.pages) {
      this.state.pages = [
        {
          id: `page-home`,
          title: "Home",
          groups: this.state.groups
        }
      ];
      this.state.activePageId = `page-home`;
      delete this.state.groups;
    }

    this.state.customTemplates ??= [];

    this.state.settings.bgType ??= "preset";
    this.state.settings.themeMode ??= "light";
    if (this.state.settings.cardOpacity === "0.8") {
      this.state.settings.cardOpacity = "0.25";
    }
    this.state.settings.columnsCount ??= 6;
    this.state.settings.cardSize ??= 100;
    this.state.settings.searchSize ??= 100;
    this.state.settings.simpleMode ??= false;
    this.state.settings.openInNewTab ??= false;
    this.state.settings.showSearchBar ??= false;
    this.state.settings.language ??= "en";

    const colCount = this.state.settings.columnsCount;
    this.state.pages.forEach(page => {
      page.groups.forEach((g, i) => {
        g.column ??= i % colCount;
        if (g.column >= colCount) {
          g.column = colCount - 1;
        }
        g.order ??= i;
      });
    });

    this.sortGroups();
  }

  sortGroups() {
    this.state.pages.forEach(page => {
      page.groups.sort((a, b) => {
        return a.column === b.column ? a.order - b.order : a.column - b.column;
      });
    });
  }

  save() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state));
  }

  getState() {
    return this.state;
  }
}
