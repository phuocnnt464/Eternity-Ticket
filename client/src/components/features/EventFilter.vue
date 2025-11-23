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
  <div class="relative" :class="{ 'z-50': showFilters }">
    
    <Button
      variant="secondary"
      @click="showFilters = !showFilters"
      class="relative"
    >
      <FunnelIcon class="w-5 h-5" />
      <span>Filters</span>
      <span v-if="hasActiveFilters()" class="absolute -top-1 -right-1 w-3 h-3 bg-primary-600 rounded-full"></span>
    </Button>

    <div 
      v-if="showFilters"
      @click="showFilters = false"
      class="fixed inset-0 z-40 bg-black/50 md:bg-transparent"
    ></div>

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
        class="
          bg-white rounded-lg shadow-xl border p-6 z-50
          /* === MOBILE STYLES (FIXED CENTER) === */
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-h-[85vh] overflow-y-auto
          
          /* === DESKTOP STYLES (ABSOLUTE DROPDOWN) === */
          md:absolute md:top-full md:right-0 md:left-auto md:translate-x-0 md:translate-y-0 
          md:w-80 md:max-h-none md:mt-2
        "
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-lg">Filters</h3>
          <button @click="showFilters = false" class="text-gray-400 hover:text-gray-600">
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="label">Category</label>
            <select v-model="filters.category" class="select">
              <option value="">All Categories</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2">
             <div>
                <label class="label">From</label>
                <input v-model="filters.dateFrom" type="date" class="input" />
             </div>
             <div>
                <label class="label">To</label>
                <input v-model="filters.dateTo" type="date" class="input" />
             </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="label">Min (VND)</label>
              <input v-model.number="filters.minPrice" type="number" placeholder="0" class="input" />
            </div>
            <div>
              <label class="label">Max (VND)</label>
              <input v-model.number="filters.maxPrice" type="number" placeholder="Max" class="input" />
            </div>
          </div>

          <div>
            <label class="label">City</label>
            <input v-model="filters.city" type="text" placeholder="City..." class="input" />
          </div>

          <div>
            <label class="label">Sort By</label>
            <select v-model="filters.sort" class="select">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="flex items-center space-x-2 pt-4 border-t mt-2">
            <Button variant="secondary" @click="clearFilters" class="w-full justify-center">
              Clear
            </Button>
            <Button variant="primary" @click="applyFilters" class="w-full justify-center">
              Apply
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>