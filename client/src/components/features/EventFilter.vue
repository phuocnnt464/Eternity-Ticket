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

const filters = ref({
  category: props.modelValue.category || '',
  city: props.modelValue.city || '', 
  dateFrom: props.modelValue.dateFrom || '',
  dateTo: props.modelValue.dateTo || '',
  minPrice: props.modelValue.minPrice || '',
  maxPrice: props.modelValue.maxPrice || '',
  status: props.modelValue.status || 'approved',
  sort: props.modelValue.sort || 'date_asc'
})

const sortOptions = [
  { value: 'date_asc', label: 'Date: Earliest First' },
  { value: 'date_desc', label: 'Date: Latest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' }
]

const applyFilters = () => {
  console.log('🔍 [EventFilter] Emitting filters:', filters.value)
  emit('update:modelValue', filters.value)
  emit('apply', filters.value)
  showFilters.value = false
}

const clearFilters = () => {
  filters.value = {
    category: '',
    city: '', 
    dateFrom: '',
    dateTo: '',
    minPrice: '',
    maxPrice: '',
    status: 'approved',
    sort: 'date_asc'
  }
  applyFilters()
}

const hasActiveFilters = () => {
  return filters.value.category || 
         filters.value.city ||    
         filters.value.dateFrom || 
         filters.value.dateTo || 
         filters.value.minPrice || 
         filters.value.maxPrice ||
         filters.value.sort !== 'date_asc'
}
</script>

<template>
  <div class="relative">
    <!-- Filter Toggle Button -->
    <Button
      variant="secondary"
      @click="showFilters = !showFilters"
      class="relative"
    >
      <FunnelIcon class="w-5 h-5" />
      <span>Filters</span>
      <span v-if="hasActiveFilters()" class="absolute -top-1 -right-1 w-3 h-3 bg-primary-600 rounded-full"></span>
    </Button>

    <!-- Filter Panel -->
    <Transition name="fade">
      <div 
        v-if="showFilters"
        class="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border p-6 z-50"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-lg">Filters</h3>
          <button @click="showFilters = false" class="text-gray-400 hover:text-gray-600">
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4">
          <!-- Category -->
          <div>
            <label class="label">Category</label>
            <select v-model="filters.category" class="select">
              <option value="">All Categories</option>
              <option 
                v-for="category in categories" 
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>

          <!-- Date Range -->
          <div>
            <label class="label">Date From</label>
            <input 
              v-model="filters.dateFrom" 
              type="date" 
              class="input"
            />
          </div>

          <div>
            <label class="label">Date To</label>
            <input 
              v-model="filters.dateTo" 
              type="date" 
              class="input"
            />
          </div>

          <!-- Price Range -->
          <div>
            <label class="label">Min Price (VND)</label>
            <input 
              v-model.number="filters.minPrice" 
              type="number" 
              placeholder="0"
              class="input"
            />
          </div>

          <div>
            <label class="label">Max Price (VND)</label>
            <input 
              v-model.number="filters.maxPrice" 
              type="number" 
              placeholder="1000000"
              class="input"
            />
          </div>

          <div>
            <label class="label">City</label>
            <input 
              v-model="filters.city" 
              type="text" 
              placeholder="Enter city name"
              class="input"
            />
          </div>

          <!-- Sort -->
          <div>
            <label class="label">Sort By</label>
            <select v-model="filters.sort" class="select">
              <option 
                v-for="option in sortOptions" 
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2 pt-4 border-t">
            <Button variant="secondary" @click="clearFilters" full-width>
              Clear
            </Button>
            <Button variant="primary" @click="applyFilters" full-width>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Overlay for mobile -->
    <div 
      v-if="showFilters"
      @click="showFilters = false"
      class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
    ></div>
  </div>
</template>