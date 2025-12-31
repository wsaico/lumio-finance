-- Migration Part 4: Enable RLS and Create Policies

-- Enable RLS
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_account_links ENABLE ROW LEVEL SECURITY;

-- Policies for savings_goals
CREATE POLICY "Users can view their own goals"
    ON savings_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
    ON savings_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
    ON savings_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
    ON savings_goals FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for goal_contributions
CREATE POLICY "Users can view contributions to their goals"
    ON goal_contributions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create contributions to their goals"
    ON goal_contributions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their contributions"
    ON goal_contributions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their contributions"
    ON goal_contributions FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for goal_milestones
CREATE POLICY "Users can view milestones for their goals"
    ON goal_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM savings_goals
            WHERE savings_goals.id = goal_milestones.goal_id
            AND savings_goals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create milestones for their goals"
    ON goal_milestones FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM savings_goals
            WHERE savings_goals.id = goal_milestones.goal_id
            AND savings_goals.user_id = auth.uid()
        )
    );

-- Policies for goal_account_links
CREATE POLICY "Users can view account links for their goals"
    ON goal_account_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM savings_goals
            WHERE savings_goals.id = goal_account_links.goal_id
            AND savings_goals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create account links for their goals"
    ON goal_account_links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM savings_goals
            WHERE savings_goals.id = goal_account_links.goal_id
            AND savings_goals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete account links for their goals"
    ON goal_account_links FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM savings_goals
            WHERE savings_goals.id = goal_account_links.goal_id
            AND savings_goals.user_id = auth.uid()
        )
    );
