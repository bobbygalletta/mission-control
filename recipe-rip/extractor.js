// Recipe extraction engine v5 — stronger instruction/ingredient separation

function extractRecipe(html, url) {
  var r = { title: "", ingredients: [], instructions: [], sourceUrl: url, sourceHost: getHost(url) };

  var ld = parseJSONLD(html);
  var hi = htmlIngredients(html);
  var hs = htmlInstructions(html);

  if (ld) {
    r.title = ld.title || r.title;
    r.author = ld.author || '';
    r.description = ld.description || '';
    r.image = ld.image || '';
    r.prepTime = ld.prepTime || '';
    r.cookTime = ld.cookTime || '';
    r.totalTime = ld.totalTime || '';
    r.servings = ld.servings || '';
    r.cuisine = ld.cuisine || '';
    r.category = ld.category || '';
    r.ingredients = (ld.ingredients.length >= hi.length) ? ld.ingredients : hi;
    // Use JSON-LD image if available, otherwise try Open Graph meta tag
    if (!r.image || r.image.indexOf('http') !== 0) {
      var ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || [];
      var ogImg2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i) || [];
      var ogImgSrc = ogImg[1] || ogImg2[1] || '';
      if (ogImgSrc) r.image = ogImgSrc;
    }

    if (hs.length >= 6) {
      // HTML is rich — deduplicate and strip "Step N:" prefixes
      var seen = {};
      r.instructions = [];
      for (var i = 0; i < hs.length; i++) {
        var raw = hs[i].replace(/^(?:Step\s*)\d+[\.:]\s*/i, '').trim();
        if (raw.length > 5 && !seen[raw.slice(0, 25)]) {
          seen[raw.slice(0, 25)] = true;
          r.instructions.push(raw);
        }
      }
    } else {
      r.instructions = ld.instructions.length > 0 ? ld.instructions : [];
      for (var j = 0; j < hs.length; j++) {
        var raw2 = hs[j].replace(/^(?:Step\s*)\d+[\.:]\s*/i, '').trim();
        if (!r.instructions.some(function(s) { return s.indexOf(raw2.slice(0, 25)) >= 0; }))
          r.instructions.push(raw2);
      }
    }
  } else {
    r.ingredients = hi;
    var seen2 = {};
    r.instructions = [];
    for (var k = 0; k < hs.length; k++) {
      var raw3 = hs[k].replace(/^(?:Step\s*)\d+[\.:]\s*/i, '').trim();
      if (raw3.length > 5 && !seen2[raw3.slice(0, 25)]) {
        seen2[raw3.slice(0, 25)] = true;
        r.instructions.push(raw3);
      }
    }
  }

  r.ingredients = r.ingredients.map(clean).filter(function(s) { return s.length > 1 && s.length < 300; });
  r.instructions = r.instructions.map(clean).filter(function(s) { return s.length > 5; });
  return r;
}

