import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '@/lib/navigation';
import { alphaHex } from '@/lib/color-math';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowLeft,
  ArrowRightLeft,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Info,
  Paperclip,
  PiggyBank,
  Plus,
  Repeat,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
  Zap,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useTransactionSuggestions } from '@/hooks/useTransactionSuggestions';
import { useLearnCategory, useSmartCategories } from '@/hooks/useSmartCategories';
import { useTags } from '@/hooks/useTags';
import { useBudget } from '@/hooks/useBudget';
import { useSubscription } from '@/hooks/useSubscription';
import { useSettingsStore } from '@/stores/settings-store';
import { useFormat } from '@/hooks/useFormat';
import { getCurrencySymbol } from '@/lib/currencies';
import { formatAccountPillName } from '@/lib/format';
import { apiPost, apiUploadFormData } from '@/lib/api-client';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import { isExtraIncomeKeyword } from '@/lib/peru-insights';
import { showAppToast } from '@/stores/toast-store';
import { triggerHaptic } from '@/lib/haptics';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumCalculator } from '@/components/ui/PremiumCalculator';
import { PremiumCategoryPicker } from '@/components/ui/PremiumCategoryPicker';
import { PremiumDatePicker } from '@/components/ui/PremiumDatePicker';
import { PremiumTimePicker } from '@/components/ui/PremiumTimePicker';
import { BudgetWarningBanner } from '@/components/alerts/BudgetWarningBanner';
import { BalancePreviewBanner } from '@/components/alerts/BalancePreviewBanner';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { ExpressTransactionSheet, type ExpressStep } from './ExpressTransactionSheet';

export interface TransactionEditorViewProps {
  initialData?: any;
  initialType?: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  initialAccountId?: string;
  initialToAccountId?: string;
  autoStartScan?: boolean;
}

const MODES = [
  { id: 'DEFAULT', label: 'Por defecto' },
  { id: 'UPCOMING', label: 'Próximamente' },
  { id: 'SUBSCRIPTION', label: 'Suscripción' },
  { id: 'RECURRING', label: 'Repetitivo' },
] as const;

const RECURRENCES = [
  { id: 'DAILY', label: 'día' },
  { id: 'WEEKLY', label: 'semana' },
  { id: 'MONTHLY', label: 'mes' },
  { id: 'YEARLY', label: 'año' },
] as const;

interface ScanDraft {
  amount: string;
  currency: string;
  date: string | null;
  time: string | null;
  vendor: string;
  description: string;
  transactionType: 'EXPENSE' | 'INCOME';
  walletApp: string;
  operationNumber: string;
  receiptType: string;
  provider?: string;
  possibleDuplicate?: {
    id: string;
    description: string;
    amount: number;
    date: string;
    reason: string;
  } | null;
  suggestedCategoryId?: string;
  suggestedSubcategoryId?: string;
  suggestedCategoryName?: string;
}

