import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenAI, Type, Schema } from 'npm:@google/genai';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface StoreProduct {
  barcode: string;
  name: string;
  category: string;
  price: number;
}

const getSystemPrompt = (productListString: string) => `
### SYSTEM PROMPT: JOUDA_CELIAC_LAB (V7.0 - Evidence Observation Engine)
### ROLE: Forensic Food Safety Observer & Allergen Evidence Extractor

**CORE DIRECTIVE:**
You are NOT the final decision maker. Your ONLY job is to observe, read, and extract factual structured evidence from the food package image or text.
Be thorough, objective, and scientifically precise. Do not guess or extrapolate.

**ACTIVE STORE INVENTORY (Available Gluten-Free Alternatives):**
${productListString}

**EXTRACTION GUIDELINES:**

1. **IMAGE ASSESSMENT:**
   - readable: Set true ONLY if the text on the package is sharp and readable.
   - ingredientsVisible: Set true ONLY if an ingredients list/table is actually visible.
   - ingredientsComplete: Set true ONLY if the ingredients list is completely framed and not cut off.
   - allergenStatementVisible: Set true if an allergen statement (e.g. "تحذير الحساسية", "يحتوي على", "قد يحتوي على") is visible or clearly absent from the label.

2. **GLUTEN TRIGGERS (Direct Forbidden Ingredients):**
   - Detect direct sources of gluten: wheat (قمح، طحين قمح، سميد، نشا قمح غير معالج), barley (شعير، مالت، مستخلص مالت الشعير), rye (جاودار، شيلم), triticale, spelt, or regular uncertified oats (شوفان عادي).
   - If any detected, record the exact ingredient and source category.

3. **ALLERGEN & CROSS-CONTAMINATION WARNINGS:**
   - Detect all cross-contamination notices:
     - "may_contain": e.g. "قد يحتوي على قمح", "قد يحتوي على آثار جلوتين", "may contain wheat/gluten/traces".
     - "shared_equipment": e.g. "صنع على خطوط إنتاج مشتركة مع القمح", "made on shared equipment with wheat".
     - "facility": e.g. "صنع في منشأة تعالج القمح", "manufactured in a facility that processes wheat".
     - "contains": e.g. "يحتوي على قمح".

4. **POSITIVE GLUTEN-FREE EVIDENCE:**
   - glutenFreeClaim: Look for explicit text like "Gluten Free", "خالي من الجلوتين", "Glutensiz".
   - certification: Look for certified badges/symbols (Crossed Grain symbol, GFCO certified mark, national celiac association badge).

5. **STORE ALTERNATIVE SELECTION:**
   - If any gluten triggers or "may_contain" warnings are detected, pick the exact barcode of the closest gluten-free alternative from the STORE INVENTORY above.
   - Otherwise, leave suggestedBarcode as empty string.
`;

const evidenceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    imageAssessment: {
      type: Type.OBJECT,
      properties: {
        readable: { type: Type.BOOLEAN, description: "True if image text is legible." },
        ingredientsVisible: { type: Type.BOOLEAN, description: "True if ingredient list is visible." },
        ingredientsComplete: { type: Type.BOOLEAN, description: "True if ingredient list is completely shown without cutoffs." },
        allergenStatementVisible: { type: Type.BOOLEAN, description: "True if allergen warning area is visible or clearly absent." },
      },
      required: ["readable", "ingredientsVisible", "ingredientsComplete", "allergenStatementVisible"],
    },
    productIdentification: {
      type: Type.OBJECT,
      properties: {
        brand: { type: Type.STRING, description: "Brand name if recognized, or empty string." },
        productName: { type: Type.STRING, description: "Product name if recognized, or empty string." },
        category: { type: Type.STRING, description: "Food category e.g. بسكويت, دقيق, معكرونة, شوكولاتة, حبوب, عام." },
      },
      required: ["brand", "productName", "category"],
    },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of read ingredients in Arabic or original language.",
    },
    glutenTriggers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ingredient: { type: Type.STRING, description: "Detected gluten ingredient name." },
          source: { type: Type.STRING, description: "wheat, barley, rye, malt, regular_oats, or other." },
        },
        required: ["ingredient", "source"],
      },
      description: "Direct gluten sources detected.",
    },
    allergenWarnings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          statement: { type: Type.STRING, description: "Exact warning text found." },
          type: { type: Type.STRING, description: "contains, may_contain, shared_equipment, facility, or none." },
        },
        required: ["statement", "type"],
      },
      description: "All allergen warnings and cross-contact statements.",
    },
    glutenFreeClaim: {
      type: Type.OBJECT,
      properties: {
        found: { type: Type.BOOLEAN, description: "True if packaging has a 'Gluten Free' text claim." },
        text: { type: Type.STRING, description: "The claim text found or empty string." },
      },
      required: ["found", "text"],
    },
    certification: {
      type: Type.OBJECT,
      properties: {
        found: { type: Type.BOOLEAN, description: "True if an official certified GF logo is found." },
        type: { type: Type.STRING, description: "Name/type of certification logo, or empty string." },
      },
      required: ["found", "type"],
    },
    suggestedBarcode: {
      type: Type.STRING,
      description: "Exact barcode of the selected alternative from store inventory, or empty string.",
    },
    notes: {
      type: Type.STRING,
      description: "Short Arabic summary of factual visual findings.",
    },
  },
  required: [
    "imageAssessment",
    "productIdentification",
    "ingredients",
    "glutenTriggers",
    "allergenWarnings",
    "glutenFreeClaim",
    "certification",
    "suggestedBarcode",
    "notes",
  ],
};

interface GeminiEvidence {
  imageAssessment: {
    readable: boolean;
    ingredientsVisible: boolean;
    ingredientsComplete: boolean;
    allergenStatementVisible: boolean;
  };
  productIdentification: {
    brand: string;
    productName: string;
    category: string;
  };
  ingredients: string[];
  glutenTriggers: { ingredient: string; source: string }[];
  allergenWarnings: { statement: string; type: string }[];
  glutenFreeClaim: { found: boolean; text: string };
  certification: { found: boolean; type: string };
  suggestedBarcode: string;
  notes: string;
}

interface SafetyVerdict {
  verdict: 'SAFE' | 'RISKY' | 'UNSAFE';
  verdictTitle: string;
  reasonCode: string;
  analysis: string;
  guidance: string;
}

/**
 * Deterministic TypeScript Safety Engine
 * Applies the Celiac Safety Decision Matrix strictly in code.
 */
