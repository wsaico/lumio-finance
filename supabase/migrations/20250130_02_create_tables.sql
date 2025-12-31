-- Migration Part 2: Create Tables

-- Table: savings_goals
CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    
    -- Financial Details
    target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(15, 2) DEFAULT 0 CHECK (current_amount >= 0),
    currency VARCHAR(3) DEFAULT 'PEN',
    
    -- Account Integration
    primary_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    
    -- Timeline
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE NOT NULL,
    completed_date DATE,
    
    -- Metadata
    icon VARCHAR(50) DEFAULT 'target',
    color VARCHAR(50) DEFAULT '#f97316',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    
    -- Gamification
    streak_count INTEGER DEFAULT 0 CHECK (streak_count >= 0),
    total_contributions INTEGER DEFAULT 0 CHECK (total_contributions >= 0),
    badges JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT target_date_after_start CHECK (target_date >= start_date),
    CONSTRAINT current_not_exceed_target CHECK (current_amount <= target_amount),
    CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED')),
    CONSTRAINT valid_goal_type CHECK (goal_type IN ('EMERGENCY', 'TRAVEL', 'PURCHASE', 'INVESTMENT', 'OTHER')),
    CONSTRAINT valid_priority CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW'))
);

-- Table: goal_contributions
CREATE TABLE goal_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: goal_milestones
CREATE TABLE goal_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    
    milestone_type VARCHAR(50) NOT NULL,
    achieved_date TIMESTAMPTZ DEFAULT NOW(),
    amount_at_achievement DECIMAL(15, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_milestone_type CHECK (milestone_type IN ('25_PERCENT', '50_PERCENT', '75_PERCENT', 'COMPLETED')),
    CONSTRAINT unique_goal_milestone UNIQUE(goal_id, milestone_type)
);

-- Table: goal_account_links
CREATE TABLE goal_account_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    allocation_percentage DECIMAL(5, 2) CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_goal_account UNIQUE(goal_id, account_id)
);
