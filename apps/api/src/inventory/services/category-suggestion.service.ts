import { Injectable, Logger } from '@nestjs/common';

/**
 * Category Suggestion Service
 * 
 * Automatically suggests categories for products based on:
 * 1. Product name keywords
 * 2. Common retail category patterns
 * 3. Brand associations
 * 
 * This enables automatic categorization during bulk imports.
 */
@Injectable()
export class CategorySuggestionService {
  private readonly logger = new Logger(CategorySuggestionService.name);

  // Category keyword mappings - keywords that suggest specific categories
  private readonly categoryKeywords: Map<string, string[]> = new Map([
    // Food & Beverages
    ['Beverages', [
      'water', 'juice', 'soda', 'cola', 'fanta', 'sprite', 'pepsi', 'coca-cola', 'coke',
      'drink', 'tea', 'coffee', 'milk', 'yogurt', 'smoothie', 'energy drink', 'redbull',
      'beer', 'wine', 'whisky', 'vodka', 'gin', 'brandy', 'liquor', 'alcohol',
      'mineral water', 'sparkling', 'dasani', 'aquafina', 'keringet', 'highlands'
    ]],
    ['Snacks', [
      'chips', 'crisps', 'biscuit', 'cookie', 'cracker', 'popcorn', 'nuts', 'peanut',
      'chocolate', 'candy', 'sweet', 'gum', 'mint', 'snack', 'pretzel', 'nachos',
      'oreo', 'digestive', 'marie', 'shortbread', 'wafer'
    ]],
    ['Dairy', [
      'milk', 'cheese', 'butter', 'yogurt', 'cream', 'ghee', 'margarine', 'dairy',
      'brookside', 'tuzo', 'fresha', 'molo', 'lala', 'curd'
    ]],
    ['Bread & Bakery', [
      'bread', 'loaf', 'bun', 'roll', 'cake', 'pastry', 'muffin', 'croissant',
      'donut', 'doughnut', 'pie', 'tart', 'scone', 'bagel', 'toast'
    ]],
    ['Rice & Grains', [
      'rice', 'wheat', 'flour', 'maize', 'corn', 'oats', 'barley', 'millet',
      'sorghum', 'ugali', 'posho', 'unga', 'atta', 'grain', 'cereal', 'pasta',
      'spaghetti', 'macaroni', 'noodle'
    ]],
    ['Cooking Oil', [
      'oil', 'cooking oil', 'vegetable oil', 'sunflower', 'olive oil', 'coconut oil',
      'palm oil', 'canola', 'corn oil', 'frying oil', 'elianto', 'golden fry', 'rina'
    ]],
    ['Spices & Seasonings', [
      'spice', 'salt', 'pepper', 'curry', 'masala', 'turmeric', 'ginger', 'garlic',
      'cinnamon', 'cardamom', 'cumin', 'coriander', 'paprika', 'chili', 'seasoning',
      'royco', 'mchuzi', 'knorr', 'maggi'
    ]],
    ['Canned Foods', [
      'canned', 'tin', 'beans', 'peas', 'corn', 'tomato paste', 'sardine', 'tuna',
      'pilchard', 'corned beef', 'spam', 'baked beans'
    ]],
    ['Sugar & Sweeteners', [
      'sugar', 'honey', 'syrup', 'sweetener', 'jaggery', 'molasses', 'brown sugar'
    ]],
    
    // Personal Care & Hygiene
    ['Personal Care', [
      'soap', 'shampoo', 'conditioner', 'lotion', 'cream', 'deodorant', 'perfume',
      'cologne', 'body wash', 'shower gel', 'moisturizer', 'sunscreen', 'lip balm',
      'vaseline', 'petroleum jelly', 'nivea', 'dove', 'lux', 'dettol'
    ]],
    ['Hair Care', [
      'shampoo', 'conditioner', 'hair oil', 'hair gel', 'hair spray', 'relaxer',
      'hair food', 'hair cream', 'dark and lovely', 'tcb', 'olive oil hair'
    ]],
    ['Oral Care', [
      'toothpaste', 'toothbrush', 'mouthwash', 'dental', 'floss', 'colgate',
      'closeup', 'aquafresh', 'sensodyne', 'oral-b'
    ]],
    ['Baby Care', [
      'diaper', 'nappy', 'baby', 'pampers', 'huggies', 'baby wipes', 'baby powder',
      'baby lotion', 'baby oil', 'formula', 'baby food', 'cerelac', 'nan'
    ]],
    ['Feminine Care', [
      'sanitary', 'pad', 'tampon', 'panty liner', 'always', 'kotex', 'stayfree',
      'feminine', 'menstrual'
    ]],
    
    // Household
    ['Cleaning Supplies', [
      'detergent', 'soap', 'bleach', 'cleaner', 'disinfectant', 'jik', 'omo',
      'ariel', 'persil', 'surf', 'tide', 'vim', 'harpic', 'toilet cleaner',
      'floor cleaner', 'glass cleaner', 'dish soap', 'dishwashing'
    ]],
    ['Laundry', [
      'washing powder', 'fabric softener', 'starch', 'laundry', 'downy', 'comfort',
      'sta-soft', 'washing liquid'
    ]],
    ['Paper Products', [
      'tissue', 'toilet paper', 'paper towel', 'napkin', 'serviette', 'kitchen roll',
      'facial tissue', 'kleenex', 'rosy'
    ]],
    
    // Electronics & Accessories
    ['Electronics', [
      'phone', 'charger', 'cable', 'earphone', 'headphone', 'speaker', 'radio',
      'battery', 'torch', 'flashlight', 'bulb', 'led', 'adapter', 'power bank',
      'usb', 'memory card', 'sd card', 'flash drive'
    ]],
    ['Phone Accessories', [
      'phone case', 'screen protector', 'phone charger', 'earphone', 'airpod',
      'bluetooth', 'phone holder', 'selfie stick'
    ]],
    
    // Stationery
    ['Stationery', [
      'pen', 'pencil', 'notebook', 'book', 'paper', 'envelope', 'folder', 'file',
      'stapler', 'tape', 'glue', 'scissors', 'ruler', 'eraser', 'sharpener',
      'marker', 'highlighter', 'calculator', 'bic', 'counter book'
    ]],
    
    // Health & Medicine
    ['Health & Medicine', [
      'panadol', 'aspirin', 'paracetamol', 'ibuprofen', 'medicine', 'tablet',
      'capsule', 'syrup', 'bandage', 'plaster', 'cotton', 'antiseptic', 'vitamin',
      'supplement', 'first aid', 'pain relief', 'cold', 'flu', 'cough'
    ]],
    
    // Tobacco
    ['Tobacco', [
      'cigarette', 'tobacco', 'sportsman', 'embassy', 'dunhill', 'marlboro',
      'rooster', 'safari', 'supermatch'
    ]],
    
    // Airtime & Services
    ['Airtime & Data', [
      'airtime', 'data', 'bundle', 'safaricom', 'airtel', 'telkom', 'scratch card',
      'top up', 'recharge'
    ]],
  ]);

