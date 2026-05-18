<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  Wallet, ArrowUpRight, Clock, Loader2,
  Banknote
} from 'lucide-vue-next';

const isLoading = ref(true);
const payouts = ref([]);

// Mock data for demo
const mockPayouts = [
  { id: '1', amount: 45000, type: 'released', date: '2026-05-15', order_id: 'order-123', status: 'completed' },
  { id: '2', amount: 28000, type: 'released', date: '2026-05-10', order_id: 'order-122', status: 'completed' },
  { id: '3', amount: 15000, type: 'released', date: '2026-05-05', order_id: 'order-121', status: 'completed' },
  { id: '4', amount: 65000, type: 'escrow', date: '2026-05-18', order_id: 'order-125', status: 'pending' },
  { id: '5', amount: 32000, type: 'escrow', date: '2026-05-17', order_id: 'order-124', status: 'pending' },
];

const fetchPayouts = async () => {
  isLoading.value = true;
  try {
    payouts.value = mockPayouts;
  } catch (err) {
    console.error("Failed to fetch payouts:", err);
    payouts.value = mockPayouts;
  } finally {
    isLoading.value = false;
  }
};

const totalEarnings = computed(() => {
  return payouts.value
    .filter(p => p.type === 'released' && p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);
});

const pendingPayouts = computed(() => {
  return payouts.value
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
});

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(value);
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

onMounted(fetchPayouts);
</script>

<template>
  <div class="min-h-screen bg-[#061209] text-[#f0ede4] p-6 md:p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif">Payouts</h1>
        <p class="text-white/40 text-sm">Track your earnings and withdrawals</p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-[#0d2010] border border-white/10 p-6 rounded-2xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-[#5cb83a]/10 rounded-xl">
              <Wallet class="text-[#5cb83a]" :size="20" />
            </div>
            <span class="text-[10px] uppercase text-white/40 font-bold tracking-wider">Total Earnings</span>
          </div>
          <p class="text-3xl font-serif text-[#5cb83a]">{{ formatCurrency(totalEarnings) }}</p>
          <p class="text-[10px] text-white/40 mt-2">All time earnings from completed orders</p>
        </div>

        <div class="bg-[#0d2010] border border-white/10 p-6 rounded-2xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-amber-500/10 rounded-xl">
              <Clock class="text-amber-500" :size="20" />
            </div>
            <span class="text-[10px] uppercase text-white/40 font-bold tracking-wider">In Escrow</span>
          </div>
          <p class="text-3xl font-serif text-amber-500">{{ formatCurrency(pendingPayouts) }}</p>
          <p class="text-[10px] text-white/40 mt-2">Awaiting delivery confirmation</p>
        </div>

        <div class="bg-[#0d2010] border border-white/10 p-6 rounded-2xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-blue-500/10 rounded-xl">
              <Banknote class="text-blue-400" :size="20" />
            </div>
            <span class="text-[10px] uppercase text-white/40 font-bold tracking-wider">Available Balance</span>
          </div>
          <p class="text-3xl font-serif text-white">₦0</p>
          <p class="text-[10px] text-white/40 mt-2">Ready for withdrawal</p>
        </div>
      </div>

      <!-- Bank Account Info -->
      <div class="bg-[#0d2010] border border-white/10 p-5 rounded-2xl mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="p-3 bg-white/5 rounded-xl">
              <Banknote class="text-white/40" :size="24" />
            </div>
            <div>
              <p class="text-[10px] text-white/40 uppercase font-bold">Settlement Account</p>
              <p class="text-white font-medium">{{ farmerProfile?.bank_name || 'Bank' }} •••{{ farmerProfile?.account_number?.slice(-4) || '****' }}</p>
            </div>
          </div>
          <span class="px-3 py-1 bg-[#5cb83a]/10 text-[#5cb83a] text-[10px] font-bold uppercase rounded-lg">Active</span>
        </div>
      </div>

      <!-- Payout History -->
      <div class="bg-[#0d2010] border border-white/10 rounded-2xl overflow-hidden">
        <div class="p-6 border-b border-white/5">
          <h2 class="font-serif text-lg">Transaction History</h2>
        </div>

        <div v-if="isLoading" class="flex justify-center py-12">
          <Loader2 class="animate-spin text-[#5cb83a]" :size="32" />
        </div>

        <div v-else class="divide-y divide-white/5">
          <div 
            v-for="payout in payouts" 
            :key="payout.id"
            class="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div class="flex items-center gap-4">
              <div 
                class="p-2 rounded-xl"
                :class="payout.type === 'released' ? 'bg-[#5cb83a]/10' : 'bg-amber-500/10'"
              >
                <ArrowUpRight v-if="payout.type === 'released'" class="text-[#5cb83a]" :size="18" />
                <Clock v-else class="text-amber-500" :size="18" />
              </div>
              <div>
                <p class="font-medium text-white">
                  {{ payout.type === 'released' ? 'Payout Released' : 'Funds in Escrow' }}
                </p>
                <p class="text-[10px] text-white/40">Order #{{ payout.order_id?.slice(-6) }} • {{ formatDate(payout.date) }}</p>
              </div>
            </div>

            <div class="text-right">
              <p 
                class="font-serif text-lg"
                :class="payout.type === 'released' ? 'text-[#5cb83a]' : 'text-amber-500'"
              >
                {{ payout.type === 'released' ? '+' : '' }}{{ formatCurrency(payout.amount) }}
              </p>
              <span 
                class="text-[10px] font-bold uppercase"
                :class="payout.status === 'completed' ? 'text-[#5cb83a]' : 'text-amber-500'"
              >
                {{ payout.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>