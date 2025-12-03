<script setup>
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="bg-gradient-to-br from-dark-900 via-primary-900 to-black text-white mt-20">
    <div class="container-custom py-12">
      <div class="text-center mb-8">
        <RouterLink to="/" class="inline-flex items-center space-x-3 group">
          <img 
            src="/logo_w.svg" 
            alt="Eternity Tickets" 
            class="h-12 w-12 object-contain group-hover:scale-110 transition-transform"
          />
          <span class="text-2xl font-bold">Eternity Tickets</span>
        </RouterLink>
      </div>

      <div class="border-t border-white/10 mb-6"></div>

      <div class="text-center space-y-2">
        <p class="text-gray-400 text-sm">
          &copy; {{ currentYear }} Eternity Tickets. All rights reserved. 
        </p>
        <p class="text-gray-500 text-sm">
          Final Year Project - <span class="text-primary-400 font-medium">Nguyen Ngo Thanh Phuoc</span>
        </p>
        <p class="text-gray-500 text-xs">
          University of Greenwich
        </p>
      </div>
    </div>
  </footer>
</template>