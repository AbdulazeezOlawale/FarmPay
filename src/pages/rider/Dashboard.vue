<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import api from '@/api/api';
import { 
  Package, ShieldCheck, Loader2, 
  CheckCircle, Inbox, RefreshCw, 
  FileCheck, MapPin, LogOut
} from 'lucide-vue-next';

const router = useRouter();

// --- State Management ---
const orders = ref([]);
const isLoading = ref(true);
const activeTab = ref('pending'); 
const isOtpModalOpen = ref(false);
const selectedOrder = ref(null);
const otpValue = ref('');
const isVerifying = ref(false);

// --- Auth Actions ---
const auth = useAuthStore();
// --- API Actions ---
const fetchRiderTasks = async () => {
  isLoading.value = true;
  try {
    const response = await api.get('/rider/rider/orders'); 
    orders.value = response.data || response;
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    isLoading.value = false;
  }
};

const openOtpModal = (order) => {
  selectedOrder.value = order;
  otpValue.value = '';
  isOtpModalOpen.value = true;
};

const handleVerifyOtp = async () => {
  if (otpValue.value.length < 6) return;
  isVerifying.value = true;
  try {
    await api.post(`/rider/confirm-delivery/${selectedOrder.value.id}`, {
      otp_code: otpValue.value
    });
    await fetchRiderTasks(); 
    isOtpModalOpen.value = false;
    activeTab.value = 'completed'; 
  } catch (err) {
    alert("Invalid OTP code.");
  } finally {
    isVerifying.value = false;
  }
};

onMounted(fetchRiderTasks);

// --- Filtering Logic ---
const filteredOrders = computed(() => {
  return orders.value.filter(order => {
    const dStatus = order.delivery_status;
    if (activeTab.value === 'pending') return dStatus === 'pending';
    if (activeTab.value === 'picked-up') return dStatus === 'picked-up' || dStatus === 'transit';
    if (activeTab.value === 'disputed') return dStatus === 'disputed';
    if (activeTab.value === 'delivered') return dStatus === 'delivered';
    if (activeTab.value === 'completed') return order.status === 'completed' && dStatus !== 'disputed';
    return false;
  });
});
</script>

