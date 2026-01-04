import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/constants/default-categories';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { description, categoryId, subcategoryId } = await req.json();

    if (!description || !categoryId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // 1. Verify/Materialize PARENT Category
    let { data: category, error: categoryError } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('user_id', user.id)
      .single();

    // If category not found in DB, check if it's a DEFAULT category to materialize
    if ((categoryError || !category) && DEFAULT_EXPENSE_CATEGORIES) {
      const defaultCategory = DEFAULT_EXPENSE_CATEGORIES.find(c => c.id === categoryId);

      if (defaultCategory) {
        // Materialize Parent
        const { data: newCategory, error: createError } = await supabase
          .from('expense_categories')
          .insert({
            id: defaultCategory.id,
            user_id: user.id,
            name: defaultCategory.name,
            icon: defaultCategory.icon,
            color: defaultCategory.color,
            is_active: true,
            sort_order: 0,
          })
          .select('id')
          .single();

        if (!createError && newCategory) {
          category = newCategory;
          categoryError = null;
        } else {
          console.error('Failed to materialize default category:', createError);
          return NextResponse.json({ message: 'Skipped default category (materialization failed)', learned: 0 }, { status: 200 });
        }
      }
    }

    if (categoryError || !category) {
      // Check income categories
      const { data: income, error: incomeError } = await supabase
        .from('income_categories')
        .select('id')
        .eq('id', categoryId)
        .eq('user_id', user.id)
        .single();

      if (income) {
        // It's a valid income category, proceed
        category = income;
        categoryError = null;
      } else {
        // Log specifically what ID failed
        return NextResponse.json({
          message: 'Category not found (skipping learning)',
          details: `ID ${categoryId} not materialized.`,
          learned: 0
        }, { status: 200 }); // Return 200 to keep the UI smooth
      }
    }

    // 2. Verify/Materialize SUBCATEGORY (if provided)
    if (subcategoryId) {
      let { data: subcategory, error: subError } = await supabase
        .from('subcategories')
        .select('id')
        .eq('id', subcategoryId)
        .single();

      if (subError || !subcategory) {
        // Check if it's a default subcategory
        const defaultParent = DEFAULT_EXPENSE_CATEGORIES.find(c => c.id === categoryId);
        const defaultSub = defaultParent?.subcategories?.find(s => s.id === subcategoryId);

        if (defaultSub) {
          // Materialize Subcategory
          const { error: createSubError } = await supabase
            .from('subcategories')
            .insert({
              id: defaultSub.id,
              expense_category_id: categoryId,
              name: defaultSub.name,
              is_active: true
            });

          if (createSubError) {
            console.error('[LEARN_API] Failed to materialize default subcategory:', createSubError);
          }
        } else {
        }
      }
    }

    // Normalize description and extract keywords
    const keywords = description
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word: string) => word.length > 2)
      .slice(0, 10);

    if (keywords.length === 0) {
      return NextResponse.json({ message: 'No keywords to learn', learned: 0 }, { status: 200 });
    }

    let learnedCount = 0;

    for (const keyword of keywords) {
      const safeKeyword = keyword.slice(0, 190);

      try {
        // Check if association exists (matching both category AND subcategory)
        let query = supabase
          .from('category_learning')
          .select('*')
          .eq('user_id', user.id)
          .eq('keyword', safeKeyword);

        // IMPORTANT: We update if the keyword matches, but we should also check if we are 
        // switching categories for this keyword. For simplicity, we filter by category too.
        query = query.eq('category_id', categoryId);

        if (subcategoryId) {
          query = query.eq('subcategory_id', subcategoryId);
        } else {
          query = query.is('subcategory_id', null);
        }

        const { data: existing } = await query.single();

        if (existing) {
          // Update
          await supabase
            .from('category_learning')
            .update({
              times_used: existing.times_used + 1,
              last_used_at: new Date().toISOString(),
              confidence: Math.min(1.0, Number(existing.confidence) + 0.1)
            })
            .eq('id', existing.id);
        } else {
          // Insert
          await supabase
            .from('category_learning')
            .insert({
              user_id: user.id,
              keyword: safeKeyword,
              category_id: categoryId,
              subcategory_id: subcategoryId || null,
              confidence: 0.5,
              times_used: 1,
              last_used_at: new Date().toISOString()
            });
        }
        learnedCount++;
      } catch (err) {
        console.error(`[LEARN_API] Error processing keyword "${keyword}":`, err);
      }
    }

    return NextResponse.json({
      message: 'Category association processed',
      learned: learnedCount,
      keywords,
    });
  } catch (error) {
    console.error('[LEARN_API] Fatal Error:', error);
    // Even on fatal error, we return 200 with an error flag to avoid blocking UI
    return NextResponse.json(
      { error: 'Internal Learning Failure', details: String(error), learned: 0 },
      { status: 200 }
    );
  }
}
