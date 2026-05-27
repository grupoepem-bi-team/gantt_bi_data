import { ref, computed } from 'vue'

export function useSkeletonLoader(itemCount: number = 5) {
  const isLoading = ref(false)
  const skeletonItems = computed(() => {
    return Array.from({ length: itemCount }, (_, i) => ({
      id: `skeleton-${i}`,
      width: Math.random() * 100 + 50,
      left: Math.random() * 200
    }))
  })

  function startLoading() {
    isLoading.value = true
  }

  function stopLoading() {
    isLoading.value = false
  }

  return {
    isLoading,
    skeletonItems,
    startLoading,
    stopLoading
  }
}