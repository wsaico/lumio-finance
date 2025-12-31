-- Migration Part 5: Create Functions and Triggers

-- Function for updated_at trigger
CREATE OR REPLACE FUNCTION update_savings_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_savings_goals_updated_at
    BEFORE UPDATE ON savings_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_savings_goals_updated_at();

-- Function to calculate goal progress percentage
CREATE OR REPLACE FUNCTION calculate_goal_progress(goal_id_param UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    target DECIMAL(15, 2);
    current DECIMAL(15, 2);
BEGIN
    SELECT target_amount, current_amount
    INTO target, current
    FROM savings_goals
    WHERE id = goal_id_param;
    
    IF target = 0 OR target IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((current / target) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to check and award milestones
CREATE OR REPLACE FUNCTION check_and_award_milestone(goal_id_param UUID)
RETURNS void AS $$
DECLARE
    progress DECIMAL(5, 2);
    current_amt DECIMAL(15, 2);
    milestone_to_award VARCHAR(50);
BEGIN
    -- Get current progress
    progress := calculate_goal_progress(goal_id_param);
    
    SELECT current_amount INTO current_amt
    FROM savings_goals
    WHERE id = goal_id_param;
    
    -- Determine which milestone to award
    IF progress >= 100 THEN
        milestone_to_award := 'COMPLETED';
    ELSIF progress >= 75 THEN
        milestone_to_award := '75_PERCENT';
    ELSIF progress >= 50 THEN
        milestone_to_award := '50_PERCENT';
    ELSIF progress >= 25 THEN
        milestone_to_award := '25_PERCENT';
    ELSE
        RETURN;
    END IF;
    
    -- Insert milestone if not exists
    INSERT INTO goal_milestones (goal_id, milestone_type, amount_at_achievement)
    VALUES (goal_id_param, milestone_to_award, current_amt)
    ON CONFLICT (goal_id, milestone_type) DO NOTHING;
    
    -- Update goal status if completed
    IF milestone_to_award = 'COMPLETED' THEN
        UPDATE savings_goals
        SET status = 'COMPLETED',
            completed_date = CURRENT_DATE
        WHERE id = goal_id_param;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE savings_goals IS 'Stores user savings goals with hybrid account integration';
COMMENT ON TABLE goal_contributions IS 'Tracks contributions to savings goals, can be virtual or linked to transactions';
COMMENT ON TABLE goal_milestones IS 'Records achievement milestones for goals (25%, 50%, 75%, 100%)';
COMMENT ON TABLE goal_account_links IS 'Links goals to multiple accounts for flexible allocation';
