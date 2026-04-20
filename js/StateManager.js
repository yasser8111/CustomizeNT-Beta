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
          bgType: "preset",
          bgImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
          primaryColor: "#4A90E2",
          cardOpacity: 0.15,
          themeMode: "dark",
          columnsCount: 6,
          cardSize: 100,
          simpleMode: false,
          openInNewTab: false,
          language: "en",
          showSearchBar: true,
          searchSize: 100,
          hideScrollbar: false,
          enableHistorySearch: false,
          hideDescription: false,
          iconOnlyMode: false,
          siteDirection: "auto",
          hideBorders: false,
          hideIconBg: false
        },
        pages: [
          {
            id: "page-1775807211776",
            title: "Home",
            groups: [
              {
                id: "group-1775835687689",
                title: "google",
                column: 0,
                order: 0,
                sites: [
                  {
                    id: "site-1775817256443",
                    name: "Google",
                    url: "https://www.google.com",
                    desc: "It is Google :>"
                  },
                  {
                    id: "site-1775902280747",
                    name: "YouTube",
                    url: "https://www.youtube.com/",
                    desc: "And It's YouTube to :>"
                  },
                  {
                    id: "site-1775835729833",
                    name: "Google music",
                    url: "https://music.youtube.com/",
                    desc: "for Music !!!"
                  }
                ]
              },
              {
                id: "group-1775839008935",
                title: "text",
                column: 0,
                order: 1,
                sites: [],
                widgetData: {
                  text: "# Shortcuts\nAlt + G: Add Group.\nAlt + S: Save Tab. \nAlt + A: Group All Tabs. \n\n# Widget Types\nanalog_clock\ndigital_clockClock. \ntext/note"
                }
              },
              {
                id: "group-1775839457845",
                title: "digital_clock",
                column: 5,
                order: 2,
                sites: []
              },
              {
                id: "group-1775839440815",
                title: "analog_clock",
                column: 5,
                order: 3,
                sites: []
              }
            ]
          }
        ],
        activePageId: "page-1775807211776",
        customTemplates: [],
        searchHistory: [
          "مسلسل الخلاص",
          "اليمن تقرأ",
          "dwa",
          "NoteLM",
          "chrome://extensions",
          "chrome://extensions.",
          "yasser811.vercel.app",
          "m"
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
    this.state.searchHistory ??= [];

    this.state.settings.bgType ??= "preset";
    this.state.settings.themeMode ??= "light";
    if (this.state.settings.cardOpacity === "0.8") {
      this.state.settings.cardOpacity = 0.25;
    }
    this.state.settings.columnsCount ??= 6;
    this.state.settings.cardSize ??= 100;
    this.state.settings.searchSize ??= 100;
    this.state.settings.simpleMode ??= false;
    this.state.settings.openInNewTab ??= false;
    this.state.settings.showSearchBar ??= false;
    this.state.settings.enableHistorySearch ??= true;
    this.state.settings.language ??= "en";
    this.state.settings.hideScrollbar ??= false;
    this.state.settings.hideDescription ??= false;
    this.state.settings.iconOnlyMode ??= false;
    this.state.settings.siteDirection ??= "auto";
    this.state.settings.hideBorders ??= false;
    this.state.settings.hideIconBg ??= false;

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
