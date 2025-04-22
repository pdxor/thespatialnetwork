import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.1";

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
    const { query, userId } = await req.json();

    if (!query || !userId) {
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

    // Get the user's Google API key and CSE ID from the database
    const { data: apiKeyData, error: apiKeyError } = await supabaseClient
      .from("api_keys")
      .select("key")
      .eq("user_id", userId)
      .eq("service", "google")
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: "No Google API key found for this user" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: cseData, error: cseError } = await supabaseClient
      .from("api_keys")
      .select("key")
      .eq("user_id", userId)
      .eq("service", "google_cse")
      .single();

    if (cseError || !cseData) {
      return new Response(
        JSON.stringify({ error: "No Google Custom Search Engine ID found for this user" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const googleApiKey = apiKeyData.key;
    const cseId = cseData.key;

    // Prepare search query
    const searchQuery = encodeURIComponent(`${query} price buy online`);
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${cseId}&q=${searchQuery}&num=5`;

    // Call Google Custom Search API
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google API error: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    // Process and extract relevant information
    const results = data.items?.map((item: any) => {
      // Try to extract price from the title or snippet
      const priceRegex = /\$\s*(\d+(?:\.\d{1,2})?)/g;
      const titlePriceMatch = item.title.match(priceRegex);
      const snippetPriceMatch = item.snippet.match(priceRegex);
      
      let price = null;
      if (titlePriceMatch) {
        price = parseFloat(titlePriceMatch[0].replace('$', '').trim());
      } else if (snippetPriceMatch) {
        price = parseFloat(snippetPriceMatch[0].replace('$', '').trim());
      }
      
      return {
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        source: item.displayLink,
        price: price,
        image: item.pagemap?.cse_image?.[0]?.src || null
      };
    }) || [];

    return new Response(
      JSON.stringify({ results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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