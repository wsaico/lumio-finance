DO $$
DECLARE
    cols TEXT;
BEGIN
    SELECT string_agg(column_name, ', ')
    INTO cols
    FROM information_schema.columns
    WHERE table_name = 'subcategories';

    RAISE EXCEPTION 'Subcategories Columns: %', cols;
END;
$$;
