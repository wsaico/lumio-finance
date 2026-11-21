export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const SPANISH_STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'en', 'por', 'para', 'con', 'sin', 'sobre', 'mi', 'mis', 'tu', 'tus',
  'a', 'al', 'y', 'o', 'e', 'u', 'que', 'se', 'lo', 'le', 'su', 'sus',
  // Generic transaction action words that cause false matches (e.g. "Compra de libro" matching "Compras supermercado")
  'compra', 'compras', 'comprar', 'pago', 'pagos', 'pagar', 'gasto', 'gastos',
  'ingreso', 'ingresos', 'abono', 'cobro', 'cuenta', 'factura', 'boleta', 'recibo',
]);

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemWord(word: string): string {
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function wordsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const sa = stemWord(a);
  const sb = stemWord(b);
  if (sa.length >= 3 && sb.length >= 3 && (sa === sb || sa.startsWith(sb) || sb.startsWith(sa))) {
    return true;
  }
  return false;
}

interface PredictionEntry {
  score: number;
  categoryId: string;
  subcategoryId: string | null;
  categoryName: string;
  subcategoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  matchedKeywords: Set<string>;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { description, type = 'EXPENSE' } = body as {
      description?: string;
      type?: 'EXPENSE' | 'INCOME';
    };

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ suggestions: [] });
    }

    const normalized = normalizeText(description);
    const allTokens = normalized.split(' ').filter((w) => w.length >= 2);
    if (allTokens.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Prioritize meaningful semantic keywords over generic action/stop words
    const meaningfulTokens = allTokens.filter((w) => !SPANISH_STOPWORDS.has(w) && w.length >= 3);
    const keywords = (meaningfulTokens.length > 0 ? meaningfulTokens : allTokens).slice(0, 6);

    const catTable = type === 'INCOME' ? 'income_categories' : 'expense_categories';
    const orLearning = keywords.map((k) => `keyword.ilike.${stemWord(k)}%`).join(',');
    const orHistory = keywords.map((k) => `description.ilike.%${stemWord(k)}%`).join(',');

    // Parallel queries: Categories+Subcategories, Learned keywords, and Transaction History
    const [categoriesRes, subcategoriesRes, learningRes, historyRes] = await Promise.all([
      supabase
        .from(catTable)
        .select('id, name, icon, color')
        .or(`user_id.eq.${user.id},user_id.is.null`),
      type === 'EXPENSE'
        ? supabase
            .from('subcategories')
            .select('id, name, expense_category_id')
            .or(`user_id.eq.${user.id},user_id.is.null`)
        : Promise.resolve({ data: [] as any[] }),
      orLearning
        ? supabase
            .from('category_learning')
            .select(`
              *,
              expense_category:expense_categories (id, name, icon, color),
              income_category:income_categories (id, name, icon, color),
              subcategory:subcategories (id, name)
            `)
            .eq('user_id', user.id)
            .or(orLearning)
        : Promise.resolve({ data: [] as any[] }),
      orHistory
        ? supabase
            .from('transactions')
            .select(`
              description,
              transaction_type,
              expense_category_id,
              income_category_id,
              subcategory_id,
              expense_category:expense_categories(id, name, icon, color),
              income_category:income_categories(id, name, icon, color),
              subcategory:subcategories (id, name)
            `)
            .eq('user_id', user.id)
            .eq('transaction_type', type)
            .or(orHistory)
            .order('created_at', { ascending: false })
            .limit(25)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const predictionScores: Record<string, PredictionEntry> = {};
    const addScore = (
      cat: { id: string; name: string; icon: string | null; color: string | null },
      sub: { id: string; name: string } | null,
      points: number,
      matchedWord: string
    ) => {
      const key = sub?.id ? `${cat.id}|${sub.id}` : cat.id;
      if (!predictionScores[key]) {
        predictionScores[key] = {
          score: 0,
          categoryId: cat.id,
          subcategoryId: sub?.id || null,
          categoryName: cat.name,
          subcategoryName: sub?.name || null,
          categoryIcon: cat.icon,
          categoryColor: cat.color,
          matchedKeywords: new Set(),
        };
      }
      predictionScores[key].score += points;
      predictionScores[key].matchedKeywords.add(matchedWord);
    };

    const categoriesMap = new Map<string, { id: string; name: string; icon: string | null; color: string | null }>();
    (categoriesRes.data || []).forEach((c: any) => categoriesMap.set(c.id, c));

    // TIER 1: Direct semantic match against user's Categories & Subcategories
    (subcategoriesRes.data || []).forEach((sub: any) => {
      const parent = categoriesMap.get(sub.expense_category_id);
      if (!parent) return;
      const subTokens = normalizeText(sub.name).split(' ').filter((w) => w.length >= 3);
      for (const kw of keywords) {
        if (subTokens.some((st) => wordsMatch(kw, st))) {
          addScore(parent, { id: sub.id, name: sub.name }, 60, kw);
        }
      }
    });

    categoriesMap.forEach((cat) => {
      const catTokens = normalizeText(cat.name)
        .split(' ')
        .filter((w) => w.length >= 3 && !SPANISH_STOPWORDS.has(w));
      for (const kw of keywords) {
        if (catTokens.some((ct) => wordsMatch(kw, ct))) {
          addScore(cat, null, 35, kw);
        }
      }
    });

    // TIER 2: Explicit user-learned associations (filtered by active type)
    const now = new Date();
    (learningRes.data || []).forEach((record: any) => {
      const category = type === 'INCOME' ? record.income_category : record.expense_category;
      if (!category) return;
      const kwNorm = normalizeText(record.keyword || '');
      if (!kwNorm || SPANISH_STOPWORDS.has(kwNorm)) return;

      const daysSince = (now.getTime() - new Date(record.last_used_at).getTime()) / (1000 * 60 * 60 * 24);
      const recencyFactor = Math.max(0.5, 1 - daysSince * 0.04);
      const isExact = keywords.some((k) => wordsMatch(k, kwNorm));
      const points = (Number(record.confidence) || 1) * (record.times_used || 1) * recencyFactor * (isExact ? 25 : 10);

      addScore(category, record.subcategory || null, points, record.keyword);
    });

    // TIER 3: Historical transaction matches (scored by meaningful keyword overlap)
    (historyRes.data || []).forEach((t: any) => {
      const category = type === 'INCOME' ? t.income_category : t.expense_category;
      if (!category) return;
      const txTokens = normalizeText(t.description || '')
        .split(' ')
        .filter((w) => w.length >= 3 && !SPANISH_STOPWORDS.has(w));

      const overlap = keywords.filter((kw) => txTokens.some((tt) => wordsMatch(kw, tt)));
      if (overlap.length === 0) return;

      addScore(category, t.subcategory || null, overlap.length * 12, overlap[0]);
    });

    const suggestions = Object.values(predictionScores)
      .filter((item) => item.score >= 10)
      .map((item) => ({
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId,
        categoryName: item.categoryName,
        subcategoryName: item.subcategoryName,
        categoryIcon: item.categoryIcon,
        categoryColor: item.categoryColor,
        confidence: Math.round(item.score),
        matchedKeywords: Array.from(item.matchedKeywords),
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
      throw error;
    }
    console.error('Error generating suggestions:', error);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