  // Brand to category mappings
  private readonly brandCategories: Map<string, string> = new Map([
    // Beverages
    ['coca-cola', 'Beverages'], ['pepsi', 'Beverages'], ['fanta', 'Beverages'],
    ['sprite', 'Beverages'], ['dasani', 'Beverages'], ['keringet', 'Beverages'],
    ['redbull', 'Beverages'], ['monster', 'Beverages'], ['nescafe', 'Beverages'],
    ['lipton', 'Beverages'], ['ketepa', 'Beverages'],
    
    // Dairy
    ['brookside', 'Dairy'], ['tuzo', 'Dairy'], ['fresha', 'Dairy'],
    ['molo', 'Dairy'], ['lala', 'Dairy'],
    
    // Snacks
    ['oreo', 'Snacks'], ['lays', 'Snacks'], ['pringles', 'Snacks'],
    ['cadbury', 'Snacks'], ['nestle', 'Snacks'],
    
    // Personal Care
    ['nivea', 'Personal Care'], ['dove', 'Personal Care'], ['lux', 'Personal Care'],
    ['dettol', 'Personal Care'], ['vaseline', 'Personal Care'],
    
    // Cleaning
    ['omo', 'Cleaning Supplies'], ['ariel', 'Cleaning Supplies'],
    ['jik', 'Cleaning Supplies'], ['harpic', 'Cleaning Supplies'],
    
    // Baby
    ['pampers', 'Baby Care'], ['huggies', 'Baby Care'], ['cerelac', 'Baby Care'],
    
    // Cooking
    ['elianto', 'Cooking Oil'], ['golden fry', 'Cooking Oil'], ['rina', 'Cooking Oil'],
    ['royco', 'Spices & Seasonings'], ['knorr', 'Spices & Seasonings'],
  ]);

