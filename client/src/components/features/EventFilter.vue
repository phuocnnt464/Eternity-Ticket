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

const filters = ref({ ...defaultState, ...props.modelValue })

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
  const filtersToEmit = { ...filters.value }
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
  
  const hasCategory = f.category && f.category !== ''
  const hasCity = f.city && f.city. trim() !== ''
  const hasDateFrom = f.dateFrom && f.dateFrom !== ''
  const hasDateTo = f.dateTo && f.dateTo !== ''
  const hasMinPrice = f.minPrice && Number(f.minPrice) > 0
  const hasMaxPrice = f.maxPrice && Number(f.maxPrice) > 0
  const hasSort = f.sort && f.sort !== 'date_asc'

  return hasCategory || hasCity || hasDateFrom || hasDateTo || hasMinPrice || hasMaxPrice || hasSort
}
</script>

<template>
  <div class="relative">
    <!-- Filter Button -->
    <Button
      variant="secondary"
      @click="showFilters = ! showFilters"
      class="relative whitespace-nowrap"
    >
      <FunnelIcon class="w-5 h-5" />
      <span>Filters</span>
      
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
        class="fixed inset-0 bg-black/50 z-[100]"
      ></div>
    </Transition>

    <!-- Filter Modal -->
    <Transition 
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <div 
        v-if="showFilters"
        @click. stop
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[500px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 z-[101] overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <h3 class="font-bold text-xl text-gray-900">Filter Events</h3>
          <button 
            @click="showFilters = false" 
            class="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200 rounded-lg"
          >
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <!-- Filter Form -->
        <div class="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-140px)]">
          <!-- Category -->
          <div>
            <label class="label">Category</label>
            <select v-model="filters.category" class="select w-full">
              <option value="">All Categories</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>

          <!-- Date Range -->
          <div>
            <label class="label">Date Range</label>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <input 
                  v-model="filters.dateFrom" 
                  type="date" 
                  class="input w-full" 
                  placeholder="From"
                />
              </div>
              <div>
                <input 
                  v-model="filters.dateTo" 
                  type="date" 
                  class="input w-full" 
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          <!-- Price Range -->
          <div>
            <label class="label">Price Range (VND)</label>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <input 
                  v-model.number="filters.minPrice" 
                  type="number" 
                  placeholder="Min price" 
                  class="input w-full" 
                  min="0"
                />
              </div>
              <div>
                <input 
                  v-model.number="filters. maxPrice" 
                  type="number" 
                  placeholder="Max price" 
                  class="input w-full" 
                  min="0"
                />
              </div>
            </div>
          </div>

          <!-- City -->
          <div>
            <label class="label">City</label>
            <input 
              v-model="filters.city" 
              type="text" 
              placeholder="Enter city name..." 
              class="input w-full" 
            />
          </div>

          <!-- Sort -->
          <div>
            <label class="label">Sort By</label>
            <select v-model="filters.sort" class="select w-full">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button 
            variant="secondary" 
            @click="clearFilters" 
            class="flex-1 justify-center"
          >
            Clear All
          </Button>
          <Button 
            variant="primary" 
            @click="applyFilters" 
            class="flex-1 justify-center"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </Transition>
  </div>
</template>