export function TransactionEditorView({
  initialData,
  initialType = 'EXPENSE',
  initialAccountId,
  initialToAccountId,
  autoStartScan = false,
}: TransactionEditorViewProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { formatMoney } = useFormat();

  const {
    showAttachmentsButton,
    autoSuggestTitles,
    newTxInitialEntry,
    defaultAutoPayRecurring,
    enableAIReceiptScanning,
    currencyCode: defaultCurrency,
    payYourselfFirstEnabled,
    payYourselfFirstPct,
    payYourselfFirstGoalId,
  } = useSettingsStore();

  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { createTransaction, updateTransaction, deleteTransaction } = useTransactions({});
  const { data: activeGoals = [] } = useSavingsGoals('ACTIVE');
  const { isTrial, isPremium, trialEndsAt } = useSubscription();

  const { scanPlanBadge, scanPlanNotice } = useMemo(() => {
    if (isTrial && trialEndsAt) {
      const parsedEnd = new Date(trialEndsAt);
      const validDate = !Number.isNaN(parsedEnd.getTime());
      const shortEnd = validDate
        ? parsedEnd.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).toUpperCase()
        : '';
      const longEnd = validDate
        ? parsedEnd.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      return {
        scanPlanBadge: shortEnd ? `TRIAL HASTA ${shortEnd}` : 'EN PRUEBA',
        scanPlanNotice: longEnd
          ? `Función Beta · Opción de paga (en prueba gratis hasta el ${longEnd})`
          : 'Función Beta · Opción de paga (en prueba gratis)',
      };
    }
    if (isPremium) {
      return {
        scanPlanBadge: 'PLAN PRO',
        scanPlanNotice: 'Función Beta · Incluida en tu plan de paga',
      };
    }
    return {
      scanPlanBadge: 'OPCIÓN DE PAGA',
      scanPlanNotice: 'Función Beta · Exclusiva de planes de paga',
    };
  }, [isTrial, isPremium, trialEndsAt]);
  const { tags: userTags, createTag } = useTags();
  const learnCategory = useLearnCategory();

  const resolvedType: 'EXPENSE' | 'INCOME' | 'TRANSFER' =
    initialData?.transaction_type ||
    initialData?.transactionType ||
    initialData?.type ||
    initialType ||
    'EXPENSE';

  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>(resolvedType);
  const [amount, setAmount] = useState<string>(initialData?.amount?.toString() || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [txDate, setTxDate] = useState<Date>(
    initialData?.transaction_date || initialData?.transactionDate
      ? new Date(initialData.transaction_date || initialData.transactionDate)
      : new Date()
  );
  const [accountId, setAccountId] = useState<string>(
    initialData?.account_id || initialData?.accountId || initialAccountId || accounts[0]?.id || ''
  );
  const [transferToAccountId, setTransferToAccountId] = useState<string>(
    initialData?.transfer_to_account_id ||
      initialData?.transferToAccountId ||
      initialToAccountId ||
      ''
  );
  const [categoryId, setCategoryId] = useState<string>(
    initialData?.expense_category_id ||
      initialData?.expenseCategoryId ||
      initialData?.income_category_id ||
      initialData?.incomeCategoryId ||
      initialData?.categoryId ||
      ''
  );
  const [subcategoryId, setSubcategoryId] = useState<string>(
    initialData?.sub_category_id || initialData?.subcategoryId || ''
  );
  const [tags, setTags] = useState<string[]>(
    Array.isArray(initialData?.tags) ? initialData.tags : []
  );
  const [attachmentUrl, setAttachmentUrl] = useState<string>(
    initialData?.attachment_url || initialData?.attachmentUrl || ''
  );

  // Cashew scheduling state
  const [mode, setMode] = useState<string>(initialData?.metadata?.mode || 'DEFAULT');
  const [recurrence, setRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>(
    initialData?.metadata?.recurrence || 'NONE'
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(
    initialData?.metadata?.recurrenceInterval || 1
  );
  const [initialPaymentState, setInitialPaymentState] = useState<'PENDING' | 'PAID_TODAY'>(
    initialData?.metadata?.initialPaymentState || 'PENDING'
  );
  const [recurrenceLimitMode, setRecurrenceLimitMode] = useState<'FOREVER' | 'UNTIL_DATE' | 'COUNT'>(
    initialData?.metadata?.recurrenceLimitMode || 'FOREVER'
  );
  const [recurrenceCount, setRecurrenceCount] = useState<number>(
    initialData?.metadata?.recurrenceCount || 12
  );
  const [reminderDays, setReminderDays] = useState<number>(
    initialData?.metadata?.reminderDays ?? 3
  );
  const [isAutoExecute, setIsAutoExecute] = useState<boolean>(
    initialData?.metadata?.isAutoExecute ?? defaultAutoPayRecurring
  );

  // UI state
  const expressStepInitial: ExpressStep =
    newTxInitialEntry === 'express_amount'
      ? 'amount'
      : newTxInitialEntry === 'express_category'
        ? 'category'
        : 'title';
  const [isExpressOpen, setIsExpressOpen] = useState<boolean>(
    !initialData && !autoStartScan && newTxInitialEntry !== 'full_form'
  );
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isCatPickerOpen, setIsCatPickerOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isModeInfoOpen, setIsModeInfoOpen] = useState(false);
  const [modeInfoTab, setModeInfoTab] = useState<string>('SUBSCRIPTION');
  const [suggestionTab, setSuggestionTab] = useState<'frequent' | 'scheduled'>('frequent');
  const [hasManualCat, setHasManualCat] = useState<boolean>(Boolean(initialData));
  const [newTagInput, setNewTagInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanDraft, setScanDraft] = useState<ScanDraft | null>(null);
  const [scannedMeta, setScannedMeta] = useState<{
    operationNumber?: string;
    walletApp?: string;
    receiptType?: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetPayFirstGoal = useMemo(
    () => activeGoals.find((g) => g.id === payYourselfFirstGoalId) || activeGoals[0] || null,
    [activeGoals, payYourselfFirstGoalId]
  );
  const [applyPayYourselfFirst, setApplyPayYourselfFirst] = useState<boolean>(
    Boolean(payYourselfFirstEnabled && !initialData)
  );
  const [openAssistantOnSave, setOpenAssistantOnSave] = useState<boolean>(false);

  useEffect(() => {
    if (payYourselfFirstEnabled && targetPayFirstGoal && !initialData) {
      setApplyPayYourselfFirst(true);
    }
  }, [payYourselfFirstEnabled, targetPayFirstGoal, initialData]);

  // Sync default accounts when loaded
  useEffect(() => {
    if (!accounts.length) return;
    if (initialType === 'TRANSFER' && initialToAccountId) {
      if (!transferToAccountId && accounts.some((a) => a.id === initialToAccountId)) {
        setTransferToAccountId(initialToAccountId);
      }
      if (!accountId || accountId === initialToAccountId) {
        const cand =
          accounts.find((a) => a.id !== initialToAccountId && a.accountType !== 'CREDIT_CARD') ||
          accounts.find((a) => a.id !== initialToAccountId);
        if (cand) setAccountId(cand.id);
      }
      return;
    }
    if (!accountId) setAccountId(accounts[0].id);
  }, [accounts, accountId, transferToAccountId, initialType, initialToAccountId]);

  const { frequent, scheduled, recentCategoryIds, getAutocompleteMatches } =
    useTransactionSuggestions(activeTab);

  const autocompleteMatches = useMemo(
    () => (autoSuggestTitles ? getAutocompleteMatches(description, activeTab) : []),
    [autoSuggestTitles, getAutocompleteMatches, description, activeTab]
  );

  const { data: smartCatData } = useSmartCategories(
    autoSuggestTitles && activeTab !== 'TRANSFER' ? description : '',
    activeTab === 'INCOME' ? 'INCOME' : 'EXPENSE',
    autoSuggestTitles && activeTab !== 'TRANSFER'
  );
  const topSmart = smartCatData?.suggestions?.[0];

  useEffect(() => {
    if (
      autoSuggestTitles &&
      activeTab !== 'TRANSFER' &&
      !hasManualCat &&
      topSmart &&
      description.trim().length >= 3
    ) {
      setCategoryId(topSmart.categoryId);
      setSubcategoryId(topSmart.subcategoryId || '');
    }
  }, [autoSuggestTitles, activeTab, hasManualCat, topSmart, description]);

  const currentAccount = accounts.find((a) => a.id === accountId);
  const transferToAccount = accounts.find((a) => a.id === transferToAccountId);
  const currencySymbol = getCurrencySymbol(currentAccount?.currencyCode);
  const currentCategory = categories.find((c: any) => c.id === categoryId);
  const currentSubcategory = currentCategory?.subcategories?.find(
    (s: any) => s.id === subcategoryId
  );

  // Real-time Budget Alert check
  const { budgets } = useBudget(txDate.getFullYear(), txDate.getMonth() + 1);
  const budgetAlert = useMemo(() => {
    if (activeTab !== 'EXPENSE' || !categoryId || !budgets?.length) return null;
    const budget = budgets.find(
      (b: any) =>
        b.include_categories?.includes(categoryId) ||
        b.includeCategories?.includes(categoryId) ||
        (subcategoryId &&
          (b.include_categories?.includes(subcategoryId) ||
            b.includeCategories?.includes(subcategoryId)))
    );
    if (!budget) return null;
    const limit = Number(budget.amount);
    const spentSoFar = Number(budget.stats?.spent || budget.spent || 0);
    const newTotal = spentSoFar + Number(amount || 0);
    const pct = limit > 0 ? (newTotal / limit) * 100 : 0;
    const remaining = limit - newTotal;
    if (pct > 100) {
      return {
        type: 'exceeded' as const,
        message: `Excederás el presupuesto "${budget.name}"`,
        details: `Proyectado: ${currencySymbol}${newTotal.toFixed(2)} / ${currencySymbol}${limit.toFixed(2)}`,
      };
    }
    if (pct >= 85) {
      return {
        type: 'critical' as const,
        message: `Presupuesto "${budget.name}" casi al límite`,
        details: `Restante estimado: ${currencySymbol}${remaining.toFixed(2)}`,
      };
    }
    return null;
  }, [activeTab, categoryId, subcategoryId, budgets, amount, currencySymbol]);

  const handleTabChange = (nextTab: 'EXPENSE' | 'INCOME' | 'TRANSFER') => {
    setActiveTab(nextTab);
    if (nextTab === 'TRANSFER') {
      if (!transferToAccountId || transferToAccountId === accountId) {
        const other = accounts.find((a) => a.id !== accountId);
        if (other) setTransferToAccountId(other.id);
      }
    } else if (currentCategory && currentCategory.type && currentCategory.type !== nextTab) {
      setCategoryId('');
      setSubcategoryId('');
    }
  };

  const handleSwapTransfer = () => {
    if (!accountId || !transferToAccountId) return;
    triggerHaptic('selection');
    const prevSrc = accountId;
    setAccountId(transferToAccountId);
    setTransferToAccountId(prevSrc);
  };

  const handleScanReceipt = async (useCamera = false) => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAppToast.warning({
          title: 'Permiso requerido',
          description: 'Habilita el acceso a cámara o galería para escanear Yape, Plin o boletas.',
        });
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            base64: true,
            quality: 0.68,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            base64: true,
            quality: 0.68,
            mediaTypes: ['images'],
          });

      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const dataUrl = `data:${mime};base64,${asset.base64}`;

      setIsScanning(true);
      const scanned = await apiPost<any>('/api/ai/scan-receipt', { image: dataUrl });
      const detectedType: 'EXPENSE' | 'INCOME' =
        scanned?.transactionType === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const descCandidate = scanned?.description || scanned?.vendor || '';

      let suggestedCat: any = null;
      if (descCandidate.trim().length >= 2) {
        try {
          const sugRes = await apiPost<{ suggestions?: any[] }>('/api/smart-categories/suggest', {
            description: [scanned?.vendor, descCandidate].filter(Boolean).join(' '),
            type: detectedType,
          });
          suggestedCat = sugRes?.suggestions?.[0] || null;
        } catch {
          // category suggestion is best-effort
        }
      }

      setScanDraft({
        amount: scanned?.amount ? String(scanned.amount) : '',
        currency: scanned?.currency || currentAccount?.currencyCode || 'PEN',
        date: scanned?.date || null,
        time: scanned?.time || null,
        vendor: scanned?.vendor || '',
        description: descCandidate || (scanned?.walletApp ? `Movimiento ${scanned.walletApp}` : ''),
        transactionType: detectedType,
        walletApp: scanned?.walletApp || scanned?.receiptType || 'OTRO',
        operationNumber: scanned?.operationNumber || scanned?.receiptNumber || '',
        receiptType: scanned?.receiptType || 'OTRO',
        provider: scanned?.provider,
        possibleDuplicate: scanned?.possibleDuplicate || null,
        suggestedCategoryId: suggestedCat?.categoryId,
        suggestedSubcategoryId: suggestedCat?.subcategoryId || '',
        suggestedCategoryName: suggestedCat
          ? suggestedCat.subcategoryName
            ? `${suggestedCat.categoryName} · ${suggestedCat.subcategoryName}`
            : suggestedCat.categoryName
          : undefined,
      });
    } catch (err: any) {
      showAppToast.error({
        title: 'No se pudo leer el comprobante',
        description: err?.message,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmScanDraft = () => {
    if (!scanDraft) return;
    triggerHaptic('success');

    setActiveTab(scanDraft.transactionType);
    if (scanDraft.amount) setAmount(scanDraft.amount);
    if (scanDraft.description || scanDraft.vendor) {
      setDescription(scanDraft.description || scanDraft.vendor);
    }
    if (scanDraft.date) {
      const timePart = scanDraft.time ? `${scanDraft.time}:00` : '12:00:00';
      const d = new Date(`${scanDraft.date}T${timePart}`);
      if (!Number.isNaN(d.getTime())) setTxDate(d);
    }

    const noteParts = [
      scanDraft.walletApp && scanDraft.walletApp !== 'OTRO' ? scanDraft.walletApp : scanDraft.receiptType,
      scanDraft.operationNumber ? `Nro. op: ${scanDraft.operationNumber}` : '',
      scanDraft.vendor,
    ].filter(Boolean);
    if (noteParts.length > 0) setNotes(noteParts.join(' · '));

    if (scanDraft.suggestedCategoryId) {
      setCategoryId(scanDraft.suggestedCategoryId);
      setSubcategoryId(scanDraft.suggestedSubcategoryId || '');
      setHasManualCat(true);
    } else {
      setCategoryId('');
      setSubcategoryId('');
      setHasManualCat(false);
    }

    setScannedMeta({
      operationNumber: scanDraft.operationNumber || undefined,
      walletApp: scanDraft.walletApp || undefined,
      receiptType: scanDraft.receiptType || undefined,
    });
    setScanDraft(null);
    showAppToast.success({
      title: 'Datos aplicados',
      description: 'Verifica la cuenta o categoría y toca Guardar.',
    });
  };

  useEffect(() => {
    if (autoStartScan && enableAIReceiptScanning && Platform.OS !== 'web') {
      void handleScanReceipt(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartScan]);

  const handleAttachFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const file = res.assets[0];
      setIsUploading(true);
      const fd = new FormData();
      fd.append('file', {
        uri: file.uri,
        name: file.name || 'comprobante',
        type: file.mimeType || 'application/octet-stream',
      } as any);
      const uploaded = await apiUploadFormData<any>('/api/google-drive/upload', fd);
      setAttachmentUrl(uploaded.webViewLink || uploaded.url || '');
      showAppToast.success({ title: 'Comprobante adjuntado' });
    } catch (err: any) {
      showAppToast.error({
        title: 'No se pudo subir el comprobante',
        description: err?.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateInlineTag = async () => {
    const clean = newTagInput.trim();
    if (!clean) return;
    try {
      await createTag.mutateAsync({ name: clean });
      if (!tags.includes(clean)) setTags([...tags, clean]);
      setNewTagInput('');
    } catch {
      // handled in hook
    }
  };

  const handleSubmit = async (createAnother = false) => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      showAppToast.warning({ title: 'Ingresa un monto mayor a 0' });
      return;
    }
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      showAppToast.warning({ title: 'Falta la descripción' });
      return;
    }
    if (!accountId) {
      showAppToast.warning({ title: 'Selecciona una cuenta' });
      return;
    }
    if (activeTab === 'TRANSFER') {
      if (!transferToAccountId || transferToAccountId === accountId) {
        showAppToast.warning({ title: 'Selecciona una cuenta destino válida' });
        return;
      }
    } else if (!categoryId) {
      showAppToast.warning({ title: 'Selecciona una categoría' });
      return;
    }

    setIsSubmitting(true);
    try {
      const isSpecialScheduled = ['SUBSCRIPTION', 'RECURRING', 'UPCOMING'].includes(mode);
      let resolvedEndDate: string | null = null;
      if (
        (mode === 'SUBSCRIPTION' || mode === 'RECURRING') &&
        recurrenceLimitMode === 'COUNT' &&
        recurrenceCount > 1
      ) {
        const endD = new Date(txDate);
        const step = Math.max(1, recurrenceInterval) * (recurrenceCount - 1);
        if (recurrence === 'DAILY') endD.setDate(endD.getDate() + step);
        else if (recurrence === 'WEEKLY') endD.setDate(endD.getDate() + step * 7);
        else if (recurrence === 'YEARLY') endD.setFullYear(endD.getFullYear() + step);
        else endD.setMonth(endD.getMonth() + step);
        resolvedEndDate = endD.toISOString().slice(0, 10);
      }

      const effectivePayState =
        mode === 'UPCOMING'
          ? 'PENDING'
          : isSpecialScheduled
            ? initialPaymentState
            : 'PAID_TODAY';

      const payload: any = {
        type: activeTab,
        accountId,
        amount: parsedAmount,
        currency: currentAccount?.currencyCode || defaultCurrency || 'PEN',
        date: txDate.toISOString(),
        description: trimmedDesc,
        notes: notes.trim() || undefined,
        tags,
        attachmentUrl: attachmentUrl || undefined,
        categoryId: activeTab === 'TRANSFER' ? undefined : categoryId || undefined,
        subcategoryId: activeTab === 'TRANSFER' ? undefined : subcategoryId || undefined,
        transferToAccountId: activeTab === 'TRANSFER' ? transferToAccountId : undefined,
        recurrenceEndDate: resolvedEndDate,
        metadata: {
          mode,
          scheduledType: isAutoExecute ? 'AUTO' : 'MANUAL',
          isAutoExecute,
          recurrence,
          recurrenceInterval: Math.max(1, recurrenceInterval),
          recurrenceUnit:
            recurrence === 'DAILY'
              ? 'days'
              : recurrence === 'WEEKLY'
                ? 'weeks'
                : recurrence === 'YEARLY'
                  ? 'years'
                  : 'months',
          initialPaymentState: effectivePayState,
          dueDate: txDate.toISOString().slice(0, 10),
          recurrenceLimitMode,
          recurrenceEndDate: resolvedEndDate,
          recurrenceCount: recurrenceCount || null,
          reminderDays,
          ...(scannedMeta || {}),
        },
      };

      if (initialData) {
        await updateTransaction.mutateAsync({ id: initialData.id, ...payload });
        safeGoBack(router, '/(tabs)');
        return;
      }

      const savedRes: any = await createTransaction.mutateAsync(payload);
      const isQueuedOffline = Boolean(savedRes?.queuedOffline);

      if (!isQueuedOffline && trimmedDesc && payload.categoryId && activeTab !== 'TRANSFER') {
        learnCategory.mutate({
          description: trimmedDesc,
          categoryId: payload.categoryId,
          subcategoryId: payload.subcategoryId,
        });
      }

      let reservedForGoal = 0;
      if (
        !isQueuedOffline &&
        activeTab === 'INCOME' &&
        payYourselfFirstEnabled &&
        applyPayYourselfFirst &&
        targetPayFirstGoal
      ) {
        const reserve = Math.round(parsedAmount * (payYourselfFirstPct / 100) * 100) / 100;
        if (reserve > 0) {
          try {
            await apiPost('/api/savings-goals/contribute', {
              goalId: targetPayFirstGoal.id,
              amount: reserve,
              notes: `Págate primero (${payYourselfFirstPct}% de ${trimmedDesc})`,
            });
            reservedForGoal = reserve;
            invalidateFinancialGraph(queryClient);
          } catch {
            // Do not block saved income if savings reserve call fails
          }
        }
      }

      const shouldOpenExtraAssistant =
        !isQueuedOffline &&
        activeTab === 'INCOME' &&
        openAssistantOnSave &&
        isExtraIncomeKeyword(trimmedDesc);

      if (createAnother) {
        setAmount('');
        setDescription('');
        setNotes('');
        setTags([]);
        setAttachmentUrl('');
        setScannedMeta(null);
        if (!isQueuedOffline) {
          showAppToast.success({ title: 'Guardado · listo para el siguiente' });
        }
      } else {
        if (!isQueuedOffline) {
          const isPendingSched =
            isSpecialScheduled && (mode === 'UPCOMING' || initialPaymentState !== 'PAID_TODAY');
          showAppToast.success({
            title: isPendingSched
              ? 'Movimiento programado'
              : reservedForGoal > 0
                ? 'Ingreso y ahorro registrados'
                : 'Transacción guardada',
            description:
              reservedForGoal > 0 && targetPayFirstGoal
                ? `Se apartó ${payYourselfFirstPct}% a "${targetPayFirstGoal.name}".`
                : isExtraIncomeKeyword(trimmedDesc) && activeTab === 'INCOME' && !shouldOpenExtraAssistant
                  ? 'Ingreso extra detectado: puedes repartirlo en Metas de Ahorro.'
                  : undefined,
          });
        }
        if (shouldOpenExtraAssistant) {
          router.replace(
            `/savings-goals?extraIncome=${parsedAmount}&label=${encodeURIComponent(trimmedDesc)}` as any
          );
        } else {
          safeGoBack(router, '/(tabs)');
        }
      }
    } catch {
      // handled in mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const heroColors: [string, string] =
    activeTab === 'INCOME'
      ? ['#10B981', '#059669']
      : activeTab === 'TRANSFER'
        ? [theme.brandLight, theme.brandDark]
        : ['#F43F5E', '#E11D48'];

  const actionColor = heroColors[1];
  const activeSuggestions = suggestionTab === 'frequent' ? frequent : scheduled;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      style={[styles.flex, { backgroundColor: theme.bg }]}
    >
      {/* Top Bar */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 12) + 4,
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={() => safeGoBack(router, '/(tabs)')}
          style={[styles.headerBtn, { backgroundColor: theme.muted }]}
        >
          <ArrowLeft size={19} color={theme.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(17) }}>
            {initialData ? 'Editar Transacción' : 'Nueva Transacción'}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11.5 }}>
            {activeTab === 'EXPENSE'
              ? 'Registra una salida de dinero'
              : activeTab === 'INCOME'
                ? 'Registra un ingreso a tus cuentas'
                : 'Mueve saldo entre tus cuentas'}
          </Text>
        </View>

        {!initialData ? (
          <Pressable
            onPress={() => setIsExpressOpen(true)}
            style={[styles.expressBtn, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}
          >
            <Zap size={13} color={theme.brand} />
            <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 11.5 }}>
              Flujo rápido
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setIsDeleteOpen(true)}
            style={[styles.headerBtn, { backgroundColor: theme.expenseSoft }]}
          >
            <Trash2 size={18} color={theme.expense} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. DYNAMIC HERO CARD */}
        <LinearGradient
          colors={heroColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTabs}>
            {(
              [
                { id: 'EXPENSE', label: 'Gasto' },
                { id: 'INCOME', label: 'Ingreso' },
                { id: 'TRANSFER', label: 'Transferir' },
              ] as const
            ).map((t) => {
              const active = activeTab === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => {
                    triggerHaptic('selection');
                    handleTabChange(t.id);
                  }}
                  style={[styles.heroTabBtn, active && styles.heroTabActive]}
                >
                  <Text
                    style={{
                      color: active ? '#FFFFFF' : 'rgba(255,255,255,0.72)',
                      fontFamily: theme.font('800'),
                      fontSize: theme.sp(12.5),
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.heroCenter}>
            <Pressable
              onPress={() =>
                activeTab === 'TRANSFER' ? handleSwapTransfer() : setIsCatPickerOpen(true)
              }
              style={[styles.heroIconBtn, { flexShrink: 0 }]}
            >
              {activeTab === 'TRANSFER' ? (
                <ArrowRightLeft size={34} color="#FFFFFF" />
              ) : (
                <CategoryIcon
                  name={currentSubcategory?.icon || currentCategory?.icon || 'circle-help'}
                  size={34}
                  color="#FFFFFF"
                />
              )}
            </Pressable>

            <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end', overflow: 'hidden' }}>
              <Pressable onPress={() => setIsCalcOpen(true)} style={styles.amountRow}>
                <Text style={[styles.heroCurrency, { fontFamily: theme.font('800') }]}>
                  {currencySymbol}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[styles.heroAmount, { fontFamily: theme.font('800') }]}
                >
                  {amount || '0'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => activeTab !== 'TRANSFER' && setIsCatPickerOpen(true)}
                style={{ marginTop: 4, maxWidth: '100%' }}
              >
                <Text
                  style={[
                    styles.heroCatLabel,
                    { fontFamily: theme.font('700'), textAlign: 'right' },
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {activeTab === 'TRANSFER'
                    ? transferToAccount
                      ? `Hacia ${transferToAccount.name}`
                      : 'Elegir destino'
                    : currentSubcategory
                      ? `${currentCategory?.name} · ${currentSubcategory.name}`
                      : currentCategory?.name || 'Elegir categoría'}
                </Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {accounts.length === 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 13,
              borderRadius: 18,
              borderWidth: 1,
              backgroundColor: alphaHex(theme.expense, 0.1),
              borderColor: alphaHex(theme.expense, 0.35),
            }}
          >
            <AlertTriangle size={18} color={theme.expense} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 13 }}>
                Primero crea una cuenta
              </Text>
              <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                Necesitas al menos una cuenta de origen para guardar tus movimientos.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/accounts' as any)}
              style={{
                backgroundColor: theme.brand,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 12 }}>
                Crear cuenta
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* AI Receipt Scanner Strip (Yape, Plin, Boletas y Facturas) */}
        {enableAIReceiptScanning && activeTab !== 'TRANSFER' ? (
          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: alphaHex(theme.brand, 0.08),
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: alphaHex(theme.brand, 0.2),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <View
                  style={{
                    backgroundColor: theme.brand,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontFamily: theme.font('800'), fontSize: 9.5 }}>
                    BETA
                  </Text>
                </View>
                <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                  Lectura IA de comprobantes
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: alphaHex(theme.coral, 0.15),
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: theme.coral, fontFamily: theme.font('800'), fontSize: 9.5 }}>
                  {scanPlanBadge}
                </Text>
              </View>
            </View>
            <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 10.5 }}>
              {scanPlanNotice}
            </Text>

            <View style={styles.scanRow}>
              <Pressable
                disabled={isScanning}
                onPress={() => handleScanReceipt(true)}
                style={[
                  styles.scanBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: autoStartScan ? theme.coral : theme.border,
                  },
                ]}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color={theme.coral} />
                ) : (
                  <Camera size={16} color={theme.coral} />
                )}
                <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 12.5 }}>
                  {isScanning ? 'Leyendo...' : 'Foto Yape/Plin'}
                </Text>
              </Pressable>
              <Pressable
                disabled={isScanning}
                onPress={() => handleScanReceipt(false)}
                style={[
                  styles.scanBtn,
                  {
                    backgroundColor: autoStartScan ? theme.brandSoft : theme.card,
                    borderColor: autoStartScan ? theme.brand : theme.border,
                  },
                ]}
              >
                <Sparkles size={16} color={theme.brand} />
                <Text
                  style={{
                    color: autoStartScan ? theme.brand : theme.text,
                    fontFamily: theme.font('700'),
                    fontSize: 12.5,
                  }}
                >
                  Subir captura
                </Text>
              </Pressable>
            </View>
            {autoStartScan ? (
              <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: 11.5 }}>
                Selecciona una captura de Yape, Plin o boleta para extraer monto, fecha, operación y detectar duplicados.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Budget Alert Banner */}
        {budgetAlert ? (
          <BudgetWarningBanner
            type={budgetAlert.type}
            message={budgetAlert.message}
            details={budgetAlert.details}
          />
        ) : null}

        {/* Smart Suggestions Strip */}
        {(frequent.length > 0 || scheduled.length > 0) && (
          <View style={{ gap: 8 }}>
            <View style={styles.sugHeader}>
              <View style={[styles.sugTabs, { backgroundColor: theme.muted }]}>
                <Pressable
                  onPress={() => setSuggestionTab('frequent')}
                  style={[styles.sugTab, suggestionTab === 'frequent' && { backgroundColor: theme.card }]}
                >
                  <Zap size={12} color={theme.brand} />
                  <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                    Frecuentes
                  </Text>
                </Pressable>
                {scheduled.length > 0 ? (
                  <Pressable
                    onPress={() => setSuggestionTab('scheduled')}
                    style={[styles.sugTab, suggestionTab === 'scheduled' && { backgroundColor: theme.card }]}
                  >
                    <CalendarClock size={12} color={theme.brand} />
                    <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                      Programadas
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11 }}>
                1 toque para rellenar
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {activeSuggestions.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    triggerHaptic('selection');
                    setDescription(item.description);
                    if (item.categoryId && activeTab !== 'TRANSFER') {
                      setCategoryId(item.categoryId);
                      setSubcategoryId(item.subcategoryId || '');
                      setHasManualCat(true);
                    }
                    if (item.lastAmount > 0 && (!amount || amount === '0')) {
                      setAmount(String(item.lastAmount));
                    }
                  }}
                  style={[styles.sugChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={[styles.sugIcon, { backgroundColor: item.categoryColor || theme.brand }]}>
                    <CategoryIcon name={item.categoryIcon || 'sparkles'} size={13} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 12 }} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 10.5 }}>
                      {item.lastAmount > 0
                        ? `${getCurrencySymbol(item.currencyCode)}${item.lastAmount.toFixed(0)}`
                        : item.categoryName || 'Sugerencia'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Description + Smart Category Pill */}
        <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <FileText size={18} color={theme.textMuted} />
          <TextInput
            value={description}
            onChangeText={(v) => {
              setDescription(v);
              if (!v.trim()) setHasManualCat(false);
            }}
            placeholder="Descripción (ej. Almuerzo, Uber, Sueldo...)"
            placeholderTextColor={theme.textMuted}
            style={[styles.inputField, { color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(14.5) }]}
          />
          {topSmart && activeTab !== 'TRANSFER' && description.trim().length >= 3 && categoryId !== topSmart.categoryId ? (
            <Pressable
              onPress={() => {
                setCategoryId(topSmart.categoryId);
                setSubcategoryId(topSmart.subcategoryId || '');
                setHasManualCat(true);
              }}
              style={[styles.smartBadge, { backgroundColor: theme.brandSoft }]}
            >
              <Sparkles size={11} color={theme.brand} />
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 11 }}>
                {topSmart.categoryName}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {autocompleteMatches.length > 0 && description.trim().length >= 2 ? (
          <View style={[styles.autoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {autocompleteMatches.slice(0, 3).map((m) => (
              <Pressable
                key={`auto-${m.id}`}
                onPress={() => {
                  setDescription(m.description);
                  if (m.categoryId) {
                    setCategoryId(m.categoryId);
                    setSubcategoryId(m.subcategoryId || '');
                    setHasManualCat(true);
                  }
                  if (m.lastAmount > 0) setAmount(String(m.lastAmount));
                }}
                style={styles.autoRow}
              >
                <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('700'), fontSize: 13 }}>
                  {m.description}
                </Text>
                <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 12 }}>
                  {m.lastAmount > 0 ? `${getCurrencySymbol(m.currencyCode)}${m.lastAmount}` : m.categoryName}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Notes */}
        <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Tag size={18} color={theme.textMuted} />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas opcionales"
            placeholderTextColor={theme.textMuted}
            style={[styles.inputField, { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(14) }]}
          />
        </View>

        {/* Date & Time */}
        <View style={styles.dateTimeRow}>
          <PremiumDatePicker variant="hero" label="Fecha" value={txDate} onChange={setTxDate} />
          <PremiumTimePicker label="Hora" value={txDate} onChange={setTxDate} />
        </View>

        {/* Source Account Pills + Balance Preview */}
        <View style={{ gap: 10 }}>
          <View style={styles.sectionLabel}>
            <Wallet size={14} color={theme.brand} />
            <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11 }}>
              {activeTab === 'INCOME' ? 'CUENTA DE DESTINO' : 'CUENTA DE ORIGEN'}
            </Text>
          </View>
          <View style={styles.wrapRow}>
            {accounts.map((acc) => {
              const selected = acc.id === accountId;
              return (
                <Pressable
                  key={acc.id}
                  onPress={() => {
                    triggerHaptic('selection');
                    setAccountId(acc.id);
                  }}
                  style={[
                    styles.accPill,
                    {
                      backgroundColor: selected ? theme.brand : theme.card,
                      borderColor: selected ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <Text style={{ color: selected ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 12.5 }}>
                    {formatAccountPillName(acc.name, acc.currencyCode)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <BalancePreviewBanner account={currentAccount} amount={Number(amount || 0)} type={activeTab} />
        </View>

        {/* Transfer Destination Pills */}
        {activeTab === 'TRANSFER' ? (
          <View style={{ gap: 10 }}>
            <View style={styles.sugHeader}>
              <View style={styles.sectionLabel}>
                <ArrowRightLeft size={14} color={theme.transfer} />
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11 }}>
                  CUENTA DESTINO
                </Text>
              </View>
              <Pressable onPress={handleSwapTransfer} style={styles.sectionLabel}>
                <ArrowDownUp size={13} color={theme.brand} />
                <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 12 }}>
                  Invertir
                </Text>
              </Pressable>
            </View>
            <View style={styles.wrapRow}>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((acc) => {
                  const selected = acc.id === transferToAccountId;
                  return (
                    <Pressable
                      key={`to-${acc.id}`}
                      onPress={() => setTransferToAccountId(acc.id)}
                      style={[
                        styles.accPill,
                        {
                          backgroundColor: selected ? theme.transfer : theme.card,
                          borderColor: selected ? theme.transfer : theme.border,
                        },
                      ]}
                    >
                      <Text style={{ color: selected ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 12.5 }}>
                        {formatAccountPillName(acc.name, acc.currencyCode)}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
            {transferToAccount?.accountType === 'CREDIT_CARD' ? (
              <View style={[styles.ccBox, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}>
                <CreditCard size={15} color={theme.brand} />
                <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 12, flex: 1 }}>
                  Pago a tarjeta · Deuda actual:{' '}
                  {formatMoney(Math.abs(Number(transferToAccount.usedBalance || 0)), transferToAccount.currencyCode)}
                </Text>
              </View>
            ) : null}
            {currentAccount && transferToAccount && currentAccount.currencyCode !== transferToAccount.currencyCode ? (
              <View style={[styles.ccBox, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}>
                <Clock size={15} color={theme.brand} />
                <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 12, flex: 1 }}>
                  Transferencia multimoneda ({currentAccount.currencyCode} → {transferToAccount.currencyCode}): se aplicará la tasa vigente.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Creatable Tags */}
        <View style={[styles.tagsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionLabel}>
            <Tag size={13} color={theme.brand} />
            <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11 }}>
              ETIQUETAS
            </Text>
          </View>
          {userTags.length > 0 ? (
            <View style={styles.wrapRow}>
              {userTags.map((t) => {
                const selected = tags.includes(t.name);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() =>
                      setTags(selected ? tags.filter((x) => x !== t.name) : [...tags, t.name])
                    }
                    style={[
                      styles.tagPill,
                      {
                        backgroundColor: selected ? theme.brand : theme.muted,
                        borderColor: selected ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <View style={[styles.tagDot, { backgroundColor: selected ? '#FFFFFF' : t.color }]} />
                    <Text style={{ color: selected ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                      {t.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={styles.tagInputRow}>
            <TextInput
              value={newTagInput}
              onChangeText={setNewTagInput}
              onSubmitEditing={handleCreateInlineTag}
              placeholder="Crear etiqueta rápida..."
              placeholderTextColor={theme.textMuted}
              style={[
                styles.tagInput,
                { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('600') },
              ]}
            />
            <Pressable
              onPress={handleCreateInlineTag}
              style={[styles.tagAddBtn, { backgroundColor: theme.brandSoft }]}
            >
              <Plus size={15} color={theme.brand} />
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 12 }}>
                Agregar
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Attachment */}
        {showAttachmentsButton ? (
          <Pressable
            disabled={isUploading}
            onPress={handleAttachFile}
            style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={theme.brand} />
            ) : attachmentUrl ? (
              <CheckCircle2 size={18} color={theme.income} />
            ) : (
              <Paperclip size={18} color={theme.textMuted} />
            )}
            <Text
              style={{
                flex: 1,
                color: attachmentUrl ? theme.income : theme.textSecondary,
                fontFamily: theme.font('700'),
                fontSize: theme.sp(13.5),
              }}
            >
              {isUploading
                ? 'Subiendo comprobante...'
                : attachmentUrl
                  ? 'Comprobante adjunto'
                  : 'Adjuntar comprobante'}
            </Text>
          </Pressable>
        ) : null}

        {/* Cashew Transaction Mode & Scheduling */}
        <View style={{ gap: 10 }}>
          <View style={styles.sugHeader}>
            <Pressable
              onPress={() => {
                setModeInfoTab(mode === 'DEFAULT' ? 'SUBSCRIPTION' : mode);
                setIsModeInfoOpen(true);
              }}
              style={styles.sectionLabel}
            >
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11 }}>
                TIPO DE TRANSACCIÓN
              </Text>
              <Info size={14} color={theme.brand} />
            </Pressable>
            <Pressable onPress={() => router.push('/subscriptions' as any)}>
              <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                Ver programados
              </Text>
            </Pressable>
          </View>

          <View style={styles.wrapRow}>
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    triggerHaptic('selection');
                    setMode(m.id);
                    if (m.id === 'SUBSCRIPTION' || m.id === 'RECURRING') {
                      if (recurrence === 'NONE') setRecurrence('MONTHLY');
                      setInitialPaymentState('PENDING');
                    } else if (m.id === 'UPCOMING') {
                      setRecurrence('NONE');
                      setInitialPaymentState('PENDING');
                    } else {
                      setRecurrence('NONE');
                      setInitialPaymentState('PAID_TODAY');
                    }
                  }}
                  style={[
                    styles.accPill,
                    {
                      backgroundColor: active ? theme.brand : theme.card,
                      borderColor: active ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 12.5 }}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode !== 'DEFAULT' ? (
            <View style={[styles.schedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {(mode === 'SUBSCRIPTION' || mode === 'RECURRING') && (
                <>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 10.5 }}>
                    ESTADO DE ESTE COBRO
                  </Text>
                  <View style={styles.twoCol}>
                    {[
                      { id: 'PENDING', label: 'Pendiente ("¿Pagar?")' },
                      { id: 'PAID_TODAY', label: 'Ya pagado hoy' },
                    ].map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => setInitialPaymentState(s.id as any)}
                        style={[
                          styles.halfBtn,
                          {
                            backgroundColor: initialPaymentState === s.id ? theme.brand : theme.muted,
                            borderColor: initialPaymentState === s.id ? theme.brand : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: initialPaymentState === s.id ? '#FFFFFF' : theme.textSecondary,
                            fontFamily: theme.font('700'),
                            fontSize: 12,
                          }}
                        >
                          {s.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 10.5 }}>
                    FRECUENCIA (CADA {recurrenceInterval})
                  </Text>
                  <View style={styles.wrapRow}>
                    <TextInput
                      value={String(recurrenceInterval)}
                      onChangeText={(v) => setRecurrenceInterval(Math.max(1, Number(v) || 1))}
                      keyboardType="number-pad"
                      style={[
                        styles.intervalBox,
                        { backgroundColor: theme.muted, borderColor: theme.border, color: theme.brand, fontFamily: theme.font('800') },
                      ]}
                    />
                    {RECURRENCES.map((r) => (
                      <Pressable
                        key={r.id}
                        onPress={() => setRecurrence(r.id)}
                        style={[
                          styles.accPill,
                          {
                            backgroundColor: recurrence === r.id ? theme.brand : theme.muted,
                            borderColor: recurrence === r.id ? theme.brand : theme.border,
                          },
                        ]}
                      >
                        <Text style={{ color: recurrence === r.id ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                          {r.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.wrapRow}>
                    {(
                      [
                        { id: 'FOREVER', label: 'Para siempre' },
                        { id: 'COUNT', label: 'Por N cobros' },
                      ] as const
                    ).map((lim) => (
                      <Pressable
                        key={lim.id}
                        onPress={() => setRecurrenceLimitMode(lim.id)}
                        style={[
                          styles.tagPill,
                          {
                            backgroundColor: recurrenceLimitMode === lim.id ? theme.brandSoft : theme.muted,
                            borderColor: recurrenceLimitMode === lim.id ? theme.brand : theme.border,
                          },
                        ]}
                      >
                        <Text style={{ color: recurrenceLimitMode === lim.id ? theme.brand : theme.textMuted, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                          {lim.label}
                        </Text>
                      </Pressable>
                    ))}
                    {recurrenceLimitMode === 'COUNT' ? (
                      <TextInput
                        value={String(recurrenceCount)}
                        onChangeText={(v) => setRecurrenceCount(Math.max(2, Number(v) || 2))}
                        keyboardType="number-pad"
                        style={[
                          styles.intervalBox,
                          { backgroundColor: theme.muted, borderColor: theme.border, color: theme.brand, fontFamily: theme.font('800') },
                        ]}
                      />
                    ) : null}
                  </View>
                </>
              )}

              <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 10.5 }}>
                RECORDATORIO DE VENCIMIENTO
              </Text>
              <View style={styles.wrapRow}>
                {[
                  { days: 0, label: 'Mismo día' },
                  { days: 1, label: '1d antes' },
                  { days: 3, label: '3d antes' },
                  { days: 7, label: '7d antes' },
                ].map((rem) => (
                  <Pressable
                    key={rem.days}
                    onPress={() => setReminderDays(rem.days)}
                    style={[
                      styles.tagPill,
                      {
                        backgroundColor: reminderDays === rem.days ? theme.brand : theme.muted,
                        borderColor: reminderDays === rem.days ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: reminderDays === rem.days ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                      {rem.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.autoPayRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 13 }}>
                    Auto-pagar en fecha
                  </Text>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('400'), fontSize: 11 }}>
                    {isAutoExecute ? 'Ejecución automática al vencer' : 'Confirmarás manualmente con ¿Pagar?'}
                  </Text>
                </View>
                <Switch
                  value={isAutoExecute}
                  onValueChange={setIsAutoExecute}
                  trackColor={{ false: theme.border, true: theme.brand }}
                />
              </View>
            </View>
          ) : null}
        </View>

        {/* Págate Primero + Asistente Grati/CTS en Ingresos */}
        {!initialData && activeTab === 'INCOME' ? (
          <View style={{ gap: 8 }}>
            {payYourselfFirstEnabled && targetPayFirstGoal && Number(amount || 0) > 0 ? (
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setApplyPayYourselfFirst((v) => !v);
                }}
                style={[
                  styles.ccBox,
                  {
                    backgroundColor: applyPayYourselfFirst
                      ? alphaHex(theme.income, 0.12)
                      : theme.card,
                    borderColor: applyPayYourselfFirst ? theme.income : theme.border,
                  },
                ]}
              >
                <PiggyBank
                  size={17}
                  color={applyPayYourselfFirst ? theme.income : theme.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 12.5 }}>
                    Págate primero ({payYourselfFirstPct}%)
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 11 }}>
                    Apartar {currencySymbol}
                    {(Number(amount || 0) * (payYourselfFirstPct / 100)).toFixed(2)} hacia &quot;{targetPayFirstGoal.name}&quot;
                  </Text>
                </View>
                <CheckCircle2
                  size={18}
                  color={applyPayYourselfFirst ? theme.income : theme.textMuted}
                />
              </Pressable>
            ) : null}

            {isExtraIncomeKeyword(description) && Number(amount || 0) > 0 ? (
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setOpenAssistantOnSave((v) => !v);
                }}
                style={[
                  styles.ccBox,
                  {
                    backgroundColor: openAssistantOnSave
                      ? theme.brandSoft
                      : theme.card,
                    borderColor: openAssistantOnSave ? theme.brand : theme.border,
                  },
                ]}
              >
                <Sparkles
                  size={16}
                  color={openAssistantOnSave ? theme.brand : theme.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 12.5 }}>
                    Asistente Grati / CTS / Extra
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 11 }}>
                    Al guardar, abrir el repartidor entre deuda, emergencia y metas
                  </Text>
                </View>
                <CheckCircle2
                  size={18}
                  color={openAssistantOnSave ? theme.brand : theme.textMuted}
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Sticky Submit Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {!initialData ? (
          <Pressable
            disabled={isSubmitting}
            onPress={() => handleSubmit(true)}
            style={[styles.secondarySubmit, { backgroundColor: theme.muted, borderColor: theme.border }]}
          >
            <Plus size={16} color={theme.text} />
            <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 13 }}>
              Otra
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          disabled={isSubmitting}
          onPress={() => handleSubmit(false)}
          style={[styles.primarySubmit, { backgroundColor: actionColor }]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Check size={19} color="#FFFFFF" strokeWidth={2.8} />
              <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(15) }}>
                {initialData ? 'Actualizar Registro' : 'Completar Transacción'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <PremiumBottomSheet
        open={Boolean(scanDraft)}
        onClose={() => setScanDraft(null)}
        title="Confirmar datos del comprobante"
        subtitle={
          scanDraft
            ? `Origen: ${scanDraft.walletApp}${scanDraft.provider ? ` · ${scanDraft.provider.split(':')[0].toUpperCase()}` : ''}`
            : undefined
        }
        footer={
          <View style={styles.twoCol}>
            <Pressable
              onPress={() => setScanDraft(null)}
              style={[
                styles.halfBtn,
                { backgroundColor: theme.muted, borderColor: theme.border, paddingVertical: 13 },
              ]}
            >
              <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: 13.5 }}>
                Descartar
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirmScanDraft}
              style={[
                styles.halfBtn,
                { backgroundColor: theme.brand, borderColor: theme.brand, paddingVertical: 13 },
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 13.5 }}>
                Confirmar datos
              </Text>
            </Pressable>
          </View>
        }
      >
        {scanDraft ? (
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: alphaHex(theme.brand, 0.07),
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: alphaHex(theme.brand, 0.18),
              }}
            >
              <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 11 }}>
                {scanPlanNotice}
              </Text>
            </View>

            {scanDraft.possibleDuplicate ? (
              <View
                style={[
                  styles.ccBox,
                  {
                    backgroundColor: alphaHex(theme.expense, 0.1),
                    borderColor: theme.expense,
                  },
                ]}
              >
                <AlertTriangle size={18} color={theme.expense} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.expense, fontFamily: theme.font('800'), fontSize: 12.5 }}>
                    Posible comprobante duplicado
                  </Text>
                  <Text style={{ color: theme.text, fontFamily: theme.font('600'), fontSize: 11.5 }}>
                    {scanDraft.possibleDuplicate.reason}. Ya existe &quot;{scanDraft.possibleDuplicate.description}&quot;.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Tipo detectado (editable) */}
            <View style={styles.twoCol}>
              {(
                [
                  { id: 'EXPENSE', label: 'Gasto / Envío', color: theme.expense },
                  { id: 'INCOME', label: 'Ingreso / Recibido', color: theme.income },
                ] as const
              ).map((opt) => {
                const active = scanDraft.transactionType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() =>
                      setScanDraft((prev) => (prev ? { ...prev, transactionType: opt.id } : prev))
                    }
                    style={[
                      styles.halfBtn,
                      {
                        backgroundColor: active ? alphaHex(opt.color, 0.14) : theme.muted,
                        borderColor: active ? opt.color : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? opt.color : theme.textSecondary,
                        fontFamily: theme.font('800'),
                        fontSize: 12,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={[
                styles.schedCard,
                { backgroundColor: theme.muted, borderColor: theme.border, gap: 8 },
              ]}
            >
              <View style={styles.sugHeader}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 12 }}>
                  Monto detectado
                </Text>
                <Text
                  style={{
                    color: scanDraft.transactionType === 'INCOME' ? theme.income : theme.expense,
                    fontFamily: theme.font('800'),
                    fontSize: 17,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {getCurrencySymbol(scanDraft.currency)} {scanDraft.amount || '0.00'}
                </Text>
              </View>

              <View style={styles.sugHeader}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 12 }}>
                  Comercio / Persona
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.text,
                    fontFamily: theme.font('700'),
                    fontSize: 12.5,
                    maxWidth: '60%',
                  }}
                >
                  {scanDraft.vendor || scanDraft.description || 'No detectado'}
                </Text>
              </View>

              <View style={styles.sugHeader}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 12 }}>
                  Fecha y hora
                </Text>
                <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 12.5 }}>
                  {[scanDraft.date || 'Hoy', scanDraft.time].filter(Boolean).join(' · ')}
                </Text>
              </View>

              <View style={styles.sugHeader}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 12 }}>
                  Nro. operación
                </Text>
                <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 12.5 }}>
                  {scanDraft.operationNumber || 'No visible'}
                </Text>
              </View>

              <View style={styles.sugHeader}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 12 }}>
                  Categoría sugerida
                </Text>
                <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 12.5 }}>
                  {scanDraft.suggestedCategoryName || 'Elegir al revisar'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </PremiumBottomSheet>

      {/* Modals & Pickers */}
      <PremiumCategoryPicker
        open={isCatPickerOpen}
        onClose={() => setIsCatPickerOpen(false)}
        categories={categories}
        selectedCategoryId={categoryId}
        selectedSubcategoryId={subcategoryId}
        recentCategoryIds={recentCategoryIds}
        type={activeTab === 'INCOME' ? 'INCOME' : 'EXPENSE'}
        onSelect={(cat, sub) => {
          setCategoryId(cat);
          setSubcategoryId(sub || '');
          setHasManualCat(true);
        }}
      />

      <PremiumBottomSheet
        open={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        title="Calculadora de monto"
      >
        <PremiumCalculator
          initialValue={amount || '0'}
          currencySymbol={currencySymbol}
          accentColor={actionColor}
          onConfirm={(val) => setAmount(val)}
          onClose={() => setIsCalcOpen(false)}
        />
      </PremiumBottomSheet>

      <PremiumBottomSheet
        open={isModeInfoOpen}
        onClose={() => setIsModeInfoOpen(false)}
        title="Tipo de Transacción"
      >
        <View style={styles.wrapRow}>
          {[
            { id: 'UPCOMING', label: 'Próximamente', Icon: Clock },
            { id: 'SUBSCRIPTION', label: 'Suscripción', Icon: CalendarClock },
            { id: 'RECURRING', label: 'Repetitivo', Icon: Repeat },
            { id: 'DEFAULT', label: 'Por defecto', Icon: CheckCircle2 },
          ].map((b) => {
            const BIcon = b.Icon;
            const active = modeInfoTab === b.id;
            return (
              <Pressable
                key={b.id}
                onPress={() => setModeInfoTab(b.id)}
                style={[
                  styles.accPill,
                  {
                    backgroundColor: active ? theme.brand : theme.muted,
                    borderColor: active ? theme.brand : theme.border,
                  },
                ]}
              >
                <BIcon size={14} color={active ? '#FFFFFF' : theme.brand} />
                <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                  {b.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.guideBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 15 }}>
            {modeInfoTab === 'UPCOMING'
              ? 'Pago único futuro: no afecta tu saldo hasta que lo marques como pagado.'
              : modeInfoTab === 'SUBSCRIPTION'
                ? 'Suscripción periódica: aparece en Programados y genera el siguiente ciclo al confirmar.'
                : modeInfoTab === 'RECURRING'
                  ? 'Ingreso o gasto periódico (sueldo, alquiler) con límite configurable.'
                  : 'Transacción inmediata: actualiza el saldo de tu cuenta y reportes al instante.'}
          </Text>
        </View>
      </PremiumBottomSheet>

      {initialData ? (
        <ConfirmAlertModal
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          variant="danger"
          title="¿Eliminar transacción?"
          description="El saldo de tus cuentas se ajustará automáticamente."
          confirmLabel="Eliminar"
          onConfirm={async () => {
            await deleteTransaction.mutateAsync(initialData.id);
            router.back();
          }}
        />
      ) : null}

      {!initialData ? (
        <ExpressTransactionSheet
          open={isExpressOpen}
          onOpenChange={setIsExpressOpen}
          initialStep={expressStepInitial}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          description={description}
          onDescriptionChange={(val) => {
            setDescription(val);
            if (!val.trim()) setHasManualCat(false);
          }}
          amount={amount || '0'}
          onAmountChange={setAmount}
          categoryId={categoryId}
          subcategoryId={subcategoryId}
          onCategorySelect={(cat, sub) => {
            setCategoryId(cat);
            setSubcategoryId(sub || '');
            setHasManualCat(true);
          }}
          categories={categories}
          recentCategoryIds={recentCategoryIds}
          accounts={accounts}
          accountId={accountId}
          onAccountSelect={setAccountId}
          transferToAccountId={transferToAccountId}
          onTransferToSelect={setTransferToAccountId}
          onSwapTransferAccounts={handleSwapTransfer}
          frequent={frequent}
          autocompleteMatches={autocompleteMatches}
          onApplySuggestion={(item) => {
            setDescription(item.description);
            if (item.categoryId && activeTab !== 'TRANSFER') {
              setCategoryId(item.categoryId);
              setSubcategoryId(item.subcategoryId || '');
              setHasManualCat(true);
            }
            if (item.lastAmount > 0) setAmount(String(item.lastAmount));
          }}
          smartSuggestions={(smartCatData?.suggestions as any) || []}
          transactionDate={txDate}
          onDateChange={setTxDate}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 28,
    padding: 18,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  heroTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 99,
    padding: 4,
    gap: 4,
  },
  heroTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 99,
    alignItems: 'center',
  },
  heroTabActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  heroCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  heroIconBtn: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroCurrency: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 22,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 44,
    fontVariant: ['tabular-nums'],
  },
  heroCatLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
  },
  scanRow: { flexDirection: 'row', gap: 10 },
  scanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  sugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sugTabs: { flexDirection: 'row', padding: 3, borderRadius: 99, gap: 4 },
  sugTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  sugChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  sugIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
  },
  inputField: { flex: 1, height: 48 },
  smartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
  },
  autoCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateTimeRow: { flexDirection: 'row', gap: 10 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  accPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
  },
  ccBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 13,
    gap: 10,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  tagDot: { width: 7, height: 7, borderRadius: 99 },
  tagInputRow: { flexDirection: 'row', gap: 8 },
  tagInput: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 11,
    fontSize: 12.5,
  },
  tagAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
  },
  schedCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 11,
  },
  twoCol: { flexDirection: 'row', gap: 8 },
  halfBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
  },
  intervalBox: {
    width: 48,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
  },
  autoPayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  secondarySubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 99,
    borderWidth: 1,
  },
  primarySubmit: {
    flex: 1,
    height: 50,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  guideBox: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
});