  /**
   * Suggest a category for a product based on its name and optional brand
   */
  suggestCategory(productName: string, brand?: string): string | null {
    const nameLower = productName.toLowerCase();
    const brandLower = brand?.toLowerCase();

    // First, check brand mapping
    if (brandLower) {
      for (const [brandKey, category] of this.brandCategories) {
        if (brandLower.includes(brandKey) || nameLower.includes(brandKey)) {
          this.logger.debug(`Category suggested by brand: ${category} for ${productName}`);
          return category;
        }
      }
    }

    // Then check keyword mappings
    for (const [category, keywords] of this.categoryKeywords) {
      for (const keyword of keywords) {
        if (nameLower.includes(keyword.toLowerCase())) {
          this.logger.debug(`Category suggested by keyword "${keyword}": ${category} for ${productName}`);
          return category;
        }
      }
    }

    // No match found
    this.logger.debug(`No category suggestion for: ${productName}`);
    return null;
  }

  /**
   * Suggest categories for multiple products
   * Returns a map of product index to suggested category
   */
  suggestCategoriesForProducts(products: Array<{ name: string; brand?: string }>): Map<number, string> {
    const suggestions = new Map<number, string>();
    
    products.forEach((product, index) => {
      const suggestion = this.suggestCategory(product.name, product.brand);
      if (suggestion) {
        suggestions.set(index, suggestion);
      }
    });

    return suggestions;
  }

  /**
   * Get all unique suggested categories for a list of products
   * Useful for pre-creating categories before import
   */
  getUniqueSuggestedCategories(products: Array<{ name: string; brand?: string; category?: string }>): string[] {
    const categories = new Set<string>();

    products.forEach(product => {
      // If product already has a category name, use that
      if (product.category) {
        categories.add(product.category);
      } else {
        // Otherwise, try to suggest one
        const suggestion = this.suggestCategory(product.name, product.brand);
        if (suggestion) {
          categories.add(suggestion);
        }
      }
    });

    return Array.from(categories);
  }

  /**
   * Analyze products and return categorization statistics
   */
  analyzeProducts(products: Array<{ name: string; brand?: string; category?: string; categoryId?: string }>): {
    total: number;
    withCategory: number;
    withSuggestion: number;
    uncategorized: number;
    suggestedCategories: { [category: string]: number };
  } {
    let withCategory = 0;
    let withSuggestion = 0;
    const suggestedCategories: { [category: string]: number } = {};

    products.forEach(product => {
      if (product.category || product.categoryId) {
        withCategory++;
        if (product.category) {
          suggestedCategories[product.category] = (suggestedCategories[product.category] || 0) + 1;
        }
      } else {
        const suggestion = this.suggestCategory(product.name, product.brand);
        if (suggestion) {
          withSuggestion++;
          suggestedCategories[suggestion] = (suggestedCategories[suggestion] || 0) + 1;
        }
      }
    });

    return {
      total: products.length,
      withCategory,
      withSuggestion,
      uncategorized: products.length - withCategory - withSuggestion,
      suggestedCategories,
    };
  }

  /**
   * Get all available category templates
   * Useful for showing users what categories can be auto-detected
   */
  getAvailableCategories(): string[] {
    return Array.from(this.categoryKeywords.keys()).sort();
  }
}
