export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse px-0.5 sm:px-0">
      {/* Image Skeleton */}
      <div className="relative aspect-[3/4] bg-gray-200 rounded-lg sm:rounded-xl mb-2 sm:mb-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
      </div>

      {/* Content Skeleton */}
      <div className="flex flex-col flex-grow space-y-1.5 sm:space-y-3">
        {/* Title */}
        <div className="space-y-1 sm:space-y-1.5">
          <div className="h-3 sm:h-4 bg-gray-200 rounded w-11/12 sm:w-3/4"></div>
          <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/5 sm:w-1/2"></div>
        </div>

        {/* Color Swatches */}
        <div className="flex gap-1 sm:gap-1.5">
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-200"></div>
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-200"></div>
          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-200"></div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1 sm:gap-2">
          <div className="h-4 sm:h-5 bg-gray-200 rounded w-14 sm:w-20"></div>
          <div className="h-3 sm:h-4 bg-gray-100 rounded w-10 sm:w-12"></div>
        </div>

        {/* Button (Mobile) */}
        <div className="mt-auto pt-1 sm:pt-2 lg:hidden">
          <div className="h-8 sm:h-10 bg-gray-100 rounded-md sm:rounded-lg w-full"></div>
        </div>
      </div>
    </div>
  );
}
