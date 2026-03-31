// Recipe extraction engine v4
function extractRecipe(html, url) {
  var r = { title: "", ingredients: [], instructions: [], sourceUrl: url, sourceHost: getHost(url) };

  // Strategy 1: JSON-LD (schema.org Recipe) — most reliable
  var ld = parseJSONLD(html);
  if (ld) {
    r.title = ld.title || r.title;
    r.ingredients = ld.ingredients.length > 0 ? ld.ingredients : [];
    r.instructions = ld.instructions.length > 0 ? ld.instructions : [];
    // If JSON-LD is sparse, supplement from HTML
    if (r.ingredients.length < 2 || r.instructions.length < 3) {
      var hi = htmlIngredients(html);
      var hs = htmlInstructions(html);
      if (r.ingredients.length < 2 && hi.length > r.ingredients.length) r.ingredients = hi;
      if (r.instructions.length < 3 && hs.length > r.instructions.length) {
        for (var k = 0; k < hs.length; k++) {
          if (!r.instructions.some(function(s) { return s.indexOf(hs[k].slice(0, 25)) >= 0; }))
            r.instructions.push(hs[k]);
        }
      }
    }
  }

  // Strategy 2: Microdata
  if (!r.title || r.ingredients.length === 0) {
    var mh = parseMicrodata(html);
    if (mh.title || mh.ingredients.length > 0) {
      r.title = r.title || mh.title;
      r.ingredients = r.ingredients.length > 0 ? r.ingredients : mh.ingredients;
      r.instructions = r.instructions.length > 0 ? r.instructions : mh.instructions;
    }
  }

  // Clean
  r.ingredients = r.ingredients.map(clean).filter(function(s) { return s.length > 1 && s.length < 300; });
  r.instructions = r.instructions.map(clean).filter(function(s) { return s.length > 5; });
  return r;
}

function parseJSONLD(html) {
  // Try with id attribute first (group 1 = id, group 2 = content)
  var ms = html.match(/<script[^>]*\sid=["']?[^"'\s>]+[^>]*\stype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  // Try without id attribute (group 1 = content)
  var ms2 = html.match(/<script[^>]*\stype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  var all = ms.concat(ms2);
  for (var i = 0; i < all.length; i++) {
    // Extract just the JSON content (last captured group)
    var m = all[i].match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!m) continue;
    var block = m[1].trim();
    try {
      var data = JSON.parse(block);
      var recipe = findRecipeInJSON(data);
      if (recipe && (recipe.ingredients.length > 0 || recipe.instructions.length > 0)) {
        return recipe;
      }
    } catch(e) {}
  }
  return null;
}

function findRecipeInJSON(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (var i = 0; i < data.length; i++) {
      var r = findRecipeInJSON(data[i]);
      if (r) return r;
    }
    return null;
  }
  if (data && typeof data === 'object') {
    var t = data['@type'];
    var isR = (t === 'Recipe') || (Array.isArray(t) && t.indexOf('Recipe') >= 0);
    if (isR) {
      var img = data.image || '';
      var imgUrl = typeof img === 'string' ? img :
        Array.isArray(img) ? (img[0] && (img[0].url || img[0])) :
        (img && (img.url || img.src)) ? (img.url || img.src) : '';
      return {
        title: clean(data.name || ''),
        author: typeof data.author === 'object' ? data.author.name : data.author || '',
        description: clean(data.description || ''),
        image: imgUrl,
        prepTime: data.prepTime || '',
        cookTime: data.cookTime || '',
        totalTime: data.totalTime || '',
        servings: data.recipeYield || data.yield || '',
        cuisine: data.recipeCuisine || '',
        category: data.recipeCategory || '',
        ingredients: flatIngr(data.recipeIngredient || []),
        instructions: flatInstr(data.recipeInstructions || [])
      };
    }
    if (data['@graph']) {
      var g = findRecipeInJSON(data['@graph']);
      if (g) return g;
    }
    if (data.mainEntityOfPage) {
      var me = findRecipeInJSON(data.mainEntityOfPage);
      if (me) return me;
    }
  }
  return null;
}

function flatIngr(arr) {
  if (!arr) return [];
  if (typeof arr === 'string') { var s = clean(arr); return s ? [s] : []; }
  if (!Array.isArray(arr)) return [];
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var x = arr[i];
    if (typeof x === 'string') { var s = clean(x); if (s) out.push(s); }
    else if (x && typeof x === 'object') {
      var s2 = clean(x.text || x.name || x.recipeIngredient || '');
      if (s2) out.push(s2);
      // Also check nested itemListElement for HowToSection inside ingredient list
      if (x.itemListElement && Array.isArray(x.itemListElement)) {
        for (var j = 0; j < x.itemListElement.length; j++) {
          var s3 = clean(x.itemListElement[j].text || x.itemListElement[j].name || '');
          if (s3) out.push(s3);
        }
      }
    }
  }
  return out;
}

