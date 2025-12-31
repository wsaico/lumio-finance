-- Migration Part 3: Create Indexes

-- Indexes for savings_goals
CREATE INDEX idx_savings_goals_user ON savings_goals(user_id);
CREATE INDEX idx_savings_goals_status ON savings_goals(status);
CREATE INDEX idx_savings_goals_account ON savings_goals(primary_account_id);
CREATE INDEX idx_savings_goals_type ON savings_goals(goal_type);
CREATE INDEX idx_savings_goals_target_date ON savings_goals(target_date);

-- Indexes for goal_contributions
CREATE INDEX idx_goal_contributions_goal ON goal_contributions(goal_id);
CREATE INDEX idx_goal_contributions_user ON goal_contributions(user_id);
CREATE INDEX idx_goal_contributions_date ON goal_contributions(contribution_date);
CREATE INDEX idx_goal_contributions_transaction ON goal_contributions(transaction_id);

-- Indexes for goal_milestones
CREATE INDEX idx_goal_milestones_goal ON goal_milestones(goal_id);
CREATE INDEX idx_goal_milestones_type ON goal_milestones(milestone_type);

-- Indexes for goal_account_links
CREATE INDEX idx_goal_account_links_goal ON goal_account_links(goal_id);
CREATE INDEX idx_goal_account_links_account ON goal_account_links(account_id);
