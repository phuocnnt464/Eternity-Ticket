<script setup>
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="bg-gradient-to-br from-dark-900 via-primary-900 to-black text-white mt-20">
    <div class="container-custom py-12">
      <!-- Logo & Brand -->
      <div class="text-center mb-8">
        <RouterLink to="/" class="inline-flex items-center space-x-3 group">
          <img 
            src="/logo_w.svg" 
            alt="Eternity Tickets" 
            class="h-12 w-12 object-contain group-hover:scale-110 transition-transform"
          />
          <span class="text-2xl font-bold">Eternity Tickets</span>
        </RouterLink>
        <!-- <p class="text-gray-400 text-sm mt-3 max-w-md mx-auto">
          Your trusted platform for discovering and booking amazing events across Vietnam.
        </p> -->
      </div>

      <!-- Quick Links -->
      <!-- <div class="flex flex-wrap justify-center gap-6 mb-8 text-sm">
        <RouterLink to="/events" class="text-gray-400 hover:text-white transition-colors">
          Browse Events
        </RouterLink>
        <RouterLink to="/about" class="text-gray-400 hover:text-white transition-colors">
          About Us
        </RouterLink>
        <RouterLink to="/contact" class="text-gray-400 hover:text-white transition-colors">
          Contact
        </RouterLink>
        <RouterLink to="/auth/register? role=organizer" class="text-gray-400 hover:text-white transition-colors">
          Become Organizer
        </RouterLink>
      </div> -->

      <!-- Divider -->
      <div class="border-t border-white/10 mb-6"></div>

      <!-- Copyright & Final Year Project Info -->
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