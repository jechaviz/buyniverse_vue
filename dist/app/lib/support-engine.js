// Guided support: retrieval over the Buyniverse knowledge base
// (app/data/support/kb.json). It answers without any AI provider, and the
// server's assistant uses the same scoring to ground its replies, so both
// modes cite the same articles.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BuyniverseSupport = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STOP = ("a al algo como con cual cuando de del el ella en es esa ese eso esta este esto ha hay la las le lo los me mi mis muy no o para pero por que se si sin su sus te tengo tu un una uno y ya yo " +
    "the a an and are as at be but by can do does for from how i if in is it my of on or so that the this to what when where which with you your").split(" ");
  var STOPSET = {};
  STOP.forEach(function (word) { STOPSET[word] = true; });

  function normalize(text) {
    return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\- ]+/g, " ");
  }
  function tokens(text) {
    return normalize(text).split(/\s+/).filter(function (word) { return word.length > 1 && !STOPSET[word]; });
  }
  function textOf(value, locale) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[locale] || value.es || value.en || "";
  }

  /**
   * Scores every article for a question. Keyword phrases count most, then
   * the title, then the summary; the chosen area gives a small boost.
   */
  function search(kb, question, options) {
    options = options || {};
    var locale = options.locale || "es", area = options.area || "";
    var query = tokens(question), phrase = normalize(question);
    if (!query.length && !area) return [];
    return (kb.articles || []).map(function (article) {
      var score = 0;
      (article.keywords || []).forEach(function (keyword) {
        var key = normalize(keyword);
        if (key.indexOf(" ") >= 0 ? phrase.indexOf(key) >= 0 : query.indexOf(key) >= 0) score += 3;
        // A shared five-letter stem catches Spanish conjugations: cancelo ~ cancelar.
        else if (key.length >= 5 && query.some(function (word) { return word.length >= 5 && word.slice(0, 5) === key.slice(0, 5); })) score += 2;
        else if (query.some(function (word) { return word.length > 3 && key.indexOf(word) === 0; })) score += 1.5;
      });
      var title = tokens(textOf(article.title, locale) + " " + textOf(article.title, locale === "es" ? "en" : "es"));
      var summary = tokens(textOf(article.summary, locale));
      query.forEach(function (word) {
        if (title.indexOf(word) >= 0) score += 2;
        if (summary.indexOf(word) >= 0) score += 0.6;
      });
      if (area && article.area === area) score += query.length ? 1.5 : 1;
      return { article: article, score: score };
    }).filter(function (hit) { return hit.score >= 2; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, options.limit || 3);
  }

  /** The area most represented among the best hits. */
  function triage(kb, question) {
    var hits = search(kb, question, { limit: 5 });
    var weight = {};
    hits.forEach(function (hit) { weight[hit.article.area] = (weight[hit.article.area] || 0) + hit.score; });
    var best = Object.keys(weight).sort(function (a, b) { return weight[b] - weight[a]; })[0];
    return best || "";
  }

  function article(kb, id) {
    return (kb.articles || []).filter(function (item) { return item.id === id; })[0] || null;
  }

  return { normalize: normalize, tokens: tokens, search: search, triage: triage, article: article, textOf: textOf };
});
