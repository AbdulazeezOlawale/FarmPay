<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import api from '@/api/api';
import { 
  Package, ShieldCheck, Clock, CheckCircle2, 
  MapPin, Copy, Loader2, Inbox, LayoutDashboard,
  ShoppingBag, LogOut, Bell, RotateCw, 
  AlertCircle, X, Upload, Trash2, ImageIcon,
  CreditCard, ScanLine, Eye, ExternalLink, Truck
} from 'lucide-vue-next';
import LiveMap from '@/components/logistics/LiveMap.vue';
import DeliveryTimeline from '@/components/logistics/DeliveryTimeline.vue';

const router = useRouter();
const auth = useAuthStore();
const orders = ref([]);
const isLoading = ref(true);

// --- Payment Modal State ---
const isPaymentModalOpen = ref(false);
const paymentOrder = ref(null);
const isInitiatingPayment = ref(false);
const paymentError = ref('');
const checkoutUrl = ref('');

// --- Scan Delivery Modal State ---
const isScanModalOpen = ref(false);
const scanOrder = ref(null);
const scanImage = ref(null);
const scanImagePreview = ref(null);
const isScanning = ref(false);
const scanResult = ref(null);

// --- Dispute Modal State ---
const isDisputeModalOpen = ref(false);
const disputeOrder = ref(null);
const disputeReason = ref('');
const disputeImages = ref([]);
const isSubmittingDispute = ref(false);

// --- Tracking Modal State ---
const isTrackingModalOpen = ref(false);
const trackingOrder = ref(null);

// User Profile
const user = ref({
  name: auth.user?.fullName?.split(' ')[0] || 'User',
  email: auth.user?.email,
  avatar: null,
  role: auth.user?.role || 'Buyer'
});

const fetchOrders = async () => {
  isLoading.value = true;
  try {
    const response = await api.get('/orders/my-orders'); 
    orders.value = response.data || response;
  } catch (err) {
    console.error("Error fetching orders:", err);
  } finally {
    isLoading.value = false;
  }
};

// --- Payment Logic ---
const openPaymentModal = (order) => {
  paymentOrder.value = order;
  paymentError.value = '';
  checkoutUrl.value = '';
  isPaymentModalOpen.value = true;
};

const initiatePayment = async () => {
  if (!paymentOrder.value) return;
  
  isInitiatingPayment.value = true;
  paymentError.value = '';
  
  try {
    const response = await api.post(`/payments/initiate/${paymentOrder.value.id}`);
    checkoutUrl.value = response.checkout_url;
  } catch (err) {
    console.error("Payment initiation error:", err);
    paymentError.value = err.detail || "Failed to initiate payment. Please try again.";
  } finally {
    isInitiatingPayment.value = false;
  }
};

const proceedToCheckout = () => {
  if (checkoutUrl.value) {
    window.open(checkoutUrl.value, '_blank');
  }
};

const checkPaymentStatus = async () => {
  try {
    await api.post('/payments/verify', { transaction_ref: paymentOrder.value.payment_reference });
    alert('Payment verified successfully!');
    isPaymentModalOpen.value = false;
    fetchOrders();
  } catch (err) {
    paymentError.value = err.detail || "Payment not yet confirmed";
  }
};

// --- Scan Delivery Logic ---
const openScanModal = (order) => {
  scanOrder.value = order;
  scanImage.value = null;
  scanImagePreview.value = null;
  scanResult.value = null;
  isScanModalOpen.value = true;
};

const handleScanImageUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    scanImage.value = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      scanImagePreview.value = e.target.result;
    };
    reader.readAsDataURL(file);
  }
};