function flatInstr(arr) {
  if (!arr) return [];
  if (typeof arr === 'string') {
    return arr.split(/[\n\r]+/).map(function(s) { return clean(s); }).filter(function(s) { return s.length > 5; });
  }
  if (!Array.isArray(arr)) return [];
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var x = arr[i];
    if (typeof x === 'string') { var s = clean(x); if (s) out.push(s); }
    else if (x && typeof x === 'object') {
      var tp = x['@type'] || '';
      if (tp === 'HowToSection') {
        // Section title + all steps inside
        if (x.name) out.push('--- ' + clean(x.name) + ' ---');
        if (x.itemListElement) {
          var sub = flatInstr(x.itemListElement);
          for (var j = 0; j < sub.length; j++) out.push(sub[j]);
        }
      } else if (tp === 'HowToStep') {
        var s2 = clean(x.text || x.name || '');
        if (s2) out.push(s2);
        // Some plugins nest steps inside itemListElement even in HowToStep
        if (x.itemListElement) {
          var sub2 = flatInstr(x.itemListElement);
          for (var k = 0; k < sub2.length; k++) out.push(sub2[k]);
        }
      } else if (x.text) {
        var s3 = clean(x.text);
        if (s3) out.push(s3);
      } else if (x.name) {
        var s4 = clean(x.name);
        if (s4) out.push(s4);
      }
    }
  }
  return out;
}

function parseMicrodata(html) {
  var title = '', ingredients = [], instructions = [];
  var nm = html.match(/itemprop=["'](?:name)["'][^>]*>([^<]+)/gi) || [];
  if (nm.length > 0) title = clean(nm[nm.length - 1].replace(/<[^>]+>/g, ''));
  var im = html.match(/itemprop=["'](?:recipeIngredient|ingredients)["'][^>]*>([^<]+)/gi) || [];
  for (var i = 0; i < im.length; i++) { var s = clean(im[i].replace(/<[^>]+>/g, '')); if (s) ingredients.push(s); }
  return { title, ingredients, instructions };
}

function htmlIngredients(html) {
  var res = [], seen = {};
  // Look for lists inside recipe/ingredient containers
  var lbs = html.match(/<(?:ul|ol)[^>]*class=["'][^"']*(?:ingredient|recipe-ingredient)[^"']*["'][^>]*>([\s\S]*?)<\/(?:ul|ol)>/gi) || [];
  for (var b = 0; b < lbs.length; b++) {
    var items = lbs[b].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (var l = 0; l < items.length; l++) {
      var s = clean(items[l].replace(/<[^>]+>/g, '')).trim();
      if (s && s.length < 200 && !seen[s]) { seen[s] = true; res.push(s); }
    }
  }
  // Any li that looks like an ingredient (has measurement patterns)
  var mre = /\d+\s*(?:cup|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|clove|piece|slice|bunch|can|jar|package|pkg|small|medium|large|pinch|dash|bay|head|stalk|strip)/i;
  var allLis = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
  for (var li = 0; li < allLis.length && res.length < 50; li++) {
    var txt = clean(allLis[li].replace(/<[^>]+>/g, '')).trim();
    if (txt.length > 2 && txt.length < 200 && !seen[txt] && (mre.test(txt) || txt.split(' ').length < 8)) {
      seen[txt] = true; res.push(txt);
    }
  }
  return res;
}

function htmlInstructions(html) {
  var res = [], seen = {};
  // Ordered/unordered lists in instruction containers
  var ibs = html.match(/<(?:ol|ul)[^>]*class=["'][^"']*(?:instruction|step|direction|procedure|method|recipe)[^"']*["'][^>]*>([\s\S]*?)<\/(?:ol|ul)>/gi) || [];
  for (var b = 0; b < ibs.length; b++) {
    var items = ibs[b].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (var l = 0; l < items.length; l++) {
      var s = clean(items[l].replace(/<[^>]+>/g, '')).trim();
      if (s && s.length > 8 && !seen[s.slice(0, 25)]) { seen[s.slice(0, 25)] = true; res.push(s); }
    }
  }
  // Individual step divs with class names
  var sds = html.match(/<(?:div|span|p)[^>]*class=["'][^"']*(?:step|instruction|direction)[^"']*["'][^>]*>([\s\S]{15,})<\/(?:div|span|p)>/gi) || [];
  for (var s = 0; s < sds.length && res.length < 60; s++) {
    var txt = clean(sds[s].replace(/<[^>]+>/g, '')).trim();
    if (txt.length > 15 && txt.length < 1500 && !seen[txt.slice(0, 30)]) { seen[txt.slice(0, 30)] = true; res.push(txt); }
  }
  // WPRM / Tasty Recipes plugin format
  var wprm = html.match(/class=["'][^"']*wprm-recipe-instruction["'][^>]*>([\s\S]*?)<\/div>/gi) || [];
  for (var w = 0; w < wprm.length; w++) {
    var wItems = wprm[w].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (var wl = 0; wl < wItems.length; wl++) {
      var ws = clean(wItems[wl].replace(/<[^>]+>/g, '')).trim();
      if (ws && ws.length > 8 && !seen[ws.slice(0, 20)]) { seen[ws.slice(0, 20)] = true; res.push(ws); }
    }
  }
  return res;
}

function clean(s) {
  if (!s) return '';
  return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#x2019;/g, "'").replace(/&#x2018;/g, "'").trim();
}

function getHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch(e) { return ''; }
}
