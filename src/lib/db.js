import fs from 'fs';
import path from 'path';

// Note: This relies on the file being accessible at runtime.
// For Next.js, it's better to import directly if it's static, or read from process.cwd()
export function getMenu() {
  const filePath = path.join(process.cwd(), 'src', 'data', 'Foods.json');
  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    return data.foods || [];
  } catch (error) {
    console.error('Error reading the menu data:', error);
    return [];
  }
}

export function searchMenu(query) {
  const menu = getMenu();
  if (!query) return menu;
  const q = query.toLowerCase();

  // Simple intent parsing for dietary preferences, spice level, macros, and budget
  const wantsVeg = /\bveg\b|\bvegetarian\b/.test(q);
  const wantsNonVeg = /\bnon\s*veg\b|\bnon-vegetarian\b|\bnonveg\b/.test(q);

  // Handle both "spicy" and "not too spicy" / "not spicy" / "mild"
  const wantsMild =
    /\bnot\s+too\s+spicy\b/.test(q) ||
    /\bnot\s+spicy\b/.test(q) ||
    /\bmild\b/.test(q);
  const wantsSpicyRaw = /\bspicy\b|\bhot\b/.test(q);
  const wantsSpicy = wantsSpicyRaw && !wantsMild;

  const wantsHighProtein = /\bhigh\s+protein\b/.test(q);
  const wantsLowCarb = /\blow\s+carb\b|\blow\s+carbs\b/.test(q);
  const wantsLowCalorie = /\blow\s+calorie\b|\blow\s+calories\b|\blight\b/.test(q);

  // Detect budget like "under 500" or "below ₹400"
  let maxPrice = null;
  const priceMatch = q.match(/(?:under|below|upto|up to)\s*₹?\s*(\d+)/);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1], 10);
  }

  // Extract meaningful tokens (ignore generic stopwords like "show", "want", "food", etc.)
  const stopwords = new Set([
    'show', 'me', 'some', 'food', 'foods', 'dishes', 'dish',
    'give', 'get', 'please', 'recommend', 'suggest',
    'for', 'a', 'an', 'the', 'that', 'this', 'those', 'these',
    'under', 'below', 'upto', 'up', 'to', 'about', 'kind', 'sort',
    'something', 'anything', 'good', 'nice', 'popular', 'tasty',
    'delicious', 'light', 'lunch', 'dinner', 'breakfast', 'snack',
    'meal', 'want', 'i', 'of', 'in', 'not', 'too',
  ]);

  const tokens = q
    .replace(/₹/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const meaningfulTokens = tokens.filter((t) => !stopwords.has(t));
  const hasMeaningfulTokens = meaningfulTokens.length > 0;

  const primaryResults = menu.filter((item) => {
    const type = (item.type || '').toLowerCase();
    const spice = (item.spiceLevel || '').toLowerCase();
    const price = typeof item.price === 'number' ? item.price : Number(item.price);
    const name = (item.name || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    const ingredients = (item.ingredients || []).map((ing) => ing.toLowerCase());

    // Build a nutrition string for matching macros
    const nutrition = item.nutrition || {};
    const nutritionString = Object.entries(nutrition)
      .map(([key, value]) => `${key} ${String(value)}`)
      .join(' ')
      .toLowerCase();

    const proteinG = nutrition.protein
      ? parseFloat(String(nutrition.protein).replace(/[^\d.]/g, ''))
      : 0;
    const carbsG = nutrition.carbs
      ? parseFloat(String(nutrition.carbs).replace(/[^\d.]/g, ''))
      : 0;
    const calories = nutrition.calories || 0;

    // Enforce vegetarian / non-vegetarian intent
    if (wantsVeg && type !== 'vegetarian') return false;
    if (wantsNonVeg && type !== 'non-vegetarian') return false;

    // Enforce spicy / mild intent
    if (wantsSpicy) {
      const spicyLevels = ['medium', 'medium-hot', 'hot', 'spicy'];
      if (!spicyLevels.some(level => spice.includes(level))) {
        return false;
      }
    }
    if (wantsMild) {
      const mildLevels = ['mild', 'low', 'light'];
      if (!mildLevels.some(level => spice.includes(level))) {
        return false;
      }
    }

    // Enforce budget if specified
    if (maxPrice !== null && price && price > maxPrice) {
      return false;
    }

    // Enforce macro / health intents
    if (wantsHighProtein && proteinG < 18) {
      return false;
    }
    if (wantsLowCarb && carbsG > 35) {
      return false;
    }
    if (wantsLowCalorie && calories && calories > 400) {
      return false;
    }

    // If we don't have any meaningful tokens, just return items that match constraints
    if (!hasMeaningfulTokens) {
      return true;
    }

    // Otherwise, require at least one meaningful token to match in key fields
    const haystacks = [name, desc, category, type, nutritionString, ...ingredients];
    return meaningfulTokens.some((token) =>
      haystacks.some((field) => field.includes(token))
    );
  });

  // If nothing matched with the stricter intent logic, fall back to a simpler search:
  // just budget + basic text match over core fields, so natural-language
  // prompts like "a light lunch that's not too spicy" still show something.
  if (primaryResults.length > 0) {
    return primaryResults;
  }

  return menu.filter((item) => {
    const type = (item.type || '').toLowerCase();
    const price = typeof item.price === 'number' ? item.price : Number(item.price);

    // Keep only very broad constraints in the fallback:
    // dietary preference + budget, ignore macros/spice/text strictness.
    if (wantsVeg && type !== 'vegetarian') return false;
    if (wantsNonVeg && type !== 'non-vegetarian') return false;

    if (maxPrice !== null && price && price > maxPrice) {
      return false;
    }

    return true;
  });
}

export function getMenuItemById(id) {
  const menu = getMenu();
  return menu.find(item => item.id === parseInt(id, 10)) || null;
}
