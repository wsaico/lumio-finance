-- Run this in your Supabase SQL Editor to fix the missing relationship
ALTER TABLE transactions
ADD CONSTRAINT transactions_loan_id_fkey
FOREIGN KEY (loan_id)
REFERENCES loans(id)
ON DELETE SET NULL;
