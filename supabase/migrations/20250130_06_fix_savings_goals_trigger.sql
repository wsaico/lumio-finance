-- Function to calculate total contributions and update goal
CREATE OR REPLACE FUNCTION update_goal_current_amount()
RETURNS TRIGGER AS $$
DECLARE
    target_goal_id UUID;
    total_amount DECIMAL(15, 2);
BEGIN
    -- Determine the goal_id based on the operation
    IF (TG_OP = 'DELETE') THEN
        target_goal_id := OLD.goal_id;
    ELSE
        target_goal_id := NEW.goal_id;
    END IF;

    -- Calculate total contributions for this goal
    SELECT COALESCE(SUM(amount), 0)
    INTO total_amount
    FROM goal_contributions
    WHERE goal_id = target_goal_id;

    -- Update the savings goal current_amount
    UPDATE savings_goals
    SET current_amount = total_amount,
        updated_at = NOW()
    WHERE id = target_goal_id;

    -- Check and award milestones
    PERFORM check_and_award_milestone(target_goal_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_goal_amount ON goal_contributions;
CREATE TRIGGER trigger_update_goal_amount
    AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_current_amount();

-- Recalculate all existing goals to ensure consistency
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM savings_goals LOOP
        PERFORM check_and_award_milestone(r.id);
        
        UPDATE savings_goals
        SET current_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM goal_contributions
            WHERE goal_id = r.id
        )
        WHERE id = r.id;
    END LOOP;
END $$;
