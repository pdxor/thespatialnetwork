// Follow Deno's ES modules convention
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.1";
import OpenAI from "npm:openai@4.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get request body
    const { prompt, userId } = await req.json();

    if (!prompt || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user's OpenAI API key from the database
    const { data: apiKeyData, error: apiKeyError } = await supabaseClient
      .from("api_keys")
      .select("key")
      .eq("user_id", userId)
      .eq("service", "openai")
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: "No OpenAI API key found for this user" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create OpenAI client with the user's API key
    const openai = new OpenAI({
      apiKey: apiKeyData.key,
    });

    // Prepare the prompt for price estimation
    const systemPrompt = `You are a helpful assistant that estimates prices for items. 
    Given a description of an item, provide your best estimate of its current market price in USD.
    Respond with ONLY a JSON object in the format: {"price": number}
    For example: {"price": 29.99}
    Do not include any explanations or additional text.`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.5,
    });

    // Extract the price from the response
    const content = response.choices[0]?.message?.content?.trim() || "";
    
    try {
      // Try to parse the JSON response
      const priceData = JSON.parse(content);
      
      return new Response(
        JSON.stringify(priceData),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (parseError) {
      // If parsing fails, try to extract the price using regex
      const priceMatch = content.match(/\{.*"price":\s*(\d+\.?\d*).*\}/);
      if (priceMatch && priceMatch[1]) {
        const price = parseFloat(priceMatch[1]);
        return new Response(
          JSON.stringify({ price }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      throw new Error("Failed to parse price from OpenAI response");
    }
  } catch (error) {
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});