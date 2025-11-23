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

// 1. Định nghĩa trạng thái mặc định chuẩn
const defaultState = {
  category: '',
  city: '',
  dateFrom: '',
  dateTo: '',
  minPrice: '',
  maxPrice: '',
  status: 'approved',
  sort: 'date_asc'
  // Lưu ý: Không đưa 'search' vào đây vì nó thuộc về thanh tìm kiếm bên ngoài
}

// Khởi tạo filters từ props
const filters = ref({ ...defaultState, ...props.modelValue })

// 2. Watcher: Khi Parent (Cha) reset (Clear All), Child (Con) cũng phải reset theo
watch(() => props.modelValue, (newVal) => {
  console.log('🔄 [EventFilter] Syncing from parent:', newVal)
  filters.value = { 
    ...defaultState, // Reset về chuẩn trước
    ...newVal        // Ghi đè giá trị mới
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
  // Tạo bản sao để emit
  const filtersToEmit = { ...filters.value }
  emit('update:modelValue', filtersToEmit)
  emit('apply', filtersToEmit)
  showFilters.value = false
}

const clearFilters = () => {
  // Reset về default state nội bộ
  filters.value = { ...defaultState }
  
  // Nếu prop modelValue có chứa 'search', ta cần giữ lại nó để không làm mất text trong ô tìm kiếm
  if (props.modelValue.search) {
    filters.value.search = props.modelValue.search
  }

  applyFilters()
}

// 3. LOGIC QUAN TRỌNG NHẤT: Kiểm tra xem có đang filter không?
const hasActiveFilters = () => {
  const f = filters.value
  
  // Chúng ta kiểm tra thủ công từng trường để đảm bảo chính xác tuyệt đối.
  // Tuyệt đối KHÔNG kiểm tra f.search ở đây.
  
  const hasCategory = f.category && f.category !== ''
  const hasCity = f.city && f.city.trim() !== ''
  const hasDateFrom = f.dateFrom && f.dateFrom !== ''
  const hasDateTo = f.dateTo && f.dateTo !== ''
  
  // Với số (Price), cần kiểm tra > 0 (tránh trường hợp '0' hoặc null)
  const hasMinPrice = f.minPrice && Number(f.minPrice) > 0
  const hasMaxPrice = f.maxPrice && Number(f.maxPrice) > 0
  
  // Sort khác mặc định mới tính là filter
  const hasSort = f.sort && f.sort !== 'date_asc'

  return hasCategory || hasCity || hasDateFrom || hasDateTo || hasMinPrice || hasMaxPrice || hasSort
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
      
      <span 
        v-if="hasActiveFilters()" 
        class="absolute -top-1 -right-1 w-3 h-3 bg-primary-600 rounded-full border-2 border-white"
      ></span>
    </Button>

    <div 
      v-if="showFilters"
      @click="showFilters = false"
      class="fixed inset-0 z-40 bg-black/50"
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
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-h-[85vh] overflow-y-auto
          md:absolute md:top-full md:right-0 md:left-auto md:translate-x-0 md:translate-y-0 
          md:w-[450px] md:max-h-none md:mt-2
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
            <select v-model="filters.category" class="select w-full">
              <option value="">All Categories</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
             <div>
                <label class="label">From</label>
                <input v-model="filters.dateFrom" type="date" class="input w-full" />
             </div>
             <div>
                <label class="label">To</label>
                <input v-model="filters.dateTo" type="date" class="input w-full" />
             </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Min (VND)</label>
              <input v-model.number="filters.minPrice" type="number" placeholder="0" class="input w-full" />
            </div>
            <div>
              <label class="label">Max (VND)</label>
              <input v-model.number="filters.maxPrice" type="number" placeholder="Max" class="input w-full" />
            </div>
          </div>

          <div>
            <label class="label">City</label>
            <input v-model="filters.city" type="text" placeholder="City..." class="input w-full" />
          </div>

          <div>
            <label class="label">Sort By</label>
            <select v-model="filters.sort" class="select w-full">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="flex items-center space-x-3 pt-4 border-t mt-4">
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