function parseJSONLD(html) {
  var ms = html.match(/<script[^>]*\sid=["']?[^"'\s>]+[^>]*\stype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  var ms2 = html.match(/<script[^>]*\stype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  var all = ms.concat(ms2);
  for (var i = 0; i < all.length; i++) {
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
      // Handle all possible JSON-LD image formats
      var imgUrl = '';
      if (typeof img === 'string' && img) {
        imgUrl = img;
      } else if (Array.isArray(img)) {
        for (var ii = 0; ii < img.length; ii++) {
          if (typeof img[ii] === 'string' && img[ii]) { imgUrl = img[ii]; break; }
          if (img[ii] && typeof img[ii] === 'object') {
            if (img[ii].url) { imgUrl = img[ii].url; break; }
            if (img[ii].src) { imgUrl = img[ii].src; break; }
            if (img[ii]['@type'] === 'ImageObject' && img[ii].contentUrl) { imgUrl = img[ii].contentUrl; break; }
          }
        }
      } else if (img && typeof img === 'object') {
        imgUrl = img.url || img.src || img.contentUrl || '';
      }
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
    if (data['@graph']) { var g = findRecipeInJSON(data['@graph']); if (g) return g; }
    if (data.mainEntityOfPage) { var me = findRecipeInJSON(data.mainEntityOfPage); if (me) return me; }
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
        if (x.itemListElement) {
          var sub = flatInstr(x.itemListElement);
          for (var j = 0; j < sub.length; j++) out.push(sub[j]);
        }
      } else if (tp === 'HowToStep' || tp === 'HowToDirection') {
        var s2 = clean(x.text || x.name || '');
        if (s2) out.push(s2);
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

// ---------- INGREDIENTS ----------

function htmlIngredients(html) {
  var res = [], seen = {};
  var junk = /^(?:log\s?in|sign\s?up|register|print\s?(?:recipe)?|jump\s?to\s?recipe|save\s?recipe|share\s?recipe|rate\s?this\s?recipe|about\s?the\s?author|subscribe|newsletter|comment|related\s?(?:recipes?|posts?|articles?)|popular\s?now|advertisement|social\s?share|back\s?to\s?top|skip\s?to\s?(?:content|recipe|ingredients|instr)|air\s?fryer(?:\s?(?:basket|receptacle|pans?|trays?|rack))?$)/i;

  // 1. Explicit ingredient container classes
  var lbs = html.match(/<(?:ul|ol)[^>]*class=["'][^"']*(?:ingredient|recipe-ingredient)[^"']*["'][^>]*>([\s\S]*?)<\/(?:ul|ol)>/gi) || [];
  for (var b = 0; b < lbs.length; b++) {
    var items = lbs[b].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (var l = 0; l < items.length; l++) {
      var s = clean(items[l].replace(/<[^>]+>/g, '')).trim();
      if (s && s.length < 200 && !seen[s] && !junk.test(s)) { seen[s] = true; res.push(s); }
    }
  }

  // 2. Strict measurement-based fallback
  var mre2 = /^(?:\d[\d\s\/\.\-\(\)]*\s*(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|cloves?|pieces?|slices?|bunche?s?|cans?|jars?|packages?|pkgs?|small|medium|large|pinch(?:es)?|dashes?|bay\b|heads?\b|stalks?\b|strips?\b|sprigs?\b|inch(?:es)?\b|tails?\b|links?\b|rashers?\b|quart\b|gall?ons?\b|liters?\b|grams?\b|kgs?\b|mgs?\b|bunche?s?\b)|[\u00BC-\u00BE\u2150-\u215E]\s*(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?\b)|fresh\s|chopped\s|sliced\s|diced\s|minced\s|grated\s|ground\s|peeled\s|pinch\b|pinches\b|pkg\b|can\s|jar\s|bunch\s)/i;
  var allLis = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
  for (var li = 0; li < allLis.length && res.length < 80; li++) {
    var txt = clean(allLis[li].replace(/<[^>]+>/g, '')).trim();
    if (txt.length > 2 && txt.length < 250 && !seen[txt] && mre2.test(txt) && !junk.test(txt)) {
      seen[txt] = true; res.push(txt);
    }
  }
  return res;
}

// ---------- INSTRUCTIONS ----------

function htmlInstructions(html) {
  var res = [], seen = {};

  // Does this item look like an ingredient rather than a cooking step?
  // Ingredients: "3 chicken breasts", "1/2 cup flour" — starts with measurement, no action verb
  // Steps: "Preheat oven", "Add eggs to bowl" — starts with action verb or descriptive sentence
  function isIngredientItem(s) {
    s = s.replace(/^[\s\u00a0\u2000-\u206f\u3000]*/, '').trim();
    // Words that indicate a cooking action (step), not an ingredient
    var action = /^(?:preheat|heat|turn|set|place|add|pour|mix|stir|combine|whisk|beat|fold|drop|top|cover|wrap|seal|slice|cut|chop|dice|mince|tear|rip|crush|grind|grate|shake|sprinkle|drizzle|brush|coat|toss|serve|garnish|remove|flip|cook|bake|broil|roast|grill|fry|saute|simmer|boil|steam|poach|microwave|blend|puree|process|transfer|drain|rinse|pat|dip|press|squeeze|scrape|spread|layer|arrange|submerge|ladle|baste|insert|line|wrap|point|organize|finish)/i;
    if (action.test(s)) return false;
    // Check if it's clearly a measurement + food item (no action verb at start)
    return /^(?:\d[\d\s\/\.\-\(\)]*(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|cloves?|pieces?|slices?|bunche?s?|cans?|jars?|packages?|pkgs?|small|medium|large|heads?|stalks?|strips?|sprigs?|inch(?:es)?|tails?|links?|rashers?|quart|gall?ons?|liters?|grams?|kgs?|mgs?|tablespoons?|teaspoons?)\b|[\u00BC-\u00BE\u2150-\u215E]\s*(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?\b))/i.test(s);
  }

  // 1. WPRM explicit instruction list (highest confidence — use as-is, no filtering needed)
  var wprm = html.match(/<(?:ol|ul)[^>]*class=["'][^"']*wprm-recipe-instructions["'][^>]*>([\s\S]*?)<\/(?:ol|ul)>/gi) || [];
  for (var wi = 0; wi < wprm.length; wi++) {
    var wItems = wprm[wi].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (var wl = 0; wl < wItems.length; wl++) {
      var ws = clean(wItems[wl].replace(/<[^>]+>/g, ' ').replace(/<br\s*\/?>/gi, '\n')).trim();
      if (ws && ws.length > 5 && !seen[ws.slice(0, 25)]) { seen[ws.slice(0, 25)] = true; res.push(ws); }
    }
  }

  // 2. Explicit instruction/step containers (skip ingredient lists)
  var ibs = html.match(/<(?:ol|ul)[^>]*class=["'][^"']*(?:instruction|step|direction|procedure|method)[^"']*["'][^>]*>([\s\S]*?)<\/(?:ol|ul)>/gi) || [];
  for (var b = 0; b < ibs.length; b++) {
    if (/(?:^|[\s])ingredient/i.test(ibs[b])) continue;
    var items = ibs[b].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (var l = 0; l < items.length; l++) {
      var s = clean(items[l].replace(/<[^>]+>/g, ' ').replace(/<br\s*\/?>/gi, '\n')).trim();
      if (s && s.length > 8 && !seen[s.slice(0, 25)] && !isIngredientItem(s)) { seen[s.slice(0, 25)] = true; res.push(s); }
    }
  }

  // 3. Microdata recipeInstructions
  var micro = html.match(/itemprop=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/div>/gi) || [];
  for (var m = 0; m < micro.length; m++) {
    var items2 = micro[m].match(/<(?:li|p|div)[^>]*>([\s\S]*?)<\/(?:li|p|div)>/gi) || [];
    for (var mi = 0; mi < items2.length; mi++) {
      var s2 = clean(items2[mi].replace(/<[^>]+>/g, ' ').replace(/<br\s*\/?>/gi, '\n')).trim();
      if (s2 && s2.length > 8 && !seen[s2.slice(0, 25)] && !isIngredientItem(s2)) { seen[s2.slice(0, 25)] = true; res.push(s2); }
    }
  }

  // 4. Individual step divs/paragraphs
  var sds = html.match(/<(?:div|span|p)[^>]*class=["'][^"']*(?:step|instruction|direction)[^"']*["'][^>]*>([\s\S]{15,})<\/(?:div|span|p)>/gi) || [];
  for (var s = 0; s < sds.length && res.length < 80; s++) {
    var txt = clean(sds[s].replace(/<[^>]+>/g, ' ').replace(/<br\s*\/?>/gi, '\n')).trim();
    if (txt.length > 15 && txt.length < 2000 && !seen[txt.slice(0, 30)] && !isIngredientItem(txt)) { seen[txt.slice(0, 30)] = true; res.push(txt); }
  }

  // 5. Other recipe plugins (tasty, etc.)
  var plugins = html.match(/class=["'][^"']*(?:tasty|recipe)[^"']*(?:instruction|step|direction)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi) || [];
  for (var p = 0; p < plugins.length; p++) {
    var pItems = plugins[p].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (var pl = 0; pl < pItems.length; pl++) {
      var ps = clean(pItems[pl].replace(/<[^>]+>/g, ' ').replace(/<br\s*\/?>/gi, '\n')).trim();
      if (ps && ps.length > 8 && !seen[ps.slice(0, 20)] && !isIngredientItem(ps)) { seen[ps.slice(0, 20)] = true; res.push(ps); }
    }
  }

  return res;
}

function clean(s) {
  if (!s) return '';
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/&#x2019;/g, "'").replace(/&#x2018;/g, "'")
    .replace(/&#(\d+);/g, function(m, c) { return String.fromCharCode(parseInt(c, 10)); })
    .replace(/&#x([0-9a-fA-F]+);/g, function(m, h) { return String.fromCharCode(parseInt(h, 16)); })
    .replace(/[\u00a0\u2000-\u206f\u3000]/g, ' ')
    .replace(/\u25A1/g, ' ').replace(/\u25A2/g, ' ').replace(/\u25A3/g, ' ')
    .replace(/\u25A4/g, ' ').replace(/\u25A5/g, ' ').replace(/\u25A6/g, ' ')
    .replace(/\u25A7/g, ' ').replace(/\u25A8/g, ' ').replace(/\u25A9/g, ' ')
    .replace(/\u2610/g, ' ').replace(/\u2611/g, ' ').replace(/\u2612/g, ' ')
    .replace(/\u25CB/g, ' ').replace(/\u25C9/g, ' ').replace(/\u25CC/g, ' ')
    .trim();
}

function getHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch(e) { return ''; }
}
