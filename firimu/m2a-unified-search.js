(function () {
  "use strict";

  var ROOT_ID = "m2a-search-box";
  var CONFIG = {
    pageSize: 24,
    maxPages: 40,
    timeout: 12000,
    minSearchLength: 2,
    sources: [
      {
        name: "Naka Firimu",
        blogUrl: "https://www.marketing2advertising.com",
        label: "nakamovies"
      },
      {
        name: "Serie",
        blogUrl: "https://serie.marketing2advertising.com",
        label: ""
      }
    ]
  };

  var root = document.getElementById(ROOT_ID);
  if (!root || root.getAttribute("data-unified-search-ready") === "1") return;
  root.setAttribute("data-unified-search-ready", "1");
  root.classList.add("m2a-unified-search");

  root.innerHTML =
    '<div class="m2a-unified-panel">' +
      '<h2 class="m2a-unified-heading">Search Naka Firimu &amp; Serie</h2>' +
      '<p class="m2a-unified-description">Search movies and series by title, description, VJ or keyword.</p>' +
      '<form class="m2a-unified-form" id="m2a-unified-form">' +
        '<input class="m2a-unified-input" id="m2a-unified-input" type="search" placeholder="Enter a movie or series title..." autocomplete="off" aria-label="Search Naka Firimu and Serie">' +
        '<button class="m2a-unified-submit" id="m2a-unified-submit" type="submit">SEARCH</button>' +
        '<button class="m2a-unified-clear" id="m2a-unified-clear" type="button">CLEAR</button>' +
      '</form>' +
      '<div class="m2a-unified-status" id="m2a-unified-status" role="status" aria-live="polite">Enter at least 2 characters to search both catalogues.</div>' +
    '</div>';

  var results = document.createElement("div");
  results.className = "m2a-unified-results";
  results.id = "m2a-unified-results";
  var sticky = root.closest(".m2a-sticky-controls");
  if (sticky && sticky.parentNode) {
    sticky.insertAdjacentElement("afterend", results);
  } else {
    root.insertAdjacentElement("afterend", results);
  }

  var form = root.querySelector("#m2a-unified-form");
  var input = root.querySelector("#m2a-unified-input");
  var submit = root.querySelector("#m2a-unified-submit");
  var clear = root.querySelector("#m2a-unified-clear");
  var status = root.querySelector("#m2a-unified-status");
  var pageCache = Object.create(null);
  var requestCounter = 0;
  var activeSearch = 0;

  function cleanText(value) {
    var node = document.createElement("div");
    node.innerHTML = value || "";
    return (node.textContent || node.innerText || "").replace(/\s+/g, " ").trim();
  }

  function postUrl(entry) {
    var links = entry.link || [];
    for (var i = 0; i < links.length; i++) {
      if (links[i].rel !== "alternate" || !links[i].href) continue;
      try {
        var url = new URL(links[i].href);
        if (url.hostname === "www.marketing2advertising.com" ||
            url.hostname === "serie.marketing2advertising.com") {
          url.hostname = "marketing2advertising.com";
          if (!/^\/firimu(?:\/|$)/i.test(url.pathname)) {
            url.pathname = "/firimu" + (url.pathname.charAt(0) === "/" ? "" : "/") + url.pathname;
          }
        }
        url.protocol = "https:";
        return url.href;
      } catch (error) {
        return links[i].href;
      }
    }
    return "#";
  }

  function postImage(entry) {
    if (entry.media$thumbnail && entry.media$thumbnail.url) {
      return entry.media$thumbnail.url.replace(/\/s[0-9]+(-c)?\//, "/s600/");
    }
    var html = entry.content && entry.content.$t
      ? entry.content.$t
      : (entry.summary && entry.summary.$t ? entry.summary.$t : "");
    var match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : "";
  }

  function normalize(entry, source) {
    var title = cleanText(entry.title && entry.title.$t ? entry.title.$t : "Untitled");
    var contentHtml = entry.content && entry.content.$t
      ? entry.content.$t
      : (entry.summary && entry.summary.$t ? entry.summary.$t : "");
    var summaryHtml = entry.summary && entry.summary.$t ? entry.summary.$t : contentHtml;
    var content = cleanText(contentHtml);
    var summary = cleanText(summaryHtml);
    var labels = (entry.category || []).map(function (item) {
      return item.term || "";
    }).join(" ");
    return {
      title: title,
      description: summary.slice(0, 220),
      searchText: (title + " " + content + " " + summary + " " + labels + " " + source.name).toLowerCase(),
      url: postUrl(entry),
      image: postImage(entry),
      source: source.name
    };
  }

  function fetchPage(source, page) {
    var sourceIndex = CONFIG.sources.indexOf(source);
    var cacheKey = sourceIndex + ":" + page;
    if (pageCache[cacheKey]) return Promise.resolve(pageCache[cacheKey]);

    return new Promise(function (resolve, reject) {
      var callback = "m2aUnifiedSearchCallback" + (++requestCounter);
      var script = document.createElement("script");
      var done = false;
      var startIndex = ((page - 1) * CONFIG.pageSize) + 1;
      var feedPath = source.label
        ? "/feeds/posts/default/-/" + encodeURIComponent(source.label)
        : "/feeds/posts/default";
      var url = source.blogUrl + feedPath +
        "?alt=json-in-script&max-results=" + CONFIG.pageSize +
        "&start-index=" + startIndex + "&orderby=published&callback=" + callback;
      var timer;

      function finish(error, posts) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        script.onerror = null;
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callback]; } catch (e) { window[callback] = undefined; }
        if (error) reject(error);
        else {
          pageCache[cacheKey] = posts;
          resolve(posts);
        }
      }

      window[callback] = function (response) {
        try {
          var entries = response && response.feed && response.feed.entry
            ? response.feed.entry
            : [];
          finish(null, entries.map(function (entry) { return normalize(entry, source); }));
        } catch (error) {
          finish(error);
        }
      };

      script.onerror = function () {
        finish(new Error(source.name + " feed could not be reached."));
      };
      timer = setTimeout(function () {
        finish(new Error(source.name + " feed request timed out."));
      }, CONFIG.timeout);
      script.src = url;
      document.head.appendChild(script);
    });
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function render(posts) {
    results.innerHTML = "";
    if (!posts.length) {
      results.appendChild(element("div", "m2a-unified-empty", "No matching movies or series were found. Try another title or keyword."));
      return;
    }

    posts.forEach(function (post) {
      var card = element("article", "m2a-unified-card");
      var link = element("a", "m2a-unified-link");
      link.href = post.url;
      link.setAttribute("aria-label", "Open " + post.title);

      if (post.image) {
        var image = element("img", "m2a-unified-image");
        image.src = post.image;
        image.alt = post.title;
        image.loading = "lazy";
        image.decoding = "async";
        image.onerror = function () {
          image.replaceWith(element("div", "m2a-unified-no-image", "M2A"));
        };
        link.appendChild(image);
      } else {
        link.appendChild(element("div", "m2a-unified-no-image", "M2A"));
      }

      var info = element("div", "m2a-unified-info");
      info.appendChild(element("span", "m2a-unified-source", post.source));
      info.appendChild(element("h3", "m2a-unified-title", post.title));
      if (post.description) {
        info.appendChild(element("p", "m2a-unified-description-text", post.description));
      }
      link.appendChild(info);
      card.appendChild(link);
      results.appendChild(card);
    });
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function setLoading(loading) {
    submit.disabled = loading;
    submit.textContent = loading ? "SEARCHING..." : "SEARCH";
  }

  async function runSearch(query, searchId) {
    var matched = Object.create(null);
    var active = [true, true];
    var errors = [];
    var pagesSearched = [0, 0];

    for (var page = 1; page <= CONFIG.maxPages && (active[0] || active[1]); page++) {
      if (searchId !== activeSearch) return;
      setStatus("Searching Naka Firimu and Serie... Catalogue page " + page + " of " + CONFIG.maxPages + ".");

      var requests = CONFIG.sources.map(function (source, index) {
        if (!active[index]) return Promise.resolve({ index: index, posts: null });
        return fetchPage(source, page).then(function (posts) {
          return { index: index, posts: posts };
        }).catch(function (error) {
          return { index: index, error: error };
        });
      });

      var outcomes = await Promise.all(requests);
      if (searchId !== activeSearch) return;

      outcomes.forEach(function (outcome) {
        if (outcome.posts === null) return;
        var sourceIndex = outcome.index;
        if (outcome.error) {
          active[sourceIndex] = false;
          errors.push(outcome.error.message);
          return;
        }
        pagesSearched[sourceIndex]++;
        outcome.posts.forEach(function (post) {
          if (post.searchText.indexOf(query) !== -1) matched[post.url] = post;
        });
        if (outcome.posts.length < CONFIG.pageSize) active[sourceIndex] = false;
      });
    }

    if (searchId !== activeSearch) return;
    var matches = Object.keys(matched).map(function (key) { return matched[key]; });
    matches.sort(function (a, b) { return a.title.localeCompare(b.title); });
    render(matches);

    var totalPages = pagesSearched[0] + pagesSearched[1];
    var statusText = matches.length
      ? "Found " + matches.length + " matching result(s) across both catalogues. Searched " + totalPages + " feed page(s)."
      : "No matching movies or series found. Searched " + totalPages + " feed page(s).";
    if (errors.length) statusText += " Some results may be missing: " + errors.join(" ");
    setStatus(statusText);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var query = input.value.trim().toLowerCase();
    if (query.length < CONFIG.minSearchLength) {
      setStatus("Please enter at least 2 characters to search.");
      input.focus();
      return;
    }
    activeSearch++;
    var searchId = activeSearch;
    results.innerHTML = "";
    setLoading(true);
    setStatus("Starting search across both catalogues...");
    runSearch(query, searchId).catch(function (error) {
      if (searchId !== activeSearch) return;
      results.innerHTML = "";
      results.appendChild(element("div", "m2a-unified-empty", error.message || "Search could not be completed. Please try again."));
      setStatus("Search could not be completed.");
    }).finally(function () {
      if (searchId === activeSearch) setLoading(false);
    });
  });

  clear.addEventListener("click", function () {
    activeSearch++;
    input.value = "";
    results.innerHTML = "";
    setLoading(false);
    setStatus("Enter at least 2 characters to search both catalogues.");
    input.focus();
  });
})();