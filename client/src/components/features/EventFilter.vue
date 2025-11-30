<script setup>
import { ref, watch } from 'vue'
import { FunnelIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import Button from '@/components/common/Button.vue'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'apply'])

const showFilters = ref(false)

const defaultState = {
  category: '',
  city: '',
  dateFrom: '',
  dateTo: '',
  minPrice: '',
  maxPrice: '',
  status: 'approved',
  sort: 'date_asc'
}

const filters = ref({ ...defaultState, ...props. modelValue })

watch(() => props.modelValue, (newVal) => {
  filters.value = { 
    ...defaultState,
    ...newVal
  }
}, { deep: true })

const sortOptions = [
  { value: 'date_asc', label: 'Date: Earliest First' },
  { value: 'date_desc', label: 'Date: Latest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' }
]

const applyFilters = () => {
  const filtersToEmit = { ...filters. value }
  emit('update:modelValue', filtersToEmit)
  emit('apply', filtersToEmit)
  showFilters.value = false
}

const clearFilters = () => {
  filters.value = { ...defaultState }
  
  if (props.modelValue.search) {
    filters.value. search = props.modelValue.search
  }

  applyFilters()
}

const hasActiveFilters = () => {
  const f = filters.value
  
  const hasCategory = f. category && f.category !== ''
  const hasCity = f.city && f.city. trim() !== ''
  const hasDateFrom = f.dateFrom && f.dateFrom !== ''
  const hasDateTo = f.dateTo && f.dateTo !== ''
  const hasMinPrice = f. minPrice && Number(f.minPrice) > 0
  const hasMaxPrice = f.maxPrice && Number(f.maxPrice) > 0
  const hasSort = f.sort && f.sort !== 'date_asc'

  return hasCategory || hasCity || hasDateFrom || hasDateTo || hasMinPrice || hasMaxPrice || hasSort
}
</script>

<template>
  <div class="relative z-[60]">
    <!-- Filter Button -->
    <Button
      variant="secondary"
      @click="showFilters = ! showFilters"
      class="relative whitespace-nowrap"
    >
      <FunnelIcon class=" inline-flex w-5 h-5" />
      <span class="ml-1">Filters</span>
      
      <!-- Active Indicator -->
      <span 
        v-if="hasActiveFilters()" 
        class="absolute -top-1 -right-1 w-3 h-3 bg-primary-600 rounded-full border-2 border-white"
      ></span>
    </Button>

    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="showFilters"
        @click="showFilters = false"
        class="fixed inset-0 bg-black/50 z-[61]"
      ></div>
    </Transition>

    <!-- Filter Dropdown -->
    <Transition 
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="showFilters"
        v-click-away="() => showFilters = false"
        @click. stop
        class="
          absolute right-0 mt-2 w-[380px] 
          bg-white rounded-xl shadow-2xl border border-gray-200 
          z-[62]
          max-h-[calc(100vh-200px)] overflow-hidden
          origin-top-right
        "
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h3 class="font-bold text-lg text-gray-900">Filter Events</h3>
          <button 
            @click="showFilters = false" 
            class="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-200 rounded-lg"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Filter Form -->
        <div class="px-5 py-4 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)]">
          <!-- Category -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1. 5">Category</label>
            <select v-model="filters. category" class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              <option value="" class="text-gray-900">All Categories</option>
              <option v-for="category in categories" :key="category.id" :value="category.id" class="text-gray-900">
                {{ category.name }}
              </option>
            </select>
          </div>

          <!-- Date Range -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Date Range</label>
            <div class="grid grid-cols-2 gap-2">
              <input 
                v-model="filters.dateFrom" 
                type="date" 
                class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
              />
              <input 
                v-model="filters.dateTo" 
                type="date" 
                class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
              />
            </div>
          </div>

          <!-- Price Range -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Price Range (VND)</label>
            <div class="grid grid-cols-2 gap-2">
              <input 
                v-model.number="filters. minPrice" 
                type="number" 
                placeholder="Min" 
                class="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                min="0"
              />
              <input 
                v-model.number="filters. maxPrice" 
                type="number" 
                placeholder="Max" 
                class="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                min="0"
              />
            </div>
          </div>

          <!-- City -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">City</label>
            <input 
              v-model="filters.city" 
              type="text" 
              placeholder="Enter city..." 
              class="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
            />
          </div>

          <!-- Sort -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Sort By</label>
            <select v-model="filters.sort" class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              <option v-for="option in sortOptions" :key="option. value" :value="option.value" class="text-gray-900">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <Button 
            variant="secondary" 
            size="sm"
            @click="clearFilters" 
            class="flex-1 justify-center"
          >
            Clear
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            @click="applyFilters" 
            class="flex-1 justify-center"
          >
            Apply
          </Button>
        </div>
      </div>
    </Transition>
  </div>
</template>