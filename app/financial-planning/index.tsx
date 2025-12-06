import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Modal, Alert, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter } from 'expo-router'
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';;
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Plus, Bell, ChevronRight, Target, PiggyBank, Chrome as Home, Briefcase, Car, GraduationCap, Heart, DollarSign, Calendar, Clock, X, ArrowUpRight, CreditCard, Receipt, ChartBar as BarChart3, CircleCheck } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

// Placeholder data for financial overview
const FINANCIAL_OVERVIEW = {
  netWorth: 25000,
  income: 4500,
  expenses: 3200,
  savings: 1300,
  savingsRate: 28.9,
};

// Placeholder data for recent transactions
const RECENT_TRANSACTIONS = [
  {
    id: '1',
    type: 'expense',
    category: 'Food & Dining',
    amount: 45.80,
    date: '2024-07-15',
    description: 'Grocery shopping',
  },
  {
    id: '2',
    type: 'income',
    category: 'Salary',
    amount: 2250.00,
    date: '2024-07-10',
    description: 'Bi-weekly paycheck',
  },
  {
    id: '3',
    type: 'expense',
    category: 'Transportation',
    amount: 35.00,
    date: '2024-07-08',
    description: 'Fuel',
  },
  {
    id: '4',
    type: 'expense',
    category: 'Entertainment',
    amount: 15.99,
    date: '2024-07-05',
    description: 'Streaming subscription',
  },
  {
    id: '5',
    type: 'income',
    category: 'Freelance',
    amount: 350.00,
    date: '2024-07-03',
    description: 'Website design project',
  },
];

// Placeholder data for financial goals
const FINANCIAL_GOALS = [
  {
    id: '1',
    title: 'Emergency Fund',
    target: 10000,
    current: 6500,
    deadline: 'December 2024',
    icon: PiggyBank,
    color: '#FFE4E4',
  },
  {
    id: '2',
    title: 'Down Payment',
    target: 50000,
    current: 15000,
    deadline: 'June 2026',
    icon: Home,
    color: '#E4EAFF',
  },
  {
    id: '3',
    title: 'Retirement',
    target: 1000000,
    current: 75000,
    deadline: 'Ongoing',
    icon: Briefcase,
    color: '#E4FFF4',
  },
  {
    id: '4',
    title: 'New Car',
    target: 25000,
    current: 8000,
    deadline: 'March 2025',
    icon: Car,
    color: '#FFF4E4',
  },
  {
    id: '5',
    title: 'Education Fund',
    target: 30000,
    current: 5000,
    deadline: 'September 2026',
    icon: GraduationCap,
    color: '#FFE4F4',
  },
];

// Placeholder data for financial tips
const FINANCIAL_TIPS = [
  {
    id: '1',
    title: '50/30/20 Rule',
    description: 'Allocate 50% of your income to needs, 30% to wants, and 20% to savings and debt repayment.',
  },
  {
    id: '2',
    title: 'Emergency Fund',
    description: 'Aim to save 3-6 months of living expenses in an easily accessible account for emergencies.',
  },
  {
    id: '3',
    title: 'Debt Snowball',
    description: 'Pay off your smallest debts first to build momentum, then tackle larger ones.',
  },
];

// Transaction categories
const TRANSACTION_CATEGORIES = {
  income: [
    'Salary',
    'Freelance',
    'Investments',
    'Gifts',
    'Refunds',
    'Other Income',
  ],
  expense: [
    'Housing',
    'Transportation',
    'Food & Dining',
    'Utilities',
    'Entertainment',
    'Healthcare',
    'Education',
    'Shopping',
    'Personal Care',
    'Travel',
    'Debt Payments',
    'Savings',
    'Other Expenses',
  ],
};

