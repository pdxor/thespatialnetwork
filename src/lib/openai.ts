import OpenAI from 'openai';
import { supabase } from './supabase';

export interface OpenAIOptions {
  userId: string;
  prompt: string;
  fieldName: string;
  locationContext?: string;
  maxTokens?: number;
}

export async function generateWithOpenAI({ userId, prompt, fieldName, locationContext, maxTokens = 500 }: OpenAIOptions): Promise<string> {
  try {
    // Get the user's API key from the database
    const { data, error } = await supabase
      .from('api_keys')
      .select('key')
      .eq('user_id', userId)
      .eq('service', 'openai')
      .single();
    
    if (error || !data) {
      throw new Error('No OpenAI API key found for this user. Please add your API key in settings.');
    }
    
    // Create OpenAI client with the user's API key
    const openai = new OpenAI({
      apiKey: data.key,
      dangerouslyAllowBrowser: true // Allow browser usage while acknowledging security implications
    });
    
    // Prepare base prompt with context based on the field
    let systemPrompt = "You are an expert in permaculture and sustainable design.";
    
    // Add location context if provided
    if (locationContext) {
      systemPrompt += ` Your advice should be specific and appropriate for ${locationContext}, considering its climate, typical soil conditions, rainfall patterns, and local ecosystem.`;
    }
    
    // Handle "all fields" requests differently
    if (fieldName === 'all') {
      systemPrompt += ` Create a comprehensive permaculture project plan for ${locationContext || 'a general location'}. Return ONLY a valid JSON object (no markdown, no explanations, no code blocks) with the following fields as string values (never return objects or nested structures):
        - title: A catchy, descriptive name for the project
        - valuesMissionGoals: Values and mission statement
        - zone0: Description of the house/main building design and features
        - zone1: Plants and elements for Zone 1 (frequent attention)
        - zone2: Plants and elements for Zone 2 (regular attention)
        - zone3: Plants and elements for Zone 3 (occasional attention)
        - zone4: Description of Zone 4 (semi-wild areas)
        - water: Water management systems
        - soil: Soil management approaches
        - power: Energy systems
        - guilds: An array of 3-6 appropriate plant/animal guilds as strings
        - structures: An array of 2-4 appropriate structures as strings

      IMPORTANT: All values must be simple strings, never objects. Arrays must only contain strings. The response must be parseable with JSON.parse().`;
      
      // Use more tokens for comprehensive response
      maxTokens = 1500;
    } else if (fieldName === 'businessPlan') {
      systemPrompt = "You are an expert in permaculture business planning and sustainable enterprise development. Create a detailed, professional business plan that appears to be written by a human expert, not AI. IMPORTANT FORMATTING INSTRUCTIONS: Do not use any markdown formatting - avoid using # symbols for headers, avoid using * for bullets or emphasis, and avoid any other special markdown characters. Use natural paragraph titles with descriptive text for section headers. Avoid excessive numbered lists. Use a conversational, professional style with varied sentence structures. Format content in a way that looks like a polished document created by a professional consultant without relying on special formatting characters. Include all essential business plan components but present them in a natural flow without obvious templated formatting.";
      
      // Increase tokens for business plan
      maxTokens = maxTokens || 3000;
    } else if (fieldName === 'projectImage') {
      // For project image generation, we'll return an Unsplash URL
      const unsplashPrompt = `Find a beautiful, high-quality image on Unsplash that represents: ${prompt}. The image should be suitable for a permaculture or sustainable project. Return ONLY the direct Unsplash image URL, nothing else.`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant that provides Unsplash image URLs. Return only the URL, no other text." },
          { role: "user", content: unsplashPrompt }
        ],
        max_tokens: 100,
        temperature: 0.7,
      });
      
      const responseText = response.choices[0]?.message?.content?.trim() || "";
      
      // Extract URL from the response if it contains one
      const urlRegex = /(https?:\/\/[^\s]+unsplash[^\s]+)/g;
      const matches = responseText.match(urlRegex);
      
      if (matches && matches.length > 0) {
        return matches[0]; // Return the first URL found
      }
      
      // Fallback to a default Unsplash image if no URL is found
      return "https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80";
    } else {
      // Add specific context based on the field being completed
      switch (fieldName) {
        case 'title':
          systemPrompt += " Generate a creative, memorable title for a permaculture project. Keep it concise but descriptive.";
          break;
        case 'valuesMissionGoals':
          systemPrompt += " Create a mission statement and goals for a permaculture project that emphasizes sustainability, regeneration, and community.";
          break;
        case 'zone0':
          systemPrompt += " Describe Zone 0 (house/main building) in a permaculture design. Focus on sustainable features, energy efficiency, and integration with the landscape.";
          if (locationContext) {
            systemPrompt += ` Include specific building considerations appropriate for ${locationContext}'s climate conditions, such as insulation, heating/cooling needs, and appropriate architectural elements.`;
          }
          break;
        case 'zone1':
          systemPrompt += " Describe Zone 1 (frequently visited areas) in a permaculture design. Include suitable plants, design features, and sustainability elements.";
          if (locationContext) {
            systemPrompt += ` Recommend specific plants that thrive in ${locationContext}'s climate and are appropriate for Zone 1's frequent attention needs. Consider local growing conditions and seasons.`;
          }
          break;
        case 'zone2':
          systemPrompt += " Describe Zone 2 (semi-frequently visited areas) in a permaculture design. Include appropriate plantings, animal systems, and management strategies.";
          if (locationContext) {
            systemPrompt += ` Suggest specific fruit trees, perennials, and possibly small animal systems that are well-adapted to ${locationContext}'s climate and can thrive with moderate attention.`;
          }
          break;
        case 'zone3':
          systemPrompt += " Describe Zone 3 (occasionally visited areas) in a permaculture design. Include main crops, larger animals, and management approaches.";
          if (locationContext) {
            systemPrompt += ` Recommend specific field crops, grazing systems, or larger-scale food production methods that work well in ${locationContext}'s growing conditions with minimal intervention.`;
          }
          break;
        case 'zone4':
          systemPrompt += " Describe Zone 4 (rarely visited semi-wild areas) in a permaculture design. Include forestry, foraging, and wildlife habitat elements.";
          if (locationContext) {
            systemPrompt += ` Suggest appropriate native species, forest management techniques, and wildlife corridor designs specific to ${locationContext}'s native ecosystem and biodiversity.`;
          }
          break;
        case 'water':
          systemPrompt += " Describe sustainable water systems for a permaculture project. Include rain harvesting, storage, irrigation, and water conservation strategies.";
          if (locationContext) {
            systemPrompt += ` Provide specific water management techniques appropriate for ${locationContext}'s annual rainfall, seasonal patterns, and local regulations. Consider drought resilience if applicable.`;
          }
          break;
        case 'soil':
          systemPrompt += " Describe soil management strategies for a permaculture project. Include composting, mulching, cover cropping, and soil improvement techniques.";
          if (locationContext) {
            systemPrompt += ` Recommend specific soil amendments, pH adjustments, and improvement techniques based on ${locationContext}'s typical soil conditions. Consider local materials that might be available.`;
          }
          break;
        case 'power':
          systemPrompt += " Describe sustainable energy systems for a permaculture project. Include renewable sources, efficiency measures, and appropriate technology.";
          if (locationContext) {
            systemPrompt += ` Suggest optimal renewable energy sources based on ${locationContext}'s climate conditions (solar potential, wind patterns, hydro possibilities, etc.) and any local energy incentives or programs.`;
          }
          break;
        default:
          systemPrompt += " Provide helpful information on sustainable and regenerative design principles.";
      }
    }
    
    // Make the API call
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    
    // Return the generated text
    return response.choices[0]?.message?.content?.trim() || "Could not generate a response. Please try again.";
    
  } catch (error) {
    console.error('OpenAI API Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate content with AI. Please try again later.');
  }
}