const performScan = async () => {
  if (!scanImage.value || !scanOrder.value) return;
  
  isScanning.value = true;
  scanResult.value = null;
  
  try {
    const formData = new FormData();
    formData.append('image', scanImage.value);
    const response = await api.post(`/orders/scan-delivery/${scanOrder.value.id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    scanResult.value = response;
  } catch (err) {
    console.error("Scan error:", err);
    alert(err.detail || "Failed to scan delivery");
  } finally {
    isScanning.value = false;
  }
};

// --- Dispute Logic ---
const openDisputeModal = (order) => {
  disputeOrder.value = order;
  disputeReason.value = '';
  disputeImages.value = [];
  isDisputeModalOpen.value = true;
};

const handleDisputeImageUpload = (event) => {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      disputeImages.value.push(e.target.result);
    };
    reader.readAsDataURL(file);
  });
};

const removeDisputeImage = (index) => {
  disputeImages.value.splice(index, 1);
};

const submitDispute = async () => {
  if (!disputeReason.value || disputeImages.value.length === 0) return;

  isSubmittingDispute.value = true;
  try {
    await api.post('/disputes/create', {
      order_id: disputeOrder.value.id,
      reason: disputeReason.value,
      images: disputeImages.value
    });

    alert("Dispute submitted. Our team will review the evidence.");
    isDisputeModalOpen.value = false;
    fetchOrders();
  } catch (err) {
    alert(err.response?.data?.message || "Failed to submit dispute.");
  } finally {
    isSubmittingDispute.value = false;
  }
};

const handleLogout = () => {
  auth.logout();
  router.push('/login');
};

const copyOTP = (otp) => {
  if (!otp) return;
  navigator.clipboard.writeText(otp.replace(/\s/g, ''));
  alert("Release Code copied!");
};

onMounted(fetchOrders);

// Stats
const totalSpent = computed(() => {
  return orders.value
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
});

const inEscrow = computed(() => {
  return orders.value
    .filter(o => o.escrow_status === 'held')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
});

const inTransit = computed(() => {
  return orders.value.filter(o => 
    o.delivery_status === 'in_transit' || 
    o.delivery_status === 'transit' ||
    o.delivery_status === 'assigned'
  ).length;
});

const pendingPayment = computed(() => {
  return orders.value.filter(o => o.payment_status === 'pending').length;
});

// Get order items summary
const getOrderItems = (order) => {
  if (order.order_items && order.order_items.length > 0) {
    return order.order_items.map(item => item.product?.name || 'Produce').join(', ');
  }
  return 'Produce Order';
};
</script>

<template>
  <div class="flex min-h-screen bg-[#061209] text-[#f0ede4]">
    
    <aside class="w-64 border-r border-white/5 bg-[#081a0c] hidden md:flex flex-col p-6 sticky top-0 h-screen">
      <div class="mb-10 flex items-center gap-2 px-2 cursor-pointer" @click="router.push('/')">
        <div class="w-8 h-8 bg-[#5cb83a] rounded-lg flex items-center justify-center">
          <ShieldCheck class="text-[#061209]" :size="20" />
        </div>
        <span class="font-serif text-xl font-bold tracking-tight">FarmPay</span>
      </div>

      <nav class="flex-1 space-y-2">
        <button class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#5cb83a]/10 text-[#5cb83a] font-medium">
          <LayoutDashboard :size="20" /> Dashboard
        </button>
        <button @click="router.push('/marketplace')" class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
          <ShoppingBag :size="20" /> Marketplace
        </button>
      </nav>

      <div class="mt-auto pt-6 border-t border-white/5">
        <div class="flex items-center gap-3 mb-4 px-2">
          <div class="w-10 h-10 rounded-full bg-[#5cb83a]/20 border border-[#5cb83a]/30 flex items-center justify-center text-[#5cb83a] font-bold">
            {{ user.name.charAt(0) }}
          </div>
          <div class="overflow-hidden">
            <p class="text-sm font-bold truncate">{{ user.name }}</p>
            <p class="text-[10px] text-white/30 uppercase tracking-widest">{{ user.role }}</p>
          </div>
        </div>
        <button @click="handleLogout" class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-400/10 transition-all text-sm font-medium">
          <LogOut :size="18" /> Logout
        </button>
      </div>
    </aside>

    <main class="flex-1 p-6 md:p-10 overflow-y-auto">
      <div class="max-w-5xl mx-auto">
        
        <header class="mb-10 flex justify-between items-center">
          <div>
            <h1 class="text-3xl font-serif">Buyer Terminal</h1>
            <p class="text-white/40 text-sm italic">Secure produce acquisition & escrow management.</p>
          </div>
          <button @click="fetchOrders" class="p-3 rounded-full bg-white/5 border border-white/10 hover:border-[#5cb83a] transition-all">
            <RotateCw :size="18" :class="{ 'animate-spin': isLoading }" />
          </button>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div class="bg-white/5 border border-white/10 p-5 rounded-[2rem]">
            <p class="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2">Total Settled</p>
            <p class="text-2xl font-serif">₦{{ totalSpent.toLocaleString() }}</p>
          </div>
          <div class="bg-[#5cb83a]/10 border border-[#5cb83a]/20 p-5 rounded-[2rem] relative overflow-hidden">
            <ShieldCheck class="absolute -right-4 -bottom-4 text-[#5cb83a]/5" :size="80" />
            <p class="text-[10px] uppercase tracking-widest text-[#5cb83a] font-bold mb-2">Active Escrow</p>
            <p class="text-2xl font-serif">₦{{ inEscrow.toLocaleString() }}</p>
          </div>
          <div class="bg-blue-500/10 border border-blue-500/20 p-5 rounded-[2rem]">
            <p class="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-2">In Transit</p>
            <p class="text-2xl font-serif">{{ inTransit }}</p>
          </div>
          <div class="bg-amber-500/10 border border-amber-500/20 p-5 rounded-[2rem]">
            <p class="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-2">Pending Payment</p>
            <p class="text-2xl font-serif">{{ pendingPayment }}</p>
          </div>
        </div>

        <section class="space-y-6">
          <h3 class="font-bold text-xs uppercase tracking-[0.2em] text-white/40 px-2">Order History</h3>

          <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
            <Loader2 class="animate-spin text-[#5cb83a]" :size="32" />
          </div>

          <div v-else-if="orders.length === 0" class="text-center py-20 bg-white/2 rounded-[2.5rem] border border-white/5">
            <Inbox :size="40" class="mx-auto mb-4 text-white/10" />
            <p class="text-white/40">No orders found.</p>
            <button @click="router.push('/marketplace')" class="mt-4 text-[#5cb83a] text-sm font-bold hover:underline">
              Browse Marketplace
            </button>
          </div>

          <div v-else v-for="order in orders" :key="order.id" 
               class="bg-[#0d2010] border border-white/10 rounded-[2.5rem] p-6 transition-all hover:bg-[#112814]">
            
            <!-- Order Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-center">
                  <Package class="text-[#5cb83a]/40" :size="24" />
                </div>
                <div>
                  <span class="text-[9px] font-mono text-white/20 uppercase block mb-1">#{{ order.id.slice(-8) }}</span>
                  <h4 class="font-bold text-lg">{{ getOrderItems(order) }}</h4>
                </div>
              </div>
              
              <div class="flex items-center gap-3">
                <span 
                  class="px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider"
                  :class="{
                    'bg-amber-500/10 text-amber-500': order.payment_status === 'pending',
                    'bg-blue-500/10 text-blue-400': order.delivery_status === 'in_transit' || order.delivery_status === 'transit',
                    'bg-[#5cb83a]/10 text-[#5cb83a]': order.status === 'completed',
                    'bg-red-500/10 text-red-400': order.delivery_status === 'disputed',
                  }"
                >
                  {{ order.payment_status === 'pending' ? 'Payment Pending' : order.delivery_status === 'in_transit' ? 'In Transit' : order.delivery_status }}
                </span>
              </div>
            </div>

            <!-- Order Details Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-white/5">
              <div>
                <p class="text-[8px] uppercase text-white/30 font-bold mb-1">Delivery To</p>
                <p class="text-xs text-white/60">{{ order.delivery_location || 'Not specified' }}</p>
              </div>
              <div>
                <p class="text-[8px] uppercase text-white/30 font-bold mb-1">Delivery Fee</p>
                <p class="text-xs text-white/60">₦{{ (order.delivery_fee || 0).toLocaleString() }}</p>
              </div>
              <div>
                <p class="text-[8px] uppercase text-white/30 font-bold mb-1">Escrow Status</p>
                <p class="text-xs" :class="order.escrow_status === 'held' ? 'text-amber-400' : 'text-[#5cb83a]'">
                  {{ order.escrow_status || 'N/A' }}
                </p>
              </div>
              <div>
                <p class="text-[8px] uppercase text-white/30 font-bold mb-1">Total Amount</p>
                <p class="text-sm font-serif text-[#5cb83a]">₦{{ (order.total_amount || 0).toLocaleString() }}</p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap gap-3">
              <!-- Payment Button - for pending orders -->
              <button 
                v-if="order.payment_status === 'pending'"
                @click="openPaymentModal(order)"
                class="bg-[#5cb83a] text-[#061209] px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#4da330] transition-all"
              >
                <CreditCard :size="14" />
                Pay Now
              </button>

              <!-- Scan Delivery Button - for in transit orders -->
              <button 
                v-if="order.delivery_status === 'in_transit' || order.delivery_status === 'transit'"
                @click="openScanModal(order)"
                class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500/20 transition-all"
              >
                <ScanLine :size="14" />
                Scan Delivery
              </button>

              <!-- Track Order Button - for paid orders -->
              <button 
                v-if="order.payment_status === 'paid' && order.delivery_status !== 'completed'"
                @click="openTrackingModal(order)"
                class="bg-white/5 text-white border border-white/10 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all"
              >
                <Truck :size="14" />
                Track Order
              </button>

              <!-- OTP - for paid orders not completed -->
              <div v-if="order.payment_status === 'paid' && order.status !== 'completed' && order.otp_code && order.delivery_status !== 'disputed'" 
                   class="bg-black/40 border border-[#5cb83a]/20 px-5 py-2.5 rounded-xl">
                <span class="text-[8px] uppercase tracking-widest text-[#5cb83a] font-bold block mb-1">Release Code</span>
                <div class="flex items-center gap-3">
                  <span class="text-lg font-mono font-bold">{{ order.otp_code }}</span>
                  <button @click="copyOTP(order.otp_code)" class="text-white/30 hover:text-[#5cb83a]">
                    <Copy :size="14" />
                  </button>
                </div>
              </div>

              <!-- Dispute Button -->
              <button 
                v-if="order.status !== 'completed' && order.delivery_status !== 'disputed' && order.payment_status === 'paid'"
                @click="openDisputeModal(order)"
                class="bg-red-500/10 text-red-400 border border-red-500/20 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                <AlertCircle :size="14" />
                Dispute
              </button>

              <!-- Completed Status -->
              <div v-if="order.status === 'completed'" class="flex items-center gap-2 text-[#5cb83a]">
                <CheckCircle2 :size="18" />
                <span class="text-[10px] font-bold uppercase">Delivered & Paid</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Payment Modal -->
    <div v-if="isPaymentModalOpen" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#061209]/95 backdrop-blur-md">
      <div class="bg-[#0d2010] border border-white/10 w-full max-w-md rounded-[3rem] p-8 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-serif">Complete Payment</h2>
          <button @click="isPaymentModalOpen = false" class="text-white/20 hover:text-white"><X :size="24" /></button>
        </div>

        <div class="space-y-4">
          <div class="bg-white/5 rounded-xl p-4">
            <p class="text-[10px] uppercase text-white/30 mb-1">Order Amount</p>
            <p class="text-2xl font-serif text-[#5cb83a]">₦{{ (paymentOrder?.total_amount || 0).toLocaleString() }}</p>
          </div>

          <p class="text-sm text-white/40">
            Click below to proceed to secure payment via Squad. Your funds will be held in escrow until delivery is confirmed.
          </p>

          <div v-if="paymentError" class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            {{ paymentError }}
          </div>

          <div v-if="checkoutUrl" class="space-y-3">
            <button 
              @click="proceedToCheckout"
              class="w-full bg-[#5cb83a] text-[#061209] py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#4da330]"
            >
              <ExternalLink :size="16" />
              Open Secure Checkout
            </button>
            <button 
              @click="checkPaymentStatus"
              class="w-full bg-white/5 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest"
            >
              I've Completed Payment
            </button>
          </div>

          <button 
            v-else
            @click="initiatePayment"
            :disabled="isInitiatingPayment"
            class="w-full bg-[#5cb83a] text-[#061209] py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Loader2 v-if="isInitiatingPayment" class="animate-spin" :size="18" />
            <CreditCard v-else :size="18" />
            {{ isInitiatingPayment ? 'Processing...' : 'Proceed to Payment' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Scan Delivery Modal -->
    <div v-if="isScanModalOpen" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#061209]/95 backdrop-blur-md">
      <div class="bg-[#0d2010] border border-white/10 w-full max-w-md rounded-[3rem] p-8 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-serif">Scan Delivery</h2>
          <button @click="isScanModalOpen = false" class="text-white/20 hover:text-white"><X :size="24" /></button>
        </div>

        <p class="text-sm text-white/40 mb-4">
          Upload a photo of your delivered produce to verify quality before confirming with the rider.
        </p>

        <div class="space-y-4">
          <!-- Image Upload -->
          <div v-if="!scanImagePreview" class="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center">
            <label class="cursor-pointer">
              <Upload class="mx-auto mb-3 text-white/30" :size="32" />
              <p class="text-sm text-white/40 mb-2">Tap to upload photo</p>
              <input type="file" accept="image/*" class="hidden" @change="handleScanImageUpload" />
            </label>
          </div>

          <!-- Image Preview -->
          <div v-else class="relative rounded-2xl overflow-hidden">
            <img :src="scanImagePreview" class="w-full aspect-video object-cover" />
            <button @click="scanImage = null; scanImagePreview = null" class="absolute top-2 right-2 bg-red-500 p-2 rounded-lg">
              <X :size="16" />
            </button>
          </div>

          <!-- Scan Result -->
          <div v-if="scanResult" class="p-4 rounded-xl" :class="scanResult.is_healthy ? 'bg-[#5cb83a]/10 border border-[#5cb83a]/20' : 'bg-red-500/10 border border-red-500/20'">
            <div class="flex items-center gap-3 mb-2">
              <CheckCircle2 v-if="scanResult.is_healthy" class="text-[#5cb83a]" :size="24" />
              <AlertCircle v-else class="text-red-400" :size="24" />
              <span class="font-bold" :class="scanResult.is_healthy ? 'text-[#5cb83a]' : 'text-red-400'">
                {{ scanResult.is_healthy ? 'Product Looks Good!' : 'Issues Detected' }}
              </span>
            </div>
            <p class="text-xs text-white/60">{{ scanResult.recommendation }}</p>
            <p v-if="scanResult.disease_name" class="text-xs text-red-400 mt-2">
              Issue: {{ scanResult.disease_name }}
            </p>
          </div>

          <button 
            @click="performScan"
            :disabled="!scanImage || isScanning"
            class="w-full bg-blue-500 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30"
          >
            <Loader2 v-if="isScanning" class="animate-spin" :size="18" />
            <ScanLine v-else :size="18" />
            {{ isScanning ? 'Analyzing...' : 'Analyze Photo' }}
          </button>

          <p class="text-[10px] text-white/30 text-center">
            AI-powered quality detection
          </p>
        </div>
      </div>
    </div>

    <!-- Dispute Modal -->
    <div v-if="isDisputeModalOpen" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#061209]/95 backdrop-blur-md">
      <div class="bg-[#0d2010] border border-white/10 w-full max-w-lg rounded-[3rem] p-8 shadow-2xl">
        
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-2xl font-serif">Raise Dispute</h2>
          <button @click="isDisputeModalOpen = false" class="text-white/20 hover:text-white"><X :size="24" /></button>
        </div>

        <div class="space-y-6">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2 block">Issue Description</label>
            <textarea v-model="disputeReason" rows="3" placeholder="Describe what's wrong with the produce..." 
                      class="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-red-500/50 transition-all"></textarea>
          </div>

          <div>
            <label class="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2 block">Photo Evidence (Max 3)</label>
            <div class="grid grid-cols-3 gap-3">
              <div v-for="(img, idx) in disputeImages" :key="idx" class="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                <img :src="img" class="w-full h-full object-cover" />
                <button @click="removeDisputeImage(idx)" class="absolute top-1 right-1 bg-red-500 p-1 rounded-lg"><Trash2 :size="12" /></button>
              </div>
              <label v-if="disputeImages.length < 3" class="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white/5 transition-all">
                <Upload class="text-[#5cb83a]" :size="18" />
                <span class="text-[8px] font-bold uppercase opacity-40">Add</span>
                <input type="file" multiple accept="image/*" class="hidden" @change="handleDisputeImageUpload" />
              </label>
            </div>
          </div>

          <button @click="submitDispute" :disabled="isSubmittingDispute || !disputeReason || disputeImages.length === 0"
                  class="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 transition-all">
            <Loader2 v-if="isSubmittingDispute" class="animate-spin" :size="18" />
            Submit Dispute to Escrow
          </button>
        </div>
      </div>
    </div>

    <!-- Tracking Modal -->
    <div v-if="isTrackingModalOpen" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#061209]/95 backdrop-blur-md">
      <div class="bg-[#0d2010] border border-white/10 w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-serif">Track Your Delivery</h2>
          <button @click="isTrackingModalOpen = false" class="text-white/20 hover:text-white"><X :size="24" /></button>
        </div>

        <div class="space-y-6">
          <!-- Live Map -->
          <LiveMap 
            :origin="{ coordinates: [7.4386, 11.0626], name: 'Kaduna' }"
            :destination="{ coordinates: [7.4250, 11.0580], name: trackingOrder?.delivery_location }"
            :status="trackingOrder?.delivery_status || 'pending'"
          />

          <!-- Delivery Timeline -->
          <DeliveryTimeline :current-status="trackingOrder?.delivery_status || 'pending'" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>