<template>
  <div class="min-h-screen bg-[#061209] text-[#f0ede4] p-6 pb-24 font-sans">
    
    <header class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-2xl font-serif tracking-tight">Rider Terminal</h1>
        <div class="flex items-center gap-2 mt-1">
          <span class="w-1.5 h-1.5 bg-[#5cb83a] rounded-full animate-pulse"></span>
          <span class="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Duty Active</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button @click="fetchRiderTasks" class="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <RefreshCw :size="18" :class="{ 'animate-spin': isLoading }" />
        </button>
        <button @click="auth.logout" class="p-3 bg-red-500/5 rounded-2xl border border-red-500/10 text-red-400 hover:bg-red-500/10 active:scale-90 transition-all">
          <LogOut :size="18" />
        </button>
      </div>
    </header>

    <nav class="flex p-1 bg-black/40 rounded-2xl border border-white/5 mb-8 overflow-x-auto no-scrollbar gap-1">
      <button 
        v-for="tab in ['pending', 'picked-up', 'delivered', 'completed', 'disputed']" 
        :key="tab"
        @click="activeTab = tab"
        class="flex-1 min-w-[90px] py-3 text-[9px] uppercase font-bold tracking-widest rounded-xl transition-all"
        :class="activeTab === tab ? 'bg-[#5cb83a] text-[#061209]' : 'text-white/30 hover:text-white/60'"
      >
        {{ tab }}
      </button>
    </nav>

    <section class="space-y-4">
      <div v-if="isLoading" class="flex justify-center py-20">
        <Loader2 class="animate-spin text-[#5cb83a]" :size="32" />
      </div>

      <div v-else-if="filteredOrders.length === 0" class="text-center py-20 bg-white/2 rounded-[2.5rem] border border-dashed border-white/10">
        <Inbox class="mx-auto mb-2 text-white/5" :size="32" />
        <p class="text-[10px] uppercase tracking-widest text-white/20">Queue clear: {{ activeTab }}</p>
      </div>

      <div v-for="order in filteredOrders" :key="order.id" 
           class="bg-[#0d2010] border border-white/10 p-6 rounded-[2.5rem] transition-all">
        
        <div class="flex justify-between items-start mb-6">
          <div class="p-3 bg-white/5 rounded-2xl text-white/40">
            <Package v-if="activeTab !== 'completed'" :size="20" />
            <FileCheck v-else class="text-[#5cb83a]" :size="20" />
          </div>
          <span class="text-[10px] font-mono text-white/20 uppercase">#{{ order.id.slice(-8).toUpperCase() }}</span>
        </div>

        <div class="space-y-4 mb-6 border-l-2 border-[#5cb83a]/20 pl-4">
          <div>
            <span class="text-[8px] uppercase text-white/20 block mb-1">Drop-off Point</span>
            <p class="text-xs font-medium">{{ order.delivery_location }}</p>
          </div>
          <div>
            <span class="text-[8px] uppercase text-white/20 block mb-1">Total Payout</span>
            <p class="text-lg font-serif text-[#5cb83a]">₦{{ (order.total_amount || 0).toLocaleString() }}</p>
          </div>
        </div>

        <div v-if="activeTab === 'pending'">
          <button class="w-full bg-white text-black py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all">
            Confirm Pickup
          </button>
        </div>

        <div v-if="activeTab === 'picked-up'">
          <button @click="openOtpModal(order)" class="w-full bg-[#5cb83a] text-black py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-[#5cb83a]/10 active:scale-95 transition-all">
            Enter Delivery OTP
          </button>
        </div>

        <div v-if="activeTab === 'disputed'" class="text-center p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
          <p class="text-[9px] text-red-500 font-bold uppercase tracking-widest">Under Investigation</p>
          <p class="text-[8px] text-white/30 mt-1 italic">Contact dispatch for resolution</p>
        </div>

        <div v-if="activeTab === 'completed'" class="flex justify-between items-center px-2">
          <span class="text-[9px] font-bold uppercase text-white/20 tracking-widest">Settled to Wallet</span>
          <div class="flex items-center gap-2 text-[#5cb83a]">
            <span class="text-[10px] font-bold uppercase">Success</span>
            <CheckCircle :size="14" />
          </div>
        </div>
      </div>
    </section>

    <div v-if="isOtpModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#061209]/95 backdrop-blur-md">
      <div class="bg-[#0d2010] border border-white/10 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl">
        <div class="text-center mb-8">
          <ShieldCheck class="text-[#5cb83a] mx-auto mb-4" :size="48" />
          <h2 class="text-xl font-serif">Verification Required</h2>
          <p class="text-white/40 text-[10px] uppercase tracking-wider mt-2">Collect code from buyer to finalize</p>
        </div>

        <input 
          v-model="otpValue" 
          type="text" 
          maxlength="6" 
          placeholder="000000"
          class="w-full bg-white/5 border border-white/10 rounded-2xl py-5 text-center text-3xl font-mono tracking-[0.3em] outline-none focus:border-[#5cb83a] transition-all mb-8" 
        />

        <div class="flex gap-3">
          <button @click="isOtpModalOpen = false" class="flex-1 bg-white/5 py-4 rounded-2xl text-[10px] uppercase font-bold tracking-widest">Cancel</button>
          <button 
            @click="handleVerifyOtp" 
            :disabled="isVerifying || otpValue.length < 6"
            class="flex-[2] bg-[#5cb83a] text-[#061209] py-4 rounded-2xl text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2 disabled:opacity-30"
          >
            <Loader2 v-if="isVerifying" class="animate-spin" :size="16" />
            Confirm Delivery
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>