function evaluateSafety(evidence: GeminiEvidence, isTextSearch: boolean): SafetyVerdict {
  // Scenario: Text-only search
  if (isTextSearch) {
    if (evidence.glutenTriggers && evidence.glutenTriggers.length > 0) {
      const triggersText = evidence.glutenTriggers.map((t) => t.ingredient).join('، ');
      return {
        verdict: 'UNSAFE',
        verdictTitle: 'يحتوي على جلوتين ⛔',
        reasonCode: 'TRIGGER_GLUTEN_TEXT',
        analysis: `المنتج المدخل معروف باحتوائه على مصادر جلوتين: ${triggersText}.`,
        guidance: 'المنتج غير آمن لمرضى السيلياك؛ تجنب تناوله نهائياً.',
      };
    }
    return {
      verdict: 'RISKY',
      verdictTitle: 'فحص بالاسم (إرشادي فقط) ⚠️',
      reasonCode: 'TEXT_SEARCH_INFORMATIONAL',
      analysis: 'البحث بالاسم يقدم معلومات تقديرية عامة؛ تختلف المكونات حسب بلد التصنيع ولا يمكن الجزم بالسلامة دون مطابقة العبوة.',
      guidance: 'صوّر جدول المكونات والتحذيرات على العبوة الفعلية للحصول على تأكيد قطعي.',
    };
  }

  // 1. Check image legibility
  if (!evidence.imageAssessment.readable) {
    return {
      verdict: 'RISKY',
      verdictTitle: 'الصورة غير واضحة ⚠️',
      reasonCode: 'IMAGE_UNREADABLE',
      analysis: 'النصوص أو جدول المكونات غير واضحة أو معتمة بما يتعذر معه التحقق العلمي الدقيق.',
      guidance: 'يُرجى تثبيت الكاميرا والتصوير في إضاءة جيدة ومباشرة.',
    };
  }

  // 2. Check if ingredients table is visible
  if (!evidence.imageAssessment.ingredientsVisible) {
    return {
      verdict: 'RISKY',
      verdictTitle: 'جدول المكونات غير ظاهر ⚠️',
      reasonCode: 'MISSING_INGREDIENTS',
      analysis: 'الصورة تُظهر الواجهة أو الاسم فقط، ولم يظهر جدول المكونات والتحذيرات الخلفية للتأكد من خلوه.',
      guidance: 'وجّه الكاميرا نحو قائمة المكونات والتحذيرات المطبوعة خلف العبوة.',
    };
  }

  // 3. Check direct forbidden gluten triggers (WHEAT, BARLEY, RYE, MALT, REGULAR OATS)
  if (evidence.glutenTriggers && evidence.glutenTriggers.length > 0) {
    const triggersList = evidence.glutenTriggers.map((t) => t.ingredient).join('، ');
    return {
      verdict: 'UNSAFE',
      verdictTitle: 'يحتوي على جلوتين ⛔',
      reasonCode: 'GLUTEN_TRIGGER_DETECTED',
      analysis: `تم رصد مكونات تحتوي على الجلوتين صراحة: ${triggersList}.`,
      guidance: 'يسبب ضرراً لأمعاء مريض السيلياك؛ تجنب تناوله نهائياً.',
    };
  }

  // 4. Check allergen & cross-contamination warnings
  const allergenWarnings = evidence.allergenWarnings || [];
  
  // 4a. High-risk cross-contamination (may contain wheat / traces / gluten)
  const highRiskWarning = allergenWarnings.find((w) => {
    const s = (w.statement || '').toLowerCase();
    const t = (w.type || '').toLowerCase();
    return (
      t === 'may_contain' ||
      t === 'contains' ||
      s.includes('قمح') ||
      s.includes('جلوتين') ||
      s.includes('شعير') ||
      s.includes('wheat') ||
      s.includes('gluten') ||
      s.includes('traces')
    );
  });

  if (highRiskWarning) {
    return {
      verdict: 'UNSAFE',
      verdictTitle: 'غير آمن — تحذير تلوث تلامسي ⛔',
      reasonCode: 'WARNING_MAY_CONTAIN_GLUTEN',
      analysis: `العبوة تحمل تحذيراً صريحاً: "${highRiskWarning.statement}". تلوث آثار القمح يتجاوز الحد الآمن للسيلياك (20ppm).`,
      guidance: 'المنتج يشكل خطراً على مريض السيلياك بسبب التلوث التلامسي؛ لا تتناوله.',
    };
  }

  // 4b. Facility / shared equipment warnings
  const facilityWarning = allergenWarnings.find((w) => {
    const t = (w.type || '').toLowerCase();
    return t === 'shared_equipment' || t === 'facility';
  });

  if (facilityWarning) {
    return {
      verdict: 'RISKY',
      verdictTitle: 'غير مؤكد — خطوط إنتاج مشتركة ⚠️',
      reasonCode: 'SHARED_FACILITY_RISK',
      analysis: `المنتج يحمل تحذير تصنيع مشترك: "${facilityWarning.statement}". لا يمكن استبعاد التلوث الخفي.`,
      guidance: 'يُفضل توخي الحذر والاعتماد على منتج معتمد مخصص للسيلياك.',
    };
  }

  // 5. Check if ingredients list is complete
  if (!evidence.imageAssessment.ingredientsComplete) {
    return {
      verdict: 'RISKY',
      verdictTitle: 'قائمة المكونات مقتطعة ⚠️',
      reasonCode: 'INCOMPLETE_INGREDIENTS',
      analysis: 'جزء من قائمة المكونات مقتطع من زوايا الصورة، ولا يمكن الجزم بالأمان بقائمة ناقصة.',
      guidance: 'أعد التصوير بحيث يظهر كامل جدول المكونات والتحذيرات داخل الإطار.',
    };
  }

  // 6. Check for vague suspicious ingredients (e.g. نشا معدل مجهول)
  const ingredientsStr = (evidence.ingredients || []).join(' ').toLowerCase();
  if (ingredientsStr.includes('نشا معدل') || ingredientsStr.includes('modified starch')) {
    if (!ingredientsStr.includes('ذرة') && !ingredientsStr.includes('بطاطس') && !ingredientsStr.includes('tapioca') && !ingredientsStr.includes('corn')) {
      return {
        verdict: 'RISKY',
        verdictTitle: 'مكونات مبهمة المصدر ⚠️',
        reasonCode: 'VAGUE_INGREDIENTS',
        analysis: 'يحتوي على نشا معدل غير محدد المصدر قد يشتق من القمح.',
        guidance: 'تأكد من موقع الشركة المصنعة أو ابحث عن منتج يحمل شعار خالي من الجلوتين.',
      };
    }
  }

  // 7. POSITIVE EVIDENCE CHECKS FOR SAFE
  // 7a. Official certification logo found
  if (evidence.certification && evidence.certification.found) {
    const certType = evidence.certification.type ? ` (${evidence.certification.type})` : '';
    return {
      verdict: 'SAFE',
      verdictTitle: 'خالي من الجلوتين ومعتمد ✓',
      reasonCode: 'CERTIFIED_GLUTEN_FREE',
      analysis: `يحمل شعار اعتماد خلو الجلوتين الرسمي${certType}، والمكونات خالية تماماً من مصادر القمح والشعير.`,
      guidance: 'المنتج آمن تماماً للاستهلاك لمرضى السيلياك وحساسية الجلوتين.',
    };
  }

  // 7b. Explicit Gluten-Free claim on packaging
  if (evidence.glutenFreeClaim && evidence.glutenFreeClaim.found) {
    const claimText = evidence.glutenFreeClaim.text ? ` "${evidence.glutenFreeClaim.text}"` : '';
    return {
      verdict: 'SAFE',
      verdictTitle: 'خالي من الجلوتين ✓',
      reasonCode: 'CLAIMED_GLUTEN_FREE',
      analysis: `المكونات خالية من القمح ومشتقاته، ويحمل تصريحاً صريحاً بخلوه من الجلوتين${claimText}.`,
      guidance: 'المنتج آمن للاستهلاك لمرضى السيلياك.',
    };
  }

  // 8. Clean ingredients but NO certification and NO claim
  return {
    verdict: 'RISKY',
    verdictTitle: 'المكونات خالية لكن غير موثق ⚠️',
    reasonCode: 'UNLABELED_CLEAN_INGREDIENTS',
    analysis: 'قائمة المكونات الظاهرة لا تحوي قمحاً، لكن العبوة لا تحمل أي تصريح أو شعار خلو الجلوتين؛ مما يبقي خطر التلوث الخفي وارداً.',
    guidance: 'يُفضل الحذر والاعتماد على منتجات موثقة رسمياً بخلوها من الجلوتين.',
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image, productName } = await req.json();

    if (!image && !productName) {
      return new Response(
        JSON.stringify({ error: 'Missing image or productName in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured in server environment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Connect to Supabase to fetch live products with barcodes & prices
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: rawProducts } = await supabase
      .from('products')
      .select('barcode, name, category, price')
      .eq('is_active', true);

    const storeProducts: StoreProduct[] = (rawProducts || []).map((p: any) => ({
      barcode: String(p.barcode || ''),
      name: String(p.name || ''),
      category: String(p.category || 'عام'),
      price: Number(p.price) || 0,
    }));

    const productListString = storeProducts.length > 0
      ? storeProducts.map((p) => `- [باركود: ${p.barcode}] ${p.name} (قسم: ${p.category})`).join('\n')
      : 'لا توجد منتجات مسجلة حالياً';

    const ai = new GoogleGenAI({ apiKey });
    const modelId = 'gemini-2.5-flash';
    const config = {
      systemInstruction: getSystemPrompt(productListString),
      responseMimeType: 'application/json',
      responseSchema: evidenceSchema,
      temperature: 0.1,
    };

    let contents;
    const isTextSearch = !image && Boolean(productName);

    if (image) {
      const base64Data = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      contents = {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
            },
          },
          {
            text: 'Carefully inspect this food package. Extract all ingredients, allergen warnings, and certification logos into the structured schema.',
          },
        ],
      };
    } else {
      contents = {
        parts: [
          {
            text: `Analyze this food product name: "${productName}". Identify its typical ingredients and gluten status into the structured schema.`,
          },
        ],
      };
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents,
      config,
    });

    if (!response.text) {
      throw new Error('No response from Gemini');
    }

    const rawEvidence: GeminiEvidence = JSON.parse(response.text);

    // Apply Deterministic TypeScript Safety Engine
    const evaluation = evaluateSafety(rawEvidence, isTextSearch);

    // Alternative Resolution: Code verified lookup
    let verifiedAlternative: StoreProduct | null = null;

    if (evaluation.verdict === 'UNSAFE') {
      // 1. Try matching suggested barcode from Gemini
      if (rawEvidence.suggestedBarcode) {
        const found = storeProducts.find((p) => p.barcode === rawEvidence.suggestedBarcode.trim());
        if (found) verifiedAlternative = found;
      }

      // 2. If no barcode match, try matching category
      if (!verifiedAlternative && rawEvidence.productIdentification?.category) {
        const cat = rawEvidence.productIdentification.category.trim();
        const foundInCat = storeProducts.find((p) => p.category.includes(cat) || cat.includes(p.category));
        if (foundInCat) verifiedAlternative = foundInCat;
      }

      // 3. Fallback to first available active store product if still not found
      if (!verifiedAlternative && storeProducts.length > 0) {
        verifiedAlternative = storeProducts[0];
      }
    }

    const finalResponse = {
      verdict: evaluation.verdict,
      verdictTitle: evaluation.verdictTitle,
      reasonCode: evaluation.reasonCode,
      analysis: evaluation.analysis,
      guidance: evaluation.guidance,
      matchedStoreItem: verifiedAlternative ? verifiedAlternative.name : null, // Backward compatibility
      alternative: verifiedAlternative
        ? {
            barcode: verifiedAlternative.barcode,
            name: verifiedAlternative.name,
            price: verifiedAlternative.price,
            category: verifiedAlternative.category,
          }
        : null,
      evidence: {
        imageAssessment: rawEvidence.imageAssessment,
        productIdentification: rawEvidence.productIdentification,
        ingredients: rawEvidence.ingredients || [],
        glutenTriggers: rawEvidence.glutenTriggers || [],
        warnings: rawEvidence.allergenWarnings || [],
        glutenFreeClaim: rawEvidence.glutenFreeClaim || { found: false, text: '' },
        certification: rawEvidence.certification || { found: false, type: '' },
        notes: rawEvidence.notes || '',
      },
      timestamp: Date.now(),
    };

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Gemini Analysis Error:', error);

    // Check for quota exhaustion (429)
    const errorMessage = String(error).toLowerCase();
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('exhausted')) {
      return new Response(
        JSON.stringify({ error: 'QUOTA_EXCEEDED' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
