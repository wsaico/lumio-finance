export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface SubCategory {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface LearningRecord {
  id: string;
  keyword: string;
  category_id: string;
  subcategory_id: string | null;
  confidence: number;
  times_used: number;
  last_used_at: string;
  expense_category?: Category;
  income_category?: Category;
  subcategory: SubCategory | null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { description } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ suggestions: [] });
    }

    // Normalize description and extract keywords
    const keywords = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length >= 2) // Allow 2 chars for improved responsiveness
      .slice(0, 5); // Limit to 5 keywords to avoid complex queries

    if (keywords.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Build OR query for prefix matching
    const orConditions = keywords.map(k => `keyword.ilike.${k}%`).join(',')

    // 1. Get explicitly learned associations
    let learningQuery = supabase
      .from('category_learning')
      .select(`
        *,
        expense_category:expense_categories (id, name, icon, color),
        income_category:income_categories (id, name, icon, color),
        subcategory:subcategories (id, name)
      `)
      .eq('user_id', user.id)

    if (orConditions) {
      learningQuery = learningQuery.or(orConditions)
    }

    // 2. Fallback: Search in ACTUAL transaction history for similar descriptions
    const transactionQuery = supabase
      .from('transactions')
      .select(`
        description,
        expense_category_id,
        income_category_id,
        subcategory_id,
        expense_category:expense_categories(id, name, icon, color),
        income_category:income_categories(id, name, icon, color),
        subcategory:subcategories (id, name)
      `)
      .eq('user_id', user.id)
      .ilike('description', `%${description.split(' ')[0]}%`) // Search by first word
      .order('created_at', { ascending: false })
      .limit(20)

    const [learningResult, historyResult] = await Promise.all([
      learningQuery,
      transactionQuery
    ])

    const { data: learningData, error: learningError } = learningResult
    const { data: historyData } = historyResult

    if (learningError) {
      console.error('Error fetching learning data:', learningError);
    }

    // Calculate scores
    const predictionScores: Record<
      string,
      {
        score: number;
        categoryId: string;
        subcategoryId: string | null;
        categoryName: string;
        subcategoryName: string | null;
        categoryIcon: string | null;
        categoryColor: string | null;
        matchedKeywords: Set<string>;
      }
    > = {};

    const now = new Date();

    // Process explicit learning (Priority)
    if (learningData) {
      (learningData as unknown as LearningRecord[]).forEach((record) => {
        const category = record.expense_category || record.income_category;
        if (!category) return;

        const categoryId = record.category_id;
        const subcategoryId = record.subcategory_id;
        const key = subcategoryId ? `${categoryId}|${subcategoryId}` : categoryId;

        const daysSinceLastUse = (now.getTime() - new Date(record.last_used_at).getTime()) / (1000 * 60 * 60 * 24);
        const recencyFactor = Math.max(0.5, 1 - daysSinceLastUse * 0.05);

        if (!predictionScores[key]) {
          predictionScores[key] = {
            score: 0,
            categoryId: category.id,
            subcategoryId: record.subcategory?.id || null,
            categoryName: category.name,
            subcategoryName: record.subcategory?.name || null,
            categoryIcon: category.icon,
            categoryColor: category.color,
            matchedKeywords: new Set(),
          };
        }

        const isExactMatch = keywords.includes(record.keyword);
        const matchBonus = isExactMatch ? 2.5 : 1.0;
        const confidence = Number(record.confidence) || 1.0;

        predictionScores[key].score += confidence * record.times_used * recencyFactor * matchBonus * 10;
        predictionScores[key].matchedKeywords.add(record.keyword);
      });
    }

    // Process history fallback (Secondary but fills gaps)
    if (historyData) {
      historyData.forEach((t: any) => {
        const category = t.expense_category || t.income_category;
        if (!category) return;

        const categoryId = category.id;
        const subcategoryId = t.subcategory_id;
        const key = subcategoryId ? `${categoryId}|${subcategoryId}` : categoryId;

        if (!predictionScores[key]) {
          predictionScores[key] = {
            score: 0,
            categoryId: category.id,
            subcategoryId: t.subcategory?.id || null,
            categoryName: category.name,
            subcategoryName: t.subcategory?.name || null,
            categoryIcon: category.icon,
            categoryColor: category.color,
            matchedKeywords: new Set(['history_match']),
          };
        }

        predictionScores[key].score += 1; // Base point for each occurrence in history
      });
    }

    // Convert to array and sort
    const suggestions = Object.values(predictionScores)
      .map((item) => ({
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId, // New field
        categoryName: item.categoryName,
        subcategoryName: item.subcategoryName, // New field
        categoryIcon: item.categoryIcon,
        categoryColor: item.categoryColor,
        confidence: item.score,
        matchedKeywords: Array.from(item.matchedKeywords),
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Return top 3 suggestions

    return NextResponse.json({ suggestions });
  } catch (error) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { suggestions: [] },
      { status: 200 }
    );
  }
}
