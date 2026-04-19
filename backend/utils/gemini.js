import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai"; 

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.error('WARNING: GEMINI_API_KEY is not set. AI features will not work');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_NAME = "gemini-2.5-flash";

const stripMarkdown = (text) => {
    if (text.startsWith('```json')) {
        return text.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (text.startsWith('```')) {
        return text.replace(/```\n?/g, '');
    }
    return text;
};

export const generateRecipe = async ({ ingredients, dietaryRestrictions = [], cuisineType = 'any', servings = 4, cookingTime = 'medium' }) => {
    const dietaryInfo = dietaryRestrictions.length > 0
        ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}`
        : 'No dietary restrictions';

    const timeGuide = {
        quick: 'under 30 minutes',
        medium: '30-60 minutes',
        long: 'over 60 minutes'
    };

    const prompt = `Generate a detailed recipe with the following requirements:
      
Ingredients available: ${ingredients.join(', ')}
${dietaryInfo}
Cuisine type: ${cuisineType}
Servings: ${servings}
Cooking time: ${timeGuide[cookingTime] || 'any'}

Please provide a complete recipe in the following JSON format (return ONLY valid JSON, no markdown):
{
  "name": "Recipe name",
  "description": "Brief description of the dish",
  "cuisineType": "${cuisineType}",
  "difficulty": "easy|medium|hard",
  "prepTime": number (in minutes),
  "cookTime": number (in minutes),
  "servings": ${servings},
  "ingredients": [
    {"name": "ingredient name", "quantity": number, "unit": "unit of measurement"}
  ],
  "instructions": [
    "Step 1 description",
    "Step 2 description"
  ],
  "dietaryTags": ["vegetarian", "gluten-free", etc.],
  "nutrition": {
    "calories": number,
    "protein": number (grams),
    "carbohydrates": number (grams),
    "fats": number (grams),
    "fiber": number (grams)
  },
  "cookingTips": ["Tip 1", "Tip 2"]
}

Make sure the recipe is creative, delicious, and uses the provided ingredients effectively.`;

    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const response = await model.generateContent(prompt);
        const generatedText = response.response.text().trim();

        const jsonText = stripMarkdown(generatedText);
        const recipe = JSON.parse(jsonText);
        return recipe;

    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate recipe. Please try again');
    }
};

export const generatePantrySuggestions = async (pantryItems, expiringItems = []) => { 
    const ingredients = pantryItems.map(item => item.name).join(', ');
    const expiringText = expiringItems.length > 0
        ? `\nPriority ingredients (expiring soon): ${expiringItems.join(', ')}`
        : '';

    const prompt = `Based on these available ingredients: ${ingredients}${expiringText}

Suggest 3 creative recipe ideas that use these ingredients. Return ONLY a JSON array of strings (no markdown):
["Recipe idea 1", "Recipe idea 2", "Recipe idea 3"]

Each suggestion should be a brief, appetizing description (1-2 sentences).`; 

    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const response = await model.generateContent(prompt);
        const generatedText = response.response.text().trim();

        const jsonText = stripMarkdown(generatedText);
        const suggestions = JSON.parse(jsonText); 
        return suggestions; 

    } catch (error) { 
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate suggestions');
    }
};

export const generateCookingTips = async (recipe) => {
    const prompt = `For this recipe: "${recipe.name}"
Ingredients: ${recipe.ingredients?.map(i => i.name).join(', ') || 'N/A'}

Provide 3-5 helpful cooking tips to make this recipe better. Return ONLY a JSON array of strings (no markdown):
["Tip 1", "Tip 2", "Tip 3"]`; 

    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const response = await model.generateContent(prompt);
        const generatedText = response.response.text().trim();

        const jsonText = stripMarkdown(generatedText);
        const tips = JSON.parse(jsonText);
        return tips; 

    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to generate cooking tips');
    }
};

export default {
    generateRecipe,
    generatePantrySuggestions,
    generateCookingTips
};