export default function FinancialPlanningScreen() {
  const router = useRouter();
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [transactions, setTransactions] = useState(RECENT_TRANSACTIONS);
  const [goals, setGoals] = useState(FINANCIAL_GOALS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Transaction form state
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Goal form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalIcon, setGoalIcon] = useState('PiggyBank');
  const [goalColor, setGoalColor] = useState('#FFE4E4');
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }
  
  const handleAddTransaction = () => {
    if (!transactionAmount || isNaN(Number(transactionAmount)) || Number(transactionAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    if (!transactionCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    if (!transactionDescription) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const newTransaction = {
        id: Date.now().toString(),
        type: transactionType,
        category: transactionCategory,
        amount: Number(transactionAmount),
        date: transactionDate,
        description: transactionDescription,
      };
      
      setTransactions([newTransaction, ...transactions]);
      
      // Reset form
      setTransactionType('expense');
      setTransactionAmount('');
      setTransactionCategory('');
      setTransactionDescription('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      
      setIsSubmitting(false);
      setShowAddTransactionModal(false);
      
      // Update financial overview
      if (transactionType === 'income') {
        FINANCIAL_OVERVIEW.income += Number(transactionAmount);
        FINANCIAL_OVERVIEW.netWorth += Number(transactionAmount);
      } else {
        FINANCIAL_OVERVIEW.expenses += Number(transactionAmount);
        FINANCIAL_OVERVIEW.netWorth -= Number(transactionAmount);
      }
      FINANCIAL_OVERVIEW.savings = FINANCIAL_OVERVIEW.income - FINANCIAL_OVERVIEW.expenses;
      FINANCIAL_OVERVIEW.savingsRate = (FINANCIAL_OVERVIEW.savings / FINANCIAL_OVERVIEW.income) * 100;
      
      Alert.alert('Success', 'Transaction added successfully');
    }, 1000);
  };
  
  const handleAddGoal = () => {
    if (!goalTitle) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }
    
    if (!goalTarget || isNaN(Number(goalTarget)) || Number(goalTarget) <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }
    
    if (!goalCurrent || isNaN(Number(goalCurrent)) || Number(goalCurrent) < 0) {
      Alert.alert('Error', 'Please enter a valid current amount');
      return;
    }
    
    if (Number(goalCurrent) > Number(goalTarget)) {
      Alert.alert('Error', 'Current amount cannot be greater than target amount');
      return;
    }
    
    if (!goalDeadline) {
      Alert.alert('Error', 'Please enter a deadline');
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const IconComponent = getIconComponent(goalIcon);
      
      const newGoal = {
        id: Date.now().toString(),
        title: goalTitle,
        target: Number(goalTarget),
        current: Number(goalCurrent),
        deadline: goalDeadline,
        icon: IconComponent,
        color: goalColor,
      };
      
      setGoals([...goals, newGoal]);
      
      // Reset form
      setGoalTitle('');
      setGoalTarget('');
      setGoalCurrent('');
      setGoalDeadline('');
      setGoalIcon('PiggyBank');
      setGoalColor('#FFE4E4');
      
      setIsSubmitting(false);
      setShowAddGoalModal(false);
      
      Alert.alert('Success', 'Financial goal added successfully');
    }, 1000);
  };
  
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'PiggyBank': return PiggyBank;
      case 'Home': return Home;
      case 'Briefcase': return Briefcase;
      case 'Car': return Car;
      case 'GraduationCap': return GraduationCap;
      case 'Heart': return Heart;
      default: return PiggyBank;
    }
  };
  
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const calculateProgress = (current: number, target: number) => {
    return (current / target) * 100;
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => debouncedRouter.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.title}>Financial Planning</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Financial Overview</Text>
          <View style={styles.netWorthContainer}>
            <Text style={styles.netWorthLabel}>Net Worth</Text>
            <Text style={styles.netWorthValue}>{formatCurrency(FINANCIAL_OVERVIEW.netWorth)}</Text>
          </View>
          
          <View style={styles.overviewStats}>
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <TrendingUp size={16} color="#10B981" />
                <Text style={styles.statLabel}>Income</Text>
              </View>
              <Text style={styles.statValue}>{formatCurrency(FINANCIAL_OVERVIEW.income)}</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <TrendingDown size={16} color="#EF4444" />
                <Text style={styles.statLabel}>Expenses</Text>
              </View>
              <Text style={styles.statValue}>{formatCurrency(FINANCIAL_OVERVIEW.expenses)}</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <PiggyBank size={16} color="#4169E1" />
                <Text style={styles.statLabel}>Savings</Text>
              </View>
              <Text style={styles.statValue}>{formatCurrency(FINANCIAL_OVERVIEW.savings)}</Text>
              <Text style={styles.savingsRate}>{FINANCIAL_OVERVIEW.savingsRate.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>
          
          {transactions.slice(0, 3).map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={[
                styles.transactionIconContainer,
                { backgroundColor: transaction.type === 'income' ? '#E4FFF4' : '#FFE4E4' }
              ]}>
                {transaction.type === 'income' ? (
                  <TrendingUp size={24} color="#10B981" />
                ) : (
                  <TrendingDown size={24} color="#EF4444" />
                )}
              </View>
              
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>{transaction.description}</Text>
                <Text style={styles.transactionCategory}>{transaction.category}</Text>
                <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
              </View>
              
              <Text style={[
                styles.transactionAmount,
                { color: transaction.type === 'income' ? '#10B981' : '#EF4444' }
              ]}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </View>
          ))}
          
          <TouchableOpacity 
            style={styles.addTransactionButton}
            onPress={() => setShowAddTransactionModal(true)}
          >
            <Plus size={16} color="#4169E1" />
            <Text style={styles.addTransactionText}>Add Transaction</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Financial Goals</Text>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={16} color="#666666" />
            </TouchableOpacity>
          </View>
          
          {goals.map((goal) => {
            const IconComponent = goal.icon;
            const progress = calculateProgress(goal.current, goal.target);
            
            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={[styles.goalIconContainer, { backgroundColor: goal.color }]}>
                    <IconComponent size={24} color="#000000" />
                  </View>
                  
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalDeadline}>Target: {goal.deadline}</Text>
                  </View>
                </View>
                
                <View style={styles.goalAmounts}>
                  <Text style={styles.goalCurrentAmount}>{formatCurrency(goal.current)}</Text>
                  <Text style={styles.goalTargetAmount}>of {formatCurrency(goal.target)}</Text>
                </View>
                
                <View style={styles.goalProgressContainer}>
                  <View style={styles.goalProgressBar}>
                    <View 
                      style={[
                        styles.goalProgressFill, 
                        { width: `${progress}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.goalProgressText}>{progress.toFixed(0)}%</Text>
                </View>
              </View>
            );
          })}
          
          <TouchableOpacity 
            style={styles.addGoalButton}
            onPress={() => setShowAddGoalModal(true)}
          >
            <Plus size={16} color="#4169E1" />
            <Text style={styles.addGoalText}>Add Financial Goal</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Tips</Text>
          
          {FINANCIAL_TIPS.map((tip) => (
            <View key={tip.id} style={styles.tipCard}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDescription}>{tip.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setShowActionModal(true)}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* Action Selection Modal */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <View style={styles.actionModalContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setShowActionModal(false);
                setShowAddTransactionModal(true);
              }}
            >
              <Receipt size={24} color="#4169E1" />
              <Text style={styles.actionButtonText}>Add Transaction</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setShowActionModal(false);
                setShowAddGoalModal(true);
              }}
            >
              <Target size={24} color="#4169E1" />
              <Text style={styles.actionButtonText}>Add Financial Goal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setShowActionModal(false);
                Alert.alert('Coming Soon', 'Budget planning feature will be available soon!');
              }}
            >
              <BarChart3 size={24} color="#4169E1" />
              <Text style={styles.actionButtonText}>Create Budget Plan</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Add Transaction Modal */}
      <Modal
        visible={showAddTransactionModal}
        animationType="slide"
        onRequestClose={() => setShowAddTransactionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Transaction</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAddTransactionModal(false)}
            >
              <X size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Transaction Type</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity 
                  style={[
                    styles.segmentButton,
                    transactionType === 'expense' && styles.segmentButtonActive
                  ]}
                  onPress={() => setTransactionType('expense')}
                >
                  <TrendingDown size={16} color={transactionType === 'expense' ? "#FFFFFF" : "#666666"} />
                  <Text style={[
                    styles.segmentButtonText,
                    transactionType === 'expense' && styles.segmentButtonTextActive
                  ]}>Expense</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.segmentButton,
                    transactionType === 'income' && styles.segmentButtonActive,
                    transactionType === 'income' && { backgroundColor: '#10B981' }
                  ]}
                  onPress={() => setTransactionType('income')}
                >
                  <TrendingUp size={16} color={transactionType === 'income' ? "#FFFFFF" : "#666666"} />
                  <Text style={[
                    styles.segmentButtonText,
                    transactionType === 'income' && styles.segmentButtonTextActive
                  ]}>Income</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountInputContainer}>
                <DollarSign size={20} color="#666666" />
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                  value={transactionAmount}
                  onChangeText={setTransactionAmount}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                {(transactionType === 'income' ? TRANSACTION_CATEGORIES.income : TRANSACTION_CATEGORIES.expense).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      transactionCategory === category && styles.selectedCategoryChip,
                      transactionType === 'income' && transactionCategory === category && { backgroundColor: '#10B981' }
                    ]}
                    onPress={() => setTransactionCategory(category)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      transactionCategory === category && styles.selectedCategoryChipText
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter description"
                placeholderTextColor="#666666"
                value={transactionDescription}
                onChangeText={setTransactionDescription}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date</Text>
              <View style={styles.dateInputContainer}>
                <Calendar size={20} color="#666666" />
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666666"
                  value={transactionDate}
                  onChangeText={setTransactionDate}
                />
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!transactionAmount || !transactionCategory || !transactionDescription || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleAddTransaction}
              disabled={!transactionAmount || !transactionCategory || !transactionDescription || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Add Transaction</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
      
      {/* Add Goal Modal */}
      <Modal
        visible={showAddGoalModal}
        animationType="slide"
        onRequestClose={() => setShowAddGoalModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Financial Goal</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAddGoalModal(false)}
            >
              <X size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Goal Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter goal title"
                placeholderTextColor="#666666"
                value={goalTitle}
                onChangeText={setGoalTitle}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Target Amount</Text>
              <View style={styles.amountInputContainer}>
                <DollarSign size={20} color="#666666" />
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Amount</Text>
              <View style={styles.amountInputContainer}>
                <DollarSign size={20} color="#666666" />
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                  value={goalCurrent}
                  onChangeText={setGoalCurrent}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Target Date</Text>
              <View style={styles.dateInputContainer}>
                <Calendar size={20} color="#666666" />
                <TextInput
                  style={styles.dateInput}
                  placeholder="e.g., December 2024"
                  placeholderTextColor="#666666"
                  value={goalDeadline}
                  onChangeText={setGoalDeadline}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Icon</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.iconsContainer}
              >
                {['PiggyBank', 'Home', 'Briefcase', 'Car', 'GraduationCap', 'Heart'].map((icon) => {
                  const IconComponent = getIconComponent(icon);
                  return (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconButton,
                        goalIcon === icon && styles.selectedIconButton
                      ]}
                      onPress={() => setGoalIcon(icon)}
                    >
                      <IconComponent size={24} color={goalIcon === icon ? "#FFFFFF" : "#000000"} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Color</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.colorsContainer}
              >
                {['#FFE4E4', '#E4EAFF', '#E4FFF4', '#FFF4E4', '#FFE4F4'].map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color },
                      goalColor === color && styles.selectedColorButton
                    ]}
                    onPress={() => setGoalColor(color)}
                  />
                ))}
              </ScrollView>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!goalTitle || !goalTarget || !goalCurrent || !goalDeadline || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleAddGoal}
              disabled={!goalTitle || !goalTarget || !goalCurrent || !goalDeadline || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Add Goal</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  notificationButton: {
    padding: 8,
  },
  overviewCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
  },
  overviewTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 16,
  },
  netWorthContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  netWorthLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  netWorthValue: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  savingsRate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  addTransactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#EBF0FF',
    borderRadius: 12,
    gap: 8,
  },
  addTransactionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  goalCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 4,
  },
  goalDeadline: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  goalCurrentAmount: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginRight: 4,
  },
  goalTargetAmount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  goalProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#4169E1',
    borderRadius: 4,
  },
  goalProgressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    width: 40,
    textAlign: 'right',
  },
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#EBF0FF',
    borderRadius: 12,
    gap: 8,
  },
  addGoalText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  tipCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    gap: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  segmentButtonActive: {
    backgroundColor: '#EF4444',
  },
  segmentButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
  },
  selectedCategoryChip: {
    backgroundColor: '#EF4444',
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  selectedCategoryChipText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000000',
  },
  submitButton: {
    backgroundColor: '#4169E1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  iconsContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIconButton: {
    backgroundColor: '#4169E1',
  },
  colorsContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 16,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  selectedColorButton: {
    borderWidth: 2,
    borderColor: '#000000',
  },
});