import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TransactionEditorView } from '@/components/transactions/TransactionEditorView';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    accountId?: string;
    toAccountId?: string;
    scan?: string;
  }>();

  const initialType =
    params.type === 'INCOME' || params.type === 'TRANSFER' ? params.type : 'EXPENSE';

  return (
    <TransactionEditorView
      initialType={initialType}
      initialAccountId={params.accountId}
      initialToAccountId={params.toAccountId}
      autoStartScan={params.scan === '1'}
    />
  );
}
